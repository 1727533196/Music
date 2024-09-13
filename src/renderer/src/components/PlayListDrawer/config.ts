import {GetMusicDetailData} from "@/api/musicList";
import {formattingTime} from "@/utils";
import {h} from "vue";

export const columns = [
  {
    title: '',
    prop: 'name',
    picUrl: 'al.picUrl',
    width: '90%',
    class: 'title',
    type: 'title',
  },
  {
    title: '',
    prop: 'dt',
    width: '10%',
    class: 'time',
    processEl: (createVNode: typeof h, data: GetMusicDetailData) => {
      return formattingTime(data.dt)
    }
  },
]
