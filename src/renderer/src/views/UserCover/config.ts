import { GetMusicDetailData } from '@/api/musicList'
import { VIcon } from 'vuetify/components'

export const columns = [
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
    width: '75%',
    class: 'title',
    type: 'title',
    lazy: true
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
      return h('div', [
        h(VIcon, {
          icon: 'mdi-play-outline'
        }),
        data.playCount
      ])
    }
  }
]
