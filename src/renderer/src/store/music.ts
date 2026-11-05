import { defineStore } from 'pinia'
import {
  CurrentItem,
  getCloudlyric,
  getDynamicCover,
  getIntelliganceList,
  getLyric,
  getMusicDetail,
  GetMusicDetailData,
  getMusicUrl,
  updateScrobble
} from '@/api/musicList'
import { watch, ref, reactive } from 'vue'
import { parseLrc, parseYrc } from '@lrc-player/parse'
import { randomNum, Yrc } from '@/utils'
import { useUserInfo } from '@/store/index'
import { getMusicUrlExpiresAt } from '@/utils/musicSource'

export type Lyric = { time: number | boolean; text: string; line: number }
interface State {
  musicUrl: string
  musicUrlExpiresAt: number
  songs: any
  currentItem: Partial<CurrentItem> | null
  runtimeList: CurrentItem | null
  runtimeIds: number[]
  lyric: (Lyric[] & { notSupportedScroll?: boolean }) | (Yrc[] & { notSupportedScroll?: boolean })
  currentTime: number
  lrcMode: 0 | 1
  bgColor: Array<Array<string>>
  videoPlayUrl: string | null
  // 0心动 1列表循环 2随机播放 3单曲循环
  orderStatusVal: 0 | 1 | 2 | 3
  load: boolean
  index: number
  lastIndexList: number[]
  searchList: any[]
}

const normalizePlaybackQueue = (
  tracks: GetMusicDetailData[],
  previousIds: number[],
  songId: number | undefined,
  currentIndex: number,
  history: number[]
) => {
  const playableTracks = tracks.filter((song) => !((song.privilege?.st ?? 0) < 0))
  const ids = playableTracks.map((song) => song.id)
  const positions = new Map<number, number>()
  ids.forEach((id, index) => {
    if (!positions.has(id)) positions.set(id, index)
  })
  const focusedSongId = positions.has(songId!) ? songId : previousIds[currentIndex]
  return {
    tracks: playableTracks,
    ids,
    index: positions.get(focusedSongId!) ?? Math.max(0, Math.min(currentIndex, ids.length - 1)),
    history: history
      .map((index) => positions.get(previousIds[index]) ?? -1)
      .filter((index) => index !== -1)
  }
}

// 会把用户当前正在播放的列表单独存储起来，以便切换歌单时没有播放切换的歌单不会被清空
export const useMusicAction = defineStore('musicActionId', () => {
  let state: State = reactive({
    musicUrl: '', // 用户当前播放器播放的音乐url
    musicUrlExpiresAt: 0,
    songs: {}, // 用户当前播放器播放的音乐
    currentItem: null, // 用户当前选中的歌单列表，会随着用户选中的菜单变化
    runtimeList: null, // 用户当前正在播放音乐的列表
    runtimeIds: [], // 用户当前正在播放音乐的列表ids
    lyric: [],
    currentTime: 0,
    lrcMode: 1,
    bgColor: [], // 当前正在播放的音乐主题色
    videoPlayUrl: '',
    orderStatusVal: 0,
    load: false,
    lastIndexList: [],
    index: 0,
    searchList: []
  })
  const store = useUserInfo()
  let reorderingQueue = false
  watch(
    () => state.index,
    (_value, oldValue) => {
      if (!reorderingQueue) state.lastIndexList.push(oldValue)
    },
    { flush: 'sync' }
  )
  const updateSearchList = (val: any) => {
    state.searchList = val
  }
  const updateCurrentItem = (val: CurrentItem) => {
    val.name = val.specialType === 5 ? '我喜欢的歌单' : val.name
    state.currentItem = val
  }
  const replacePlaybackQueue = (list: CurrentItem, previousIds: number[], history: number[]) => {
    const queue = normalizePlaybackQueue(
      Array.isArray(list.tracks) ? list.tracks : [],
      previousIds,
      state.songs.id,
      state.index,
      history
    )
    // 只过滤播放队列，避免修改与浏览歌单共享的对象。
    state.runtimeList = { ...list, tracks: queue.tracks }
    state.runtimeIds = queue.ids
    reorderingQueue = true
    try {
      state.index = queue.index
    } finally {
      reorderingQueue = false
    }
    state.lastIndexList = queue.history
  }
  const updateRuntimeList = (list: CurrentItem, ids: number[]) => {
    if (list.specialType !== 5 && state.orderStatusVal === 0) {
      state.orderStatusVal = 1
    }
    const sameQueue = state.runtimeList?.id === list.id
    replacePlaybackQueue(
      list,
      sameQueue ? state.runtimeIds : ids,
      sameQueue ? state.lastIndexList : []
    )

    getIntelliganceListHandler()
  }
  const updateTracks = (tracks: GetMusicDetailData[], ids: number[]) => {
    if (state.runtimeList) {
      replacePlaybackQueue(
        { ...state.runtimeList, tracks },
        state.runtimeIds.length ? state.runtimeIds : ids,
        state.lastIndexList
      )
    }
  }

  // 只调整已有队列中的歌单歌曲，保留心动推荐和临时添加的歌曲及其位置。
  const reorderPlaylistTracks = (playlistId: number, orderedIds: number[]): void => {
    const order = new Map(orderedIds.map((id, index) => [id, index]))
    const reorderExisting = <T extends { id: number }>(tracks: T[]): T[] => {
      const sorted = tracks
        .filter((track) => order.has(track.id))
        .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
      let index = 0
      return tracks.map((track) => (order.has(track.id) ? sorted[index++] : track))
    }

    const reorderMetadata = (list: Partial<CurrentItem> | null | undefined): boolean => {
      if (list?.id !== playlistId) return false
      if (Array.isArray(list.trackIds)) list.trackIds = reorderExisting(list.trackIds)
      if (Array.isArray(list.tracks)) list.tracks = reorderExisting(list.tracks)
      return true
    }
    const reorderQueue = (
      tracks: GetMusicDetailData[],
      songId: number | undefined,
      currentIndex: number,
      history: number[]
    ) => {
      const previousIds = tracks.map((track) => track.id)
      return normalizePlaybackQueue(
        reorderExisting(tracks),
        previousIds,
        songId,
        currentIndex,
        history
      )
    }

    // 先保留旧位置；当前浏览的歌单和播放队列可能引用同一个对象。
    const runtimeList = state.runtimeList
    const queue =
      runtimeList?.id === playlistId && Array.isArray(runtimeList.tracks)
        ? reorderQueue(runtimeList.tracks, state.songs.id, state.index, state.lastIndexList)
        : null
    reorderMetadata(state.currentItem)
    if (reorderMetadata(runtimeList) && queue && runtimeList) {
      runtimeList.tracks = queue.tracks
      state.runtimeIds = queue.ids
      reorderingQueue = true
      try {
        state.index = queue.index
      } finally {
        reorderingQueue = false
      }
      state.lastIndexList = queue.history
    }

    // 只更新已有播放缓存，重启后仍沿用保存后的顺序。
    try {
      const stored = localStorage.getItem('MUSIC_CONFIG')
      if (!stored) return
      const cached = JSON.parse(stored) as Partial<State> | null
      if (!cached || typeof cached !== 'object') return
      const cachedRuntime = cached.runtimeList
      const cachedQueue =
        cachedRuntime?.id === playlistId && Array.isArray(cachedRuntime.tracks)
          ? reorderQueue(
              cachedRuntime.tracks,
              cached.songs?.id,
              cached.index ?? 0,
              cached.lastIndexList ?? []
            )
          : null
      const currentUpdated = reorderMetadata(cached.currentItem)
      const runtimeUpdated = reorderMetadata(cachedRuntime)
      if (cachedQueue && cachedRuntime) {
        cachedRuntime.tracks = cachedQueue.tracks
        cached.runtimeIds = cachedQueue.ids
        cached.index = cachedQueue.index
        cached.lastIndexList = cachedQueue.history
      }
      if (currentUpdated || runtimeUpdated) {
        localStorage.setItem('MUSIC_CONFIG', JSON.stringify(cached))
      }
    } catch (error) {
      console.warn('更新播放队列缓存失败', error)
    }
  }

  // 获取歌词
  const getLyricHandler = async (item) => {
    const { id, pc } = item
    if (pc?.privateCloud && store.profile.userId) {
      const { lrc } = await getCloudlyric(store.profile.userId, id)
      console.log('lrc', lrc)
      state.lyric = parseYrc(lrc)
      state.lrcMode = 0
      if (state.lyric.length === 1) {
        state.lyric = []
      }
      return
    }
    const { lrc, yrc } = await getLyric(id)
    // 首先对歌词进行格式化处理
    // {time: number(s), text: string}
    if (yrc && yrc.lyric) {
      state.lyric = parseLrc(yrc.lyric)
      state.lrcMode = 1
    } else {
      state.lyric = parseYrc(lrc.lyric)
      state.lrcMode = 0
      if (state.lyric.length === 1) {
        state.lyric = []
      }
    }
  }
  const updateState = (data) => {
    const restored = { ...data }
    if (Array.isArray(data.runtimeList?.tracks)) {
      const queue = normalizePlaybackQueue(
        data.runtimeList.tracks,
        data.runtimeIds ?? data.runtimeList.tracks.map((song) => song.id),
        data.songs?.id,
        data.index ?? 0,
        data.lastIndexList ?? []
      )
      Object.assign(restored, {
        runtimeList: { ...data.runtimeList, tracks: queue.tracks },
        runtimeIds: queue.ids,
        index: queue.index,
        lastIndexList: queue.history
      })
      try {
        localStorage.setItem('MUSIC_CONFIG', JSON.stringify(restored))
      } catch (error) {
        console.warn('更新播放队列缓存失败', error)
      }
    }
    reorderingQueue = true
    try {
      Object.assign(state, restored)
    } finally {
      reorderingQueue = false
    }
  }
  // 获取动态封面
  const getDynamicCoverHandler = async (id: number) => {
    try {
      const { data } = await getDynamicCover(id)
      if (data.videoPlayUrl) {
        state.videoPlayUrl = data.videoPlayUrl
      } else {
        state.videoPlayUrl = null
      }
    } catch (e) {
      state.videoPlayUrl = null
    }
  }
  // 设置媒体元数据
  const updateMediaSession = (song) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title, // 歌曲名
        artist: song.artist, // 歌手
        album: song.album, // 专辑名
        artwork: [
          { src: song.coverUrl, sizes: '96x96', type: 'image/png' },
          { src: song.coverUrl, sizes: '128x128', type: 'image/png' },
          { src: song.coverUrl, sizes: '192x192', type: 'image/png' },
          { src: song.coverUrl, sizes: '512x512', type: 'image/png' }
        ]
      })
    }
  }
  let sourceRequestId = 0
  const isMusicUrlExpired = () => !state.musicUrlExpiresAt || Date.now() >= state.musicUrlExpiresAt

  // 同一首歌只替换音频地址，不重置进度、歌词和播放记录。
  const refreshMusicUrl = async (signal: AbortSignal): Promise<boolean> => {
    const songId = state.songs.id
    const previousUrl = state.musicUrl
    const requestId = sourceRequestId
    const requestedAt = Date.now()
    const { data } = await getMusicUrl(songId)
    if (
      signal.aborted ||
      requestId !== sourceRequestId ||
      state.songs.id !== songId ||
      state.musicUrl !== previousUrl
    ) {
      return false
    }
    if (!data[0]?.url) {
      throw new Error('未获取到可播放的歌曲链接')
    }
    state.musicUrl = data[0].url
    state.musicUrlExpiresAt = getMusicUrlExpiresAt(data[0].expi, requestedAt)
    return true
  }

  // 获取音乐url并播放
  const getMusicUrlHandler = async (item: GetMusicDetailData, i?: number) => {
    const requestId = ++sourceRequestId
    const requestedAt = Date.now()
    try {
      $audio.el.oncanplay = null
      state.songs = item
      getLyricHandler(item)
      getDynamicCoverHandler(item.id)
      updateScrobble(item.id, state.runtimeList?.id)
      const [{ data }, { songs }] = await Promise.all([
        getMusicUrl(item.id),
        getMusicDetail(item.id.toString())
      ])
      if (requestId !== sourceRequestId) return
      state.songs.dt = data[0].time
      // 请求过程中可能已拖动排序，使用歌曲 ID 定位最新队列中的位置。
      const currentIndex = state.runtimeIds.indexOf(item.id)
      state.index = currentIndex === -1 ? (i === undefined ? state.index : i) : currentIndex
      $audio.reset(true)
      await $audio.pause(false)
      if (requestId !== sourceRequestId) return
      state.musicUrl = data[0].url || ''
      state.musicUrlExpiresAt = getMusicUrlExpiresAt(data[0].expi, requestedAt)
      $audio.cutSongHandler()
      // 监听audio是否加载完毕
      localStorage.setItem('MUSIC_CONFIG', JSON.stringify({ ...state, load: true }))

      updateMediaSession({
        title: item.name,
        artist: item.ar.map((item) => item.name).join('/ '),
        album: item.al.name,
        coverUrl: item.al.picUrl
      })
      $audio.el.oncanplay = async () => {
        $audio.el.oncanplay = null
        if (requestId !== sourceRequestId) return
        try {
          await $audio.play()
          // localStorage.setItem('MUSIC_CONFIG', JSON.stringify({
          //   songs: item,
          //   lyric: state.lyric,
          //   lrcMode: state.lrcMode,
          //   videoPlayUrl: state.videoPlayUrl,
          //   index: index.value,
          //   musicUrl: state.musicUrl,
          //   runtimeIds: state.runtimeIds,
          //   orderStatusVal: state.orderStatusVal,
          //   runtimeList: state.runtimeList,
          //   bgColor: state.bgColor,
          // }))
        } catch (error) {
          console.error('播放失败:', error)
        }
      }
    } catch (e) {
      console.log('getMusicUrlHandler函数错误：', e)
    }
  }
  // const setSongCache() {
  //   localStorage.setItem('MUSIC_CONFIG', JSON.stringify({
  //
  //   }))
  // }
  // 0心动 1列表循环 2随机播放 3单曲循环
  const orderTarget = (i: 0 | 1 | 2 | 3) => {
    if (i === 0) {
      return (state.index + 1) % state.runtimeIds.length
    } else if (i === 1) {
      return (state.index + 1) % state.runtimeIds.length
    } else if (i === 2) {
      return randomNum(0, state.runtimeIds.length - 1)
    } else {
      return state.index
    }
  }
  const playEnd = () => {
    state.index = orderTarget(state?.orderStatusVal!)
    if (state.index > state.runtimeIds.length - 1) {
      return
    }
    getMusicUrlHandler(state.runtimeList!.tracks[state.index])
  }
  // 切换歌曲
  const cutSongHandler = (target: boolean) => {
    if ([0, 1, 3].includes(state?.orderStatusVal!)) {
      const length = state.runtimeIds.length
      if (!length) return
      state.index = (state.index + (target ? 1 : -1) + length) % length
      getMusicUrlHandler(state.runtimeList!.tracks[state.index])
      return
    }
    if (!target) {
      const i =
        state.lastIndexList[state.lastIndexList.length - 1] ?? orderTarget(state?.orderStatusVal)
      getMusicUrlHandler(state.runtimeList!.tracks[i])
      state.lastIndexList.splice(state.lastIndexList.length - 1)
      return
    }
    playEnd()
  }
  const registerMediaSessionHandlers = () => {
    if ('mediaSession' in navigator) {
      // 播放
      navigator.mediaSession.setActionHandler('play', () => {
        $audio.play()
      })

      // 暂停
      navigator.mediaSession.setActionHandler('pause', () => {
        $audio.pause()
      })

      // 上一首
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        cutSongHandler(false)
      })

      // 下一首
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        cutSongHandler(true)
      })

      // 拖动进度条 (macOS Big Sur+ 支持)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        window.$audio.time = details.seekTime
      })
    }
  }
  registerMediaSessionHandlers()
  const updateBgColor = (colors: Array<Array<string>>) => {
    state.bgColor = colors
  }
  // 获取心动歌曲列表  只支持我喜欢的列表 pid: 歌单id   id: 歌曲id
  const getIntelliganceListHandler = async () => {
    const runtimeList = state.runtimeList

    if (state.orderStatusVal !== 0 || !runtimeList || runtimeList.specialType !== 5) {
      return
    }

    const songs = state.songs
    const { data } = await getIntelliganceList(runtimeList.id, songs.id, songs.id)

    const tracks = data
      .filter((item) => !!item.songInfo)
      .map((item) => {
        return item.songInfo!
      })
    const ids = tracks.map((item) => {
      return item!.id
    })
    updateTracks(tracks, ids)
  }

  return {
    state,
    updateState,
    updateCurrentItem,
    updateRuntimeList,
    getLyricHandler,
    getMusicUrlHandler,
    isMusicUrlExpired,
    refreshMusicUrl,
    orderTarget,
    playEnd,
    cutSongHandler,
    updateBgColor,
    getIntelliganceListHandler,
    updateTracks,
    reorderPlaylistTracks,
    updateSearchList
  }
})
