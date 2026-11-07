<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMusicAction } from '@/store/music'
import { getUserAccountFn } from '@/utils/userInfo'
import { useFlags } from '@/store/flags'
import { usePunchCard } from '@/store/punchCard'
import Header from '@/layout/BaseHeader/index.vue'
import Bottom from '@/layout/BaseBottom/index.vue'
import MusicDetail from '@/components/MusicDetail/index.vue'
import MusicPlayer, { MusicPlayerInstanceType } from '@/components/MusicPlayer/index.vue'
import Login from '@/components/Login/index.vue'
import { useUserInfo } from '@/store'
import PlayListDrawer from '@/components/PlayListDrawer/index.vue'
import PunchCardReminder from '@/components/PunchCardReminder/index.vue'
import MessageHost from '@/components/MessageHost/index.vue'
import UpdateNotice from '@/components/UpdateNotice/index.vue'
import { useUpdates } from '@/store/updates'
import { initializeShortcuts } from '@/utils/shortcutKey'
import { useSettings } from '@/store/settings'
import { useContextMenu } from './components/ContextMenu/useContextMenu'

const audioInstance = ref<MusicPlayerInstanceType>()
const login = ref()
const punchCardRef = ref()
const music = useMusicAction()
const flags = useFlags()
const route = useRoute()
const store = useUserInfo()
const settings = useSettings()
let stopShortcuts: (() => void) | undefined
const updates = useUpdates()
const refresh = ref(0) // 登录完成后强制刷新组件
const bodyRef = ref<HTMLElement | null>(null)
const accountRequired = computed(() => !store.isLogin && ['/cloud', '/lately'].includes(route.path))
const accountPageName = computed(() => (route.path === '/cloud' ? '音乐云盘' : '最近播放'))
watch(
  () => route.fullPath,
  () => bodyRef.value?.scrollTo({ top: 0 }),
  { flush: 'post' }
)
store.loadCache()

// 创建并提供全局菜单状态
const { MENU_KEY, activeMenu, setActiveMenu } = useContextMenu()
provide(MENU_KEY, { activeMenu, setActiveMenu })
// 初始化全局属性
onMounted(() => {
  void updates.connect()
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

  startPunchCardTimer()
  stopShortcuts = initializeShortcuts()
})
store.addEvent('login', () => {
  refresh.value = refresh.value + 1
})
getUserAccountFn()

// ─── 打卡提醒定时器 ──────────────────────────────────────────────
let punchCardTimer: ReturnType<typeof setInterval> | null = null

function startPunchCardTimer(): void {
  const punchCard = usePunchCard()
  // 每分钟检查一次是否需要弹出提醒
  punchCardTimer = setInterval(() => {
    if (punchCard.shouldShowReminder()) {
      punchCardRef.value?.show()
    }
  }, 60000)

  // 启动时立即检查一次
  setTimeout(() => {
    if (punchCard.shouldShowReminder()) {
      punchCardRef.value?.show()
    }
  }, 3000)
}

function stopPunchCardTimer(): void {
  if (punchCardTimer) {
    clearInterval(punchCardTimer)
    punchCardTimer = null
  }
}

onUnmounted(() => {
  updates.disconnect()
  stopPunchCardTimer()
  stopShortcuts?.()
})
</script>

<template>
  <UpdateNotice />
  <div id="opacity-bg" class="app-theme-background"></div>
  <div id="opacity-bg1" class="app-theme-background"></div>
  <MusicDetail v-model="flags.isOpenDetail" />
  <PlayListDrawer v-model="flags.isOpenDrawer" />
  <div id="box" class="app-shell" :class="{ 'has-player': music.state.musicUrl.length > 0 }">
    <div class="main">
      <Header />
      <main
        ref="bodyRef"
        class="body"
        id="main-content"
        aria-label="音乐内容"
        :inert="flags.isOpenDetail"
      >
        <div class="page-view" :class="{ 'page-view-contained': route.path === '/comment' }">
          <section v-if="accountRequired" class="account-required">
            <v-icon
              :icon="route.path === '/cloud' ? 'mdi-cloud-outline' : 'mdi-history'"
              size="48"
            />
            <h1>{{ accountPageName }}</h1>
            <p>
              {{
                route.path === '/cloud'
                  ? '登录后，随时收听你上传的音乐。'
                  : '登录后，找回最近听过的歌曲。'
              }}
            </p>
            <button type="button" @click="login?.show()">登录账号</button>
          </section>
          <router-view v-else v-slot="{ Component }">
            <component :key="refresh" :is="Component"></component>
          </router-view>
        </div>
      </main>
    </div>
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
  <PunchCardReminder ref="punchCardRef"></PunchCardReminder>
  <MessageHost />
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
