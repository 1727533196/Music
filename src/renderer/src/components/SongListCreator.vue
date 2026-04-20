<script setup lang="ts">
import { createPlay } from '../api/play'
import { ref } from 'vue'
import { getUserPlayListFn } from '../utils/userInfo'
import { ElMessage } from 'element-plus'

const visible = defineModel({ default: false })
const loading = ref(false)
const desc = ref('')
const privacy = ref(false)
const closeDialog = () => {
  visible.value = false
}
const create = async () => {
  loading.value = true
  try {
    const isPrivacy = privacy.value ? '10' : ''
    const res = await createPlay(desc.value, isPrivacy)
    getUserPlayListFn()
    closeDialog()
    ElMessage.success('创建成功')
  } catch {
    ElMessage.error('因某种原因创建失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog 
    v-model="visible" 
    persistent
    max-width="480"
    transition="dialog-bottom-transition"
  >
    <v-card 
      class="create-playlist-card"
      rounded="xl"
      elevation="8"
    >
      <!-- 装饰性顶部渐变条 -->
      <div class="gradient-bar" />
      
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
          创建新歌单
        </v-card-title>
        
        <v-card-subtitle class="text-body-2 text-medium-emphasis">
          打造你的专属音乐空间
        </v-card-subtitle>
      </v-card-item>

      <v-card-text class="px-6 py-4">
        <v-text-field
          label="歌单标题"
          placeholder="请输入歌单名称"
          v-model="desc"
          :counter="40"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="mb-4"
          prepend-inner-icon="mdi-music-note"
        />

        <v-checkbox-btn
          v-model="privacy"
          label="设为隐私歌单"
          color="primary"
          density="comfortable"
          class="privacy-checkbox"
        >
          <template #label>
            <span class="text-body-2">
              <v-icon icon="mdi-lock-outline" size="small" class="mr-1" />
              隐私歌单（仅自己可见）
            </span>
          </template>
        </v-checkbox-btn>
      </v-card-text>

      <v-card-actions class="px-6 pb-6 pt-0">
        <v-spacer />
        <v-btn
          variant="text"
          color="medium-emphasis"
          @click="closeDialog"
          class="mr-2"
        >
          取消
        </v-btn>
        <v-btn
          :loading="loading"
          color="primary"
          variant="flat"
          size="large"
          min-width="120"
          @click="create"
          class="create-btn"
        >
          <v-icon icon="mdi-check" start />
          创建
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style lang="less" scoped>
:deep(.v-overlay__scrim) {
  background-color: rgba(0, 0, 0, 1) !important;
}
.create-playlist-card {
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
      #667eea 0%,
      #764ba2 50%,
      #667eea 100%);
    background-size: 200% 100%;
    animation: gradient-shift 3s ease infinite;
  }

  .icon-avatar {
    border-radius: 16px;
    animation: pulse-icon 2s ease-in-out infinite;
  }

  .privacy-checkbox {
    margin-top: 8px;
    :deep(.v-label) {
      opacity: 1;
    }
  }

  .create-btn {
    font-weight: 600;
    letter-spacing: 0.5px;
    transition: all 0.3s ease;
    background: rgba(var(--v-theme-primary), 0.15) !important;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(var(--v-theme-primary), 0.3);
    color: rgb(var(--v-theme-primary)) !important;

    &:hover {
      transform: translateY(-2px);
      background: rgba(var(--v-theme-primary), 0.25) !important;
      box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.3);
      border-color: rgba(var(--v-theme-primary), 0.5);
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
  .create-playlist-card {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent);
  }
}
</style>
