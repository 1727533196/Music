<script setup lang="ts">
import { computed } from 'vue'
import { GetMusicDetailData } from '@/api/musicList'
import { useMusicAction } from '@/store/music'
import { useFlags } from '@/store/flags'

interface Props {
  songs: GetMusicDetailData
}
const props = defineProps<Props>()
const music = useMusicAction()
const flags = useFlags()

const model = computed<number>({
  get() {
    return (music.state.currentTime / window.$audio?.el.duration) * 100
  },
  set(val) {
    window.$audio.time = (val * window.$audio?.el.duration) / 100
  }
})
</script>

<template>
  <div
    :class="['base-progress-bar', flags.isOpenDetail ? 'detail-progress' : 'view-progress']"
    v-if="props.songs.ar"
    style="width: 100%"
  >
    <v-slider v-model="model"></v-slider>
    <!--        <el-slider-->
    <!--          v-model="model"-->
    <!--          @change="change"-->
    <!--          :show-tooltip="false"-->
    <!--          :show-stops="false"-->
    <!--          :step="0.000001"-->
    <!--        />-->
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
