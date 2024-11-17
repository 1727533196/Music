import { reactive } from 'vue'
import { PlayList } from '@/api/musicList'

export const paths = [
  '/home',
  '/fm',
  '/video',
  '/follow',
  '/local',
  '/lately',
  '/play-list',
  '/cloud'
]
export type ListItem = {
  name: string
  icon: string
  path: (typeof paths)[number]
  asideFontSize?: number
} & Partial<PlayList>
interface MenuConfig {
  title: '我的音乐' | '创建的歌单' | '收藏的歌单' | false
  mark: 'my' | 'play' | 'subscribedList' | false
  list: ListItem[]
  type?: 'collapsed' | 'tiled'
  isCollapsed?: boolean
}
export const asideFontSize = 14
export const needUseComparisonPaths = [
  '/home',
  '/fm',
  '/video',
  '/follow',
  '/local',
  '/lately',
  '/cloud'
]
export const originAsideMenuConfig: MenuConfig[] = [
  {
    title: false,
    mark: false,
    list: [
      {
        name: '为我推荐',
        icon: 'icon-home-fill',
        path: '/home',
        asideFontSize,
        id: 1
      }
      // {
      //   name: '云音乐精选',
      //   icon: 'icon-headphone-fill',
      //   path: '/fm',
      //   asideFontSize,
      //   id: 2,
      // },
      // {
      //   name: '博客',
      //   icon: '',
      //   path: '/video',
      //   asideFontSize,
      //   id: 3,
      // },
      // {
      //   name: '社区',
      //   icon: '',
      //   path: '/follow',
      //   asideFontSize,
      //   id: 4,
      // },
    ]
  },
  {
    title: false,
    mark: 'my',
    list: [
      // {
      //   name: '本地与下载',
      //   icon: 'icon-xiazaibendi',
      //   path: '/local',
      //   asideFontSize,
      //   id: 5,
      // },
      {
        name: '最近播放',
        icon: 'icon-zuijinlaifang',
        path: '/lately',
        asideFontSize,
        id: 6
      },
      {
        name: '音乐云盘',
        icon: 'icon-headphone-fill',
        path: '/cloud',
        asideFontSize,
        id: 7
      }
    ]
  },
  {
    title: '创建的歌单',
    mark: 'play',
    type: 'collapsed',
    isCollapsed: true,
    list: []
  },
  {
    title: '收藏的歌单',
    mark: 'subscribedList',
    type: 'collapsed',
    isCollapsed: true,
    list: []
  }
]

export const asideMenuConfig = reactive([...originAsideMenuConfig])
