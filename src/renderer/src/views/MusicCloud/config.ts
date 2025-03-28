import { formattingTime } from '@/utils'
import { Columns } from '@/components/SongList/index.vue'
import { GetMusicDetailData } from '@/api/musicList'

export const columns: Columns[] = [
  {
    title: '#',
    width: '45px',
    type: 'index',
    class: 'empty'
  },
  {
    title: '标题',
    prop: 'name',
    picUrl: 'al.picUrl',
    width: '55%',
    class: 'title',
    type: 'title'
  },
  {
    title: '专辑',
    width: '25%',
    class: 'album',
    processEl(h, data) {
      return h('div', (data.al || {}).name || data.album || '未知专辑')
    }
  },
  {
    title: '时间',
    prop: 'dt',
    width: '15%',
    class: 'time',
    processEl: (h, data: GetMusicDetailData) => {
      return formattingTime(data.dt)
    }
  }
]
