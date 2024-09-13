import 'vue-router'

declare module 'vue-router' {
  interface LocationQuery {
    uid?: number // 用户id
    key?: string // 搜索关键字
    id: number // 歌单歌曲id
    count: number // 当前分页
  }
}
