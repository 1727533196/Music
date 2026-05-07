<script setup lang="ts" name="Home">
import { computed, onMounted, ref } from 'vue'
import ArtistBanner from './components/ArtistBanner.vue'
import SongsSection from './components/SongsSection.vue'
import VideoSection from './components/VideoSection.vue'
import AlbumsSection from './components/AlbumsSection.vue'
import MixSection from './components/MixSection.vue'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { playListState } from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import type { GetMusicDetailData } from '@/api/musicList'
import { personalized, recommendSongList, type Recommend } from '@/api/home'
import { getRecordSong } from '@/api/musicList'

// Song Info
const songInfo = {
  name: "Modernism",
  artist: "Some Nice Girls",
  album: "Album Name Here",
  duration: "3:45",
  releaseDate: "2019.08.21",
  playCount: "1,234,567"
}

// 使用现有的 usePlayList hook
const { getRecommendSongs } = usePlayList()
const music = useMusicAction()

// 转换 API 数据为组件所需格式（复用 SongList 的数据格式）
const dailySongs = computed(() => {
  return playListState.playList
})

// 视频数据（使用最近播放记录模拟）
const videos = ref<any[]>([])

// 专辑数据（从推荐歌单中获取）
const albums = ref<any[]>([])

// 歌单数据（Mix）
const mixes = ref<any[]>([])

// 播放歌曲 - 使用 store 中的 getMusicUrlHandler
const handlePlay = (item: GetMusicDetailData, index?: number) => {
  console.log('item', item, index)
  music.getMusicUrlHandler(item)
}

// 喜欢歌曲
const handleLike = (item: GetMusicDetailData) => {
  console.log('Like:', item)
}

const handleShare = () => {
  console.log('Share')
}

const handleNavigate = (direction: 'prev' | 'next') => {
  console.log('Navigate:', direction)
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
      mixes.value = personalizedRes.result.slice(0, 6).map(item => ({
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

    // 设置 Video 数据（使用最近播放的歌曲封面作为视频缩略图）
    if (recordRes.data && recordRes.data.list) {
      videos.value = recordRes.data.list.slice(0, 3).map((item: any) => ({
        id: item.data.id,
        title: item.data.name,
        thumbnail: item.data.al?.picUrl || '',
        artist: item.data.ar?.map((a: any) => a.name).join(' / ') || '未知艺术家',
        playTime: new Date(item.data.time).toLocaleDateString()
      }))
    }
  } catch (error) {
    console.error('Failed to load home data:', error)
  }
})
</script>

<template>
  <div class="home-container">
    <!-- Song Banner -->
    <ArtistBanner
      @play="handlePlay"
      @like="handleLike"
      @share="handleShare"
    />

    <!-- Content Area -->
    <div class="content-area pa-6">
      <div class="content-grid">
        <!-- Left Column: Songs -->
        <div class="left-column">
          <SongsSection
            title="每日推荐"
            :songs="dailySongs"
            @play="handlePlay"
            @like="handleLike"
            @navigate="handleNavigate"
          />
          <AlbumsSection
            title="推荐专辑"
            :albums="albums"
            @play="handlePlay"
            @like="handleLike"
            @navigate="handleNavigate"
          />
        </div>

        <!-- Right Column: Video & Others -->
        <div class="right-column">
          <VideoSection
            title="精选视频"
            :videos="videos"
            @play="handlePlay"
            @navigate="handleNavigate"
          />

          <MixSection
            title="精选歌单"
            :mixes="mixes"
            @play="handlePlay"
            @like="handleLike"
            @navigate="handleNavigate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.content-area {
  min-height: 500px;
}

.content-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  min-height: 600px;

  .left-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 8px;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }

  .right-column {
    padding-left: 8px;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}
</style>
