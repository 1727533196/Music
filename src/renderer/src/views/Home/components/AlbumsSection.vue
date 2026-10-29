<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface Album {
  id: number
  name: string
  cover: string
  artist?: string
  trackCount?: number
}

interface Props {
  title: string
  albums: Album[]
  showNavigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [album: Album]
  like: [album: Album]
  navigate: [direction: 'prev' | 'next']
}>()

const router = useRouter()

// 每页显示的专辑数量
const ITEMS_PER_PAGE = 6

// 当前页码
const currentPage = ref(0)

// 总页数
const totalPages = computed(() => {
  if (!props.albums || props.albums.length === 0) return 0
  return Math.ceil(props.albums.length / ITEMS_PER_PAGE)
})

// 当前页显示的专辑
const currentAlbums = computed(() => {
  if (!props.albums || props.albums.length === 0) return []
  const start = currentPage.value * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return props.albums.slice(start, end)
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

// 处理专辑点击
const handleAlbumClick = (album: Album) => {
  router.push(`/daily-recommend?id=${album.id}`)
}
</script>

<template>
  <div class="albums-section discovery-section">
    <!-- Section Header -->
    <div class="section-header">
      <h2>{{ title }}</h2>

      <div v-if="showNavigation && totalPages > 1" class="section-navigation">
        <v-btn
          icon
          variant="tonal"
          size="small"
          :disabled="currentPage === 0"
          :aria-label="`上一页${title}`"
          @click="handleNavigate('prev')"
        >
          <v-icon icon="mdi-chevron-left" />
        </v-btn>
        <v-btn
          icon
          variant="tonal"
          size="small"
          :disabled="currentPage >= totalPages - 1 || totalPages === 0"
          :aria-label="`下一页${title}`"
          @click="handleNavigate('next')"
        >
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
      </div>
    </div>

    <!-- Album Grid -->
    <div v-if="currentAlbums && currentAlbums.length > 0" class="album-grid discovery-grid">
      <div v-for="album in currentAlbums" :key="album.id" class="album-item discovery-item">
        <v-card
          rounded="0"
          elevation="0"
          class="album-card discovery-card"
          @click="handleAlbumClick(album)"
        >
          <div class="album-cover discovery-cover">
            <v-img :src="album.cover" cover class="cover-img" />

            <v-btn
              icon
              variant="tonal"
              color="pink"
              size="small"
              class="album-heart discovery-heart"
              :aria-label="`收藏${album.name}`"
              @click.stop="emit('like', album)"
            >
              <v-icon icon="mdi-heart" />
            </v-btn>
          </div>

          <div class="album-info discovery-info">
            <div class="album-name discovery-name" :title="album.name">
              {{ album.name }}
            </div>
            <div v-if="album.artist" class="album-artist discovery-description">
              {{ album.artist }}
            </div>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state text-center py-8">
      <v-icon icon="mdi-album-off" size="64" color="grey" />
      <div class="text-body-1 text-medium-emphasis mt-4">暂无推荐专辑</div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import './discovery-cards.less';
</style>
