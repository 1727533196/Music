<script setup lang="ts">
import { formattingTime } from '@/utils'
import { GetMusicDetailData } from '@/api/musicList'
import Volume from '@/components/MusicPlayer/Volume.vue'
import { useFlags } from '@/store/flags'
import AudioQuality from './AudioQuality.vue'

interface Props {
  songs: GetMusicDetailData
  currentTime: number
  audio?: HTMLAudioElement
}

const props = defineProps<Props>()
const flags = useFlags()

const openDrawer = () => {
  flags.isOpenDrawer = !flags.isOpenDrawer
}
</script>

<template>
  <div class="right">
    <AudioQuality />
    <div class="playback-time">
      <div v-if="props.songs.ar" class="current-time">
        {{ formattingTime(props.currentTime * 1000) }}
      </div>
      <span style="margin: 0 5px; line-height: 15px">/</span>
      <div v-if="props.songs.ar" class="total-time">{{ formattingTime(props.songs.dt || 0) }}</div>
    </div>
    <button
      type="button"
      class="list"
      :class="{ active: flags.isOpenDrawer }"
      :aria-pressed="flags.isOpenDrawer"
      aria-label="播放队列"
      title="播放队列"
      @click.stop="openDrawer"
    >
      <v-icon icon="mdi-playlist-music" size="21" />
    </button>
    <Volume :audio="props.audio"></Volume>
  </div>
</template>

<style scoped lang="less">
.right {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  .playback-time {
    display: flex;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .current-time,
  .total-time {
    color: @text;
    font-size: 12px;
  }
  .list {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--app-muted);
    cursor: pointer;
    transition:
      opacity 150ms ease,
      background-color 150ms ease;
    &:hover {
      background: var(--app-hover);
    }
    &.active {
      color: var(--app-accent);
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
@media (max-width: 800px) {
  .right {
    gap: 8px;
    .playback-time {
      display: none;
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .list {
    transition: none;
  }
}
</style>
