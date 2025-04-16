<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import { computed } from 'vue'
import { columns } from '@/components/PlayListDrawer/config'
import { playListState } from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import { useTheme } from '@/store/theme'

interface Props {
  modelValue: boolean
}
const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])
const music = useMusicAction()
const theme = useTheme()

const setModelValue = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  }
})
</script>

<template>
  <div @click.stop :class="['drawer', { 'open-drawer': setModelValue }]">
    <div class="head">
      <div class="left">
        <span class="text">播放列表</span>
        <span class="count">{{ music.state.runtimeIds.length }}</span>
      </div>
    </div>
    <SongList
      @play="music.getMusicUrlHandler"
      :columns="columns"
      :loading="playListState.loading"
      :songs="music.state.songs"
      :ids="music.state.runtimeIds"
      :list="music.state.runtimeList?.tracks || []"
      :list-info="music.state.runtimeList"
      :lazy="true"
      :is-need-title="false"
      :scroll="true"
    />
  </div>
</template>

<style scoped lang="less">
.drawer {
  position: fixed;
  z-index: 2001;
  height: calc(100% - 200px);
  width: 400px;
  //background: transparent;
  color: #fff;
  background-color: rgba(40, 40, 40, 0.7);
  right: 0;
  top: 90px;
  border-radius: 15px 0 0 15px;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.3);
  transform: translateX(120%);
  transition: 0.4s;
  overflow: hidden;
  backdrop-filter: blur(60px) saturate(210%);
  .head {
    height: 60px;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0 20px;
    //background-color: #13131a;
    .left {
      .text {
        font-size: 18px;
        color: white;
      }
      .count {
        color: @darkText;
        font-size: 14px;
        position: relative;
        left: 2px;
        top: -3px;
      }
    }
  }
  :deep(.song-list-container) {
    padding: 10px 10px;
    margin-top: 0;
    height: calc(100% - 60px);
    .list {
      justify-content: space-between !important;
      padding: 20px;
    }
  }
}
.open-drawer.drawer {
  //visibility: visible;
  transform: translateX(0%);
}
</style>
