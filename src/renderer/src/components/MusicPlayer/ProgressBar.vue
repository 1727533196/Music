<script setup lang="ts">
import {computed} from "vue";
import {GetMusicDetailData} from "@/api/musicList";
import {useMusicAction} from "@/store/music";

interface Props {
  songs: GetMusicDetailData
}
const props = defineProps<Props>()
const music = useMusicAction()
const change = (val: number) => {
  $audio.time = val * $audio.el.duration / 100
}
const model = computed<number>({
  get() {
    return music.state.currentTime / $audio.el.duration * 100
  },
  set(val) {
    $audio.time = val * $audio.el.duration / 100
  }
})
</script>

<template>
  <div class="base-progress-bar" v-if="props.songs.ar" style="width: 100%">
    <el-slider
      v-model="model"
      @change="change"
      :show-tooltip="false"
      :show-stops="false"
      :step="0.000001"
    />
  </div>
</template>

<style scoped lang="less">
:deep(.el-slider__button-wrapper) {
  cursor: pointer !important;
  display: none;
}
:deep(.el-slider__button) {
  display: none;
}
:deep(.el-slider__runway) {
  height: 1px;
  width: 100%;
  padding: 15px 0;
  background-color: transparent;
}
:deep(.el-slider__bar) {
  height: 1px;
  background-color: rgb(236,65,65);
  border-radius: 0;
}
:deep(.el-slider) {
  width: 100%;
}
</style>
<style lang="less">
.music-detail-container {
  .base-progress-bar {
    .el-slider__bar {
      height: 6px;
      background-image: linear-gradient(to right, rgb(v-bind('music.state.bgColor[1]')), rgb(v-bind('music.state.bgColor[0]')));
      opacity: 0.8;
      border-radius: 6px;
      background-color: transparent;
    }
  }
}
</style>
