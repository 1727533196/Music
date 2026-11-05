<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { message } from '@/utils/message'
import { useUserInfo } from '@/store'
import type { GetUserPlayListRes, PlayList } from '@/api/musicList'
import { deletePlay } from '@/api/play'
import request from '@/utils/request'
import ContextMenu from '@/components/ContextMenu/index.vue'
import SongListCreator from '@/components/SongListCreator.vue'

type LibraryFilter = 'all' | 'created' | 'collected'
const store = useUserInfo()
const route = useRoute()
const router = useRouter()
const search = ref('')
const loading = ref(false)
const loadError = ref(false)
const creatorVisible = ref(false)
const deletingId = ref<number | null>(null)
const failedCovers = ref(new Set<string>())
let requestVersion = 0
const filters: { key: LibraryFilter; label: string }[] = [
  { key: 'all', label: '全部歌单' },
  { key: 'created', label: '我创建的' },
  { key: 'collected', label: '我收藏的' }
]
const activeFilter = computed<LibraryFilter>(() => {
  const value = route.query.filter
  return value === 'created' || value === 'collected' ? value : 'all'
})
const playlists = computed(() => [
  ...store.userPlayListInfo
    .filter((item) => item.specialType === 5)
    .map((item) => ({ ...item, name: '我喜欢的音乐' })),
  ...store.userPlayListInfo.filter((item) => item.specialType !== 5)
])
const filteredPlaylists = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return playlists.value.filter((item) => {
    if (activeFilter.value === 'created' && item.specialType !== 5 && item.subscribed) return false
    if (activeFilter.value === 'collected' && (item.specialType === 5 || !item.subscribed))
      return false
    return !query || item.name.toLocaleLowerCase().includes(query)
  })
})
const emptyTitle = computed(() => {
  if (search.value.trim()) return '没有找到匹配的歌单'
  if (activeFilter.value === 'created') return '还没有创建歌单'
  if (activeFilter.value === 'collected') return '还没有收藏歌单'
  return '你的歌单，从这里开始'
})
const login = () => window.$login?.show()
const setFilter = (filter: LibraryFilter) => {
  const query = { ...route.query }
  if (filter === 'all') delete query.filter
  else query.filter = filter
  router.replace({ path: '/library', query })
}
const openPlaylist = (item: PlayList) => router.push({ path: '/play-list', query: { id: item.id } })
const canDelete = (item: PlayList) =>
  !item.subscribed &&
  item.specialType !== 5 &&
  Number(item.creator?.userId ?? item.userId) === Number(store.profile.userId)
const menuItems = (item: PlayList) => [
  { label: '打开歌单', value: 'open' },
  ...(canDelete(item) ? [{ label: '删除歌单', value: 'delete' }] : [])
]

const loadLibrary = async () => {
  const uid = store.profile.userId
  if (!store.isLogin || !uid || deletingId.value !== null) return
  const version = ++requestVersion
  loading.value = true
  loadError.value = false
  try {
    const all: PlayList[] = []
    const ids = new Set<number>()
    let offset = 0
    let hasMore = true
    while (hasMore) {
      const response = await request<
        { uid: number; limit: number; offset: number },
        GetUserPlayListRes
      >('/user/playlist', { uid, limit: 100, offset }, 'get')
      if (version !== requestVersion || store.profile.userId !== uid || !store.isLogin) return
      if (!Array.isArray(response.playlist)) throw new Error('Invalid playlist response')
      let added = 0
      for (const item of response.playlist) {
        if (ids.has(item.id)) continue
        ids.add(item.id)
        all.push(item)
        added++
      }
      hasMore = !!response.more && added > 0
      offset += response.playlist.length
    }
    store.updateUserPlayList(all)
  } catch (error) {
    if (version === requestVersion) loadError.value = true
    console.error('加载资料库失败', error)
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

const handleMenu = async (action: { value: string }, item: PlayList) => {
  if (action.value === 'open') return openPlaylist(item)
  if (action.value !== 'delete' || !canDelete(item) || deletingId.value !== null) return
  try {
    await ElMessageBox.confirm(`确定删除“${item.name}”吗？此操作无法撤销。`, '删除歌单', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      closeOnClickModal: false
    })
  } catch {
    return
  }
  if (!store.isLogin || !canDelete(item)) return
  const uid = store.profile.userId
  requestVersion++
  loading.value = false
  deletingId.value = item.id
  try {
    await deletePlay([String(item.id)])
    if (store.profile.userId !== uid || !store.isLogin) return
    store.updateUserPlayList(store.userPlayListInfo.filter((playlist) => playlist.id !== item.id))
    message.success('歌单已删除')
  } catch {
    message.error('删除失败，请重试')
  } finally {
    deletingId.value = null
  }
}

watch(
  () => [store.isLogin, store.profile.userId],
  () => {
    requestVersion++
    loading.value = false
    loadError.value = false
    search.value = ''
    creatorVisible.value = false
    if (store.isLogin && store.profile.userId) void loadLibrary()
  },
  { immediate: true }
)
watch(creatorVisible, (visible, wasVisible) => {
  if (wasVisible && !visible && store.isLogin) void loadLibrary()
})
onBeforeUnmount(() => {
  requestVersion++
})
const imageFallback = (event: Event) => {
  const image = event.target as HTMLImageElement
  const src = image.getAttribute('src')
  if (src) failedCovers.value.add(src)
}
</script>

<template>
  <div class="library-page">
    <header class="library-heading">
      <div class="heading-title">
        <h1>资料库</h1>
        <span v-if="store.isLogin" class="heading-count" role="status" aria-live="polite">
          {{ loading && !playlists.length ? '正在同步…' : `${filteredPlaylists.length} 张歌单` }}
        </span>
      </div>
      <div v-if="store.isLogin" class="heading-actions">
        <button
          type="button"
          class="history-button"
          aria-label="最近播放"
          title="最近播放"
          @click="router.push('/lately')"
        >
          <v-icon icon="mdi-history" size="20" /><span>最近播放</span>
        </button>
        <button
          type="button"
          class="icon-button refresh-button"
          :disabled="loading"
          :aria-busy="loading"
          aria-label="刷新资料库"
          title="刷新资料库"
          @click="loadLibrary"
        >
          <v-icon icon="mdi-refresh" size="21" :class="{ spinning: loading }" />
        </button>
        <button type="button" class="create-button" @click="creatorVisible = true">
          <v-icon icon="mdi-plus" size="19" /><span>新建歌单</span>
        </button>
      </div>
    </header>

    <section v-if="!store.isLogin" class="library-empty signed-out">
      <div class="empty-icon"><v-icon icon="mdi-music-box-multiple-outline" size="36" /></div>
      <h2>把喜欢的音乐放在一起</h2>
      <p>登录后，在这里查看喜欢的音乐、创建和收藏的歌单。</p>
      <button class="create-button" @click="login">登录账号</button>
    </section>

    <template v-else>
      <section class="playlist-section" :aria-busy="loading">
        <div class="library-toolbar">
          <div class="library-filters" role="group" aria-label="筛选歌单">
            <button
              v-for="filter in filters"
              :key="filter.key"
              type="button"
              :class="{ active: activeFilter === filter.key }"
              :aria-pressed="activeFilter === filter.key"
              @click="setFilter(filter.key)"
            >
              {{ filter.label }}
            </button>
          </div>
          <label class="library-search">
            <v-icon icon="mdi-magnify" size="19" />
            <input
              v-model="search"
              type="search"
              placeholder="搜索歌单"
              aria-label="按名称搜索资料库歌单"
            />
          </label>
        </div>
        <div v-if="loadError" class="library-error" role="status">
          <span>{{
            playlists.length
              ? '刷新失败，当前显示已加载的歌单。'
              : '资料库加载失败，请检查网络后重试。'
          }}</span>
          <button :disabled="loading" @click="loadLibrary">重新加载</button>
        </div>

        <div v-if="filteredPlaylists.length" class="library-grid">
          <ContextMenu
            v-for="item in filteredPlaylists"
            :key="item.id"
            :items="menuItems(item)"
            @select="(action) => handleMenu(action, item)"
          >
            <article class="library-card" :class="{ deleting: deletingId === item.id }">
              <button
                class="playlist-link"
                :aria-label="`打开歌单：${item.name}`"
                :disabled="deletingId === item.id"
                @click="openPlaylist(item)"
              >
                <span class="cover-wrap"
                  ><span class="cover-placeholder" aria-hidden="true"
                    ><v-icon icon="mdi-music-note" size="42" /></span
                  ><img
                    v-if="item.coverImgUrl && !failedCovers.has(item.coverImgUrl)"
                    :src="item.coverImgUrl"
                    :alt="item.name"
                    loading="lazy"
                    @error="imageFallback" /><span
                    v-if="item.specialType === 5"
                    class="favorite-badge"
                    aria-hidden="true"
                    ><v-icon icon="mdi-star" size="14" /></span
                  ><span class="cover-open"><v-icon icon="mdi-arrow-top-right" size="23" /></span
                ></span>
                <strong :title="item.name">{{ item.name }}</strong>
                <span class="playlist-meta"
                  >{{ item.trackCount || 0 }} 首<span>·</span
                  >{{ item.specialType !== 5 && item.subscribed ? '已收藏' : '我创建的' }}</span
                >
              </button>
            </article>
          </ContextMenu>
        </div>
        <div
          v-else-if="loading && !playlists.length"
          class="library-grid skeleton-grid"
          aria-label="正在加载歌单"
        >
          <div v-for="i in 12" :key="i" class="skeleton-card">
            <div></div>
            <span></span><span></span>
          </div>
        </div>
        <div v-else-if="!loadError" class="library-empty">
          <div class="empty-icon">
            <v-icon
              :icon="search.trim() ? 'mdi-magnify' : 'mdi-playlist-music-outline'"
              size="30"
            />
          </div>
          <h2>{{ emptyTitle }}</h2>
          <p>
            {{
              search.trim()
                ? '试试其他名称，或清空搜索。'
                : activeFilter === 'collected'
                  ? '在推荐页发现歌单，收藏后就能在这里找到。'
                  : '为喜欢的歌曲创建一张歌单。'
            }}
          </p>
          <button v-if="search.trim()" class="secondary-button" @click="search = ''">
            清空搜索
          </button>
          <button
            v-else-if="activeFilter === 'collected'"
            class="secondary-button"
            @click="router.push('/')"
          >
            去发现音乐
          </button>
          <button v-else class="create-button" @click="creatorVisible = true">新建歌单</button>
        </div>
      </section>
    </template>
    <SongListCreator v-if="store.isLogin" v-model="creatorVisible" />
  </div>
</template>

<style scoped lang="less">
.library-page {
  width: 100%;
  max-width: calc(var(--app-content-width, 1360px) + 2 * var(--app-gutter, 40px));
  margin: 0 auto;
  padding: 28px var(--app-gutter, clamp(20px, 3vw, 40px)) 40px;
  color: var(--app-text);
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
    opacity: 0.45;
  }
  button:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 4px;
  }
}
.library-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 40px;
  margin-bottom: 20px;
}
.heading-title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 14px;
  min-width: 0;
}
.heading-count {
  color: var(--app-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
h1 {
  font-size: var(--app-title-size, clamp(26px, 2.3vw, 32px));
  line-height: 1.2;
  font-weight: 650;
  margin: 0;
  letter-spacing: -0.02em;
}
.heading-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
.history-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: var(--app-control-height, 36px);
  padding: 0 10px;
  border: 0;
  border-radius: var(--app-control-radius, 10px);
  color: var(--app-secondary);
  background: transparent;
  font-size: 13px !important;
  &:hover {
    color: var(--app-text);
    background: var(--app-hover);
  }
}
.icon-button {
  width: var(--app-control-height, 36px);
  height: var(--app-control-height, 36px);
  display: grid;
  place-items: center;
  color: var(--app-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--app-control-radius, 10px);
  &:hover {
    color: var(--app-text);
    background: var(--app-surface);
  }
}
.create-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: var(--app-control-height, 36px);
  padding: 0 15px;
  border-radius: var(--app-control-radius, 10px);
  border: 1px solid transparent;
  font-weight: 600 !important;
  font-size: 13px !important;
}
.create-button {
  background: var(--app-accent);
  color: var(--app-on-accent);
  &:hover {
    background: var(--app-accent-hover);
  }
}
.secondary-button {
  background: var(--app-surface, #ffffff09);
  border-color: var(--app-border, #ffffff14);
  color: var(--app-accent);
}
.library-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 48px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--app-border);
}
.library-filters {
  display: flex;
  align-self: stretch;
  align-items: stretch;
  gap: 24px;
  button {
    position: relative;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--app-muted);
    font-size: 13px;
    min-height: 36px;
    white-space: nowrap;
    &:hover {
      color: var(--app-text);
    }
    &.active {
      color: var(--app-accent);
      font-weight: 600;
      &::after {
        content: '';
        position: absolute;
        right: 0;
        bottom: -13px;
        left: 0;
        height: 2px;
        border-radius: 2px;
        background: var(--app-accent);
      }
    }
  }
}
.library-search {
  width: clamp(180px, 23vw, 260px);
  min-width: 0;
  height: var(--app-control-height, 36px);
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--app-muted);
  border: 1px solid var(--app-border, #ffffff14);
  border-radius: var(--app-control-radius, 10px);
  background: var(--app-surface, #ffffff09);
  padding: 0 11px;
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
  &:focus-within {
    border-color: var(--app-accent-border);
    box-shadow: 0 0 0 2px var(--app-accent-soft);
    color: var(--app-accent);
  }
  input {
    min-width: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--app-text);
    font-size: 13px;
    outline: 0;
    height: 100%;
    &::placeholder {
      color: var(--app-muted);
    }
  }
}
.library-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: start;
  gap: 28px 22px;
}
.library-card {
  width: 100%;
  min-width: 0;
  &.deleting {
    opacity: 0.45;
    pointer-events: none;
  }
}
.playlist-link {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  color: var(--app-text);
  padding: 0;
  border-radius: 11px;
  strong {
    display: block;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 10px 0 3px;
  }
  &:hover .cover-open,
  &:focus-visible .cover-open {
    opacity: 1;
  }
  &:hover .cover-wrap img,
  &:focus-visible .cover-wrap img {
    transform: scale(1.025);
  }
}
.cover-wrap {
  display: block;
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 11px;
  background: var(--app-surface);
  box-shadow: 0 4px 16px #00000012;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid var(--app-hover);
    border-radius: inherit;
    pointer-events: none;
  }
  img {
    position: relative;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
  }
}
.cover-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--app-surface-strong);
  color: var(--app-muted);
  .v-icon {
    opacity: 0.65;
  }
}
.cover-open {
  position: absolute;
  inset: auto 9px 9px auto;
  display: grid;
  place-items: center;
  background: rgba(18, 19, 20, 0.9);
  color: white;
  border: 1px solid #ffffff19;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}
.favorite-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid #ffffff26;
  border-radius: 50%;
  background: rgba(18, 19, 20, 0.72);
  color: white;
}
.playlist-meta {
  display: flex;
  gap: 7px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--app-muted);
}
.library-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: var(--app-accent-soft);
  border: 1px solid var(--app-accent-border);
  border-radius: var(--app-control-radius, 10px);
  padding: 12px 15px;
  color: var(--app-secondary);
  font-size: 13px;
  margin-bottom: 24px;
  button {
    color: var(--app-accent);
    border: 0;
    background: transparent;
    white-space: nowrap;
  }
}
.library-empty {
  min-height: 228px;
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--app-muted);
  h2 {
    color: var(--app-text);
    font-size: 17px;
    font-weight: 550;
    margin: 4px 0 8px;
  }
  p {
    max-width: 360px;
    font-size: 13px;
    line-height: 1.8;
    margin: 0 0 20px;
  }
}
.signed-out {
  min-height: 300px;
  border-top: 1px solid var(--app-border);
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: 1px solid var(--app-accent-border);
  border-radius: 16px;
  color: var(--app-accent);
  background: linear-gradient(145deg, var(--app-accent-soft), transparent);
  margin-bottom: 12px;
}
.skeleton-card {
  width: 100%;
  div {
    aspect-ratio: 1;
    border-radius: 11px;
    background: linear-gradient(
      100deg,
      var(--app-surface) 20%,
      var(--app-hover) 45%,
      var(--app-surface) 70%
    );
    background-size: 240% 100%;
    animation: skeleton-shimmer 1.8s ease-in-out infinite;
  }
  span {
    display: block;
    height: 11px;
    margin-top: 11px;
    border-radius: 4px;
    width: 75%;
    background: var(--app-surface);
    &:last-child {
      width: 42%;
      margin-top: 9px;
    }
  }
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes skeleton-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1199px) {
  .library-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
@media (max-width: 999px) {
  .library-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 759px) {
  .library-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px 18px;
  }
  .history-button {
    width: var(--app-control-height, 36px);
    padding: 0;
  }
  .history-button span {
    display: none;
  }
}
@media (max-width: 650px) {
  .library-page {
    padding-top: 24px;
  }
  .library-heading {
    gap: 12px;
  }
  .library-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .library-search {
    width: 100%;
  }
  .library-filters {
    gap: 24px;
    padding-bottom: 4px;
    button {
      &.active::after {
        bottom: -1px;
      }
    }
  }
  .create-button {
    padding: 0 12px;
  }
  .heading-actions {
    gap: 4px;
  }
}
@media (max-width: 519px) {
  .heading-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  .library-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;
  }
  .playlist-link strong {
    font-size: 13px;
  }
  .playlist-meta {
    gap: 5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .library-page *,
  .library-page *::before,
  .library-page *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
