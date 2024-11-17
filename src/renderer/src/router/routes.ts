export default [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/test2',
    name: 'test2',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('@/views/Test/test2.vue')
  },
  {
    path: '/play-list',
    name: 'playList',
    component: () => import('@/views/PlayList/index.vue')
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchList/index.vue')
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/Home/index.vue')
  },
  {
    path: '/fm',
    name: 'fm',
    component: () => import('@/views/PrivateFm/index.vue')
  },
  {
    path: '/video',
    name: 'video',
    component: () => import('@/views/Video/index.vue')
  },
  {
    path: '/follow',
    name: 'follow',
    component: () => import('@/views/Follow/index.vue')
  },
  {
    path: '/local',
    name: 'local',
    component: () => import('@/views/Local/index.vue')
  },
  {
    path: '/lately',
    name: 'lately',
    component: () => import('@/views/LatelyPlay/index.vue')
  },
  {
    path: '/daily-recommend',
    name: 'dailyRecommend',
    component: () => import('@/views/DailyRecommend/index.vue')
  },
  {
    path: '/detail',
    name: 'userDetail',
    component: () => import('@/views/UserDetail/index.vue')
  },
  {
    path: '/cloud',
    name: 'musicCloud',
    component: () => import('@/views/MusicCloud/index.vue')
  },
  {
    path: '/singer-page',
    name: 'singerPage',
    component: () => import('@/views/SingerPage/index.vue')
  },
  {
    path: '/comment',
    name: 'comment',
    component: () => import('@/views/Comment/index.vue')
  },
  {
    path: '/setting',
    name: 'setting',
    component: () => import('@/views/Setting/index.vue')
  },
  {
    path: '/yrc-test',
    name: 'yrcTest',
    component: () => import('@/views/Test/YrcTest.vue')
  },
  {
    path: '/bg-test',
    name: 'bgTest',
    component: () => import('@/views/Test/bgTest.vue')
  },
  {
    path: '/user-cover',
    name: 'userCover',
    component: () => import('@/views/UserCover/index.vue')
  }
]
