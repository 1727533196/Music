import { reactive } from 'vue'
import {
  CurrentItem,
  getAlbumContent,
  getLikeMusicListIds,
  getMusicDetail,
  GetMusicDetailData,
  getPlayListDetail,
  PlayList
} from '@/api/musicList'
import { useUserInfo } from '@/store'
import { useMusicAction } from '@/store/music'
import { playListMock } from '@/views/DailyRecommend/dailyRecommendSongsConfig'
import { recommendSong } from '@/api/home'

interface State {
  playList: GetMusicDetailData[]
  listInfo: PlayList
  ids: number[]
  loading: boolean
}

export const playListState: State = reactive({
  playList: [],
  listInfo: {} as PlayList,
  ids: [],
  loading: false
})
// 多个页面和播放器共享同一列表，只允许最后一次请求写入。
let latestPlaylistRequest = 0
const songDetailBatchSize = 500

// 这个文件可以获取指定具有id的歌单，并帮你同步一系列store操作
export default () => {
  const store = useUserInfo()
  const music = useMusicAction()
  // 获取用户指定歌单列表
  const getPlayListDetailFn = async (
    id: number,
    type?: 'album' | string,
    isUpdateLoading: boolean = true
  ) => {
    const requestVersion = ++latestPlaylistRequest
    const shouldFinishLoading = isUpdateLoading || playListState.loading
    isUpdateLoading && (playListState.loading = true)

    try {
      // 防止获取的是日推歌曲，因为日推歌曲没有歌单id
      if (id !== playListMock.id) {
        // 歌单能看到歌单名字, 但看不到具体歌单内容 , 调用此接口 , 传入歌单 id, 可 以获取对应歌单内的所有的音乐(未登录状态只能获取不完整的歌单,登录后是完整的)，
        //   但是返回的 trackIds 是完整的，tracks 则是不完整的，可拿全部 trackIds 请求一次 song/detail 接口获取所有歌曲的详情
        let playList: CurrentItem
        let orderedSongs: GetMusicDetailData[]
        if (type === 'album') {
          const { songs, album } = await getAlbumContent(id)
          if (requestVersion !== latestPlaylistRequest) return
          playList = {
            id: album.id,
            name: album.name,
            coverImgUrl: album.picUrl,
            description: album.description,
            publishTime: album.publishTime,
            albumArtist: album.artist || album.artists?.[0],
            userId: 0,
            updateTime: 0,
            createTime: 0,
            specialType: 0,
            playCount: 0,
            trackCount: songs.length,
            tags: [],
            trackIds: songs.map((song) => ({ id: song.id, uid: 0 })),
            tracks: songs,
            creator: { nickname: '', userId: 0, avatarUrl: '', userType: 4, vipType: 11 },
            subscribed: false,
            ordered: false,
            subscribedCount: 0
          }
          orderedSongs = songs
        } else {
          const { playlist } = await getPlayListDetail(id)
          if (requestVersion !== latestPlaylistRequest) return
          playList = playlist
          music.updateCurrentItem(playList)
          const ids = playList.trackIds.map((item) => item.id)
          const songsById = new Map<number, GetMusicDetailData>()
          // 歌曲详情接口单次最多接受 1000 首，分批串行获取，避免大歌单截断和并发限流。
          for (let offset = 0; offset < ids.length; offset += songDetailBatchSize) {
            const { songs } = await getMusicDetail(
              ids.slice(offset, offset + songDetailBatchSize).join(',')
            )
            if (requestVersion !== latestPlaylistRequest) return
            songs.forEach((song) => songsById.set(song.id, song))
          }
          // 接口可能遗漏失效歌曲或返回不同顺序，完整 trackIds 保留在元数据中。
          orderedSongs = ids
            .map((songId) => songsById.get(songId))
            .filter((song): song is GetMusicDetailData => !!song)
        }
        if (requestVersion !== latestPlaylistRequest) return
        updatePlayList({ ...playList, tracks: orderedSongs })
      } else {
        await fetchRecommendSongs(requestVersion)
      }
    } finally {
      if (requestVersion === latestPlaylistRequest && shouldFinishLoading) {
        playListState.loading = false
      }
    }
  }
  // 获取日推歌曲
  const fetchRecommendSongs = async (requestVersion: number) => {
    const { data } = await recommendSong()
    if (requestVersion === latestPlaylistRequest) {
      playListMock.tracks = data.dailySongs
      updatePlayList(playListMock)
    }
    return data
  }
  const getRecommendSongs = async () => {
    const requestVersion = ++latestPlaylistRequest
    const shouldFinishLoading = playListState.loading
    try {
      return await fetchRecommendSongs(requestVersion)
    } finally {
      if (requestVersion === latestPlaylistRequest && shouldFinishLoading) {
        playListState.loading = false
      }
    }
  }
  const updatePlayList = async (list: CurrentItem) => {
    playListState.playList = list.tracks
    playListState.ids = list.tracks.map((item) => item.id)
    // 过滤掉track属性
    const { tracks, ...args } = list
    playListState.listInfo = args
    music.updateCurrentItem(list)
    getLikeMusicIds()
  }
  const getLikeMusicIds = async () => {
    if (store.isLogin) {
      const { ids } = await getLikeMusicListIds(store.profile.userId!)
      ids.length && store.updateUserLikeIds(ids)
    }
  }

  return {
    getPlayListDetailFn,
    updatePlayList,
    getRecommendSongs,
    getLikeMusicIds
  }
}
