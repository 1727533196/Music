<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

interface PlayList {
  id: number
  name: string
  coverImgUrl: string
  specialType?: number
}

interface Props {
  modelValue: boolean
  playlist: PlayList[]
}

const props = withDefaults(defineProps<Props>(), {
  playlist: () => []
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const selectedPlaylist = ref<PlayList | null>(null)

const handleConfirm = () => {
  if (!selectedPlaylist.value) {
    ElMessage.warning('请选择一个歌单')
    return
  }
  emit('confirm', selectedPlaylist.value)
  dialogVisible.value = false
  selectedPlaylist.value = null
}

const handleClose = () => {
  selectedPlaylist.value = null
}

const selectPlaylist = (playlist: PlayList) => {
  selectedPlaylist.value = playlist
}
</script>

<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="520"
    persistent
    transition="dialog-bottom-transition"
    class="collection-dialog"
  >
    <v-card 
      rounded="xl" 
      class="dialog-card"
      elevation="8"
    >
      <!-- 装饰性顶部渐变条 -->
      <div class="gradient-bar" />
      
      <!-- 标题栏 -->
      <v-card-item class="pb-0 pt-6 px-6">
        <template #prepend>
          <v-avatar
            size="56"
            color="primary"
            variant="tonal"
            class="icon-avatar"
          >
            <v-icon icon="mdi-playlist-plus" size="32" />
          </v-avatar>
        </template>
        
        <v-card-title class="text-h6 font-weight-bold mb-1">
          收藏到歌单
        </v-card-title>
        
        <v-card-subtitle class="text-body-2 text-medium-emphasis">
          选择一个歌单添加歌曲
        </v-card-subtitle>
      </v-card-item>

      <!-- 内容区 -->
      <v-card-text class="px-6 py-4 dialog-content">
        <div class="playlist-container">
          <v-list class="playlist-list" lines="two">
            <v-list-item
              v-for="playlist in playlist"
              :key="playlist.id"
              rounded="lg"
              class="playlist-item"
              :class="{ 'selected': selectedPlaylist?.id === playlist.id }"
              @click="selectPlaylist(playlist)"
            >
              <template #prepend>
                <v-img
                  :src="playlist.coverImgUrl + '?param=50y50'"
                  width="50"
                  height="50"
                  class="playlist-cover"
                  cover
                />
              </template>

              <v-list-item-title class="playlist-name">{{ playlist.name }}</v-list-item-title>

              <template #append>
                <v-icon
                  :icon="selectedPlaylist?.id === playlist.id ? 'mdi-check-circle' : 'mdi-radiobox-blank'"
                  :color="selectedPlaylist?.id === playlist.id ? 'primary' : 'grey-darken-1'"
                  size="24"
                  class="check-icon"
                />
              </template>
            </v-list-item>
          </v-list>

          <!-- 空状态 -->
          <div v-if="!playlist || playlist.length === 0" class="empty-state">
            <v-icon icon="mdi-playlist-remove" size="x-large" color="grey" />
            <div class="empty-text">暂无可用歌单</div>
          </div>
        </div>
      </v-card-text>

      <!-- 底部操作栏 -->
      <v-card-actions class="dialog-footer">
        <v-spacer />
        <v-btn
          variant="text"
          color="medium-emphasis"
          @click="dialogVisible = false"
          class="mr-2"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          min-width="120"
          :disabled="!selectedPlaylist"
          @click="handleConfirm"
          class="confirm-btn"
        >
          <v-icon icon="mdi-check" start />
          确认
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="less" scoped>
:deep(.v-overlay__scrim) {
  background-color: rgba(0, 0, 0, 1) !important;
}

.collection-dialog {
  .dialog-card {
    position: relative;
    overflow: hidden;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent);
    backdrop-filter: blur(10px);

    .gradient-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg,
        #f093fb 0%,
        #f5576c 50%,
        #f093fb 100%);
      background-size: 200% 100%;
      animation: gradient-shift 3s ease infinite;
    }

    .icon-avatar {
      border-radius: 16px;
      animation: pulse-icon 2s ease-in-out infinite;
    }
  }

  .dialog-content {
    padding: 0;
    max-height: 400px;
    overflow-y: auto;

    // 自定义滚动条
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }

    .playlist-container {
      padding: 16px;

      .playlist-list {
        background: transparent;

        .playlist-item {
          margin-bottom: 8px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px !important;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, 
              rgba(var(--v-theme-primary), 0.1), 
              transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: 12px;
          }

          &:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(var(--v-theme-primary), 0.3);
            transform: translateX(4px);

            &::before {
              opacity: 1;
            }

            .playlist-name {
              color: rgb(var(--v-theme-on-surface));
            }

            .check-icon {
              color: rgb(var(--v-theme-primary)) !important;
            }
          }

          &:active {
            transform: scale(0.98);
          }

          &.selected {
            background: rgba(var(--v-theme-primary), 0.12);
            border-color: rgba(var(--v-theme-primary), 0.4);

            &::before {
              opacity: 1;
            }

            .playlist-name {
              color: rgb(var(--v-theme-primary));
              font-weight: 600;
            }
          }

          .playlist-cover {
            border-radius: 8px;
            margin-right: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease;
          }

          &:hover .playlist-cover {
            transform: scale(1.05);
          }

          .playlist-name {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.85);
            transition: all 0.3s ease;
          }

          .check-icon {
            transition: all 0.3s ease;
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
          color: rgba(255, 255, 255, 0.4);
        }
      }
    }
  }

  .dialog-footer {
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .confirm-btn {
    font-weight: 600;
    letter-spacing: 0.5px;
    transition: all 0.3s ease;
    background: rgba(var(--v-theme-primary), 0.15) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(var(--v-theme-primary), 0.3);
    color: rgb(var(--v-theme-primary)) !important;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      background: rgba(var(--v-theme-primary), 0.25) !important;
      box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.3);
      border-color: rgba(var(--v-theme-primary), 0.5);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes pulse-icon {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

// 深色模式适配
:deep(.v-theme--dark) {
  .dialog-card {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent);
  }
}
</style>
