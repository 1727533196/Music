<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useMusicAction } from '@/store/music'
import PlayerGlyph from './PlayerGlyph.vue'

const props = defineProps<{
  isPlay: boolean
  orderStatusVal: number
  orderStatus: string[]
}>()
const emit = defineEmits<{
  setOrderHandler: []
  cutSong: [next: boolean]
  pause: []
  play: []
}>()
const music = useMusicAction()
const canPlay = computed(() => Boolean(music.state.songs?.id && music.state.musicUrl))
const canSkip = computed(() => canPlay.value && music.state.runtimeIds.length > 0)
const modeNames = ['心动模式', '列表循环', '随机播放', '单曲循环']
const modeIcons = ['mdi-heart-multiple-outline', 'mdi-repeat', 'mdi-shuffle', 'mdi-repeat-once']
const previousGlyph = useTemplateRef<InstanceType<typeof PlayerGlyph>>('previousGlyph')
const nextGlyph = useTemplateRef<InstanceType<typeof PlayerGlyph>>('nextGlyph')
const skipSong = (next: boolean) => {
  if (!canSkip.value) return
  const glyph = next ? nextGlyph.value : previousGlyph.value
  glyph?.animate()
  emit('cutSong', next)
}
</script>

<template>
  <div class="center">
    <div class="cut-container" aria-label="播放控制">
      <button
        type="button"
        class="icon-button mode-button"
        :disabled="!canPlay"
        :title="modeNames[props.orderStatusVal]"
        :aria-label="`${modeNames[props.orderStatusVal]}，切换播放模式`"
        @click="emit('setOrderHandler')"
      >
        <v-icon :icon="modeIcons[props.orderStatusVal]" size="20" />
      </button>
      <button
        type="button"
        class="icon-button skip-button"
        :disabled="!canSkip"
        title="上一首"
        aria-label="上一首"
        @click="skipSong(false)"
      >
        <PlayerGlyph ref="previousGlyph" name="previous" />
      </button>
      <button
        type="button"
        class="icon-button play-button"
        :disabled="!canPlay"
        :title="props.isPlay ? '暂停' : '播放'"
        :aria-label="props.isPlay ? '暂停' : '播放'"
        @click="props.isPlay ? emit('pause') : emit('play')"
      >
        <PlayerGlyph :name="props.isPlay ? 'pause' : 'play'" />
      </button>
      <button
        type="button"
        class="icon-button skip-button"
        :disabled="!canSkip"
        title="下一首"
        aria-label="下一首"
        @click="skipSong(true)"
      >
        <PlayerGlyph ref="nextGlyph" name="next" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.center {
  color: rgb(212, 212, 212);
  width: 441px;
  display: flex;
  justify-content: center;
}
.cut-container {
  display: flex;
  align-items: center;
  gap: 35px;
}
.icon-button {
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
  color: inherit;
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition:
    opacity 150ms ease,
    background-color 150ms ease;
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
  &:active:not(:disabled) {
    opacity: 0.65;
    transform: scale(0.94);
  }
  &:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}
.mode-button {
  color: rgba(255, 255, 255, 0.56);
}
.skip-button svg {
  width: 23px;
  height: 23px;
}
.play-button {
  width: 37px;
  height: 37px;
  svg {
    width: 28px;
    height: 28px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .icon-button {
    transition: none;
  }
}
</style>
