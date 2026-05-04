<script setup lang="ts">
import { ref, computed } from 'vue'

interface Video {
  id: number
  title: string
  thumbnail: string
  artist?: string
  playTime?: string
}

interface Props {
  title: string
  videos: Video[]
  showNavigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [video: Video]
  navigate: [direction: 'prev' | 'next']
}>()

// 每页显示的视频数量
const ITEMS_PER_PAGE = 3

// 当前页码
const currentPage = ref(0)

// 总页数
const totalPages = computed(() => {
  if (!props.videos || props.videos.length === 0) return 0
  return Math.ceil(props.videos.length / ITEMS_PER_PAGE)
})

// 当前页显示的视频
const currentVideos = computed(() => {
  if (!props.videos || props.videos.length === 0) return []
  const start = currentPage.value * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return props.videos.slice(start, end)
})

// 处理导航
const handleNavigate = (direction: 'prev' | 'next') => {
  if (direction === 'prev' && currentPage.value > 0) {
    currentPage.value--
  } else if (direction === 'next' && currentPage.value < totalPages.value - 1) {
    currentPage.value++
  }
  emit('navigate', direction)
}
</script>

<template>
  <div class="video-section mb-2">
    <!-- Section Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h5 font-weight-bold">{{ title }}</h2>

      <div v-if="showNavigation" class="d-flex" style="gap: 8px">
        <v-btn
          icon
          variant="tonal"
          size="small"
          :disabled="currentPage === 0"
          @click="handleNavigate('prev')"
        >
          <v-icon icon="mdi-chevron-left" />
        </v-btn>
        <v-btn
          icon
          variant="tonal"
          size="small"
          :disabled="currentPage >= totalPages - 1 || totalPages === 0"
          @click="handleNavigate('next')"
        >
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
      </div>
    </div>

    <!-- Video Grid -->
    <div v-if="currentVideos && currentVideos.length > 0" class="video-grid">
      <v-card
        v-for="video in currentVideos"
        :key="video.id"
        rounded="xl"
        elevation="0"
        class="video-card"
        @click="emit('play', video)"
      >
        <div class="video-thumbnail">
          <v-img :src="video.thumbnail" cover class="video-img" />

          <div class="play-overlay">
            <div class="play-circle">
              <v-icon icon="mdi-play" size="large" />
            </div>
          </div>

          <div class="video-info pa-3">
            <div class="text-subtitle-2 font-weight-bold mb-1 text-truncate">
              {{ video.title }}
            </div>
            <div v-if="video.artist" class="text-caption text-medium-emphasis text-truncate">
              {{ video.artist }}
            </div>
            <div v-if="video.playTime" class="text-caption text-medium-emphasis mt-1">
              {{ video.playTime }}
            </div>
          </div>
        </div>
      </v-card>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state text-center py-8">
      <v-icon icon="mdi-video-off" size="64" color="grey" />
      <div class="text-body-1 text-medium-emphasis mt-4">暂无视频内容</div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.video-section {
  .video-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .video-card {
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-4px);

      .play-circle {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.1);
      }
    }

    .video-thumbnail {
      position: relative;
      aspect-ratio: 16 / 9;

      .video-img {
        width: 100%;
        height: 100%;
      }

      .play-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.2);

        .play-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s;

          .v-icon {
            color: white;
            font-size: 28px;
            margin-left: 3px;
          }
        }
      }

      .video-info {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
        padding: 12px;
      }
    }
  }
}

.empty-state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
