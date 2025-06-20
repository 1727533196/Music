<script setup lang="ts">
import { onMounted, ref, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useMusicAction } from '@/store/music'
import { getUserAccountFn } from '@/utils/userInfo'
import { useFlags } from '@/store/flags'
import Header from '@/layout/BaseHeader/index.vue'
import Aside from '@/layout/BaseAside/index.vue'
import Bottom from '@/layout/BaseBottom/index.vue'
import MusicDetail from '@/components/MusicDetail/index.vue'
import MusicPlayer, { MusicPlayerInstanceType } from '@/components/MusicPlayer/index.vue'
import Login from '@/components/Login/index.vue'
import { useUserInfo } from '@/store'
import PlayListDrawer from '@/components/PlayListDrawer/index.vue'
import '@/utils/shortcutKey'
import { useSettings } from '@/store/settings'
import { useContextMenu } from './components/ContextMenu/useContextMenu'

const audioInstance = ref<MusicPlayerInstanceType>()
const login = ref()
const music = useMusicAction()
const flags = useFlags()
const route = useRoute()
const store = useUserInfo()
const settings = useSettings()
const refresh = ref(0) // 登录完成后强制刷新组件
store.loadCache()

// 创建并提供全局菜单状态
const { MENU_KEY, activeMenu, setActiveMenu } = useContextMenu()
provide(MENU_KEY, { activeMenu, setActiveMenu })
// 初始化全局属性
onMounted(() => {
  if (audioInstance.value !== undefined) {
    window.$audio = audioInstance.value!
    console.log('初始化全局$audio：', window.$audio)
  }
  window.$login = login.value!
  document.addEventListener('click', () => {
    flags.isOpenDrawer = false
  })

  if (settings.state.bold) {
    document.body.classList.add('bold')
  }
})
store.addEvent('login', () => {
  refresh.value = refresh.value + 1
})
getUserAccountFn()
</script>

<template>
  <div id="opacity-bg" style="position: fixed; width: 100%; height: 100%; transition: 0.5s"></div>
  <div id="opacity-bg1" style="position: fixed; width: 100%; height: 100%; transition: 0.5s"></div>
  <MusicDetail v-model="flags.isOpenDetail" />
  <PlayListDrawer v-model="flags.isOpenDrawer" />
  <div style="height: 100%; position: relative; z-index: auto">
    <div id="box">
      <Aside></Aside>
      <div class="main">
        <Header></Header>
        <div class="body">
          <router-view v-slot="{ Component }">
            <component :key="refresh" :is="Component"></component>
          </router-view>
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </div>
  <Bottom :class="[music.state.musicUrl.length ? 'bottom-show' : 'bottom-visible']">
    <template #default>
      <teleport :disabled="!flags.isOpenDetail" to=".music-detail-container .music-detail-bottom">
        <MusicPlayer
          ref="audioInstance"
          @cutSong="music.cutSongHandler"
          @playEnd="music.playEnd"
          :songs="music.state?.songs"
          :src="music.state.musicUrl"
        ></MusicPlayer>
      </teleport>
    </template>
  </Bottom>
  <Login ref="login"></Login>
</template>

<style lang="less">
@import '@/assets/base.less';

.bottom-show {
  visibility: visible;
  opacity: 1;
}
.bottom-visible {
  visibility: hidden;
  opacity: 0;
}
</style>
