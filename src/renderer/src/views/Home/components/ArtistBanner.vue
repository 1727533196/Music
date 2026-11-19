<script setup lang="ts">
import { computed, ref, watch, onUnmounted, useTemplateRef } from 'vue'
import { findBestColors, toggleImg } from '@/utils'
import { colorExtraction } from '@/components/MusicDetail/useMusic'
import FluidBackground from '@/components/FluidBackground/index.vue'
import type { GetMusicDetailData } from '@/api/musicList'
import { useFlags } from '@/store/flags'
import PlayerGlyph from '@/components/MusicPlayer/PlayerGlyph.vue'
import {
  isBannerPalette,
  readBannerAppearance,
  writeBannerAppearance
} from '@/utils/bannerAppearance'

const props = withDefaults(
  defineProps<{
    songs: GetMusicDetailData[]
    appearanceKey?: string
    active?: boolean
    refreshToken?: number
    refreshing?: boolean
  }>(),
  { appearanceKey: 'home-banner', active: true, refreshToken: 0, refreshing: false }
)
const savedAppearance = readBannerAppearance(props.appearanceKey)
let paletteCover = savedAppearance?.cover || ''
let colorRequest = 0
let alive = true
let seenRefreshToken = 0
let manualDuringRefresh = false
const flags = useFlags()
const backgroundActive = ref(props.active && !flags.isOpenDetail)
let backgroundStopTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [flags.isOpenDetail, props.active] as const,
  ([open, active]) => {
    clearTimeout(backgroundStopTimer)
    if (!active) backgroundActive.value = false
    else if (!open) backgroundActive.value = true
    else {
      // 详情页完全盖住首页后再暂停，保留进入过渡中的流动效果。
      backgroundStopTimer = setTimeout(() => {
        backgroundActive.value = false
      }, 400)
    }
  },
  { immediate: true }
)
onUnmounted(() => {
  clearTimeout(backgroundStopTimer)
  alive = false
  colorRequest++
})

const emit = defineEmits<{
  play: [song: GetMusicDetailData]
  like: []
  share: []
}>()

// 从播放列表中随机选取一首歌曲（排除当前歌曲）
const getRandomSong = (excludeCurrent = false) => {
  const playlist = props.songs
  if (!playlist || playlist.length === 0) return null
  const previousId = currentSong.value?.id ?? savedAppearance?.songId
  const otherSongs = excludeCurrent ? playlist.filter((song) => song.id !== previousId) : []
  const candidates = otherSongs.length ? otherSongs : playlist
  return candidates[Math.floor(Math.random() * candidates.length)]
}

type BannerSource = GetMusicDetailData & { publishTime?: number; recommendReason?: string }
const displaySong = (song: BannerSource) => ({
  ...song,
  artist: song.ar?.map((artist) => artist.name).join(' / ') || '未知艺术家',
  album: song.al?.name || '未知专辑',
  duration: formatDuration(song.dt || 0),
  releaseDate: song.publishTime ? new Date(song.publishTime).toLocaleDateString() : '未知',
  displayPlayCount: song.recommendReason || (song.pop || 0) + '✨',
  coverImage: song.al?.picUrl || '',
  backgroundImage: song.al?.picUrl || ''
})
const currentSong = ref<ReturnType<typeof displaySong> | null>(null)
const selectSong = (song: GetMusicDetailData | null) => {
  currentSong.value = song ? displaySong(song) : null
  rememberAppearance()
}

// 格式化时长（毫秒 -> mm:ss）
const formatDuration = (ms: number) => {
  if (!ms) return '00:00'
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 提取的主色调数组
const mainColors = ref<number[][]>(
  savedAppearance?.colors || [
    [255, 160, 210],
    [160, 120, 255],
    [255, 210, 130],
    [100, 180, 255]
  ]
)
// Canvas 首帧就绪前也沿用当前颜色，不露出组件默认的浅紫底色。
const backgroundFallback = computed(() => `rgb(${mainColors.value[0].join(', ')})`)

function rememberAppearance() {
  if (!currentSong.value || !paletteCover) return
  writeBannerAppearance(props.appearanceKey, {
    songId: currentSong.value.id,
    cover: paletteCover,
    colors: mainColors.value
  })
}

// 从封面图片提取颜色
const extractColorsFromCover = () => {
  const request = ++colorRequest
  const coverUrl = currentSong.value?.coverImage
  if (!coverUrl || coverUrl === paletteCover) return

  toggleImg(coverUrl, '200y200')
    .then((img) => {
      // 换歌、卸载或账号切换后，旧封面的慢请求不能把颜色再改回去。
      if (!alive || request !== colorRequest || currentSong.value?.coverImage !== coverUrl) return
      const rgb = colorExtraction(img)
      const colors = findBestColors(rgb, Math.min(10, rgb.length))
        .filter((color) => Array.isArray(color))
        .map((color) => color.map(Number))

      if (isBannerPalette(colors)) {
        // 创建新的数组引用以确保 Vue 能检测到变化
        mainColors.value = colors
        paletteCover = coverUrl
        rememberAppearance()
      }
    })
    .catch((err) => {
      if (!alive || request !== colorRequest) return
      console.error('Failed to extract colors from cover:', err)
    })
}

// 监听播放列表变化，数据加载完成后随机选取
watch(
  () => [props.songs, props.refreshToken] as const,
  ([newList, token]) => {
    const refreshed = token > seenRefreshToken
    seenRefreshToken = token
    // 缓存用于保留首屏外观；真正拿到新数据后才换一次推荐，不把歌曲固定死。
    const selectedId = currentSong.value?.id ?? savedAppearance?.songId
    const retained = newList.find((item) => item.id === selectedId)
    const song =
      refreshed && !manualDuringRefresh ? getRandomSong(true) : retained || getRandomSong()
    selectSong(song)
    if (refreshed) manualDuringRefresh = false
  },
  { immediate: true }
)

// 监听当前歌曲变化
watch(
  () => [currentSong.value?.coverImage, props.refreshing] as const,
  ([newCover, refreshing]) => {
    if (refreshing) {
      colorRequest++
      return
    }
    if (newCover) extractColorsFromCover()
    manualDuringRefresh = false
  },
  { immediate: true } // 立即执行一次以处理初始值
)

// 切换到下一首随机歌曲
const nextGlyph = useTemplateRef<InstanceType<typeof PlayerGlyph>>('nextGlyph')
const nextSong = () => {
  const song = getRandomSong(true) // true 表示排除当前歌曲

  if (song) {
    nextGlyph.value?.animate()
    if (props.refreshing) manualDuringRefresh = true
    selectSong(song)
  }
}
</script>

<template>
  <v-card class="artist-banner" theme="dark" rounded="xl" elevation="0">
    <div class="banner-background">
      <FluidBackground
        :main-color="mainColors"
        :brightness="0.8"
        :active="backgroundActive"
        :style="{ backgroundColor: backgroundFallback }"
        class="fluid-bg"
      />
    </div>

    <div class="banner-content d-flex pa-6">
      <!-- Artist Avatar -->
      <v-img
        :src="currentSong?.coverImage"
        :transition="false"
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
        <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 600px; line-height: 1.6">
          专辑：{{ currentSong?.album || '未知专辑' }}
        </p>

        <div class="d-flex align-center button-group">
          <v-btn
            color="white"
            variant="tonal"
            rounded="pill"
            size="large"
            class="px-6"
            @click="currentSong && emit('play', currentSong)"
          >
            <PlayerGlyph name="play" class="banner-action-glyph banner-play-glyph" />
            播放
          </v-btn>
          <v-btn
            icon
            variant="tonal"
            color="white"
            size="large"
            class="ml-2"
            aria-label="换一首推荐歌曲"
            title="换一首推荐歌曲"
            @click="nextSong"
          >
            <PlayerGlyph ref="nextGlyph" name="next" class="banner-action-glyph" />
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
          <div class="text-body-1 font-weight-bold">{{ currentSong?.displayPlayCount || '0' }}</div>
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
  .banner-action-glyph {
    display: block;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
  }
  .banner-play-glyph {
    width: 22px;
    height: 22px;
    margin-inline-end: 8px;
  }
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
