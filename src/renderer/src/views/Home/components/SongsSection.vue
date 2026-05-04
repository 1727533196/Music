<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { GetMusicDetailData } from '@/api/musicList'
import { useMusicAction } from '@/store/music'
import { useUserInfo } from '@/store'
import { deleteSong } from '@/api/play'
import { ElMessage } from 'element-plus'
import ContextMenu from '@/components/ContextMenu/index.vue'
import CollectionDialog from '@/components/SongList/CollectionDialog.vue'

interface Props {
  title: string
  songs: GetMusicDetailData[]
  showNavigation?: boolean
}

withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [song: GetMusicDetailData, index: number]
  like: [song: GetMusicDetailData]
  navigate: [direction: 'prev' | 'next']
}>()

const router = useRouter()
const music = useMusicAction()
const store = useUserInfo()

// 判断当前歌曲是否是正在播放的歌曲
const isPlaying = (item: GetMusicDetailData) => {
  return item.id === music.state.songs?.id
}

// 处理歌曲点击事件
const handleSongClick = (song: GetMusicDetailData, index: number) => {
  // 如果当前歌曲已经在播放，不触发任何操作
  if (isPlaying(song)) {
    return
  }
  emit('play', song, index)
}

// 右键菜单相关
const currentSongForMenu = ref<GetMusicDetailData | null>(null)
const collectionDialogVisible = ref(false)

const menuList = computed(() => {
  return store.userPlayListInfo.filter(item => !item.subscribed)
})

// 生成菜单项
const getMenuItems = (song: GetMusicDetailData) => {
  return [
    { label: '播放下一首', value: 'play-next', song },
    { label: '添加到歌单', value: 'collection', song },
    { label: '查看评论', value: 'comment', song },
  ]
}

// 处理菜单选择
const handleMenuSelect = async (item: any) => {
  currentSongForMenu.value = item.song

  switch (item.value) {
    case 'play-next':
      // TODO: 实现播放下一首
      ElMessage.info('播放下一首功能待实现')
      break
    case 'collection':
      collectionDialogVisible.value = true
      break
    case 'comment':
      // 跳转到评论页面
      router.push({
        path: '/comment',
        query: {
          id: item.song.id,
        }
      })
      break
  }
}

// 确认收藏
const handleCollectionConfirm = async (playlist: any) => {
  try {
    await deleteSong('add', playlist.id, currentSongForMenu.value?.id!)
    collectionDialogVisible.value = false
    ElMessage.success({
      message: '添加成功',
    })
  } catch (error) {
    ElMessage.error({
      message: '添加失败',
    })
  }
}
</script>

<template>
  <div class="songs-section">
    <!-- Section Header -->
    <div class="section-header d-flex align-center justify-space-between mb-4">
      <h2 class="text-h5 font-weight-bold">{{ title }}</h2>

      <div v-if="showNavigation" class="d-flex" style="gap: 8px">
        <v-btn
          icon
          variant="tonal"
          size="small"
          @click="emit('navigate', 'prev')"
        >
          <v-icon icon="mdi-chevron-left" />
        </v-btn>
        <v-btn
          icon
          variant="tonal"
          size="small"
          @click="emit('navigate', 'next')"
        >
          <v-icon icon="mdi-chevron-right" />
        </v-btn>
      </div>
    </div>

    <!-- Song List -->
    <div class="song-list">
      <template v-if="songs && songs.length > 0">
        <ContextMenu
          v-for="(song, index) in songs"
          :key="song.id"
          :items="getMenuItems(song)"
          @select="handleMenuSelect"
        >
          <div
            class="song-item"
            @click="handleSongClick(song, index)"
          >
          <div class="song-content">
            <div class="song-cover-wrapper">
              <v-img
                :src="song.al?.picUrl || ''"
                cover
                class="song-cover"
              />
            </div>

            <div class="song-info">
              <div class="song-name" :class="{ 'is-playing': isPlaying(song) }">
                {{ song.name }}
              </div>
              <div class="song-artist">
                {{ song.ar?.map(artist => artist.name).join(' / ') }}
              </div>
            </div>
          </div>
          </div>
        </ContextMenu>
      </template>
      
      <!-- Empty State -->
      <div v-else class="empty-state text-center py-8">
        <v-icon icon="mdi-music-off" size="64" color="grey" />
        <div class="text-body-1 text-medium-emphasis mt-4">暂无推荐歌曲</div>
      </div>
    </div>
  </div>

  <!-- 收藏到歌单对话框 -->
  <CollectionDialog
    v-model="collectionDialogVisible"
    :playlist="menuList"
    @confirm="handleCollectionConfirm"
  />
</template>

<style lang="less" scoped>
.songs-section {
  height: 335px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .section-header {
    flex-shrink: 0;
  }

  .song-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    display: flex;
    flex-direction: column;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      transition: background 0.3s;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }

    .empty-state {
      min-height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .song-item {
      flex: 0 0 auto;
      padding: 8px 12px;
      margin-bottom: 4px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: background 0.2s ease,
                  border-color 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.1);
      }

      &:active {
        background: rgba(255, 255, 255, 0.15);
      }

      .song-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .song-cover-wrapper {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

        .song-cover {
          width: 100%;
          height: 100%;
        }
      }

      .song-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .song-name {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.3s;

          &.is-playing {
            color: rgb(255, 60, 60);
          }
        }

        .song-artist {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .song-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;

        .action-btn {
          opacity: 1;
          transition: all 0.3s;
          width: 32px;
          height: 32px;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          &.playing-indicator {
            color: rgb(255, 60, 60);
          }
        }
      }
    }
  }
}
</style>
