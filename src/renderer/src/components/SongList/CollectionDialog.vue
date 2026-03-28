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
    max-width="500"
    persistent
    class="collection-dialog"
  >
    <v-card rounded="xl" class="dialog-card">
      <!-- 标题栏 -->
      <v-card-title class="dialog-header">
        <div class="header-content">
          <v-icon icon="mdi-playlist-plus" size="large" color="primary" />
          <div class="title-text">
            <div class="main-title">收藏到歌单</div>
            <div class="sub-title">选择一个歌单添加歌曲</div>
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

      <!-- 内容区 -->
      <v-card-text class="dialog-content">
        <div class="playlist-container">
          <v-list class="playlist-list">
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
                  lazy-src
                />
              </template>

              <v-list-item-title class="playlist-name">{{ playlist.name }}</v-list-item-title>

              <template #append>
                <v-icon
                  :icon="selectedPlaylist?.id === playlist.id ? 'mdi-check-circle' : 'mdi-radiobox-blank'"
                  :color="selectedPlaylist?.id === playlist.id ? 'primary' : ''"
                  size="24"
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
        <v-btn variant="text" @click="dialogVisible = false">取消</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!selectedPlaylist"
          @click="handleConfirm"
        >
          确认
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="less" scoped>
.collection-dialog {
  // 自定义 scrim 背景色
  :deep(.v-overlay__scrim) {
    background-color: rgba(0, 0, 0, 0.7) !important;
  }

  .dialog-card {
    background: linear-gradient(145deg, rgba(30, 30, 30, 0.98), rgba(20, 20, 20, 0.95));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dialog-header {
    padding: 20px 24px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    justify-content: space-between;

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
          color: rgba(255, 255, 255, 0.5);
        }
      }
    }
  }

  .dialog-content {
    padding: 0;
    max-height: 400px;
    overflow-y: auto;

    .playlist-container {
      padding: 16px;

      .playlist-list {
        background: transparent;
        border-radius: 12px;
        overflow: hidden;

        .playlist-item {
          margin-bottom: 8px;
          padding: 14px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px !important;
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
            background: linear-gradient(135deg, rgba(82, 121, 255, 0.15), transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: 10px;
          }

          &:hover {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
            border-color: rgba(82, 121, 255, 0.3);
            transform: translateX(4px);

            &::before {
              opacity: 1;
            }

            .playlist-name {
              color: #fff;
            }
          }

          &:active {
            transform: scale(0.98);
          }

          &.selected {
            background: linear-gradient(135deg, rgba(82, 121, 255, 0.2), rgba(82, 121, 255, 0.1));
            border-color: rgba(82, 121, 255, 0.5);

            &::before {
              opacity: 1;
            }

            .playlist-name {
              color: #5279ff;
              font-weight: 600;
            }
          }

          .playlist-cover {
            border-radius: 8px;
            margin-right: 16px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .playlist-name {
            font-size: 15px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
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
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 0 0 12px 12px;
  }
}
</style>
