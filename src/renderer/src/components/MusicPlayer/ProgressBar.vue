<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GetMusicDetailData } from '@/api/musicList'
import { useMusicAction } from '@/store/music'
import { useFlags } from '@/store/flags'

interface Props {
  songs: GetMusicDetailData
}
const props = defineProps<Props>()
const music = useMusicAction()
const flags = useFlags()
const seekPreview = ref<number | null>(null)

const model = computed<number>({
  get() {
    if (seekPreview.value !== null) return seekPreview.value
    const duration = window.$audio?.el.duration
    return Number.isFinite(duration) && duration > 0
      ? (music.state.currentTime / duration) * 100
      : 0
  },
  set(val) {
    seekPreview.value = val
  }
})

const seek = (value: number | null = seekPreview.value) => {
  seekPreview.value = null
  const duration = window.$audio?.el.duration
  if (value === null || !Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0)
    return
  const seconds = (Math.min(100, Math.max(0, value)) * duration) / 100
  window.$audio.time = seconds
  music.state.currentTime = seconds
  if (!window.$audio.isPlay) void window.$audio.play()
}

watch(
  () => props.songs?.id,
  () => {
    seekPreview.value = null
  }
)
</script>

<template>
  <div
    :class="['base-progress-bar', flags.isOpenDetail ? 'detail-progress' : 'view-progress']"
    v-if="props.songs.ar"
    style="width: 100%"
  >
    <v-slider v-model="model" @end="seek" @keyup="seek()"></v-slider>
  </div>
</template>

<style scoped lang="less">
:deep(.el-slider__button-wrapper) {
  cursor: pointer !important;
  display: none;
}
:deep(.v-slider-thumb) {
  display: none;
}
:deep(.el-slider__runway) {
  height: 1px;
  width: 100%;
  padding: 15px 0;
  background-color: transparent;
}

:deep(.el-slider) {
  width: 100%;
}
</style>
<style lang="less">
.base-progress-bar.view-progress {
  height: 31px;
  .v-input {
    margin-inline: 0;
  }
  .v-slider-track__fill {
    height: 1px;
    background-color: rgb(236, 65, 65);
    border-radius: 0;
  }
}
.base-progress-bar {
  .v-input__details {
    display: none;
  }
  .v-slider-track__background {
    display: none;
  }
}

.music-detail-bottom {
  .base-progress-bar.detail-progress {
    height: 30px;
    .v-slider-track__fill {
      height: 6px;
      background-image: linear-gradient(
        to right,
        rgb(v-bind('music.state.bgColor[1]')),
        rgb(v-bind('music.state.bgColor[0]'))
      );
      opacity: 0.8;
      border-radius: 6px;
      background-color: transparent;
    }
    .v-input {
      margin-inline: 0;
    }
  }
}
</style>
