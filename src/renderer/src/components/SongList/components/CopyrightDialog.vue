<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

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
const confirmButton = ref<HTMLButtonElement | null>(null)
let opener: HTMLElement | null = null
const emit = defineEmits(['update:modelValue', 'confirm'])
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
watch(
  () => props.modelValue,
  (value) => {
    if (value)
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  },
  { flush: 'sync' }
)
const focusConfirm = async () => {
  await nextTick()
  confirmButton.value?.focus()
}
const restoreFocus = () => {
  if (!props.modelValue && opener?.isConnected && !opener.closest('[inert]')) {
    opener.focus({ preventScroll: true })
  }
}
const handleClose = () => {
  visible.value = false
  emit('confirm')
}
</script>

<template>
  <v-dialog
    v-model="visible"
    persistent
    max-width="400"
    scrim="#09090e"
    :opacity="0.72"
    class="copyright-dialog"
    aria-label="播放提示"
    @after-enter="focusConfirm"
    @after-leave="restoreFocus"
  >
    <section class="copyright-dialog-card">
      <header class="dialog-heading">
        <span class="notice-icon"><v-icon :icon="icon" size="24" aria-hidden="true" /></span>
        <div class="heading-copy">
          <span>播放提示</span>
          <h2>{{ title }}</h2>
        </div>
      </header>
      <p class="notice-message">
        {{ message || '由于版权限制，这首歌曲暂时无法播放。试试其他歌曲吧。' }}
      </p>
      <footer class="dialog-footer">
        <button ref="confirmButton" type="button" class="confirm-button" @click="handleClose">
          {{ confirmText }}
        </button>
      </footer>
    </section>
  </v-dialog>
</template>

<style lang="less" scoped>
.copyright-dialog-card {
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
}
.dialog-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 24px 0;
}
.notice-icon {
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--app-border);
  border-radius: 11px;
  background: var(--app-surface);
  color: var(--app-muted);
}
.heading-copy {
  min-width: 0;
  > span {
    color: var(--app-muted);
    font-size: 11px;
  }
  h2 {
    margin: 4px 0 0;
    overflow-wrap: anywhere;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.5;
  }
}
.notice-message {
  margin: 0;
  padding: 18px 24px 24px;
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0 24px 22px;
}
.confirm-button {
  min-height: 34px;
  max-width: 100%;
  padding: 7px 16px;
  border: 0;
  border-radius: 8px;
  background: var(--app-accent);
  color: var(--app-on-accent);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  overflow-wrap: anywhere;
  cursor: pointer;
  &:hover {
    background: var(--app-accent-hover);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
@media (max-width: 480px) {
  .dialog-heading {
    padding: 20px 18px 0;
    gap: 12px;
  }
  .notice-message {
    padding: 16px 18px 22px;
  }
  .dialog-footer {
    padding: 0 18px 18px;
  }
}
</style>
