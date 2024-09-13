import {formattingTime} from "@/utils";
import {GetMusicDetailData, getMusicUrl} from "@/api/musicList";
import {Columns} from "@/components/SongList/index.vue";
import {Bottom} from "@element-plus/icons-vue";

export const columns: Columns[] = [
  {
    title: '#',
    width: '45px',
    type: 'index',
    class: 'empty',
  },

  {
    title: '标题',
    prop: 'name',
    picUrl: 'al.picUrl',
    width: '40%',
    class: 'title',
    type: 'title',
  },
  {
    title: '专辑',
    prop: 'al.name', // 嵌套取值
    width: '20%',
    class: 'album',
  },
  {
    title: '操作',
    width: '45px',
    type: 'handle',
    class: 'handle',
    icon: ['love'],
  },
  {
    title: '时长',
    prop: 'dt',
    width: '10%',
    class: 'time',
    processEl(h, data: GetMusicDetailData) {
      return formattingTime(data.dt)
    }
  },
  {
    title: '下载',
    width: '10%',
    processEl(h, {id, name}: GetMusicDetailData) {
      return h(Bottom, {
        style: {
          width: '20px', height: '20px', cursor: 'pointer'
        },
        async onClick() {
          const {data} = await getMusicUrl(id)
          const url = data[0].url;
          fetch(url)
            .then(response => response.blob())
            .then(blob => {
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = name+'.mp3';
              link.target = "_blank"; // 可选，如果希望在新窗口中下载文件，请取消注释此行
              link.click();
            });

        }
      })
    },
  },
  {
    title: '热度',
    width: '10%',
    processEl(h, data: GetMusicDetailData) {
      return h('div', {
        style: {overflow: 'hidden', height: '6px', width: '100%', 'border-radius': '5px', 'background-color': '#373737'}
      }, h('div', {
        style: {height: '100%', 'background-color': 'rgba(255,255,255,0.2)', width: `${data.pop}%`}
      }))
    },
  },
]

export const tabsConfig = [
  {
    name: 'song',
    label: '单曲',
  },
  {
    name: 'singer',
    label: '歌手',
  },
  {
    name: 'album',
    label: '专辑',
  },
  {
    name: 'video',
    label: '视频',
  },
  {
    name: 'songList',
    label: '歌单',
  },
  {
    name: 'lyric',
    label: '歌词',
  },
  {
    name: 'podcast',
    label: '播客',
  },
  {
    name: 'voice',
    label: '声音',
  },
  {
    name: 'user',
    label: '用户',
  },
]
