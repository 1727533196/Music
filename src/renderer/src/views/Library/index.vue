<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserInfo } from '@/store'
import type { GetUserPlayListRes, PlayList } from '@/api/musicList'
import { deletePlay } from '@/api/play'
import request from '@/utils/request'
import ContextMenu from '@/components/ContextMenu/index.vue'
import SongListCreator from '@/components/SongListCreator.vue'
import fallbackCover from '@/assets/defaultBg.png'

type LibraryFilter = 'all' | 'created' | 'collected'
const store = useUserInfo()
const route = useRoute()
const router = useRouter()
const search = ref('')
const loading = ref(false)
const loadError = ref(false)
const creatorVisible = ref(false)
const deletingId = ref<number | null>(null)
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
const favorite = computed(() => store.userPlayListInfo.find((item) => item.specialType === 5))
const playlists = computed(() => store.userPlayListInfo.filter((item) => item.specialType !== 5))
const collectedCount = computed(() => playlists.value.filter((item) => item.subscribed).length)
const filteredPlaylists = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return playlists.value.filter((item) => {
    if (activeFilter.value === 'created' && item.subscribed) return false
    if (activeFilter.value === 'collected' && !item.subscribed) return false
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
const openFavorites = () => {
  if (favorite.value) openPlaylist(favorite.value)
  else if (!loading.value && !loadError.value) ElMessage.info('喜欢的音乐还未同步，请刷新资料库')
}
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
    ElMessage.success('歌单已删除')
  } catch {
    ElMessage.error('删除失败，请重试')
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
  image.onerror = null
  image.src = fallbackCover
}
</script>

<template>
  <div class="library-page">
    <header class="library-heading">
      <div>
        <p class="eyebrow">我的音乐</p>
        <h1>资料库</h1>
        <p class="heading-caption">喜欢的旋律，留在这里。</p>
      </div>
      <div v-if="store.isLogin" class="heading-actions">
        <button
          class="icon-button refresh-button"
          :disabled="loading"
          aria-label="刷新资料库"
          title="刷新资料库"
          @click="loadLibrary"
        >
          <v-icon icon="mdi-refresh" size="21" :class="{ spinning: loading }" />
        </button>
        <button class="create-button" @click="creatorVisible = true">
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
      <section class="library-shortcuts" aria-label="我的音乐快捷入口">
        <button class="shortcut favorite-shortcut" :disabled="!favorite" @click="openFavorites">
          <span class="shortcut-icon"><v-icon icon="mdi-star" size="27" /></span>
          <span class="shortcut-text"
            ><strong>我喜欢的音乐</strong
            ><span>{{
              favorite ? `${favorite.trackCount || 0} 首歌曲` : loading ? '正在同步…' : '暂未同步'
            }}</span></span
          >
          <v-icon class="shortcut-arrow" icon="mdi-chevron-right" size="21" />
        </button>
        <button class="shortcut" @click="router.push('/lately')">
          <span class="shortcut-icon"><v-icon icon="mdi-history" size="28" /></span>
          <span class="shortcut-text"><strong>最近播放</strong><span>回到熟悉的旋律</span></span>
          <v-icon class="shortcut-arrow" icon="mdi-chevron-right" size="21" />
        </button>
        <button class="shortcut" @click="setFilter('collected')">
          <span class="shortcut-icon"
            ><v-icon icon="mdi-bookmark-multiple-outline" size="26"
          /></span>
          <span class="shortcut-text"
            ><strong>收藏的歌单</strong><span>{{ collectedCount }} 张歌单</span></span
          >
          <v-icon class="shortcut-arrow" icon="mdi-chevron-right" size="21" />
        </button>
      </section>

      <section class="playlist-section" :aria-busy="loading">
        <div class="library-toolbar">
          <div class="library-filters" role="group" aria-label="筛选歌单">
            <button
              v-for="filter in filters"
              :key="filter.key"
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
              placeholder="搜索资料库"
              aria-label="按名称搜索资料库歌单"
            />
          </label>
        </div>
        <div class="section-caption">
          <span>{{ filteredPlaylists.length }} 张歌单</span
          ><span v-if="loading">正在同步资料库…</span>
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
                  ><img
                    :src="item.coverImgUrl || fallbackCover"
                    :alt="item.name"
                    loading="lazy"
                    @error="imageFallback" /><span class="cover-open"
                    ><v-icon icon="mdi-arrow-top-right" size="23" /></span
                ></span>
                <strong :title="item.name">{{ item.name }}</strong>
                <span class="playlist-meta"
                  >{{ item.trackCount || 0 }} 首<span>·</span
                  >{{ item.subscribed ? '已收藏' : '我创建的' }}</span
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
          <div v-for="i in 6" :key="i" class="skeleton-card">
            <div></div>
            <span></span><span></span>
          </div>
        </div>
        <div v-else-if="!loadError" class="library-empty">
          <v-icon :icon="search.trim() ? 'mdi-magnify' : 'mdi-playlist-music-outline'" size="34" />
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
  margin: 0 auto;
  padding: 28px var(--app-gutter, clamp(20px, 3vw, 40px)) 52px;
  color: #f2eff5;
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
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid #e8bdd1;
    outline-offset: 4px;
  }
}
.library-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}
.eyebrow {
  margin: 0 0 8px;
  color: #a19aaa;
  letter-spacing: 0.18em;
  font-size: 11px;
  font-weight: 600;
}
h1 {
  font-size: 32px;
  line-height: 1.2;
  font-weight: 650;
  margin: 0;
  letter-spacing: -0.04em;
}
.heading-caption {
  margin: 10px 0 0;
  color: #a19aaa;
  font-size: 13px;
}
.heading-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.icon-button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #a19aaa;
  background: transparent;
  border: 1px solid #ffffff16;
  border-radius: 50%;
  &:hover {
    color: #f2eff5;
    background: #ffffff08;
  }
}
.create-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 17px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-weight: 600 !important;
  font-size: 13px !important;
}
.create-button {
  background: #e8bdd1;
  color: #30212b;
  &:hover {
    background: #f1d1e0;
  }
}
.secondary-button {
  background: #ffffff09;
  border-color: #ffffff1a;
  color: #e8bdd1;
}
.library-shortcuts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 42px;
}
.shortcut {
  display: flex;
  align-items: center;
  gap: 15px;
  text-align: left;
  min-width: 0;
  padding: 20px;
  border: 1px solid #ffffff0d;
  background: #ffffff04;
  border-radius: 12px;
  color: #f2eff5;
  transition: background 0.18s;
  &:hover {
    background: #ffffff09;
  }
}
.shortcut-icon {
  display: grid;
  place-items: center;
  flex: 0 0 49px;
  height: 49px;
  border-radius: 12px;
  background: #ffffff07;
  color: #c1b9c8;
}
.favorite-shortcut .shortcut-icon {
  background: #e8bdd112;
  color: #e8bdd1;
}
.shortcut-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  strong {
    font-size: 15px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  > span {
    font-size: 12px;
    color: #a19aaa;
  }
}
.shortcut-arrow {
  margin-left: auto;
  color: #82798d;
}
.library-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ffffff0d;
}
.library-filters {
  display: flex;
  gap: 7px;
  button {
    background: transparent;
    border: 0;
    color: #a19aaa;
    font-size: 14px;
    border-radius: 7px;
    padding: 8px 13px;
    white-space: nowrap;
    &:hover {
      color: #f2eff5;
    }
    &.active {
      color: #e8bdd1;
      background: #e8bdd110;
      font-weight: 600;
    }
  }
}
.library-search {
  width: 224px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #82798d;
  border-bottom: 1px solid #ffffff1a;
  padding: 7px 0;
  input {
    min-width: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: #f2eff5;
    font-size: 13px;
    outline: 0;
    &::placeholder {
      color: #82798d;
    }
  }
}
.section-caption {
  display: flex;
  gap: 14px;
  color: #82798d;
  font-size: 12px;
  margin: 17px 0 22px;
}
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 28px 24px;
}
.library-card {
  width: 100%;
  min-width: 0;
  max-width: 210px;
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
  color: #f2eff5;
  strong {
    display: block;
    font-size: 14px;
    font-weight: 550;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 12px 0 5px;
  }
  &:hover .cover-open {
    opacity: 1;
  }
  &:hover .cover-wrap img {
    transform: scale(1.025);
  }
}
.cover-wrap {
  display: block;
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 9px;
  background: #ffffff07;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
  }
}
.cover-open {
  position: absolute;
  inset: auto 9px 9px auto;
  display: grid;
  place-items: center;
  background: #16131acd;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}
.playlist-meta {
  display: flex;
  gap: 7px;
  font-size: 12px;
  color: #a19aaa;
}
.library-error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #e8bdd109;
  border: 1px solid #e8bdd119;
  border-radius: 8px;
  padding: 14px 17px;
  color: #c6b8c3;
  font-size: 13px;
  margin-bottom: 24px;
  button {
    color: #e8bdd1;
    border: 0;
    background: transparent;
    white-space: nowrap;
  }
}
.library-empty {
  min-height: 260px;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #a19aaa;
  h2 {
    color: #f2eff5;
    font-size: 19px;
    font-weight: 600;
    margin: 16px 0 9px;
  }
  p {
    font-size: 13px;
    line-height: 1.8;
    margin: 0 0 22px;
  }
}
.signed-out {
  min-height: 380px;
  border-top: 1px solid #ffffff0d;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border-radius: 22px;
  color: #e8bdd1;
  background: #e8bdd109;
  margin-bottom: 8px;
}
.skeleton-card {
  max-width: 210px;
  div {
    aspect-ratio: 1;
    border-radius: 9px;
    background: #ffffff07;
  }
  span {
    display: block;
    height: 11px;
    margin-top: 14px;
    border-radius: 4px;
    width: 75%;
    background: #ffffff07;
    &:last-child {
      width: 42%;
      margin-top: 9px;
    }
  }
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 900px) {
  .shortcut {
    padding: 16px 13px;
    gap: 10px;
  }
  .shortcut-icon {
    flex-basis: 40px;
    height: 40px;
  }
  .shortcut-arrow {
    display: none;
  }
}
@media (max-width: 650px) {
  .library-page {
    padding-top: 22px;
  }
  .library-heading {
    gap: 12px;
  }
  .library-shortcuts {
    gap: 8px;
    margin-bottom: 28px;
  }
  .shortcut {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px 12px;
  }
  .shortcut-text strong {
    font-size: 13px;
  }
  .shortcut-text > span {
    font-size: 11px;
  }
  .library-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .library-search {
    width: 100%;
  }
  .library-filters {
    gap: 4px;
    button {
      padding: 8px 10px;
    }
  }
  .library-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 24px 16px;
  }
  .create-button {
    padding: 9px 12px;
  }
  .heading-actions {
    gap: 8px;
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
