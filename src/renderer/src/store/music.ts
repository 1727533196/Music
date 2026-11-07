import { defineStore } from 'pinia'
import {
  CurrentItem,
  getCloudlyric,
  getDynamicCover,
  getIntelliganceList,
  getLyric,
  GetMusicDetailData,
  updateScrobble
} from '@/api/musicList'
import { watch, ref, reactive } from 'vue'
import { parseLrc, parseYrc } from '@lrc-player/parse'
import { randomNum, Yrc } from '@/utils'
import { useUserInfo } from '@/store/index'
import { resolveAudioSource, audioCacheKey } from '@/utils/audioSource'
import { useSettings } from '@/store/settings'
import type { AudioQuality } from '../../../shared/audioCache'
import { message } from '@/utils/message'

export type Lyric = { time: number | boolean; text: string; line: number }
interface State {
  musicUrl: string
  actualQuality: AudioQuality | null
  sourceCached: boolean
  sourceTrial: boolean
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
    actualQuality: null,
    sourceCached: false,
    sourceTrial: false,
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
  const settings = useSettings()
  // 加载中的空数组尚不能用于判断歌曲是否有歌词，不写入播放持久化状态。
  const lyricLoading = ref(false)
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
  const getLyricHandler = async (
    item,
    revision: number,
    quality: AudioQuality,
    silentError = false
  ) => {
    const { id, pc } = item
    if (revision !== sourceRequestId || state.songs.id !== id) return
    lyricLoading.value = true
    try {
      if (pc?.privateCloud && store.profile.userId) {
        const { lrc } = (await getCloudlyric(store.profile.userId, id, silentError)) as {
          lrc: string
        }
        if (revision !== sourceRequestId || state.songs.id !== id) return

        state.lyric = parseYrc(lrc)
        state.lrcMode = 0
        if (state.lyric.length === 1) {
          state.lyric = []
        }
        void window.audioCache
          ?.details(
            audioCacheKey(id, quality),
            JSON.stringify({ lyric: state.lyric, lrcMode: state.lrcMode })
          )
          .catch(() => {})
        return
      }
      const { lrc, yrc } = await getLyric(id, silentError)
      if (revision !== sourceRequestId || state.songs.id !== id) return
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
      void window.audioCache
        ?.details(
          audioCacheKey(id, quality),
          JSON.stringify({ lyric: state.lyric, lrcMode: state.lrcMode })
        )
        .catch(() => {})
    } catch {
      /* 无歌词或离线时保留当前空状态。 */
    } finally {
      if (revision === sourceRequestId && state.songs.id === id) lyricLoading.value = false
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
      if (state.songs.id !== id) return
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
  const isMusicUrlExpired = () =>
    !state.musicUrlExpiresAt ||
    Date.now() >= state.musicUrlExpiresAt ||
    (state.load && state.musicUrl.startsWith('tinglan-audio:'))

  const refreshMusicUrl = async (signal: AbortSignal, bypassCache = false): Promise<boolean> => {
    if (signal.aborted) return false
    const songId = state.songs.id
    const quality = settings.state.audioQuality
    const requestId = ++sourceRequestId
    if (!state.lyric?.length) lyricLoading.value = true
    if (bypassCache && state.actualQuality && state.actualQuality !== quality)
      await window.audioCache
        ?.invalidate(audioCacheKey(songId, state.actualQuality))
        .catch(() => {})
    let source: Awaited<ReturnType<typeof resolveAudioSource>>
    try {
      source = await resolveAudioSource(songId, quality, bypassCache)
    } catch (error) {
      if (requestId === sourceRequestId) lyricLoading.value = false
      throw error
    }
    if (
      signal.aborted ||
      requestId !== sourceRequestId ||
      state.songs.id !== songId ||
      quality !== settings.state.audioQuality
    ) {
      if (requestId === sourceRequestId) lyricLoading.value = false
      return false
    }
    state.musicUrl = source.url
    state.musicUrlExpiresAt = source.expiresAt
    state.actualQuality = source.qualityVerified ? source.quality : null
    state.sourceCached = source.cached
    state.sourceTrial = source.trial
    if (!state.lyric?.length) {
      let restoredLyrics = false
      try {
        const details = JSON.parse(source.details || '{}')
        if (Array.isArray(details.lyric) && (details.lrcMode === 0 || details.lrcMode === 1)) {
          state.lyric = details.lyric
          state.lrcMode = details.lrcMode
          restoredLyrics = true
        }
      } catch {
        /* 无可用歌词快照。 */
      }
      if (restoredLyrics) lyricLoading.value = false
      else void getLyricHandler(state.songs, requestId, source.quality, source.cached)
    } else
      void window.audioCache
        ?.details(
          audioCacheKey(songId, source.quality),
          JSON.stringify({ lyric: state.lyric, lrcMode: state.lrcMode })
        )
        .catch(() => {})
    return true
  }

  // 获取音乐url并播放
  const getMusicUrlHandler = async (item: GetMusicDetailData, i?: number) => {
    const requestId = ++sourceRequestId
    const quality = settings.state.audioQuality
    try {
      $audio.el.oncanplay = null
      lyricLoading.value = true
      state.songs = item
      state.lyric = []
      state.videoPlayUrl = null
      const source = await resolveAudioSource(item.id, quality)
      if (requestId !== sourceRequestId || quality !== settings.state.audioQuality) {
        if (requestId === sourceRequestId) lyricLoading.value = false
        return false
      }
      void updateScrobble(item.id, state.runtimeList?.id, source.cached).catch(() => {})
      let restoredLyrics = false
      if (source.details) {
        try {
          const details = JSON.parse(source.details)
          if (Array.isArray(details.lyric) && (details.lrcMode === 0 || details.lrcMode === 1)) {
            state.lyric = details.lyric
            state.lrcMode = details.lrcMode
            restoredLyrics = true
          }
        } catch {
          /* 不可用的歌词快照会重新获取。 */
        }
      }
      if (restoredLyrics) lyricLoading.value = false
      else void getLyricHandler(item, requestId, source.quality, source.cached)
      if (!source.cached) void getDynamicCoverHandler(item.id).catch(() => {})
      if (source.duration > 0) state.songs.dt = source.duration
      // 请求过程中可能已拖动排序，使用歌曲 ID 定位最新队列中的位置。
      const currentIndex = state.runtimeIds.indexOf(item.id)
      state.index = currentIndex === -1 ? (i === undefined ? state.index : i) : currentIndex
      $audio.reset(true)
      await $audio.pause(false)
      if (requestId !== sourceRequestId) return
      state.load = false
      state.musicUrl = source.url
      state.musicUrlExpiresAt = source.expiresAt
      state.actualQuality = source.qualityVerified ? source.quality : null
      state.sourceCached = source.cached
      state.sourceTrial = source.trial
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
      return true
    } catch (e) {
      console.log('getMusicUrlHandler函数错误：', e)
      if (requestId === sourceRequestId) {
        lyricLoading.value = false
        try {
          await window.$audio?.pause()
        } catch {
          /* 播放器可能正在卸载。 */
        }
        if (requestId !== sourceRequestId) return false
        state.musicUrl = ''
        state.musicUrlExpiresAt = 0
        state.sourceCached = false
        state.sourceTrial = false
        state.actualQuality = null
        message.error(e instanceof Error ? e.message : '暂时无法播放这首歌曲')
      }
      return false
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
    lyricLoading,
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
