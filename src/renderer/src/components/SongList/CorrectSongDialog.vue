<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { cloudSearch } from '@/api/search'
import {matchCloudSong} from "@/api/play";

interface SongResult {
  id: number
  name: string
  artists: Array<{ id?: number; name?: string }>
  album?: { id?: number; name?: string }
  picUrl?: string
  ar?: Array<{ id?: number; name?: string }>
  al?: { id?: number; name?: string; picUrl?: string }
}

interface Props {
  modelValue: boolean
  songData?: any
  userId: number
}

const props = withDefaults(defineProps<Props>(), {
  songData: null
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const searchKeyword = ref('')
const isSearching = ref(false)
const searchResults = ref<SongResult[]>([])
const currentPage = ref(1)
const hasMore = ref(true)
const isLoadingMore = ref(false)
let debounceTimer: NodeJS.Timeout | null = null
const pageSize = 10

const handleSearch = async (reset = true) => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  if (reset) {
    currentPage.value = 1
    searchResults.value = []
    hasMore.value = true
  }

  if (isLoadingMore.value || !hasMore.value) return

  isSearching.value = reset
  isLoadingMore.value = !reset

  try {
    const offset = (currentPage.value - 1) * pageSize
    const res = await cloudSearch(searchKeyword.value.trim(), offset, pageSize)
    if (res.result && res.result.songs) {
      const newSongs = res.result.songs
      if (reset) {
        searchResults.value = newSongs
      } else {
        searchResults.value = [...searchResults.value, ...newSongs]
      }
      // 判断是否还有更多数据
      hasMore.value = newSongs.length >= pageSize
      currentPage.value++
    } else {
      searchResults.value = []
      hasMore.value = false
    }
  } catch (error) {
    ElMessage.error('搜索失败，请重试')
    searchResults.value = []
    hasMore.value = false
  } finally {
    isSearching.value = false
    isLoadingMore.value = false
  }
}

// 防抖搜索
const debouncedSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    handleSearch(true)  // 重置并重新搜索
  }, 500)
}

const selectSong = async (song: SongResult) => {
  if(!props.songData?.id) {
    ElMessage.error('歌曲信息不完整，请刷新后重试')
    return
  }

  await matchCloudSong(props.userId!, props.songData.id, song.id)
  ElMessage.success({
    message: '纠正歌曲信息成功',
  })
  dialogVisible.value = false
}

const handleClose = () => {
  searchKeyword.value = ''
  searchResults.value = []
  currentPage.value = 1
  hasMore.value = true
  isLoadingMore.value = false
}

watch(dialogVisible, (newVal) => {
  if (!newVal) {
    handleClose()
  }
})

// 清理定时器
onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

// 加载更多
const loadMore = () => {
  if (!isSearching.value && hasMore.value && !isLoadingMore.value) {
    handleSearch(false)
  }
}

const getCurrentSongInfo = computed(() => {
  if (!props.songData) return ''
  const name = props.songData.name || ''
  const artists = props.songData.ar?.map(a => a.name).join('/') || '未知歌手'
  return `${name} - ${artists}`
})

// 监听搜索框输入，触发防抖搜索
watch(searchKeyword, () => {
  debouncedSearch()
})
</script>

<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="650"
    scrim
    persistent
    scrollable
    class="correct-song-dialog"
  >
    <v-card rounded="xl" class="dialog-card">
      <v-card-title class="dialog-header">
        <div class="header-content">
          <v-icon icon="mdi-file-edit" size="large" color="primary" />
          <div class="title-text">
            <div class="main-title">纠正歌曲信息</div>
            <div class="sub-title" v-if="getCurrentSongInfo">
              当前：{{ getCurrentSongInfo }}
            </div>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="dialogVisible = false"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="dialog-content">
        <div class="search-section">
          <v-text-field
            v-model="searchKeyword"
            label="搜索正确的歌曲信息"
            placeholder="输入歌曲名或歌手名..."
            prepend-inner-icon="mdi-magnify"
            clearable
            density="comfortable"
            variant="outlined"
            hide-details
            class="search-input"
          >
            <template #append>
              <v-btn
                color="primary"
                :loading="isSearching"
                @click="handleSearch"
              >
                搜索
              </v-btn>
            </template>
          </v-text-field>
        </div>

        <div v-if="searchResults.length > 0" class="results-section">
          <div class="results-header">
            <div class="results-title">搜索结果：</div>
            <div class="results-count">共 {{ searchResults.length }} 首</div>
          </div>
          <v-list class="results-list">
            <v-list-item
              v-for="song in searchResults"
              :key="song.id"
              rounded="lg"
              class="result-item"
              @click="selectSong(song)"
            >
              <template #prepend>
                <v-img
                  :src="(song.al?.picUrl || song.picUrl || '') + '?param=50y50'"
                  width="50"
                  height="50"
                  class="song-cover"
                  cover
                />
              </template>

              <v-list-item-title class="song-name">{{ song.name }}</v-list-item-title>
              <v-list-item-subtitle class="song-info">
                <span class="artist">🎤 {{ song.artists?.map(a => a.name).filter(Boolean).join(', ') || song.ar?.map(a => a.name).filter(Boolean).join(', ') || '未知歌手' }}</span>
                <span class="album" v-if="song.al?.name || song.album">💿 {{ song.al?.name || song.album }}</span>
              </v-list-item-subtitle>

              <template #append>
                <v-icon icon="mdi-check-circle-outline" color="success" />
              </template>
            </v-list-item>

            <!-- 加载更多 -->
            <v-list-item v-if="hasMore && !isSearching" class="load-more-item" @click="loadMore">
              <template #prepend>
                <v-icon icon="mdi-arrow-down" size="large" color="primary" />
              </template>
              <v-list-item-title class="load-more-text">加载更多...</v-list-item-title>
            </v-list-item>

            <!-- 没有更多了 -->
            <v-list-item v-else-if="!hasMore && searchResults.length > 0" class="no-more-item">
              <v-list-item-title class="no-more-text">—— 没有更多了 ——</v-list-item-title>
            </v-list-item>

            <!-- 加载中 -->
            <v-list-item v-if="isLoadingMore" class="loading-more-item">
              <template #prepend>
                <v-progress-circular indeterminate size="20" color="primary" />
              </template>
              <v-list-item-title class="loading-more-text">加载中...</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>

        <div v-else-if="searchKeyword.trim() && !isSearching" class="empty-state">
          <v-icon icon="mdi-search-off" size="x-large" color="grey" />
          <div class="empty-text">未找到相关歌曲</div>
        </div>

        <div v-else class="hint-section">
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            rounded="lg"
            border="start"
          >
            <div class="hint-content">
              <v-icon icon="mdi-information-outline" size="small" />
              <span>请输入歌曲名或歌手名进行搜索，选择正确的歌曲信息进行纠正</span>
            </div>
          </v-alert>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer />
        <v-btn variant="text" @click="dialogVisible = false">取消</v-btn>
        <v-btn color="primary" variant="elevated" :disabled="!searchKeyword.trim()" @click="handleSearch">
          搜索
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="less" scoped>
.correct-song-dialog {
  // 自定义 scrim 背景色
  :deep(.v-overlay__scrim) {
    background-color: rgba(0, 0, 0, 1) !important;
  }

  .dialog-card {
    background: linear-gradient(145deg, rgba(30, 30, 30, 0.98), rgba(20, 20, 20, 0.95));
    backdrop-filter: blur(10px);
  }

  .dialog-header {
    padding: 20px 24px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .title-text {
        flex: 1;

        .main-title {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }

        .sub-title {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }
      }
    }
  }

  .dialog-content {
    padding: 24px;
    min-height: 400px;
    max-height: 500px;

    .search-section {
      margin-bottom: 24px;

      .search-input {
        :deep(.v-field) {
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 12px;

          .v-field__field input {
            font-size: 14px;
          }
        }
      }
    }

    .results-section {
      .results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .results-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
        }

        .results-count {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }
      }

      .results-list {
        background: transparent;
        border-radius: 12px;
        overflow: hidden;

        .result-item {
          margin-bottom: 8px;
          padding: 12px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 10px !important;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
            transform: translateX(4px);

            :deep(.v-list-item__append) {
              opacity: 1;
            }
          }

          &:active {
            transform: scale(0.98);
          }

          .song-cover {
            border-radius: 8px;
            margin-right: 16px;
          }

          .song-name {
            font-size: 15px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 6px;
          }

          .song-info {
            display: flex;
            gap: 16px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);

            .artist, .album {
              display: flex;
              align-items: center;
              gap: 4px;
            }
          }
        }
      }

      // 加载更多样式
      .load-more-item {
        cursor: pointer;
        padding: 16px;
        background-color: rgba(255, 255, 255, 0.03);
        border-radius: 8px !important;
        margin-top: 8px;
        transition: all 0.3s ease;

        &:hover {
          background-color: rgba(255, 255, 255, 0.08);

          .load-more-text {
            color: #fff;
          }
        }

        .load-more-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
        }
      }

      .no-more-item {
        padding: 16px;

        .no-more-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
        }
      }

      .loading-more-item {
        padding: 16px;
        justify-content: center;

        .loading-more-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 16px;

      .empty-text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .hint-section {
      .hint-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
    }
  }

  .dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 0 0 12px 12px;
  }
}
</style>
