<script setup lang="ts" name="Home">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserInfo } from '@/store'
import ArtistBanner from './components/ArtistBanner.vue'
import SongsSection from './components/SongsSection.vue'
import RecentSection from './components/RecentSection.vue'
import AlbumsSection from './components/AlbumsSection.vue'
import MixSection from './components/MixSection.vue'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import type { GetMusicDetailData } from '@/api/musicList'
import { getHighQualityPlaylists, recommendSongList } from '@/api/home'
import { getRecordSong } from '@/api/musicList'
import { playListMock as dailyQueue } from '@/views/DailyRecommend/dailyRecommendSongsConfig'
import { playListMock as recentQueue } from '@/views/LatelyPlay/config'

// 使用现有的 usePlayList hook
const { getRecommendSongs } = usePlayList()
const music = useMusicAction()
const user = useUserInfo()
const router = useRouter()
const homeLoading = ref(false)
const login = () => window.$login?.show()

// 转换 API 数据为组件所需格式（复用 SongList 的数据格式）
const dailySongs = ref<GetMusicDetailData[]>([])

// 最近播放的歌曲
const recentSongs = ref<GetMusicDetailData[]>([])

// 每日推荐歌单
const albums = ref<any[]>([])

// 精品歌单
interface FeaturedMix {
  id: number
  name: string
  cover: string
  description: string
  playCount: number
}
const MIX_FETCH_SIZE = 6
// 接口游标与展示页分开，调整窗口后缓存中的歌单仍可连续翻阅。
const mixItems = ref<FeaturedMix[]>([])
const mixPageSize = ref(6)
const mixHasMore = ref(true)
let mixCursor: number | undefined
let mixLayoutVersion = 0
const mixPage = ref(1)
const mixLoading = ref(false)
const mixError = ref(false)
const mixes = computed(() => {
  const start = (mixPage.value - 1) * mixPageSize.value
  return mixItems.value.slice(start, start + mixPageSize.value)
})
const mixHasNextPage = computed(
  () => mixItems.value.length > mixPage.value * mixPageSize.value || mixHasMore.value
)

const updateMixPageSize = (size: number) => {
  if (mixPageSize.value === size) return
  mixLayoutVersion++
  mixPageSize.value = size
  mixPage.value = 1
}

const loadMixPage = async (page = 1) => {
  if (mixLoading.value || page < 1) return
  const pageSize = mixPageSize.value
  const layoutVersion = mixLayoutVersion
  const start = (page - 1) * pageSize
  const end = start + pageSize
  if (mixItems.value.length >= end || (!mixHasMore.value && mixItems.value.length > start)) {
    mixPage.value = page
    mixError.value = false
    return
  }
  if (!mixHasMore.value) return

  mixLoading.value = true
  mixError.value = false
  try {
    while (mixItems.value.length < end && mixHasMore.value) {
      const before = mixCursor
      const { playlists, more, lasttime } = await getHighQualityPlaylists(MIX_FETCH_SIZE, before)
      const items = playlists || []
      const knownIds = new Set(mixItems.value.map((item) => item.id))
      const added = items.filter((item) => {
        if (knownIds.has(item.id)) return false
        knownIds.add(item.id)
        return true
      })
      mixItems.value.push(
        ...added.map((item) => ({
          id: item.id,
          name: item.name,
          cover: item.coverImgUrl,
          description: `${item.trackCount}首`,
          playCount: item.playCount
        }))
      )
      const cursor = Number(lasttime || items[items.length - 1]?.updateTime)
      const hasCursor = Number.isFinite(cursor) && cursor > 0 && (!before || cursor < before)
      mixCursor = hasCursor ? cursor : undefined
      mixHasMore.value = Boolean(more && added.length && hasCursor)
      // 请求期间窗口变化时，只缓存数据，保留新布局的首页。
      if (layoutVersion !== mixLayoutVersion) return
    }
    // 已到末尾时保留当前页面，避免翻到一页空白。
    if (mixItems.value.length > start) {
      mixPage.value = page
    }
  } catch (error) {
    mixError.value = true
    // 请求层显示错误，保留当前页以便用户再次点击重试。
    console.error('Failed to load 精选歌单:', error)
  } finally {
    mixLoading.value = false
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
const handleLike = (item: GetMusicDetailData) => {
  console.log('Like:', item)
}

const handleShare = () => {
  console.log('Share')
}

let personalRequestVersion = 0
const loadPersonalSections = async () => {
  const version = ++personalRequestVersion
  dailySongs.value = []
  albums.value = []
  recentSongs.value = []
  homeLoading.value = user.isLogin
  if (!user.isLogin) return
  const isCurrent = () => version === personalRequestVersion && user.isLogin
  // 各区域独立更新，日推或播放记录请求失败时仍可展示精品歌单。
  const results = await Promise.allSettled([
    getRecommendSongs().then((data) => {
      if (isCurrent()) dailySongs.value = data.dailySongs || []
    }),
    recommendSongList().then(({ recommend }) => {
      if (!isCurrent()) return
      albums.value = (recommend || []).map((item) => ({
        id: item.id,
        name: item.name,
        cover: item.picUrl,
        artist: item.creator?.nickname || '未知',
        trackCount: item.trackCount
      }))
    }),
    getRecordSong(10).then(({ data }) => {
      if (!isCurrent()) return
      recentSongs.value = (data?.list || []).slice(0, 3).map((item: any) => item.data)
    })
  ])
  const sections = ['每日推荐歌曲', '每日歌单', '最近播放']
  if (isCurrent()) homeLoading.value = false
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Failed to load ${sections[index]}:`, result.reason)
    }
  })
}
watch(() => [user.isLogin, user.profile.userId], loadPersonalSections, { immediate: true })
onBeforeUnmount(() => personalRequestVersion++)
onMounted(() => void loadMixPage())
</script>

<template>
  <div class="home-container">
    <!-- Song Banner -->
    <ArtistBanner
      v-if="dailySongs.length"
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
