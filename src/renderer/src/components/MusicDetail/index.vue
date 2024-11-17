<script setup lang="ts">
import { computed, onMounted, ref, onUnmounted } from 'vue'
import { useMusicAction } from '@/store/music'
import LyricDisplay from './LyricDisplay.vue'
import FlowBg from './FlowBg.vue'

interface Props {
  modelValue: boolean
}
const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])
const music = useMusicAction()
const correctHeight = ref<number>(0)

const bg = computed(() => {
  return music.state.songs?.al?.picUrl || ''
})
const setModelValue = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  }
})

const closeDetail = () => {
  setModelValue.value = false
}

onMounted(() => {
  window.onresize = () => {
    correctHeight.value = document.body.clientHeight
  }
  correctHeight.value = document.body.clientHeight
})
onUnmounted(() => {
  window.onresize = null
})
</script>

<template>
  <div ref="containerEl" :class="['container', { open: setModelValue }]">
    <el-icon :size="45" @click="closeDetail" class="close np-drag"><ArrowDown /></el-icon>
    <div class="box" :style="{ height: correctHeight + 'px' }">
      <div class="scroll-box" :style="{ height: correctHeight * 2 + 'px' }">
        <FlowBg :bg="bg" />
        <div class="music-detail-container">
          <LyricDisplay
            :lyric="music.state.lyric"
            :lrcMode="music.state.lrcMode"
            :bg="bg"
            :title="music.state.songs.name"
            :ar="music.state.songs.ar"
            :videoPlayUrl="music.state.videoPlayUrl"
          />
          <div class="test" style="height: 80px; position: absolute; bottom: 0; width: 100%"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.container {
  visibility: hidden;
  position: fixed;
  height: 100%;
  width: 100%;
  bottom: 0;
  left: 0;
  transition: 0.4s;
  z-index: 2000;
  overflow: hidden;
  transform: translateY(100%);

  .box {
    overflow: hidden;
    width: 100%;
    .scroll-box {
      position: relative;
      transition: 0.5s;
      overflow: hidden;
      background-color: @bgColor;
    }
  }
  .close {
    z-index: 1;
    position: absolute;
    top: 12px;
    left: 15px;
    padding: 10px;
    font-size: 20px;
    cursor: pointer;
  }
  // 这里使用fixed是为了让高度固定, 如果参考container的高度,会导致在过渡过程中图片按比例缩放
  .music-detail-container {
    position: fixed;
    height: 100%;
    width: 100%;
    transition: 1s;
    .bgSetting();
  }
}
.container.open {
  transform: translateY(0) !important;
  visibility: visible;
  .test {
    background-color: rgba(255, 255, 255, 0.05);
  }
}
</style>
