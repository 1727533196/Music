<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute} from "vue-router";
import {useMusicAction} from "@/store/music";
import {getUserAccountFn} from "@/utils/userInfo"
import {useFlags} from "@/store/flags";
import Header from '@/layout/BaseHeader/index.vue'
import Aside from '@/layout/BaseAside/index.vue'
import Bottom from '@/layout/BaseBottom/index.vue'
import MusicDetail from '@/components/MusicDetail/index.vue'
import MusicPlayer, {MusicPlayerInstanceType} from '@/components/MusicPlayer/index.vue'
import Login from '@/components/Login/index.vue'
import {useUserInfo} from "@/store";
import PlayListDrawer from '@/components/PlayListDrawer/index.vue'
import '@/utils/shortcutKey'

const audioInstance = ref<MusicPlayerInstanceType>()
const login = ref()
const music = useMusicAction()
const flags = useFlags()
const route = useRoute()
const store = useUserInfo()
const refresh = ref(0) // 登录完成后强制刷新组件
// 初始化全局属性
onMounted(() => {
  if(audioInstance.value !== undefined) {
    window.$audio = audioInstance.value!
    console.log('初始化全局$audio：', window.$audio)
  }
  window.$login = login.value!
  document.addEventListener('click', () => {
    flags.isOpenDrawer = false
  })
})
getUserAccountFn().then(() => {
  refresh.value = refresh.value + 1
})

</script>

<template>
  <div id="opacity-bg" style="position: fixed;width: 100%;height: 100%;transition: 0.5s"></div>
  <div id="opacity-bg1" style="position: fixed;width: 100%;height: 100%;transition: 0.5s"></div>
  <MusicDetail v-model="flags.isOpenDetail"/>
  <PlayListDrawer v-model="flags.isOpenDrawer"/>
  <div style="height: 100%;position: relative;z-index: auto">
    <div id="box">
      <Aside></Aside>
      <div class="main">
        <Header></Header>
        <div class="body">
          <router-view v-slot="{Component}">
            <!--          <keep-alive>-->
            <component :key="refresh" :is="Component"></component>
            <!--          </keep-alive>-->
          </router-view>
        </div>
      </div>
    </div>
    <div style="height: 20px"></div>
  </div>
  <Bottom :class="[music.state.musicUrl.length ? 'bottom-show' : 'bottom-visible']">
    <teleport :disabled="!flags.isOpenDetail" to=".music-detail-container .test">
      <MusicPlayer
        ref="audioInstance"
        @cutSong="music.cutSongHandler"
        @playEnd="music.playEnd"
        :songs="music.state?.songs"
        :src="music.state.musicUrl"
      ></MusicPlayer>
    </teleport>
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
