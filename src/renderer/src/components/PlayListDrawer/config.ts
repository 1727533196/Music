import { GetMusicDetailData } from '@/api/musicList'
import { formattingTime } from '@/utils'
import { h } from 'vue'
import type { Columns } from '@/components/SongList/index.vue'

export const columns: Columns[] = [
  {
    title: '标题',
    prop: 'name',
    picUrl: 'al.picUrl',
    width: '90%',
    class: 'title',
    type: 'title'
  },
  {
    title: '时长',
    prop: 'dt',
    width: '10%',
    class: 'time',
    processEl: (createVNode: typeof h, data: GetMusicDetailData) => {
      return formattingTime(data.dt)
    }
  }
]
