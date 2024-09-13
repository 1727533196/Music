import { defineStore } from "pinia";

// 这里通常标记一些状态
export const useFlags = defineStore("flagsId", {
  state: () => {
    return {
      isMaximize: false, // 是否是最大化状态
      isMinimize: false, // 是否是最小化状态
      isOpenDetail: false, // 是否打开歌曲详情页面
      isOpenSearch: false, // 搜索框是否被打开
      maxCount: 0, // 页面层级, 前进返回使用
      isOpenDrawer: false, // 播放列表抽屉是否打开
    }
  },
})