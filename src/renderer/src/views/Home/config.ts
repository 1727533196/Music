import Individual from './components/individual.vue'
import Custom from './components/Custom.vue'
import RankingList from './components/RankingList.vue'
import SongMenu from './components/SongMenu.vue'
import Singer from './components/Singer.vue'
import NewestMusic from './components/NewestMusic.vue'

export const tabsConfig = [
  {
    label: '个性推荐',
    name: 'individual',
    component: Individual
  },
  {
    label: '专属定制',
    name: 'custom',
    component: Custom
  },
  {
    label: '歌单',
    name: 'songMenu',
    component: SongMenu
  },
  {
    label: '排行榜',
    name: 'rankingList',
    component: RankingList
  },
  {
    label: '歌手',
    name: 'singer',
    component: Singer
  },
  {
    label: '最新音乐',
    name: 'newestMusic',
    component: NewestMusic
  },
]