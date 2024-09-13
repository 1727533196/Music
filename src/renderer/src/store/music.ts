import {defineStore} from "pinia";
import {
  CurrentItem, getIntelliganceList,
  getLyric,
  getMusicDetail,
  GetMusicDetailData,
  getMusicUrl,
  GetPlayListDetailRes
} from "@/api/musicList";
import {watch, ref, reactive} from "vue";
import { parseLrc, parseYrc } from "@lrc-player/parse";
import {randomNum, Yrc} from "@/utils";

export type Lyric = {time: number | boolean, text: string, line: number}
interface State {
  musicUrl: string
  songs: any
  currentItem: GetPlayListDetailRes['playlist'] | null
  runtimeList: CurrentItem | null
  runtimeIds: number[]
  lyric: Lyric[] & {notSupportedScroll?: boolean} | Yrc[] & {notSupportedScroll?: boolean}
  klyric: string
  currentTime: 0
  lrcMode: 0 | 1
  bgColor: Array<Array<string>>
}

// 会把用户当前正在播放的列表单独存储起来，以便切换歌单时没有播放切换的歌单不会被清空
export const useMusicAction = defineStore('musicActionId', () => {
  const state = reactive<State>({
    musicUrl: '', // 用户当前播放器播放的音乐url
    songs: {}, // 用户当前播放器播放的音乐
    currentItem: null, // 用户当前选中的歌单列表，会随着用户选中的菜单变化
    runtimeList: null, // 用户当前正在播放音乐的列表
    runtimeIds: [], // 用户当前正在播放音乐的列表ids
    lyric: [],
    klyric: '',
    currentTime: 0,
    lrcMode: 1,
    bgColor: [], // 当前正在播放的音乐主题色
  })
  const index = ref(0)
  const lastIndexList = ref<number[]>([])
  watch(index, (value, oldValue) => {
    lastIndexList.value.push(oldValue)
  })

  const updateCurrentItem = (val: CurrentItem) => {
    val.name = val.specialType === 5 ? '我喜欢的歌单' : val.name
    state.currentItem = val
  }
  const updateRuntimeList = (list: CurrentItem, ids: number[]) => {
    if(list.specialType !== 5 && $audio.orderStatusVal === 0) {
      $audio.orderStatusVal = 1
    }
    state.runtimeList = list
    state.runtimeIds = ids

    getIntelliganceListHandler()
  }
  const updateTracks = (tracks: GetMusicDetailData[], ids: number[]) => {
    if(state.runtimeList) {
      state.runtimeList.tracks = tracks
      state.runtimeIds = ids
    }
  }
  // 获取歌词
  const getLyricHandler = async (id: number) => {
    const {klyric, lrc, yrc} = await getLyric(id)
    // 首先对歌词进行格式化处理
    // {time: number(s), text: string}
    if(yrc && yrc.lyric) {
      state.lyric = parseLrc(yrc.lyric)
      state.lrcMode = 1
    } else {
      state.lyric = parseYrc(lrc.lyric)
      state.lrcMode = 0
      if(state.lyric.length === 1) {
        state.lyric = []
      }
    }
  }
  // 获取音乐url并播放
  const getMusicUrlHandler = async (item: GetMusicDetailData, i?: number) => {
    try {
      state.songs = item
      getLyricHandler(item.id)
      const [{data}, {songs}] = await Promise.all([getMusicUrl(item.id), getMusicDetail(item.id.toString())])
      index.value = i === undefined ? index.value : i
      $audio.reset(true)
      await $audio.pause(false)
      state.musicUrl = data[0].url || ''
      $audio.cutSongHandler()
      // 监听audio是否加载完毕
      $audio.el.oncanplay = async () => {
        try {
          await $audio.play();
        } catch (error) {
          console.error('播放失败:', error);
        }
      };

    } catch (e) {
      console.log('getMusicUrlHandler函数错误：', e)
    }

  }
  // 0心动 1列表循环 2随机播放 3单曲循环
  const orderTarget = (i: 0 | 1 | 2 | 3) => {
    if(i === 0) {
      return (index.value + 1) % state.runtimeIds.length
    } else if (i === 1) {
      return (index.value + 1) % state.runtimeIds.length
    } else if (i === 2) {
      return randomNum(0, state.runtimeIds.length - 1)
    } else {
      return index.value
    }
  }
  const playEnd = () => {
    index.value = orderTarget($audio?.orderStatusVal!)
    if (index.value > state.runtimeIds.length - 1) {
      return
    }
    getMusicUrlHandler(state.runtimeList!.tracks[index.value])
  }
  // 切换歌曲
  const cutSongHandler = (target: boolean) => {
    if ([0, 1, 3].includes($audio?.orderStatusVal!)) {
      index.value = target ? index.value + 1 : index.value - 1
      if (index.value > state.runtimeIds.length - 1) {
        index.value = 0
      } else if (index.value < 0) {
        index.value = state.runtimeIds.length - 1
      }
      getMusicUrlHandler(state.runtimeList!.tracks[index.value])
      return
    }
    if (!target) {
      const i = lastIndexList.value[lastIndexList.value.length - 1] || orderTarget($audio?.orderStatusVal)
      getMusicUrlHandler(state.runtimeList!.tracks[i])
      lastIndexList.value.splice(lastIndexList.value.length - 1)
      return;
    }
    playEnd()
  }
  const updateBgColor = (colors: Array<Array<string>>) => {
    state.bgColor = colors
  }
  // 获取心动歌曲列表  只支持我喜欢的列表 pid: 歌单id   id: 歌曲id
  const getIntelliganceListHandler = async () => {
    const runtimeList = state.runtimeList

    console.log(runtimeList, $audio.orderStatusVal, state.songs)
    if($audio.orderStatusVal !== 0 || !runtimeList || runtimeList.specialType !== 5) {
      return
    }

    const songs = state.songs
    const {data} = await getIntelliganceList(runtimeList.id, songs.id, songs.id)

    const tracks = data.filter(item => !!item.songInfo).map(item => {
      return item.songInfo!
    })
    const ids = tracks.map(item => {
      return item!.id
    })
    updateTracks(tracks, ids)
  }

  return {
    state,
    updateCurrentItem,
    updateRuntimeList,
    getLyricHandler,
    getMusicUrlHandler,
    orderTarget,
    playEnd,
    cutSongHandler,
    updateBgColor,
    getIntelliganceListHandler,
    updateTracks,
  }
})

