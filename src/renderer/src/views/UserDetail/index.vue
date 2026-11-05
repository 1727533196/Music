<script setup lang="ts" name="detail">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { province } from 'province-city-china/data'
import UserDetailCard from '@/components/UserDetailCard/index.vue'
import UserDetailList from '@/components/UserDetailList/index.vue'
import { getUserDetail, type Profile } from '@/api/user'
import { getUserPlayList, type PlayList } from '@/api/musicList'
import { list } from './config'
import { useUserInfo } from '@/store'
import { useTheme } from '@/store/theme'

type TabsName = 'createSongList' | 'collectSongList' | 'createSpecial'
const route = useRoute()
const router = useRouter()
const store = useUserInfo()
const theme = useTheme()
const userId = computed(() => {
  const value = typeof route.query.uid === 'string' ? Number(route.query.uid) : 0
  return Number.isSafeInteger(value) && value > 0 ? value : 0
})
const state = reactive({
  userInfo: null as Profile | null,
  identify: { level: 0 },
  allPlayList: [] as PlayList[]
})
const activeName = ref<TabsName>('createSongList')
const profileLoading = ref(false)
const playlistLoading = ref(false)
const profileError = ref(false)
const playlistError = ref(false)
let profileVersion = 0
let playlistVersion = 0
const location = computed(
  () => (province.find((item) => +item.code === state.userInfo?.province) || {}).name || '未知'
)
const playList = computed(() =>
  state.allPlayList.filter((item) => {
    if (activeName.value === 'createSpecial') return false
    const creatorId = Number(item.creator?.userId)
    const isCreated =
      creatorId > 0
        ? creatorId === userId.value
        : userId.value === store.profile.userId
          ? !item.subscribed
          : !item.ordered
    return activeName.value === 'createSongList' ? isCreated : !isCreated
  })
)
async function loadProfile() {
  const uid = userId.value
  if (!uid || profileLoading.value) return
  const version = ++profileVersion
  profileLoading.value = true
  profileError.value = false
  try {
    const { profile, level } = await getUserDetail(uid)
    if (version !== profileVersion || uid !== userId.value) return
    if (!profile?.userId) throw new Error('Missing user profile')
    state.userInfo = profile
    state.identify = { level }
    theme.change(profile.avatarUrl)
  } catch {
    if (version === profileVersion) profileError.value = true
  } finally {
    if (version === profileVersion) profileLoading.value = false
  }
}
async function loadPlaylists() {
  const uid = userId.value
  if (!uid || playlistLoading.value) return
  const version = ++playlistVersion
  playlistLoading.value = true
  playlistError.value = false
  try {
    const { playlist } = await getUserPlayList(uid)
    if (version !== playlistVersion || uid !== userId.value) return
    if (!Array.isArray(playlist)) throw new Error('Missing user playlists')
    state.allPlayList = playlist
  } catch {
    if (version === playlistVersion) playlistError.value = true
  } finally {
    if (version === playlistVersion) playlistLoading.value = false
  }
}
const refresh = () => {
  void loadProfile()
  void loadPlaylists()
}
watch(
  userId,
  () => {
    profileVersion++
    playlistVersion++
    state.userInfo = null
    state.allPlayList = []
    activeName.value = 'createSongList'
    profileLoading.value = playlistLoading.value = false
    profileError.value = playlistError.value = false
    refresh()
  },
  { immediate: true }
)
watch(
  () => store.userPlayListInfo,
  (playlists) => {
    if (!userId.value || userId.value !== store.profile.userId) return
    playlistVersion++
    state.allPlayList = playlists
    playlistError.value = playlistLoading.value = false
  }
)
onBeforeUnmount(() => {
  profileVersion++
  playlistVersion++
})
</script>

<template>
  <div class="user-detail-container">
    <section v-if="!userId" class="page-state" role="status">
      <v-icon icon="mdi-account-question-outline" size="34" />
      <h1>无法打开个人主页</h1>
      <p>请从用户头像或账户菜单重新进入。</p>
      <button type="button" @click="router.back()">返回上一页</button>
    </section>
    <template v-else>
      <div class="page-actions">
        <button
          type="button"
          class="refresh-button"
          :disabled="profileLoading || playlistLoading"
          @click="refresh"
        >
          <v-icon icon="mdi-refresh" size="16" />{{
            profileLoading || playlistLoading ? '刷新中…' : '刷新'
          }}
        </button>
      </div>
      <UserDetailCard
        v-if="state.userInfo"
        :location="location"
        :identify="state.identify"
        :user-info="state.userInfo"
      />
      <div
        v-else-if="profileLoading"
        class="profile-skeleton"
        role="status"
        aria-label="正在加载用户信息"
      >
        <span class="skeleton-avatar"></span>
        <div><span></span><span></span><span></span></div>
      </div>
      <div v-if="profileError" class="inline-error profile-error" role="status">
        <span>{{
          state.userInfo ? '用户信息刷新失败，已保留当前内容。' : '暂时无法加载用户信息。'
        }}</span>
        <button type="button" :disabled="profileLoading" @click="loadProfile">重试</button>
      </div>
      <div v-if="playlistError" class="inline-error playlist-error" role="status">
        <span>{{
          state.allPlayList.length ? '歌单刷新失败，已保留当前内容。' : '暂时无法加载歌单。'
        }}</span>
        <button type="button" :disabled="playlistLoading" @click="loadPlaylists">重试</button>
      </div>
      <UserDetailList
        v-if="!playlistError || state.allPlayList.length"
        v-model="activeName"
        :playList="playList"
        :list="list"
        :userId="userId"
        :loading="playlistLoading && !state.allPlayList.length"
      />
    </template>
  </div>
</template>

<style lang="less" scoped>
.user-detail-container {
  position: relative;
}
.page-actions {
  display: flex;
  justify-content: flex-end;
  padding: 14px var(--app-gutter) 0;
  margin-bottom: -8px;
}
.refresh-button,
.inline-error button,
.page-state button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: var(--app-text);
    background: var(--app-surface);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 20px var(--app-gutter);
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.7;
  button {
    flex-shrink: 0;
    color: var(--app-accent);
  }
}
.page-state {
  display: flex;
  min-height: 330px;
  padding: 50px var(--app-gutter);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--app-muted);
  text-align: center;
  h1 {
    color: var(--app-text);
    font-size: 20px;
    font-weight: 600;
  }
  p {
    font-size: 13px;
    line-height: 1.7;
  }
}
.profile-skeleton {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 28px var(--app-gutter) 30px;
  .skeleton-avatar {
    width: 152px;
    height: 152px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--app-surface);
  }
  > div {
    flex: 1;
    min-width: 0;
    span {
      display: block;
      width: 70%;
      max-width: 320px;
      height: 14px;
      margin: 16px 0;
      border-radius: 5px;
      background: var(--app-surface);
      &:first-child {
        width: 45%;
        height: 27px;
      }
      &:last-child {
        width: 55%;
      }
    }
  }
}
@media (max-width: 650px) {
  .profile-skeleton {
    gap: 18px;
    .skeleton-avatar {
      width: 96px;
      height: 96px;
    }
  }
}
@media (max-width: 420px) {
  .profile-skeleton {
    gap: 14px;
    .skeleton-avatar {
      width: 72px;
      height: 72px;
    }
  }
}
</style>
