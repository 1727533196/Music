<script setup lang="ts" name="Header">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserInfo } from '@/store'
import { useFlags } from '@/store/flags'
import Search from '@/components/Search/index.vue'
import { handle } from '@/layout/BaseHeader/handle'
import { isElectron, isMacOs } from '@/utils'

const flags = useFlags()
const store = useUserInfo()
const router = useRouter()
const route = useRoute()
const { maximize, unmaximize, minimize, close } = handle()
const accountOpen = ref(false)
const macWindow = isElectron() && isMacOs()
const windowControls = isElectron() && !isMacOs()
const libraryPaths = ['/library', '/play-list', '/lately', '/detail', '/user-cover', '/local']
const activeSection = computed(() => {
  if (libraryPaths.includes(route.path)) return '/library'
  if (route.path === '/cloud') return '/cloud'
  if (route.path === '/home' || route.path === '/') return '/home'
  return ''
})
const navigation = [
  { path: '/home', label: '推荐' },
  { path: '/library', label: '资料库' },
  { path: '/cloud', label: '云盘' }
]
const historyState = computed(() => {
  // Reading the route keeps these buttons in sync after both push and pop navigation.
  route.fullPath
  return router.options.history.state
})
const backIsDisabled = computed(() => !historyState.value.back)
const forwardIsDisabled = computed(() => !historyState.value.forward)
const favoritePlaylist = computed(() =>
  store.userPlayListInfo.find((item) => item.specialType === 5)
)
const accountItems = computed(() => [
  {
    label: '个人主页',
    icon: 'mdi-account-outline',
    to: { path: '/detail', query: { uid: store.profile.userId } }
  },
  {
    label: '我喜欢的音乐',
    icon: 'mdi-star-outline',
    to: favoritePlaylist.value
      ? { path: '/play-list', query: { id: favoritePlaylist.value.id } }
      : { path: '/library' }
  },
  {
    label: '创建的歌单',
    icon: 'mdi-playlist-music-outline',
    to: { path: '/library', query: { filter: 'created' } }
  },
  {
    label: '收藏的歌单',
    icon: 'mdi-bookmark-outline',
    to: { path: '/library', query: { filter: 'collected' } }
  },
  { label: '设置', icon: 'mdi-cog-outline', to: { path: '/setting' } }
])
const gotoSetting = () => {
  flags.isOpenDetail = false
  router.push('/setting')
}
const login = () => window.$login?.show()
watch(
  () => [route.fullPath, flags.isOpenDetail],
  () => {
    accountOpen.value = false
  }
)
</script>

<template>
  <header class="window-container" :class="{ 'mac-window': macWindow }">
    <div class="header-inner">
      <div class="history-controls no-drag" aria-label="浏览历史">
        <button
          class="icon-button"
          type="button"
          aria-label="后退"
          :disabled="backIsDisabled"
          @click="router.back()"
        >
          <el-icon :size="19"><ArrowLeft /></el-icon>
        </button>
        <button
          class="icon-button"
          type="button"
          aria-label="前进"
          :disabled="forwardIsDisabled"
          @click="router.go(1)"
        >
          <el-icon :size="19"><ArrowRight /></el-icon>
        </button>
      </div>
      <nav class="primary-navigation no-drag" aria-label="主导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          class="navigation-link"
          :class="{ active: activeSection === item.path }"
          :aria-current="activeSection === item.path ? 'page' : undefined"
          >{{ item.label }}</RouterLink
        >
      </nav>
      <div class="header-spacer" />
      <Search class="header-search no-drag" />
      <div class="account-controls no-drag">
        <button
          class="icon-button settings-button"
          type="button"
          aria-label="设置"
          title="设置"
          @click="gotoSetting"
        >
          <el-icon :size="21"><Setting /></el-icon>
        </button>
        <v-menu
          v-if="store.isLogin"
          v-model="accountOpen"
          location="bottom end"
          :offset="12"
          :z-index="1900"
        >
          <template #activator="{ props: activatorProps }">
            <button
              v-bind="activatorProps"
              class="avatar-button"
              type="button"
              :aria-label="`${store.profile.nickname || '我的'}账户菜单`"
              :title="store.profile.nickname || '我的账户'"
            >
              <img v-if="store.profile.avatarUrl" :src="store.profile.avatarUrl" alt="" />
              <el-icon v-else :size="20"><User /></el-icon>
            </button>
          </template>
          <div class="account-menu">
            <div class="account-menu-heading">
              <span class="account-eyebrow">我的账户</span>
              <strong>{{ store.profile.nickname || '音乐爱好者' }}</strong>
            </div>
            <v-list
              class="account-menu-list"
              density="compact"
              bg-color="transparent"
              aria-label="账户导航"
            >
              <v-list-item
                v-for="item in accountItems"
                :key="item.label"
                :to="item.to"
                :prepend-icon="item.icon"
                :title="item.label"
                @click="accountOpen = false"
              />
            </v-list>
          </div>
        </v-menu>
        <button v-else class="login-button" type="button" @click="login">
          <el-icon :size="18"><User /></el-icon>
          <span>登录</span>
        </button>
      </div>
      <div v-if="windowControls" class="window-controls no-drag" aria-label="窗口控制">
        <button class="icon-button" type="button" aria-label="最小化" @click="minimize">
          <i class="iconfont icon-weibiaoti-" />
        </button>
        <button
          class="icon-button"
          type="button"
          :aria-label="flags.isMaximize ? '还原窗口' : '最大化'"
          @click="flags.isMaximize ? unmaximize() : maximize()"
        >
          <i :class="['iconfont', flags.isMaximize ? 'icon-3zuidahua-3' : 'icon-3zuidahua-1']" />
        </button>
        <button class="icon-button close-button" type="button" aria-label="关闭窗口" @click="close">
          <i class="iconfont icon-guanbi" />
        </button>
      </div>
    </div>
  </header>
</template>

<style lang="less" scoped>
.window-container {
  position: relative;
  z-index: 120;
  flex-shrink: 0;
  width: 100%;
  height: var(--app-header-height, 88px);
  color: #f2eff5;
  background: rgba(19, 19, 26, 0.94);
  border-bottom: 1px solid rgba(255, 255, 255, 0.055);
  -webkit-app-region: drag;
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: calc(var(--app-content-width, 1360px) + 2 * var(--app-gutter, 32px));
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--app-gutter, 32px);
}
.mac-window .header-inner {
  padding-left: 104px;
}
.history-controls,
.account-controls,
.window-controls {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.icon-button,
.avatar-button,
.login-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  color: #c4bdce;
  background: transparent;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;
  -webkit-app-region: no-drag;
  &:hover {
    color: #f2eff5;
    background: rgba(255, 255, 255, 0.065);
  }
  &:focus-visible {
    outline: 2px solid #e8bdd1;
    outline-offset: 4px;
  }
}
.icon-button {
  width: 32px;
  height: 36px;
  border-radius: 9px;
}
.icon-button:disabled {
  color: #57515f;
  cursor: default;
  background: transparent;
}
.primary-navigation {
  display: flex;
  align-items: center;
  gap: 30px;
  flex-shrink: 0;
  height: 100%;
}
.navigation-link {
  display: inline-flex;
  align-items: center;
  position: relative;
  height: 100%;
  padding: 0 2px;
  color: #a19aaa;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color 160ms ease;
  &:hover {
    color: #f2eff5;
  }
  &:focus-visible {
    outline: 2px solid #e8bdd1;
    outline-offset: 6px;
    border-radius: 4px;
  }
  &.active {
    color: #f2eff5;
  }
  &.active::after {
    content: '';
    position: absolute;
    bottom: 18px;
    left: 2px;
    right: 2px;
    height: 2px;
    background: #e8bdd1;
    border-radius: 2px;
  }
}
.header-spacer {
  flex: 1;
  min-width: 0;
}
.header-search {
  width: clamp(190px, 23vw, 260px);
  flex-shrink: 0;
}
.avatar-button {
  width: 35px;
  height: 35px;
  margin-left: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
}
.avatar-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.login-button {
  gap: 7px;
  min-height: 35px;
  padding: 0 10px;
  border-radius: 18px;
  font-size: 13px;
  white-space: nowrap;
}
.window-controls {
  gap: 0;
  margin-right: -14px;
}
.window-controls .iconfont {
  font-size: 13px;
}
.window-controls .icon-weibiaoti- {
  font-size: 23px;
}
.close-button:hover {
  color: #ffbfc7;
  background: rgba(245, 85, 105, 0.13);
}
.account-menu {
  width: 228px;
  padding: 8px;
  color: #f2eff5;
  background: #22212b;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  box-shadow: 0 20px 65px rgba(0, 0, 0, 0.35);
  -webkit-app-region: no-drag;
}
.account-menu-heading {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.account-eyebrow {
  color: #a19aaa;
  font-size: 11px;
}
.account-menu-heading strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}
.account-menu-list {
  padding: 7px 0 0;
  color: inherit;
}
.account-menu-list :deep(.v-list-item) {
  min-height: 40px;
  padding: 0 11px;
  border-radius: 9px;
}
.account-menu-list :deep(.v-list-item-title) {
  font-size: 13px;
}
.account-menu-list :deep(.v-list-item__prepend > .v-icon) {
  color: #bdb4c6;
  margin-inline-end: 15px;
  font-size: 19px;
}
@media (max-width: 1100px) {
  .header-inner {
    gap: 17px;
    padding-right: 24px;
  }
  .primary-navigation {
    gap: 24px;
  }
}
@media (max-width: 800px) {
  .header-inner {
    gap: 14px;
    padding: 0 20px;
  }
  .mac-window .header-inner {
    padding-left: 90px;
  }
  .history-controls {
    display: none;
  }
  .primary-navigation {
    gap: 20px;
  }
  .header-search {
    width: 180px;
  }
  .settings-button {
    display: none;
  }
}
@media (max-width: 600px) {
  .header-inner {
    gap: 12px;
    padding: 0 16px;
  }
  .mac-window .header-inner {
    padding-left: 82px;
  }
  .primary-navigation {
    gap: 15px;
  }
  .navigation-link {
    font-size: 13px;
  }
  .header-search {
    width: 135px;
  }
  .account-controls {
    gap: 0;
  }
  .login-button {
    padding: 0 5px;
  }
  .login-button span {
    display: none;
  }
  .avatar-button {
    width: 30px;
    height: 30px;
    margin-left: 0;
  }
}
</style>
