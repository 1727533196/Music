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
const isAccountItemActive = (item: (typeof accountItems.value)[number]) => {
  if (route.path !== item.to.path) return false
  if (item.label === '我喜欢的音乐' && !favoritePlaylist.value) return false
  return Object.entries(item.to.query || {}).every(
    ([key, value]) => String(route.query[key]) === String(value)
  )
}
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
  <header
    class="base-header"
    :class="{
      'mac-window': macWindow,
      'window-container': !flags.isOpenDetail,
      'detail-open': flags.isOpenDetail
    }"
  >
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
      <Search class="header-search no-drag" />
      <div class="account-controls no-drag">
        <button
          class="icon-button settings-button"
          :class="{ 'is-current': route.path === '/setting' }"
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
          :offset="10"
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
          <div class="account-menu no-drag">
            <div class="account-menu-heading">
              <span class="account-menu-avatar">
                <img v-if="store.profile.avatarUrl" :src="store.profile.avatarUrl" alt="" />
                <v-icon v-else icon="mdi-account-outline" size="22" />
              </span>
              <div class="account-identity">
                <span class="account-eyebrow">我的账户</span>
                <strong :title="store.profile.nickname || '音乐爱好者'">
                  {{ store.profile.nickname || '音乐爱好者' }}
                </strong>
              </div>
            </div>
            <v-list
              class="account-menu-list"
              density="compact"
              bg-color="transparent"
              aria-label="账户导航"
            >
              <template v-for="item in accountItems" :key="item.label">
                <div
                  v-if="item.to.path === '/setting'"
                  class="account-menu-divider"
                  role="separator"
                />
                <v-list-item
                  :to="item.to"
                  :prepend-icon="item.icon"
                  :title="item.label"
                  rounded="lg"
                  :active="isAccountItemActive(item)"
                  :aria-current="isAccountItemActive(item) ? 'page' : undefined"
                  @click="accountOpen = false"
                />
              </template>
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
.base-header {
  position: relative;
  z-index: 120;
  flex-shrink: 0;
  width: 100%;
  height: var(--app-header-height, 76px);
  color: var(--app-text);
  background: var(--app-background);
  border-bottom: 1px solid var(--app-border);
}
.base-header.detail-open {
  z-index: 2001;
  visibility: hidden;
  pointer-events: none;
}
.base-header.detail-open .window-controls {
  --app-secondary: rgba(255, 255, 255, 0.65);
  --app-text: #fff;
  --app-border: rgba(255, 255, 255, 0.09);
  --app-danger-text: #fff;
  --app-danger-soft: #c42b1c;
  visibility: visible;
  pointer-events: auto;
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 20px;
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
  color: var(--app-secondary);
  background: transparent;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;
  -webkit-app-region: no-drag;
  &:hover {
    color: var(--app-text);
    background: var(--app-border);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.icon-button {
  width: 32px;
  height: 36px;
  border-radius: 9px;
}
.icon-button:disabled {
  color: var(--app-disabled);
  cursor: default;
  background: transparent;
}
.settings-button.is-current {
  color: var(--app-accent);
  background: var(--app-accent-soft);
}
.primary-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1;
  min-width: max-content;
  height: 100%;
}
.navigation-link {
  display: inline-flex;
  align-items: center;
  position: relative;
  height: 36px;
  padding: 0 12px;
  border-radius: 7px;
  color: var(--app-muted);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color 160ms ease;
  &:hover {
    color: var(--app-text);
    background: var(--app-surface);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
  &.active {
    color: var(--app-text);
  }
  &.active::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 12px;
    right: 12px;
    height: 2px;
    background: var(--app-accent);
    border-radius: 2px;
  }
}
.header-search {
  width: clamp(180px, 22vw, 250px);
  flex-shrink: 0;
  border-color: var(--app-border);
  background: var(--app-surface);
  &:hover {
    border-color: var(--app-border);
  }
  &:focus-within {
    border-color: var(--app-accent-border);
    background: var(--app-surface);
    box-shadow: 0 0 0 3px var(--app-accent-soft);
  }
  :deep(.search) {
    font-size: 13px;
  }
  :deep(.suggest) {
    top: calc(100% + 12px);
    border-color: var(--app-border);
    background: var(--app-panel);
    box-shadow: var(--app-shadow);
    .list {
      margin-top: 16px;
      padding-bottom: 8px;
    }
    .item {
      min-height: 48px;
      height: auto;
      padding-block: 9px;
      &:hover {
        background: var(--app-surface);
      }
      .sort {
        flex: 0 0 20px;
        margin-right: 12px;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .content {
        min-width: 0;
        flex: 1;
        .title {
          display: flex;
          align-items: center;
          gap: 4px;
          .name {
            min-width: 0;
          }
          .score,
          .icon {
            flex-shrink: 0;
          }
        }
      }
      .name,
      .desc {
        display: block;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .name {
        max-width: 100%;
      }
      .desc {
        color: var(--app-muted);
      }
    }
    .item:nth-child(-n + 3) .sort {
      color: var(--app-accent);
    }
    .suggest-box {
      .title {
        font-size: 12px;
        color: var(--app-muted);
      }
      .item {
        min-height: 38px;
      }
    }
  }
}
.avatar-button {
  width: 35px;
  height: 35px;
  margin-left: 7px;
  border-radius: 50%;
  background: var(--app-surface-strong);
  overflow: hidden;
}
.avatar-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-button[aria-expanded='true'] {
  box-shadow:
    0 0 0 2px var(--app-background),
    0 0 0 3px var(--app-accent);
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
  color: var(--app-danger-text);
  background: var(--app-danger-soft);
}
.account-menu {
  width: 248px;
  max-width: calc(100vw - 24px);
  padding: 8px;
  color: var(--app-text);
  background: var(--app-panel);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: var(--app-shadow);
  -webkit-app-region: no-drag;
}
.account-menu-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 4px 6px;
  padding: 10px 4px 16px;
  border-bottom: 1px solid var(--app-border);
}
.account-menu-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 40px;
  height: 40px;
  overflow: hidden;
  border-radius: 50%;
  color: var(--app-muted);
  background: var(--app-surface);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.account-identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.account-eyebrow {
  color: var(--app-muted);
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
  padding: 0;
  color: inherit;
}
.account-menu-list :deep(.v-list-item) {
  min-height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--app-text);
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: -2px;
  }
  &.v-list-item--active {
    color: var(--app-accent);
    background: var(--app-accent-soft);
  }
}
.account-menu-divider {
  margin: 6px 4px;
  border-top: 1px solid var(--app-border);
}
.account-menu-list :deep(.v-list-item--active > .v-list-item__overlay) {
  opacity: 0;
}
.account-menu-list :deep(.v-list-item-title) {
  font-size: 13px;
}
.account-menu-list :deep(.v-list-item__prepend > .v-icon) {
  color: currentColor;
  opacity: 0.65;
  margin-inline-end: 0;
  font-size: 19px;
}
.account-menu-list :deep(.v-list-item__prepend > .v-list-item__spacer) {
  width: 12px;
}
@media (max-width: 1100px) {
  .header-inner {
    gap: 17px;
    padding-right: 24px;
  }
  .primary-navigation {
    gap: 6px;
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
    gap: 4px;
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
    gap: 2px;
  }
  .navigation-link {
    padding-inline: 8px;
    font-size: 13px;
    &.active::after {
      left: 8px;
      right: 8px;
    }
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
@media (max-width: 480px) {
  :global(html:root) {
    --app-header-height: 112px;
  }
  .header-inner {
    flex-wrap: wrap;
    align-content: center;
    gap: 10px 12px;
    padding: 10px 16px;
  }
  .mac-window .header-inner {
    padding-left: 16px;
  }
  .primary-navigation {
    order: 1;
    justify-content: flex-start;
    height: 36px;
    min-width: 0;
  }
  .mac-window .primary-navigation {
    padding-left: 66px;
  }
  .account-controls {
    order: 2;
  }
  .window-controls {
    order: 3;
    margin-right: 0;
  }
  .header-search {
    order: 4;
    flex: 0 0 100%;
    width: 100%;
  }
}
</style>
