<script setup lang="ts">
import {formattingTime} from "@/utils";
import {GetMusicDetailData} from "@/api/musicList";
import Volume from "@/components/MusicPlayer/Volume.vue";
import {useFlags} from "@/store/flags";

interface Props {
  songs: GetMusicDetailData
  currentTime: number
  audio: HTMLAudioElement
}

const props = defineProps<Props>()
const flags = useFlags()

const openDrawer = () => {
  flags.isOpenDrawer = !flags.isOpenDrawer
}
</script>

<template>
  <div class="right">
    <div style="display:flex;">
      <div v-if="props.songs.ar" class="current-time">{{ formattingTime(props.currentTime * 1000) }}</div>
      <span style="margin: 0 5px;line-height: 15px">/</span>
      <div v-if="props.songs.ar" class="total-time">{{ formattingTime(props.songs.dt) }}</div>
    </div>
    <el-icon @click.stop="openDrawer" class="list"><Expand /></el-icon>
    <Volume :audio="props.audio"></Volume>
  </div>
</template>

<style scoped lang="less">
.right {
  width: 27%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .current-time, .total-time {
    color: @text;
    font-size: 12px;
  }
  .list {
    font-size: 20px;
    cursor: pointer;
  }
}
</style>
