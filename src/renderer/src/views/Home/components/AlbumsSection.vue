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
  <div class="albums-section mb-8">
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
    
    <!-- Album Grid -->
    <div v-if="currentAlbums && currentAlbums.length > 0" class="album-grid">
      <div
        v-for="album in currentAlbums"
        :key="album.id"
        class="album-item"
      >
        <v-card
          rounded="lg"
          elevation="0"
          class="album-card"
          @click="handleAlbumClick(album)"
        >
          <div class="album-cover">
            <v-img :src="album.cover" cover class="cover-img" />
            
            <v-btn
              icon
              variant="tonal"
              color="pink"
              size="small"
              class="album-heart"
              @click.stop="emit('like', album)"
            >
              <v-icon icon="mdi-heart" />
            </v-btn>
          </div>
          
          <div class="album-info pa-2">
            <div class="album-name text-subtitle-2 font-weight-bold text-truncate">
              {{ album.name }}
            </div>
            <div v-if="album.artist" class="album-artist text-caption text-medium-emphasis text-truncate">
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
.albums-section {
  .album-grid {
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

  .album-item {
    .album-card {
      transition: all 0.3s;
      cursor: pointer;
      background: transparent;
      
      &:hover {
        transform: translateY(-4px);
        
        .album-heart {
          opacity: 1;
        }
      }
      
      .album-cover {
        position: relative;
        aspect-ratio: 1;
        
        .cover-img {
          border-radius: 8px;
        }
        
        .album-heart {
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
      
      .album-info {
        .album-name {
          font-size: 13px;
          line-height: 1.4;
        }
        
        .album-artist {
          font-size: 11px;
          margin-top: 2px;
        }
      }
    }
  }
}
</style>
