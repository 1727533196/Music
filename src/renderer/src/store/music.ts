import { defineStore } from 'pinia'
import {
  CurrentItem,
  getDynamicCover,
  getIntelliganceList,
  getLyric,
  getMusicDetail,
  GetMusicDetailData,
  getMusicUrl,
  GetPlayListDetailRes,
  updateScrobble
} from '@/api/musicList'
import { watch, ref, reactive } from 'vue'
import { parseLrc, parseYrc } from '@lrc-player/parse'
import { randomNum, Yrc } from '@/utils'

export type Lyric = { time: number | boolean; text: string; line: number }
interface State {
  musicUrl: string
  songs: any
  currentItem: Partial<GetPlayListDetailRes['playlist']> | null
  runtimeList: CurrentItem | null
  runtimeIds: number[]
  lyric: (Lyric[] & { notSupportedScroll?: boolean }) | (Yrc[] & { notSupportedScroll?: boolean })
  currentTime: 0
  lrcMode: 0 | 1
  bgColor: Array<Array<string>>
  videoPlayUrl: string | null
  // 0心动 1列表循环 2随机播放 3单曲循环
  orderStatusVal: 0 | 1 | 2 | 3
  load: boolean
  index: number
  lastIndexList: number[]
}

// 会把用户当前正在播放的列表单独存储起来，以便切换歌单时没有播放切换的歌单不会被清空
export const useMusicAction = defineStore('musicActionId', () => {
  let state: State = reactive({
    musicUrl: '', // 用户当前播放器播放的音乐url
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
    index: 0
  })
  watch(
    () => state.index,
    (value, oldValue) => {
      state.lastIndexList.push(oldValue)
    }
  )

  const updateCurrentItem = (val: CurrentItem) => {
    val.name = val.specialType === 5 ? '我喜欢的歌单' : val.name
    state.currentItem = val
  }
  const updateRuntimeList = (list: CurrentItem, ids: number[]) => {
    if (list.specialType !== 5 && state.orderStatusVal === 0) {
      state.orderStatusVal = 1
    }
    state.runtimeList = list
    state.runtimeIds = ids

    getIntelliganceListHandler()
  }
  const updateTracks = (tracks: GetMusicDetailData[], ids: number[]) => {
    if (state.runtimeList) {
      state.runtimeList.tracks = tracks
      state.runtimeIds = ids
    }
  }
  // 获取歌词
  const getLyricHandler = async (id: number) => {
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
    Object.assign(state, data)
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
  // 获取音乐url并播放
  const getMusicUrlHandler = async (item: GetMusicDetailData, i?: number) => {
    try {
      state.songs = item
      getLyricHandler(item.id)
      getDynamicCoverHandler(item.id)
      updateScrobble(item.id, state.runtimeList?.id)
      const [{ data }, { songs }] = await Promise.all([
        getMusicUrl(item.id),
        getMusicDetail(item.id.toString())
      ])
      state.index = i === undefined ? state.index : i
      $audio.reset(true)
      await $audio.pause(false)
      state.musicUrl = data[0].url || ''
      $audio.cutSongHandler()
      // 监听audio是否加载完毕
      localStorage.setItem('MUSIC_CONFIG', JSON.stringify({ ...state, load: true }))

      $audio.el.oncanplay = async () => {
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
      state.index = target ? state.index + 1 : state.index - 1
      if (state.index > state.runtimeIds.length - 1) {
        state.index = 0
      } else if (state.index < 0) {
        state.index = state.runtimeIds.length - 1
      }
      getMusicUrlHandler(state.runtimeList!.tracks[state.index])
      return
    }
    if (!target) {
      const i =
        state.lastIndexList[state.lastIndexList.length - 1] || orderTarget(state?.orderStatusVal)
      getMusicUrlHandler(state.runtimeList!.tracks[i])
      state.lastIndexList.splice(state.lastIndexList.length - 1)
      return
    }
    playEnd()
  }
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
    orderTarget,
    playEnd,
    cutSongHandler,
    updateBgColor,
    getIntelliganceListHandler,
    updateTracks
  }
})
