<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { findBestColors, toggleImg } from '@/utils'
import { colorExtraction } from '@/components/MusicDetail/useMusic'
import FluidBackground from '@/components/FluidBackground/index.vue'
import { playListState } from '@/layout/BaseAside/usePlayList'

interface Props {
  // 如果传入了这些属性，则使用传入的值；否则从播放列表随机选取
  name?: string
  artist?: string
  album?: string
  duration?: string
  releaseDate?: string
  playCount?: string
  coverImage?: string
  backgroundImage?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  play: []
  like: []
  share: []
}>()

// 从播放列表中随机选取一首歌曲
const getRandomSong = () => {
  const playlist = playListState.playList
  if (!playlist || playlist.length === 0) return null

  const randomIndex = Math.floor(Math.random() * playlist.length)
  return playlist[randomIndex]
}

// 当前显示的音乐信息
const currentSong = ref<any>(null)
let hasInitialized = false // 标记是否已初始化

// 初始化或更新当前歌曲
const updateCurrentSong = () => {
  // 如果父组件传入了属性，优先使用传入的值
  if (props.name || props.coverImage) {
    currentSong.value = {
      name: props.name,
      artist: props.artist,
      album: props.album,
      duration: props.duration,
      releaseDate: props.releaseDate,
      playCount: props.playCount,
      coverImage: props.coverImage,
      backgroundImage: props.backgroundImage,
    }
    hasInitialized = true
  } else {
    // 否则从播放列表随机选取
    const song = getRandomSong()
    console.log('song', song)

    if (song) {
      currentSong.value = {
        ...song,
        name: song.name,
        artist: song.ar?.map((a: any) => a.name).join(' / ') || '未知艺术家',
        album: song.al?.name || '未知专辑',
        duration: formatDuration(song.dt || 0),
        releaseDate: song.publishTime ? new Date(song.publishTime).toLocaleDateString() : '未知',
        // 网易云接口不返回真实播放次数，使用热度值或推荐理由
        playCount: song.recommendReason || `${song.pop || 0}✨`,
        coverImage: song.al?.picUrl || '',
        backgroundImage: song.al?.picUrl || '',
      }
      hasInitialized = true
    }
  }
}

// 格式化时长（毫秒 -> mm:ss）
const formatDuration = (ms: number) => {
  if (!ms) return '00:00'
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 提取的主色调数组
const mainColors = ref<number[][]>([
  [255, 160, 210],
  [160, 120, 255],
  [255, 210, 130],
  [100, 180, 255],
])

// 从封面图片提取颜色
const extractColorsFromCover = () => {
  const coverUrl = currentSong.value?.coverImage
  if (!coverUrl) return

  toggleImg(coverUrl, '200y200').then((img) => {
    const rgb = colorExtraction(img)
    const colors = findBestColors(rgb, 10) // 提取10色

    if (colors && colors.length > 0) {
      mainColors.value = colors
    }
  })
}

// 监听播放列表变化，数据加载完成后随机选取
watch(
  () => playListState.playList,
  (newList) => {
    // 只在未初始化且列表有数据时执行
    if (!hasInitialized && newList && newList.length > 0) {
      updateCurrentSong()
    }
  },
  { immediate: true, deep: true }
)

// 监听当前歌曲变化
watch(
  () => currentSong.value,
  () => {
    if (currentSong.value) {
      extractColorsFromCover()
    }
  },
  { deep: true }
)

onMounted(() => {
  // 如果父组件传入了属性，立即初始化
  if (props.name || props.coverImage) {
    updateCurrentSong()
  }
  // 否则等待 watch 监听到播放列表数据后自动初始化
})
</script>

<template>
  <v-card class="artist-banner" rounded="xl" elevation="0">
    <div class="banner-background">
      <FluidBackground
        :main-color="mainColors"
        :brightness="0.8"
        class="fluid-bg"
      />
    </div>

    <div class="banner-content d-flex pa-6">
      <!-- Artist Avatar -->
      <v-img
        :src="currentSong?.coverImage"
        cover
        class="artist-avatar"
        rounded="lg"
        max-width="200"
        max-height="200"
      />

      <!-- Song Info -->
      <div class="song-info d-flex flex-column justify-end flex-grow-1 pb-5">
        <div class="text-caption text-medium-emphasis mb-2">
          {{ currentSong?.artist || '未知艺术家' }}
        </div>
        <h1 class="text-h4 font-weight-bold mb-3 text-white">
          {{ currentSong?.name || '未知歌曲' }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 600px; line-height: 1.6;">
          专辑：{{ currentSong?.album || '未知专辑' }}
        </p>

        <div class="d-flex align-center button-group">
          <v-btn
            color="white"
            variant="tonal"
            rounded="pill"
            size="large"
            @click="emit('play', currentSong)"
            class="px-6"
          >
            <v-icon start icon="mdi-play" />
            播放
          </v-btn>
        </div>
      </div>

      <!-- Stats -->
      <div class="song-stats text-right">
        <div class="mb-2">
          <div class="text-caption text-medium-emphasis">时长</div>
          <div class="text-body-1 font-weight-bold">{{ currentSong?.duration || '00:00' }}</div>
        </div>
        <div class="mb-2">
          <div class="text-caption text-medium-emphasis">歌曲热度</div>
          <div class="text-body-1 font-weight-bold">{{ currentSong?.playCount || '0' }}</div>
        </div>
        <div>
          <div class="text-caption text-medium-emphasis">发行日期</div>
          <div class="text-body-1 font-weight-bold">{{ currentSong?.releaseDate || '未知' }}</div>
        </div>
      </div>

      <!-- Share Button -->
      <v-btn
        icon
        variant="tonal"
        color="white"
        size="small"
        class="share-btn"
        @click="emit('share')"
      >
        <v-icon icon="mdi-share-variant" />
      </v-btn>
    </div>
  </v-card>
</template>

<style lang="less" scoped>
.artist-banner {
  position: relative;
  overflow: hidden;
  margin: 16px;

  .banner-background {
    position: absolute;
    inset: 0;
    opacity: 0.7;

    .fluid-bg {
      width: 100vw;
      height: 100vh;
    }
  }

  .banner-content {
    position: relative;
    z-index: 1;
    gap: 24px;
  }

  .song-info {
    position: relative;
    z-index: 1;
  }

  .song-stats {
    position: absolute;
    bottom: 24px;
    right: 60px;
  }

  .share-btn {
    position: absolute;
    top: 24px;
    right: 24px;
  }
}
</style>
