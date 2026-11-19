<script setup lang="ts">
import { computed, onMounted, onActivated, onDeactivated, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfo } from '@/store'
import { useSettings } from '@/store/settings'
import { clearBannerAppearance } from '@/utils/bannerAppearance'
import ArtistBanner from './components/ArtistBanner.vue'
import SongsSection from './components/SongsSection.vue'
import RecentSection from './components/RecentSection.vue'
import AlbumsSection from './components/AlbumsSection.vue'
import MixSection from './components/MixSection.vue'
import { useMusicAction } from '@/store/music'
import type { GetMusicDetailData } from '@/api/musicList'
import { getHighQualityPlaylists, recommendSongList, recommendSong } from '@/api/home'
import { getRecordSong } from '@/api/musicList'
import {
  homeCacheKey,
  readHomeCache,
  writeHomeCache,
  clearHomePersonalCache
} from '@/utils/homeCache'
import { playListMock as dailyQueue } from '@/views/DailyRecommend/dailyRecommendSongsConfig'
import { playListMock as recentQueue } from '@/views/LatelyPlay/config'

defineOptions({ name: 'Home' })

const music = useMusicAction()
const user = useUserInfo()
const settings = useSettings()
const router = useRouter()
const bannerAppearanceKey = computed(() =>
  homeCacheKey(
    settings.state.baseUrl,
    user.isLogin ? String(user.profile.userId || 'guest') : 'guest',
    'banner'
  )
)
const homeLoading = ref(false)
const pageActive = ref(true)
const login = () => window.$login?.show()
const dailySongs = ref<GetMusicDetailData[]>([])
const dailyRefreshToken = ref(0)
const dailyRefreshing = ref(false)
const recentSongs = ref<GetMusicDetailData[]>([])
interface HomeAlbum {
  id: number
  name: string
  cover: string
  artist: string
  trackCount: number
}
interface FeaturedMix {
  id: number
  name: string
  cover: string
  description: string
  playCount: number
}
interface CachedMixes {
  items: FeaturedMix[]
  cursor?: number
  hasMore: boolean
}
const albums = ref<HomeAlbum[]>([])
const MIX_FETCH_SIZE = 6
const mixItems = ref<FeaturedMix[]>([])
const mixPageSize = ref(6)
const mixHasMore = ref(true)
let mixCursor: number | undefined
let mixLayoutVersion = 0
const mixPage = ref(1)
const mixLoading = ref(false)
const mixError = ref(false)
const personalError = ref(false)
const mixes = computed(() => {
  const start = (mixPage.value - 1) * mixPageSize.value
  return mixItems.value.slice(start, start + mixPageSize.value)
})
const mixHasNextPage = computed(
  () => mixItems.value.length > mixPage.value * mixPageSize.value || mixHasMore.value
)
// 每个区域只在成功响应后写入；服务未就绪时保留已有画面。
const quietRequest = { silentError: true, timeout: 6000 }
const retryDelays = [1000, 2000, 4000, 8000, 15000, 30000]
let retryTimer: ReturnType<typeof setTimeout> | undefined
let retryAttempt = 0
let contextVersion = 0
let active = true
let server = ''
let account = ''
let personalInFlight = false
let lastFailedMixPage = 1
let needsMixRefresh = true
const pendingPersonal = new Set<'songs' | 'albums' | 'recent'>()
const cacheKey = (section: string, publicData = false) =>
  homeCacheKey(server, publicData ? 'public' : account, section)
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object'
const validSong = (value: unknown): value is GetMusicDetailData =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  Number.isFinite(value.id) &&
  typeof value.name === 'string' &&
  typeof value.dt === 'number' &&
  isRecord(value.al) &&
  typeof value.al.picUrl === 'string' &&
  Array.isArray(value.ar) &&
  value.ar.every((artist) => isRecord(artist) && typeof artist.name === 'string')
const validSongs = (value: unknown): value is GetMusicDetailData[] =>
  Array.isArray(value) && value.length <= 60 && value.every(validSong)
const validAlbums = (value: unknown): value is HomeAlbum[] =>
  Array.isArray(value) &&
  value.length <= 60 &&
  value.every(
    (item) =>
      isRecord(item) &&
      typeof item.id === 'number' &&
      Number.isFinite(item.id) &&
      typeof item.name === 'string' &&
      typeof item.cover === 'string' &&
      typeof item.artist === 'string' &&
      typeof item.trackCount === 'number'
  )
const validMixes = (value: unknown): value is CachedMixes =>
  isRecord(value) &&
  Array.isArray(value.items) &&
  value.items.length <= 12 &&
  typeof value.hasMore === 'boolean' &&
  (value.cursor === undefined ||
    (typeof value.cursor === 'number' && Number.isFinite(value.cursor))) &&
  value.items.every(
    (item) =>
      isRecord(item) &&
      typeof item.id === 'number' &&
      Number.isFinite(item.id) &&
      typeof item.name === 'string' &&
      typeof item.cover === 'string' &&
      typeof item.description === 'string' &&
      typeof item.playCount === 'number'
  )

function scheduleRetry() {
  if (
    !active ||
    !pageActive.value ||
    retryTimer ||
    (!mixError.value && !personalError.value) ||
    retryAttempt >= retryDelays.length
  )
    return
  retryTimer = setTimeout(() => {
    retryTimer = undefined
    void refreshFailed()
  }, retryDelays[retryAttempt++])
}

const updateMixPageSize = (size: number) => {
  if (mixPageSize.value === size) return
  mixLayoutVersion++
  mixPageSize.value = size
  mixPage.value = 1
}

const loadMixPage = async (page = 1, refresh = false) => {
  if (mixLoading.value || page < 1 || !active || !pageActive.value) return
  const version = contextVersion
  const pageSize = mixPageSize.value
  const layoutVersion = mixLayoutVersion
  const start = (page - 1) * pageSize
  const end = start + pageSize
  if (
    !refresh &&
    (mixItems.value.length >= end || (!mixHasMore.value && mixItems.value.length > start))
  ) {
    mixPage.value = page
    mixError.value = false
    return
  }
  if (!refresh && !mixHasMore.value) return
  mixLoading.value = true
  // 刷新失败时保持旧列表和游标；不能在请求发出前清空缓存。
  const items = refresh ? [] : [...mixItems.value]
  let cursor = refresh ? undefined : mixCursor
  let hasMore = refresh || mixHasMore.value
  try {
    while (items.length < end && hasMore) {
      const before = cursor
      const response = await getHighQualityPlaylists(MIX_FETCH_SIZE, before, quietRequest)
      if (!active || version !== contextVersion) return
      if (!Array.isArray(response.playlists)) throw new Error('Invalid featured playlists')
      const knownIds = new Set(items.map((item) => item.id))
      const added = response.playlists.filter((item) => {
        if (knownIds.has(item.id)) return false
        knownIds.add(item.id)
        return true
      })
      items.push(
        ...added.map((item) => ({
          id: item.id,
          name: item.name,
          cover: item.coverImgUrl,
          description: item.trackCount + '首',
          playCount: item.playCount
        }))
      )
      const nextCursor = Number(
        response.lasttime || response.playlists[response.playlists.length - 1]?.updateTime
      )
      const hasCursor =
        Number.isFinite(nextCursor) && nextCursor > 0 && (!before || nextCursor < before)
      cursor = hasCursor ? nextCursor : undefined
      hasMore = Boolean(response.more && added.length && hasCursor)
    }
    mixItems.value = items
    mixCursor = cursor
    mixHasMore.value = hasMore
    mixError.value = false
    needsMixRefresh = false
    if (refresh) writeHomeCache(cacheKey('mixes', true), { items, cursor, hasMore })
    if (layoutVersion === mixLayoutVersion && items.length > start) mixPage.value = page
  } catch (error) {
    if (version !== contextVersion || !active) return
    mixError.value = true
    lastFailedMixPage = page
    console.warn('首页精选歌单暂时无法更新，保留缓存', error)
  } finally {
    if (version === contextVersion && active) {
      mixLoading.value = false
      scheduleRetry()
    }
  }
}
const navigateMixes = (direction: 'prev' | 'next') => {
  void loadMixPage(mixPage.value + (direction === 'prev' ? -1 : 1))
}

// 同步当前区域的播放队列，确保下一首和自动连播仍在这组歌曲中。
const playFromList = (
  item: GetMusicDetailData,
  songs: GetMusicDetailData[],
  source: typeof dailyQueue,
  name: string
) => {
  const tracks = songs.length ? [...songs] : [item]
  const index = Math.max(
    0,
    tracks.findIndex((song) => song.id === item.id)
  )
  const queue = { ...source, name, tracks, trackCount: tracks.length }
  music.updateRuntimeList(
    queue,
    tracks.map((song) => song.id)
  )
  music.getMusicUrlHandler(item, index)
}

const handlePlay = (item: GetMusicDetailData) => {
  playFromList(item, dailySongs.value, dailyQueue, '每日推荐')
}

const handleRecentPlay = (item: GetMusicDetailData) => {
  playFromList(item, recentSongs.value, recentQueue, '最近播放')
}

// 喜欢歌曲
const handleLike = (item?: unknown) => {
  console.log('Like:', item)
}

const handleShare = () => {
  console.log('Share')
}

const loadPersonalSections = async () => {
  if (!active || !pageActive.value || !account || personalInFlight || !pendingPersonal.size) return
  personalInFlight = true
  homeLoading.value = true
  const version = contextVersion
  const isCurrent = () => active && version === contextVersion
  if (pendingPersonal.has('songs')) dailyRefreshing.value = true
  const save = (section: 'songs' | 'albums' | 'recent', data: unknown) => {
    pendingPersonal.delete(section)
    writeHomeCache(cacheKey(section), data)
  }
  await Promise.allSettled(
    [...pendingPersonal].map(async (section) => {
      if (section === 'songs') {
        try {
          const { data } = await recommendSong(quietRequest)
          if (!validSongs(data?.dailySongs)) throw new Error('Invalid daily songs')
          if (isCurrent()) {
            dailySongs.value = data.dailySongs
            dailyRefreshToken.value++
            save(section, data.dailySongs)
          }
        } finally {
          if (isCurrent()) dailyRefreshing.value = false
        }
      } else if (section === 'albums') {
        const { recommend } = await recommendSongList(quietRequest)
        if (!Array.isArray(recommend)) throw new Error('Invalid recommended albums')
        const items = recommend.slice(0, 60).map((item) => ({
          id: item.id,
          name: item.name,
          cover: item.picUrl,
          artist: item.creator?.nickname || '未知',
          trackCount: item.trackCount
        }))
        if (!validAlbums(items)) throw new Error('Invalid recommended album data')
        if (isCurrent()) {
          albums.value = items
          save(section, items)
        }
      } else {
        const { data } = await getRecordSong(10, quietRequest)
        if (!Array.isArray(data?.list)) throw new Error('Invalid recent songs')
        const songs = data.list.slice(0, 3).map((item) => item.data)
        if (!validSongs(songs)) throw new Error('Invalid recent song data')
        if (isCurrent()) {
          recentSongs.value = songs
          save(section, songs)
        }
      }
    })
  )
  if (!isCurrent()) return
  personalInFlight = false
  homeLoading.value = false
  personalError.value = pendingPersonal.size > 0
  scheduleRetry()
}

async function refreshFailed() {
  if (!active || !pageActive.value) return
  const version = contextVersion
  await Promise.all([
    mixError.value || needsMixRefresh
      ? loadMixPage(needsMixRefresh ? 1 : lastFailedMixPage, needsMixRefresh)
      : Promise.resolve(),
    loadPersonalSections()
  ])
  if (version !== contextVersion || !active) return
  if (!mixError.value && !personalError.value) {
    retryAttempt = 0
    clearTimeout(retryTimer)
    retryTimer = undefined
  }
}
function retryHome() {
  clearTimeout(retryTimer)
  retryTimer = undefined
  retryAttempt = 0
  void refreshFailed()
}
function onReconnect() {
  // 返回窗口/标签页时重新拉取，缓存只用于首屏，不当作刷新冷却。
  // focus、visibilitychange 连续到达时合并到当前请求，避免重复拉取。
  if (!active || !pageActive.value || document.hidden || homeLoading.value || mixLoading.value)
    return
  needsMixRefresh = true
  if (account) {
    pendingPersonal.add('songs')
    pendingPersonal.add('albums')
    pendingPersonal.add('recent')
  }
  retryHome()
}
function onVisibilityChange() {
  if (!document.hidden) onReconnect()
}
watch(
  () => [settings.state.baseUrl, user.isLogin ? user.profile.userId : null] as const,
  ([baseUrl, id]) => {
    const nextAccount = typeof id === 'number' && id > 0 ? String(id) : ''
    if (account && !nextAccount) {
      clearHomePersonalCache(server, account)
      clearBannerAppearance(cacheKey('banner'))
    }
    contextVersion++
    clearTimeout(retryTimer)
    retryTimer = undefined
    retryAttempt = 0
    server = baseUrl
    account = nextAccount
    dailyRefreshToken.value = 0
    dailyRefreshing.value = false
    personalInFlight = false
    homeLoading.value = false
    personalError.value = false
    mixLoading.value = false
    mixError.value = false
    needsMixRefresh = true
    mixPage.value = 1
    mixCursor = undefined
    mixHasMore.value = true
    dailySongs.value = []
    albums.value = []
    recentSongs.value = []
    mixItems.value = []
    pendingPersonal.clear()
    const featured = readHomeCache(cacheKey('mixes', true), validMixes)
    if (featured) {
      mixItems.value = featured.data.items
      mixCursor = featured.data.cursor
      mixHasMore.value = featured.data.hasMore
    }
    if (account) {
      const songs = readHomeCache(cacheKey('songs'), validSongs)
      const recommendations = readHomeCache(cacheKey('albums'), validAlbums)
      const recent = readHomeCache(cacheKey('recent'), validSongs)
      if (songs) {
        dailySongs.value = songs.data
      }
      if (recommendations) {
        albums.value = recommendations.data
      }
      if (recent) {
        recentSongs.value = recent.data
      }
      pendingPersonal.add('songs')
      pendingPersonal.add('albums')
      pendingPersonal.add('recent')
    }
    void refreshFailed()
  },
  { immediate: true }
)
let disposeServerStatus: (() => void) | undefined
onMounted(() => {
  window.addEventListener('online', onReconnect)
  window.addEventListener('focus', onReconnect)
  document.addEventListener('visibilitychange', onVisibilityChange)
  disposeServerStatus = window.electron?.ipcRenderer.on(
    'server:status',
    (_event, status: { running: boolean }) => {
      try {
        if (
          status?.running &&
          ['localhost', '127.0.0.1', '[::1]'].includes(new URL(server).hostname)
        )
          retryHome()
      } catch {
        /* 自定义地址仍可通过网络恢复或手动重试。 */
      }
    }
  )
})
let hasActivated = false
onActivated(() => {
  pageActive.value = true
  // 初次挂载已由账号监听加载；之后返回只更新数据，不重建页面。
  if (hasActivated) onReconnect()
  hasActivated = true
})
onDeactivated(() => {
  pageActive.value = false
  clearTimeout(retryTimer)
  retryTimer = undefined
})
onBeforeUnmount(() => {
  active = false
  contextVersion++
  clearTimeout(retryTimer)
  disposeServerStatus?.()
  window.removeEventListener('online', onReconnect)
  window.removeEventListener('focus', onReconnect)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div class="home-container">
    <!-- Song Banner -->
    <ArtistBanner
      v-if="dailySongs.length"
      :key="bannerAppearanceKey"
      :songs="dailySongs"
      :appearance-key="bannerAppearanceKey"
      :active="pageActive"
      :refresh-token="dailyRefreshToken"
      :refreshing="dailyRefreshing"
      @play="handlePlay"
      @like="handleLike"
      @share="handleShare"
    />
    <section v-else class="home-welcome" :aria-busy="homeLoading">
      <span class="welcome-icon"><v-icon icon="mdi-music-note" size="36" /></span>
      <div>
        <p class="welcome-caption">{{ homeLoading ? '正在为你准备音乐' : '为每一天，找到旋律' }}</p>
        <h1>{{ user.isLogin ? '今天，听点什么？' : '从一首好歌开始。' }}</h1>
        <p>
          {{
            user.isLogin
              ? '看看精选歌单，发现下一首喜欢的歌。'
              : '登录后，收听每日推荐，找回你的音乐收藏。'
          }}
        </p>
      </div>
      <button v-if="!homeLoading && !user.isLogin" type="button" @click="login">
        登录账号<v-icon icon="mdi-arrow-right" size="17" />
      </button>
    </section>

    <div class="content-area">
      <RecentSection v-if="recentSongs.length" :songs="recentSongs" @play="handleRecentPlay" />
      <SongsSection
        v-if="dailySongs.length"
        title="每日推荐"
        :songs="dailySongs"
        @play="handlePlay"
      />
      <MixSection
        title="精选歌单"
        :mixes="mixes"
        :page="mixPage"
        :has-next-page="mixHasNextPage"
        :loading="mixLoading"
        :error="mixError"
        @navigate="navigateMixes"
        @retry="loadMixPage(mixPage)"
        @page-size-change="updateMixPageSize"
        @like="handleLike"
      />
      <AlbumsSection v-if="user.isLogin" title="每日歌单" :albums="albums" @like="handleLike" />
      <button type="button" class="library-link" @click="router.push('/library')">
        <v-icon icon="mdi-music-box-multiple-outline" size="20" />
        <span>回到资料库，听听你的收藏</span>
        <v-icon icon="mdi-arrow-right" size="18" />
      </button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.home-container {
  --discovery-text: var(--app-text, #f2eff5);
  --discovery-muted: var(--app-muted, #a19aaa);
  --discovery-accent: var(--app-accent, #e8bdd1);
  width: 100%;
  padding: 24px var(--app-gutter) 16px;
  :deep(.artist-banner) {
    margin: 0 0 var(--app-section-gap);
  }
}
.content-area {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--app-section-gap);
}
.home-welcome {
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 180px;
  margin-bottom: var(--app-section-gap);
  padding: 28px 0 32px;
  border-bottom: 1px solid var(--app-border);
  .welcome-icon {
    display: grid;
    place-items: center;
    flex: 0 0 64px;
    height: 64px;
    border: 1px solid var(--app-accent-border);
    border-radius: 18px;
    background: var(--app-accent-soft);
    color: var(--app-accent);
  }
  h1 {
    margin: 6px 0 8px;
    color: var(--app-text);
    font-size: var(--app-title-size);
    font-weight: 650;
  }
  p {
    color: var(--app-muted);
    font-size: 13px;
    line-height: 1.7;
  }
  .welcome-caption {
    color: var(--app-muted);
    font-size: 12px;
  }
  button {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;
    height: var(--app-control-height);
    padding: 0 15px;
    border-radius: var(--app-control-radius);
    color: var(--app-on-accent);
    background: var(--app-accent);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
}
.library-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 0;
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 13px;
  cursor: pointer;
  &:hover {
    color: var(--app-accent);
  }
}
.library-link:focus-visible,
.home-welcome button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 4px;
}
@media (max-width: 700px) {
  .content-area {
    gap: 28px;
  }
  .home-welcome {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 14px;
    padding: 16px 0 24px;
  }
  .home-welcome h1 {
    font-size: 26px;
  }
  .home-welcome button {
    margin-left: 84px;
  }
}
@media (max-height: 720px) {
  .home-container {
    padding-top: 20px;
    :deep(.artist-banner) {
      margin-bottom: 20px;
    }
  }
  .content-area {
    gap: 20px;
  }
}
</style>
