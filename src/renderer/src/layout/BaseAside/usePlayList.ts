import {reactive} from "vue";
import {
  CurrentItem, getAlbumContent,
  getLikeMusicListIds,
  getMusicDetail,
  GetMusicDetailData,
  getPlayListDetail,
  PlayList
} from "@/api/musicList";
import {useUserInfo} from "@/store";
import {useMusicAction} from "@/store/music";
import {playListMock} from "@/views/DailyRecommend/dailyRecommendSongsConfig";
import {recommendSong} from "@/api/home";

interface State {
  playList: GetMusicDetailData[]
  listInfo: PlayList
  ids: number[]
  loading: boolean,
}

export const playListState = reactive<State>({
  playList: [],
  listInfo: {} as PlayList,
  ids: [],
  loading: false,
})


// 这个文件可以获取指定具有id的歌单，并帮你同步一系列store操作
export default () => {
  const store = useUserInfo()
  const music = useMusicAction()
  // 获取用户指定歌单列表
  const getPlayListDetailFn = async (id: number, type?: 'album' | string, isUpdateLoading: boolean = true) => {
    isUpdateLoading && (playListState.loading = true)

    try {
      // 防止获取的是日推歌曲，因为日推歌曲没有歌单id
      if(id !== playListMock.id) {
        // 歌单能看到歌单名字, 但看不到具体歌单内容 , 调用此接口 , 传入歌单 id, 可 以获取对应歌单内的所有的音乐(未登录状态只能获取不完整的歌单,登录后是完整的)，
        //   但是返回的 trackIds 是完整的，tracks 则是不完整的，可拿全部 trackIds 请求一次 song/detail 接口获取所有歌曲的详情
        let playList;
        let ids: string
        if(type === 'album') {
          const {songs} = await getAlbumContent(id)
          playList = songs
          ids = playList.map(item => item.id).join(',')
        } else {
          const {playlist} = await getPlayListDetail(id)
          playList = playlist
          ids = playList.trackIds.map(item => item.id).join(',')
        }
        music.updateCurrentItem(playList)
        const {songs} = await getMusicDetail(ids)
        updatePlayList({...playList, tracks: songs})
      } else {
        await getRecommendSongs()
      }
    } finally {
      isUpdateLoading && (playListState.loading = false)
    }
  }
  // 获取日推歌曲
  const getRecommendSongs = async () => {
    const {data} = await recommendSong()
    playListMock.tracks = data.dailySongs
    updatePlayList(playListMock)
    return data
  }
  const updatePlayList = async (list: CurrentItem) => {
    playListState.playList = list.tracks
    playListState.ids = list.tracks.map(item => item.id)
    // 过滤掉track属性
    const {tracks, ...args} = list
    playListState.listInfo = args
    music.updateCurrentItem(list)
    getLikeMusicIds()
  }
  const getLikeMusicIds = async () => {
    if(store.isLogin) {
      const { ids } = await getLikeMusicListIds(store.profile.userId!)
      ids.length && store.updateUserLikeIds(ids)
    }
  }

  return {
    getPlayListDetailFn,
    updatePlayList,
    getRecommendSongs,
    getLikeMusicIds,
  }
}

