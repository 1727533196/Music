<script setup lang="ts" name="Home">
import { computed, onMounted } from 'vue'
import ArtistBanner from './components/ArtistBanner.vue'
import SongsSection from './components/SongsSection.vue'
import VideoSection from './components/VideoSection.vue'
import AlbumsSection from './components/AlbumsSection.vue'
import MixSection from './components/MixSection.vue'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { playListState } from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import type { GetMusicDetailData } from '@/api/musicList'

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

// 组件挂载时获取每日推荐歌曲
onMounted(async () => {
  await getRecommendSongs()
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
        </div>

        <!-- Right Column: Video & Others -->
        <div class="right-column">
          <VideoSection
            title="Video"
            :videos="videos"
            @play="handlePlay"
            @navigate="handleNavigate"
          />

          <AlbumsSection
            title="Albums"
            :albums="albums"
            @play="handlePlay"
            @like="handleLike"
            @navigate="handleNavigate"
          />

          <MixSection
            title="Mix"
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
.home-container {
  min-height: 100vh;
}

.content-area {
  min-height: 500px;
}

.content-grid {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  height: calc(100vh - 400px);
  min-height: 600px;

  .left-column {
    overflow-y: auto;
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
    overflow-y: auto;
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
