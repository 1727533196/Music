import request from "../utils/request";

export type PlayList = Omit<GetPlayListDetailRes["playlist"],'tracks'>

export interface GetUserPlayListRes {
  playlist: PlayList[]
  code: string
  more: boolean
  version: string
}

// specialType 注解
//   0	普通歌单
//   5	红心歌单
//   10	置顶歌单
//   20	尾部歌单
//   100	官方歌单
//   200	视频歌单
//   300	分享歌单
export interface GetPlayListDetailRes {
  code: 200
  playlist: {
    id: number // 歌单id
    name: string // 歌单名称
    coverImgUrl: string // 歌单封面图片
    userId: number // 创建歌单的用户id
    updateTime: number
    createTime: number // 创建时间
    specialType: 0 | 5 | 10 | 20| 100 | 200 | 300
    playCount: number // 播放量
    trackCount: number //歌单下歌曲总数
    tags: Array<string>
    trackIds: {
      id: number
      uid: number
    }[]
    tracks: GetMusicDetailData[]
    creator: { // 创建这个歌单的用户信息
      nickname: string
      userId: number
      avatarUrl: string
      userType: 4
      vipType: 11
    }
    subscribed: boolean // 是否收藏
    ordered: boolean
    subscribedCount: number // 收藏总数
  }
}

export type getMusicUrlData = {
  size: number
  url: string
}

interface GetMusicUrlRes {
  code: number
  data: getMusicUrlData[]
}
export interface CurrentItem extends PlayList{
  tracks: GetMusicDetailData[]
}
export type GetMusicDetailData = {
  al: { // 名称详情
    id: number
    name: number
    pic: number
    picUrl: string
  }
  ar: { // 歌手列表详情
    alias: [] // 别名列表
    id: number
    name: string
    tns: []
  }[]
  name: string
  dt: number
  id: number
  pop: number
  album: string
}

interface GetMusicDetailRes {
  code: number
  songs: GetMusicDetailData[]
}
interface GetLyricRes {
  code: number
  klyric: { // 卡拉歌词(逐字)
    lyric: string // 可能会返回空串
    version: number
  }
  lrc: { // 逐行歌词
    lyric: string // 可能会返回空串
    version: number
  }
  yrc: { // 网易云逐字歌词
    lyric: string
  } | null
  version: 39
}

export type GetUserCloudSong = {
  fileName: string // 文件昵称，具有后缀名
  fileSize: number // 文件大小 kb
  songId: number // 文件id
  songName: string // 文件昵称，不具有后缀名
  simpleSong: GetMusicDetailData
}

export interface GetUserCloudRes {
  code: number
  count: number // total
  data: GetUserCloudSong[]
}

type Artist = {
  picUrl: string
  id: number // 歌手id
  name: string
  albumSize: number // 专辑数量
  musicSize: number // 单曲数量
}
export interface GetArtistAlbumRes {
  artist: Artist
  code: number
  hotAlbums: Array<{
    alias: string[]
    artist: Artist
    artists: Array<Artist>
    awardTags: string[]
    blurPicUrl: string
    company: string // 公司
    companyId: number
    description: string
    id: number // 专辑id
    name: string
    picUrl: string // 封面图片
  }>
  more: boolean
}

interface GetIntelliganceListRes {
  code: number
  message: string
  data: {
    id: number; // 根对象ID
    alg: string; // 算法
    recommended: boolean; // 这个字段表示如果为false则表示当前歌曲是“已喜欢”列表里的，false则反之
    songInfo: GetMusicDetailData | null; // 歌曲信息
  }[]
}

// 获取喜欢音乐列表ids
export const getLikeMusicListIds = (uid: number) =>
    request<{uid: number}, {checkPoint: number, code: number,ids: number[]}>(`/likelist?uid=${uid}`, 'get')

// 获取用户歌单信息
export const getUserPlayList = (uid: number) => request<{ uid: string }, GetUserPlayListRes>(`/user/playlist?uid=${uid}`, 'get')

// 获取歌单所有歌曲   最多只能获取十首
export const getUserPlayListMusic = (id: number) => request(`/playlist/track/all?id=${id}&limit=10&offset=0`, 'get')

// 获取音乐url
export const getMusicUrl = (id: number) =>
    request<string, GetMusicUrlRes>(`/song/url/v1?id=${id}&level=lossless`, 'get')

// 获取歌单详情  可以获取歌单全部歌曲
export const getPlayListDetail = (id: number) =>
    request<{ id: number }, GetPlayListDetailRes>(`/playlist/detail?id=${id}`, 'get')

// 获取歌曲详情
export const getMusicDetail = (ids: string) =>
    request<string, GetMusicDetailRes>(`/song/detail?ids=${ids}`, 'get')

// 对歌单添加或删除歌曲
export const addOrDelPlaylist = (op: 'add' | 'del', pid: number, tracks: number) =>
    request('/playlist/tracks', {op, pid, tracks})

// 喜欢音乐
export const likeMusicApi = (id: number, like: boolean = true) =>
    request<{id: number, like: boolean}, {code: number
      playlistId: number
      songs: GetMusicDetailData[]}>('/like', {id, like} ,'get')

// 获取歌词
export const getLyric = (id: number | string) => request<{id: number}, GetLyricRes>(`/lyric/new?id=${id}`, 'get')

// 获取云盘歌曲
export const getUserCloud = (limit?: number, offset?: number) =>
  request <{ limit: number, offset: number }, GetUserCloudRes>
  ('/user/cloud', 'get', {params: {limit, offset}})

// 获取歌手专辑
export const getArtistAlbum = (id: number, limit?: number) =>
    request<{id: number, limit: number}, GetArtistAlbumRes>('/artist/album', 'get', {params: {id, limit}})

// 获取专辑内容
export const getAlbumContent = (id: number) => request(`/album?id=${id}`, 'get')

// 获取歌曲评论
// 0: 歌曲 1: mv 2: 歌单 3: 专辑 4: 电台节目 5: 视频 6: 动态 7: 电台
export const getCommentMusic = (id: number, type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7, pageNo: number, pageSize?: number, sortType?: 1 | 2 | 3, cursor?: number) =>
    request('/comment/new', 'get', {params: {id, type, pageNo, pageSize, sortType, cursor}})

export const getRecordSong = (limit = 200) => request('/record/recent/song', {
  limit: limit,
})

// 心动模式/智能播放
export const getIntelliganceList = (pid: number, id: number, sid: number) => request<{pid: number, id: number, sid: number}, GetIntelliganceListRes>(`/playmode/intelligence/list?pid=${pid}&id=${id}&sid=${sid}`, 'get')


