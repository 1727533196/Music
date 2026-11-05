<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDiscoveryPageSize } from './useDiscoveryPageSize'

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
  page?: number
  hasNextPage?: boolean
  loading?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showNavigation: true,
  page: 1,
  hasNextPage: false,
  loading: false,
  error: false
})

const emit = defineEmits<{
  play: [mix: Mix]
  like: [mix: Mix]
  navigate: [direction: 'prev' | 'next']
  retry: []
  pageSizeChange: [size: number]
}>()

const router = useRouter()
const sectionRef = ref<HTMLElement | null>(null)
const pageSize = useDiscoveryPageSize(sectionRef)
watch(pageSize, (size) => emit('pageSizeChange', size), { immediate: true })

// 处理导航
const handleNavigate = (direction: 'prev' | 'next') => {
  if (props.loading) return
  if (direction === 'prev' && props.page <= 1) return
  if (direction === 'next' && !props.hasNextPage) return
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
  <div ref="sectionRef" class="mix-section discovery-section" :aria-busy="loading">
    <!-- Section Header -->
    <div class="section-header">
      <h2>{{ title }}</h2>

      <div v-if="showNavigation" class="section-navigation">
        <span class="page-status" role="status" aria-live="polite" aria-atomic="true">
          {{ loading ? '加载中…' : `第 ${page} 页` }}
        </span>
        <v-btn
          icon
          variant="tonal"
          size="small"
          :disabled="loading || page <= 1"
          :aria-label="`上一页${title}`"
          @click="handleNavigate('prev')"
        >
          <v-icon icon="mdi-chevron-left" />
        </v-btn>
        <v-btn
          icon
          variant="tonal"
          size="small"
          :disabled="loading || !hasNextPage"
          :aria-label="`下一页${title}`"
          @click="handleNavigate('next')"
        >
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
      </div>
    </div>

    <!-- Mix Grid -->
    <div v-if="mixes && mixes.length > 0" class="mix-grid discovery-grid">
      <div v-for="mix in mixes" :key="mix.id" class="mix-item discovery-item">
        <v-card
          rounded="0"
          elevation="0"
          class="mix-card discovery-card"
          @click="handleMixClick(mix)"
        >
          <div class="mix-cover discovery-cover">
            <v-img :src="mix.cover" cover class="cover-img" />

            <div class="play-count-badge">
              <v-icon icon="mdi-play" size="x-small" />
              <span>{{ formatPlayCount(mix.playCount) }}</span>
            </div>

            <v-btn
              icon
              variant="tonal"
              color="var(--app-accent)"
              size="small"
              class="mix-heart discovery-heart"
              :aria-label="`收藏${mix.name}`"
              @click.stop="emit('like', mix)"
            >
              <v-icon icon="mdi-heart" />
            </v-btn>
          </div>

          <div class="mix-info discovery-info">
            <div class="mix-name discovery-name" :title="mix.name">
              {{ mix.name }}
            </div>
            <div v-if="mix.description" class="mix-description discovery-description">
              {{ mix.description }}
            </div>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="loading" class="empty-state text-center py-8">
      <div class="text-body-1 text-medium-emphasis">加载中…</div>
    </div>
    <div v-else-if="error" class="empty-state text-center py-8">
      <div class="text-body-1 text-medium-emphasis mb-4">歌单加载失败</div>
      <v-btn variant="tonal" size="small" @click="emit('retry')">重新加载</v-btn>
    </div>
    <div v-else class="empty-state text-center py-8">
      <v-icon icon="mdi-playlist-music-off" size="64" color="var(--app-muted)" />
      <div class="text-body-1 text-medium-emphasis mt-4">暂无精选歌单</div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import './discovery-cards.less';

.section-navigation {
  align-items: center;
}

.page-status {
  min-width: 5em;
  margin-right: 4px;
  color: var(--discovery-muted);
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}
</style>
