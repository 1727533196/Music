<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useMusicAction } from '@/store/music'
import LyricDisplay from './LyricDisplay.vue'
import FlowBg from './FlowBg.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])
const music = useMusicAction()
const backgroundActive = ref(props.modelValue)
const detailEl = ref<HTMLElement>()
const closeButton = ref<HTMLButtonElement>()
let detailOpener: HTMLElement | null = null
let backgroundStopTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.modelValue,
  (open) => {
    clearTimeout(backgroundStopTimer)
    if (open) backgroundActive.value = true
    else {
      // 退出过渡结束后再暂停背景。
      backgroundStopTimer = setTimeout(() => {
        backgroundActive.value = false
      }, 400)
    }
  }
)
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      detailOpener =
        document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : null
      await nextTick()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      if (props.modelValue) {
        detailEl.value?.querySelector('.music-detail-container')?.scrollTo({ top: 0 })
        focusDetail()
      }
    } else {
      await nextTick()
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      const focused = document.activeElement
      const hasNewFocus =
        focused instanceof HTMLElement &&
        focused !== document.body &&
        !detailEl.value?.contains(focused) &&
        focused.getClientRects().length > 0 &&
        !focused.closest('[inert]')
      if (hasNewFocus) return
      if (!props.modelValue && detailOpener?.isConnected && !detailOpener.closest('[inert]')) {
        detailOpener.focus({ preventScroll: true })
      } else if (!props.modelValue) {
        document
          .querySelector<HTMLButtonElement>('.compact-player .picture-box')
          ?.focus({ preventScroll: true })
      }
    }
  }
)
onUnmounted(() => clearTimeout(backgroundStopTimer))

const bg = computed(() => music.state.songs?.al?.picUrl || '')
const closeDetail = () => emit('update:modelValue', false)
function focusDetail() {
  const focused = document.activeElement
  const hasExternalFocus =
    focused instanceof HTMLElement &&
    focused !== document.body &&
    !detailEl.value?.contains(focused) &&
    focused.getClientRects().length > 0 &&
    !focused.closest('[inert]')
  if (props.modelValue && !hasExternalFocus && !detailEl.value?.contains(focused)) {
    closeButton.value?.focus({ preventScroll: true })
  }
}
const containFocus = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') return
  const controls = [
    ...(detailEl.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]'
    ) || [])
  ].filter((element) => element.getClientRects().length && !element.closest('[inert]'))
  const first = controls[0]
  const last = controls.at(-1)
  if (
    (event.shiftKey && document.activeElement === first) ||
    (!event.shiftKey && document.activeElement === last)
  ) {
    event.preventDefault()
    ;(event.shiftKey ? last : first)?.focus()
  }
}
</script>

<template>
  <section
    ref="detailEl"
    :class="['music-detail-view', { open: modelValue }]"
    :aria-hidden="!modelValue"
    :inert="!modelValue"
    aria-label="正在播放"
    role="dialog"
    :aria-modal="modelValue"
    @keydown.esc.stop="closeDetail"
    @keydown="containFocus"
    @transitionend.self="focusDetail"
  >
    <FlowBg class="detail-background" :bg="bg" :active="backgroundActive" />
    <div class="detail-scrim" />
    <div
      class="detail-drag-region"
      :class="{ 'window-container': modelValue }"
      aria-hidden="true"
    />
    <header class="detail-header">
      <button
        ref="closeButton"
        type="button"
        class="detail-header-button no-drag"
        aria-label="收起歌曲详情"
        title="收起歌曲详情"
        @click="closeDetail"
      >
        <v-icon icon="mdi-chevron-down" size="28" />
      </button>
    </header>
    <div class="music-detail-container">
      <LyricDisplay
        :lyric="music.state.lyric"
        :lrcMode="music.state.lrcMode"
        :bg="bg"
        :title="music.state.songs.name || ''"
        :ar="music.state.songs.ar || []"
        :videoPlayUrl="music.state.videoPlayUrl"
        :active="modelValue"
      />
    </div>
  </section>
</template>

<style lang="less" scoped>
.music-detail-view {
  position: fixed;
  inset: 0;
  z-index: 2000;
  overflow: hidden;
  isolation: isolate;
  background: #242a2d;
  visibility: hidden;
  transform: translateY(100%);
  transition:
    transform 0.4s cubic-bezier(0.22, 0.68, 0, 1),
    visibility 0.4s;
  &.open {
    visibility: visible;
    transform: translateY(0);
  }
}
.detail-background {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.detail-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(110deg, rgba(9, 15, 23, 0.5), rgba(12, 16, 24, 0.35));
}
.detail-header {
  position: absolute;
  z-index: 3;
  top: 34px;
  left: 26px;
  display: flex;
  align-items: center;
  height: 48px;
}
.detail-drag-region {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 82px;
  right: 140px;
  height: var(--app-header-height, 76px);
}
.detail-header-button {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  :deep(.v-icon) {
    pointer-events: none;
  }
  transition:
    color 0.18s,
    background 0.18s;
  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.09);
  }
  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 3px;
  }
}
.music-detail-container {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
}
@media (max-width: 760px), (max-height: 640px) {
  .music-detail-container {
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
@media (prefers-reduced-motion: reduce) {
  .music-detail-view,
  .detail-header-button {
    transition: none;
  }
}
</style>
