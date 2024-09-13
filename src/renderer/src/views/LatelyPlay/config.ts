import {formatDate} from "@/utils";
import {Columns} from "@/components/SongList/index.vue";
import {GetMusicDetailData, GetPlayListDetailRes} from "@/api/musicList";

export const columns: Columns[] = [
  {
    title: '#',
    width: '45px',
    type: 'index',
    class: 'empty',
    style: {
      position: 'relative',
    }
  },
  {
    title: '标题',
    prop: 'name',
    picUrl: 'al.picUrl',
    width: '45%',
    class: 'title',
    type: 'title',
    lazy: true,
  },
  {
    title: '专辑',
    prop: 'al.name', // 嵌套取值
    width: '35%',
    class: 'album',
    type: 'album',
  },
  {
    title: '操作',
    width: '45px',
    type: 'handle',
    class: 'handle',
    icon: ['love'],
  },
  {
    title: '播放时间',
    width: '130px',
    class: 'time',
    processEl: (h, data: GetMusicDetailData) => {
      return formatDate(data.playTime, 'MM-DD hh:mm:ss')
    }
  },
]

export const playListMock: GetPlayListDetailRes['playlist'] = {
  id: 9999998, // 歌单id
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
