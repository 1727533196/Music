import {GetMusicDetailData, GetPlayListDetailRes} from "@/api/musicList";


export const playListMock: GetPlayListDetailRes['playlist'] = {
  id: 9999999, // 歌单id
  name: '', // 歌单名称
  coverImgUrl: '', // 歌单封面图片
  userId: 0, // 创建歌单的用户id
  updateTime: 0,
  createTime: 0, // 创建时间
  specialType: 300,
  playCount: 0, // 播放量
  trackCount: 30, //歌单下歌曲总数
  tags: [],
  creator: { // 创建这个歌单的用户信息
    nickname: '',
    userId: 0,
    avatarUrl: '',
    userType: 4,
    vipType: 11,
  },
  subscribed: false, // 是否收藏
  subscribedCount: 0, // 收藏总数
  tracks: [] as GetMusicDetailData[],
}