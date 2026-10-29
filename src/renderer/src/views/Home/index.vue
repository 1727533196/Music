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
import { personalized, recommendSongList, type Recommend } from '@/api/home'
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

// 专辑数据（从推荐歌单中获取）
const albums = ref<any[]>([])

// 歌单数据（Mix）
const mixes = ref<any[]>([])

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
  await getRecommendSongs()

  // 获取推荐歌单
  try {
    const [personalizedRes, recommendRes, recordRes] = await Promise.all([
      personalized(),
      recommendSongList(),
      getRecordSong(10)
    ])

    // 设置 Mix 数据（个性化推荐歌单）
    if (personalizedRes.result) {
      mixes.value = personalizedRes.result.slice(0, 6).map((item) => ({
        id: item.id,
        name: item.name,
        cover: item.picUrl,
        description: `${item.trackCount}首`,
        playCount: item.playCount
      }))
    }

    // 设置 Album 数据（每日推荐歌单）
    if (recommendRes.recommend) {
      albums.value = recommendRes.recommend.slice(0, 6).map((item: Recommend) => ({
        id: item.id,
        name: item.name,
        cover: item.picUrl,
        artist: item.creator?.nickname || '未知',
        trackCount: item.trackCount
      }))
    }

    recentSongs.value = (recordRes.data?.list || []).slice(0, 3).map((item: any) => item.data)
  } catch (error) {
    console.error('Failed to load home data:', error)
  }
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
      <MixSection title="精选歌单" :mixes="mixes" @like="handleLike" />
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
