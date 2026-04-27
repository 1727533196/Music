import { formattingTime } from '@/utils'
import { Columns } from '@/components/SongList/index.vue'
import { GetMusicDetailData } from '@/api/musicList'

export const columns: Columns[] = [
  {
    title: '#',
    width: '45px',
    type: 'index',
    class: 'empty',
    style: {
      position: 'relative'
    }
  },
  {
    title: '标题',
    prop: 'name',
    picUrl: 'al.picUrl',
    width: '45%',
    class: 'title',
    type: 'title',
    lazy: true
  },
  {
    title: '专辑',
    prop: 'al.name', // 嵌套取值
    width: '35%',
    class: 'album',
    type: 'album'
  },
  {
    title: '操作',
    width: '45px',
    type: 'handle',
    class: 'handle',
    icon: ['love']
  },
  {
    title: '时长',
    prop: 'dt',
    width: '10%',
    class: 'time',
    processEl: (h, data: GetMusicDetailData) => {
      return formattingTime(data.dt)
    }
  }
]
