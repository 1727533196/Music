import request from '@/utils/request'
import type { GetMusicDetailData, PlayList } from '@/api/musicList'

export type Banner = {
  encodeId: string
  imageUrl: string
  scm: string
  song: null
  targetId: number
  targetType: number
  titleColor: string // 右下角背景颜色
  typeTitle: string // 右下角文字
  url: string | null // 网页跳转链接，一般是商品之类的
}
interface BannerRes {
  code: number
  banners: Array<Banner>
}
interface PersonalizedRes {
  category: number
  code: number
  hasTaste: boolean
  result: Array<{
    alg: string
    canDislike: boolean
    copywriter: string
    highQuality: boolean
    id: number
    name: string // 歌单名称
    picUrl: string // 封面图片
    playCount: number // 播放次数
    trackCount: number // 歌单数量
    trackNumberUpdateTime: number // 歌单最后更新时间
    type: number
  }>
}
export interface Recommend {
  alg: string
  copywriter: ''
  createTime: number
  creator: {
    nickname: string
    userId: number
    avatarUrl: string
    userType: 4
    vipType: 11
  }
  id: number
  name: string
  picUrl: string
  playcount: number
  trackCount: number
  type: number
  userId: number
}
interface RecommendSongListRes {
  code: number
  featureFirst: boolean
  haveRcmdSongs: boolean
  recommend: Array<Recommend>
}
interface RecommendSongRes {
  code: number
  data: {
    dailySongs: GetMusicDetailData[]
    recommendReasons: Array<{
      reason: string
      songId: number
    }>
  }
}
interface HighQualityPlaylistsRes {
  code: number
  more: boolean
  lasttime?: number
  playlists: Array<
    Pick<PlayList, 'id' | 'name' | 'coverImgUrl' | 'trackCount' | 'playCount' | 'updateTime'>
  >
}
export const banner = () => request<null, BannerRes>('/banner')

// 获取推荐歌单
export const personalized = () => request<null, PersonalizedRes>('/personalized', 'get')

// 获取精品歌单，供首页精选区域使用
export const getHighQualityPlaylists = (limit = 6, before?: number) =>
  request<{ limit: number; before?: number }, HighQualityPlaylistsRes>(
    '/top/playlist/highquality',
    { limit, before },
    'get'
  )

// 获取每日推荐歌单
export const recommendSongList = () =>
  request<null, RecommendSongListRes>('/recommend/resource', 'get')

// 获取每日推荐歌曲
export const recommendSong = () => request<null, RecommendSongRes>('/recommend/songs', 'get')

export const homepage = () => request('/homepage/block/page', 'get')

export const privatecontent = () => request('/personalized/privatecontent/list', 'get')
