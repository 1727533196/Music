import request from "@/utils/request";

export type Profile = {
  avatarUrl: string // 用户头像
  backgroundUrl: string // 用户背景图片
  nickname: string // 用户昵称
  createTime: number
  vipType: number
  userId: number // 用户id
  followeds: number // 粉丝数量
  newFollows: number // 关注数量
  eventCount: number // 动态数量
  gender: number // 性别 0:保密 1:男性 2:女性
  province: number // 省份id
  city: number // 城市id
  signature: string // 用户签名
}
export interface getUserAccountRes {
  account: {
    anonimousUser: boolean // 是否匿名用户
    createTime: number
    vipType: number
    id: number // 用户id
  }
  code: number
  profile: Profile
}

export type User = {
  userId: number
  signature: string // 签名
  userName: string
  nickname: string // 账号昵称
  vipType: number // vip类型
  userType: number
  backgroundUrl: string // 用户背景
  avatarUrl: string // 用户头像
}
export interface getArtistDetailRes {
  message: string,
  data: {
    artist: {
      albumSize: number
      alias: string[] // 歌手化名
      avatar: string // 歌手头像
      briefDesc: string
      cover: string
      id: number
      identifyTag: null | any
      identities: string[]
      musicSize: number
      mvSize: number
      name: string
      rank: {rank: number, type: number}
      transNames: any[]
    },
    blacklist: boolean
    eventCount: number
    identify: {
      actionUrl: string // 请求网易云音乐的链接
      imageDesc: string // 标签
      imageUrl: string // 标签图片
    },
    preferShow: number
    secondaryExpertIdentiy: {}[]
    showPriMsg: boolean
    user: undefined | User
    videoCount: number
    vipRights: {}
  },
  code: number,
}

interface getUserDetailRes {
  code: number
  createDays: number
  createTime: number
  level: number // 等级
  profile: Profile
  userPoint: {
    balance: number
    blockBalance: number
    status: number
    updateTime: number
    userId: number
    version: number
  }
}
// 获取用户详情  通过指定的uid获取指定用户详情信息
export const getUserDetail = (uid: number) => request<{uid: number}, getUserDetailRes>(`/user/detail?uid=${uid}`, 'get')

// 获取账号信息
export const getUserAccount = () => request<null, getUserAccountRes>('/user/account', 'get');

// 获取歌手详情
export const getArtistDetail = (id: number) => request<{id: number}, getArtistDetailRes>(`/artist/detail?id=${id}`, 'get')

// 获取用户绑定信息
export const getUserBinding = (uid: number) => request(`/user/binding?uid=${uid}`)












