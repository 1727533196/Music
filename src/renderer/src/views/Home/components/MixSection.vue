<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface Mix {
  id: number
  name: string
  cover: string
  description?: string
  playCount?: number
}

interface Props {
  title: string
  mixes: Mix[]
  showNavigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [mix: Mix]
  like: [mix: Mix]
  navigate: [direction: 'prev' | 'next']
}>()

const router = useRouter()

// 每页显示的歌单数量
const ITEMS_PER_PAGE = 6

// 当前页码
const currentPage = ref(0)

// 总页数
const totalPages = computed(() => {
  if (!props.mixes || props.mixes.length === 0) return 0
  return Math.ceil(props.mixes.length / ITEMS_PER_PAGE)
})

// 当前页显示的歌单
const currentMixes = computed(() => {
  if (!props.mixes || props.mixes.length === 0) return []
  const start = currentPage.value * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return props.mixes.slice(start, end)
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

// 处理歌单点击
const handleMixClick = (mix: Mix) => {
  router.push(`/daily-recommend?id=${mix.id}`)
}

// 格式化播放次数
const formatPlayCount = (count?: number) => {
  if (!count) return '0'
  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(1)}亿`
  }
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`
  }
  return count.toString()
}
</script>

<template>
  <div class="mix-section mb-8">
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
    
    <!-- Mix Grid -->
    <div v-if="currentMixes && currentMixes.length > 0" class="mix-grid">
      <div
        v-for="mix in currentMixes"
        :key="mix.id"
        class="mix-item"
      >
        <v-card
          rounded="lg"
          elevation="0"
          class="mix-card"
          @click="handleMixClick(mix)"
        >
          <div class="mix-cover">
            <v-img :src="mix.cover" cover class="cover-img" />
            
            <div class="play-count-badge">
              <v-icon icon="mdi-play" size="x-small" />
              <span>{{ formatPlayCount(mix.playCount) }}</span>
            </div>
            
            <v-btn
              icon
              variant="tonal"
              color="pink"
              size="small"
              class="mix-heart"
              @click.stop="emit('like', mix)"
            >
              <v-icon icon="mdi-heart" />
            </v-btn>
          </div>
          
          <div class="mix-info pa-2">
            <div class="mix-name text-subtitle-2 font-weight-bold text-truncate">
              {{ mix.name }}
            </div>
            <div v-if="mix.description" class="mix-description text-caption text-medium-emphasis text-truncate">
              {{ mix.description }}
            </div>
          </div>
        </v-card>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else class="empty-state text-center py-8">
      <v-icon icon="mdi-playlist-music-off" size="64" color="grey" />
      <div class="text-body-1 text-medium-emphasis mt-4">暂无精选歌单</div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.mix-section {
  .mix-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 16px;
  }

  .empty-state {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .mix-item {
    .mix-card {
      transition: all 0.3s;
      cursor: pointer;
      background: transparent;
      
      &:hover {
        transform: translateY(-4px);
        
        .mix-heart {
          opacity: 1;
        }
      }
      
      .mix-cover {
        position: relative;
        aspect-ratio: 1;
        
        .cover-img {
          border-radius: 8px;
        }
        
        .play-count-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 2px 6px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: white;
          
          .v-icon {
            font-size: 12px;
          }
        }
        
        .mix-heart {
          position: absolute;
          top: 8px;
          right: 8px;
          opacity: 0;
          transition: opacity 0.3s;
          
          .v-icon {
            font-size: 18px;
          }
        }
      }
      
      .mix-info {
        .mix-name {
          font-size: 13px;
          line-height: 1.4;
        }
        
        .mix-description {
          font-size: 11px;
          margin-top: 2px;
        }
      }
    }
  }
}
</style>
