<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '当前歌曲暂无音源',
  message: '',
  confirmText: '我知道了',
  icon: 'mdi-music-off'
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleClose = () => {
  visible.value = false
  emit('confirm')
}
</script>

<template>
  <VDialog
    v-model="visible"
    persistent
    max-width="420"
    transition="dialog-bottom-transition"
  >
    <VCard
      class="copyright-dialog-card"
      rounded="xl"
      elevation="8"
    >
      <!-- 装饰性顶部渐变条 -->
      <div class="gradient-bar" />

      <VCardItem class="pb-0 pt-6 px-6">
        <template #prepend>
          <VAvatar
            size="56"
            color="warning"
            variant="tonal"
            class="icon-avatar"
          >
            <VIcon
              :icon="icon"
              size="32"
            />
          </VAvatar>
        </template>

        <VCardTitle class="text-h6 font-weight-bold mb-1">
          {{ title }}
        </VCardTitle>

        <VCardSubtitle class="text-body-2 text-medium-emphasis">
          播放提示
        </VCardSubtitle>
      </VCardItem>

      <VCardText class="px-6 py-4">
        <p class="text-body-1 text-medium-emphasis mb-0">
          {{ message || '由于版权限制，该歌曲暂时无法播放。您可以尝试其他歌曲或稍后再试。' }}
        </p>
      </VCardText>

      <VCardActions class="px-6 pb-6 pt-0">
        <VSpacer />
        <VBtn
          color="primary"
          variant="flat"
          size="large"
          min-width="120"
          @click="handleClose"
          class="confirm-btn"
        >
          {{ confirmText }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style lang="less" scoped>
:deep(.v-overlay__scrim) {
  background-color: rgba(0, 0, 0, 1) !important;
}
.copyright-dialog-card {
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
      #ff6b6b 0%,
      #ffa502 50%,
      #ff6b6b 100%);
    background-size: 200% 100%;
    animation: gradient-shift 3s ease infinite;
  }

  .icon-avatar {
    border-radius: 16px;
    animation: pulse-icon 2s ease-in-out infinite;
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
  .copyright-dialog-card {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent);
  }
}
</style>
