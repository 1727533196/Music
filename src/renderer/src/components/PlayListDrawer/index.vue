<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import { computed, nextTick, ref, watch } from 'vue'
import { columns } from '@/components/PlayListDrawer/config'
import { useMusicAction } from '@/store/music'

interface Props {
  modelValue: boolean
}
const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])
const music = useMusicAction()
const queueTracks = computed(() => {
  const tracks = music.state.runtimeList?.tracks
  return Array.isArray(tracks) ? tracks : []
})
const drawer = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let opener: HTMLElement | null = null
const close = () => emit('update:modelValue', false)
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      closeButton.value?.focus({ preventScroll: true })
    } else if (drawer.value?.contains(document.activeElement)) {
      opener?.focus({ preventScroll: true })
    }
  }
)
const handleKey = (event: KeyboardEvent) => {
  if (
    event.key === 'Escape' &&
    !event.defaultPrevented &&
    !(event.target as HTMLElement).closest('[role="dialog"]')
  ) {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}
</script>

<template>
  <aside
    ref="drawer"
    class="queue-drawer"
    :class="{ 'is-open': modelValue }"
    :inert="!modelValue"
    :aria-hidden="!modelValue"
    aria-label="播放队列"
    @click.stop
    @keydown="handleKey"
  >
    <header class="queue-heading">
      <div>
        <h2>播放队列</h2>
        <span>{{ music.state.runtimeIds.length }} 首歌曲</span>
      </div>
      <button
        ref="closeButton"
        type="button"
        class="close-queue"
        aria-label="关闭播放队列"
        @click="close"
      >
        <v-icon icon="mdi-close" size="20" />
      </button>
    </header>
    <SongList
      v-if="modelValue && music.state.runtimeIds.length"
      @play="music.getMusicUrlHandler"
      :columns="columns"
      :loading="false"
      :songs="music.state.songs"
      :ids="music.state.runtimeIds"
      :list="queueTracks"
      :list-info="music.state.runtimeList"
      :is-search="music.state.runtimeIds.length > 10"
      :is-paging="false"
      :lazy="true"
      :is-need-title="false"
      :scroll="true"
    />
    <div v-else-if="modelValue" class="queue-empty">
      <v-icon icon="mdi-playlist-music-outline" size="36" />
      <h3>队列还是空的</h3>
      <p>播放一首歌曲，从这里接着听。</p>
    </div>
  </aside>
</template>

<style scoped lang="less">
.queue-drawer {
  position: fixed;
  z-index: 2001;
  top: calc(var(--app-header-height, 76px) + 12px);
  right: 16px;
  bottom: calc(var(--app-player-height, 75px) + 14px);
  display: flex;
  flex-direction: column;
  width: ~"min(390px, calc(100vw - 32px))";
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
  opacity: 0;
  transform: translateX(calc(100% + 24px));
  pointer-events: none;
  transition:
    transform 240ms cubic-bezier(0.2, 0.75, 0.2, 1),
    opacity 180ms ease;
  &.is-open {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }
}
.queue-heading {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 76px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--app-border);
  h2 {
    margin: 0 0 4px;
    color: var(--app-text);
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
  }
  span {
    color: var(--app-muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
}
.close-queue {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  color: var(--app-muted);
  background: transparent;
  cursor: pointer;
  &:hover {
    color: var(--app-text);
    background: var(--app-surface);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
:deep(.song-list-container) {
  min-height: 0;
  padding: 10px 8px 12px;
  overscroll-behavior: contain;
  .search-container {
    margin: 2px 8px 8px;
  }
  .list {
    min-height: 60px;
    padding: 8px 10px;
    gap: 12px;
  }
  .song-artwork {
    flex-basis: 40px;
    width: 40px;
    height: 40px;
  }
  .title-box {
    gap: 10px;
  }
  .song-title {
    font-size: 13px;
  }
  .name-container {
    font-size: 11px;
  }
  .time {
    font-size: 11px;
  }
  .search-count {
    display: none;
  }
}
.queue-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--app-muted);
  text-align: center;
  h3 {
    color: var(--app-text);
    font-size: 16px;
    font-weight: 550;
  }
  p {
    font-size: 12px;
    line-height: 1.6;
  }
}
@media (max-width: 650px) {
  .queue-drawer {
    right: 12px;
    width: calc(100vw - 24px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .queue-drawer {
    transition: none;
  }
}
</style>
