<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUserInfo } from '@/store'
import PlayerGlyph from './PlayerGlyph.vue'

interface Props {
  audio?: HTMLAudioElement
}
const props = defineProps<Props>()
const model = ref(0)
const store = useUserInfo()
const savedVolume = localStorage.getItem('volume')
const initialVolume = savedVolume === null ? store.volume : Number(savedVolume)
if (Number.isFinite(initialVolume)) store.volume = Math.min(1, Math.max(0, initialVolume))
const lastVolume = ref(store.volume > 0 ? store.volume : 1)

// 详情页和底栏切换时，音量滑块保持与共享状态一致。
watch(
  () => store.volume,
  (value) => {
    model.value = value * 100
    if (value > 0) lastVolume.value = value
  },
  { immediate: true }
)

watch(
  () => props.audio,
  (value) => {
    if (value) value.volume = Math.min(1, Math.max(0, store.volume))
  },
  { immediate: true }
)
const setVolume = (value: number) => {
  if (!Number.isFinite(value)) return
  const next = Math.min(1, Math.max(0, value))
  if (next > 0) lastVolume.value = next
  model.value = next * 100
  store.volume = next
  localStorage.setItem('volume', String(next))
  const audio = props.audio || window.$audio?.el
  if (audio) audio.volume = next
}
const volumeHandler = (target: boolean) => {
  setVolume(target ? 0 : lastVolume.value)
}
const input = () => {
  setVolume(volume.value)
}
const change = () => {
  setVolume(volume.value)
}
const volume = computed(() => {
  return model.value / 100
})
</script>

<template>
  <div class="volume-box">
    <button
      type="button"
      class="volume-button"
      :title="volume ? '静音' : '取消静音'"
      :aria-label="volume ? '静音' : '取消静音'"
      :aria-pressed="volume === 0"
      @click="volumeHandler(volume !== 0)"
    >
      <PlayerGlyph :name="volume ? 'speaker' : 'mute'" />
    </button>
    <el-slider
      v-model="model"
      @change="change"
      @input="input"
      :show-tooltip="false"
      :show-stops="false"
      aria-label="音量"
      :format-tooltip="(value: number) => `${value}%`"
    />
  </div>
</template>

<style scoped lang="less">
.volume-box {
  width: 116px;
  min-width: 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  .volume-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--app-muted);
    cursor: pointer;
    margin-right: 8px;
    transition:
      opacity 150ms ease,
      background-color 150ms ease;
    svg {
      width: 22px;
      height: 22px;
    }
    &:hover {
      background: var(--app-hover);
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}

:deep(.el-slider) {
  width: 80px;
  min-width: 0;
  flex: 1;
}
:deep(.el-slider__button-wrapper) {
  cursor: pointer !important;
}
:deep(.el-slider__button) {
  display: none;
}
:deep(.el-slider__bar) {
  background-color: var(--app-accent);
  height: 5px;
  border-radius: 3px;
}
:deep(.el-slider__runway) {
  height: 5px;
  background-color: var(--app-surface-strong);
}
@media (max-width: 560px) {
  .volume-box {
    width: 98px;
  }
  .volume-box .volume-button {
    margin-right: 5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .volume-button {
    transition: none;
  }
}
</style>
