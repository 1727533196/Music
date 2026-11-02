<script setup lang="ts" name="Home">
import { computed, onMounted, ref } from 'vue'
import ArtistBanner from './components/ArtistBanner.vue'
import SongsSection from './components/SongsSection.vue'
import RecentSection from './components/RecentSection.vue'
import AlbumsSection from './components/AlbumsSection.vue'
import MixSection from './components/MixSection.vue'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { playListState } from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import type { GetMusicDetailData } from '@/api/musicList'
import { getHighQualityPlaylists, recommendSongList } from '@/api/home'
import { getRecordSong } from '@/api/musicList'
import { playListMock as dailyQueue } from '@/views/DailyRecommend/dailyRecommendSongsConfig'
import { playListMock as recentQueue } from '@/views/LatelyPlay/config'

// 使用现有的 usePlayList hook
const { getRecommendSongs } = usePlayList()
const music = useMusicAction()

// 转换 API 数据为组件所需格式（复用 SongList 的数据格式）
const dailySongs = computed(() => {
  return playListState.playList
})

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

// 组件挂载时获取数据
onMounted(async () => {
  // 各区域独立更新，日推或播放记录请求失败时仍可展示精品歌单。
  const results = await Promise.allSettled([
    getRecommendSongs(),
    loadMixPage(),
    recommendSongList().then(({ recommend }) => {
      albums.value = (recommend || []).map((item) => ({
        id: item.id,
        name: item.name,
        cover: item.picUrl,
        artist: item.creator?.nickname || '未知',
        trackCount: item.trackCount
      }))
    }),
    getRecordSong(10).then(({ data }) => {
      recentSongs.value = (data?.list || []).slice(0, 3).map((item: any) => item.data)
    })
  ])
  const sections = ['每日推荐歌曲', '精选歌单', '每日歌单', '最近播放']
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Failed to load ${sections[index]}:`, result.reason)
    }
  })
})
</script>

<template>
  <div class="home-container">
    <!-- Song Banner -->
    <ArtistBanner @play="handlePlay" @like="handleLike" @share="handleShare" />

    <div class="content-area">
      <div class="listening-row">
        <SongsSection title="每日推荐" :songs="dailySongs" @play="handlePlay" />
        <RecentSection :songs="recentSongs" @play="handleRecentPlay" />
      </div>
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
      <AlbumsSection title="每日歌单" :albums="albums" @like="handleLike" />
    </div>
  </div>
</template>

<style lang="less" scoped>
.content-area {
  --discovery-text: #f2eff5;
  --discovery-muted: #9a96a3;
  --discovery-accent: #e8bdd1;
  container-type: inline-size;
  padding: 16px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 36px;

  .listening-row {
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr);
    gap: 32px;

    > * {
      min-width: 0;
    }
  }
}

@container (max-width: 900px) {
  .content-area .listening-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }
}

@media (max-width: 700px) {
  .content-area {
    padding-inline: 16px;
    gap: 28px;
  }
}
</style>
