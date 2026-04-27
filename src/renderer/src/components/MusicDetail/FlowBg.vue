<script setup lang="ts">
import { colorExtraction, gradualChange, useRhythm } from '@/components/MusicDetail/useMusic'
import {nextTick, onMounted, ref, watch} from 'vue'
import { findBestColors, toggleImg } from '@/utils'
import { useMusicAction } from '@/store/music'
import { useSettings } from '@/store/settings'
import FluidBackground from '@/components/FluidBackground/index.vue'

interface Props {
  bg: string
}

const props    = defineProps<Props>()
const music    = useMusicAction()
const settings = useSettings()

// ★ 给默认值，确保 shader 初始就有颜色可用（Lover 封面色）
const bestColors = ref<number[][]>([
  [255, 182, 210], // 粉
  [180, 140, 255], // 紫
  [255, 220, 160], // 橙金
  [160, 200, 255], // 天蓝
])

onMounted(() => {
  const rhythmBox = document.querySelector('#rhythm-box') as HTMLDivElement
  const { splitImg } = useRhythm(rhythmBox)

  watch(
    [() => props.bg, () => settings.state.lyricBg],
    ([bg, lyricBg]) => {
      if (!bg) return

      console.log('lyricBg', lyricBg)
      toggleImg(bg, '200y200').then((img) => {
        const rgb    = colorExtraction(img)
        const colors = findBestColors(rgb, 10) // ★ 提取4色，效果更丰富

        console.log('提取的颜色:', colors)

        // 确保有颜色才更新，避免传入空数组
        if (colors && colors.length > 0) {
          bestColors.value = colors
        }

        music.updateBgColor(colors)
        gradualChange(img, colors)

        console.log('rhythmBox', rhythmBox)
        if (lyricBg === 'rhythm' && rhythmBox) {
          nextTick(() => {
            splitImg(img)
          })
        }
      })
    },
    { immediate: true }
  )
})
</script>

<template>
  <div class="music-detail-bg">
    <FluidBackground
      v-if="settings.state.lyricBg === 'shader'"
      :main-color="bestColors"
    />
    <div v-show="settings.state.lyricBg !== 'shader'">
      <div id="gradual1" />
      <div id="gradual2" />
      <div v-show="settings.state.lyricBg === 'rhythm'" id="rhythm-box" />
    </div>
  </div>
</template>

<style scoped lang="less">
/* ★ 修复1：class名与template一致 */
.music-detail-bg {
  //position: relative;   /* FluidBackground absolute 的定位基准 */
  //width: 100vw;
  //height: 100vh;
  //overflow: hidden;
}

.content-layer {
  position: relative;
  z-index: 10;          /* 内容层叠在背景上面 */
  width: 100%;
  height: 100%;
}

#gradual1,
#gradual2 {
  height: 100%;
  width: 100%;
  transition: 1s;
  position: absolute;
}

#rhythm-box {
  position: absolute;
  width: 100%;
  height: 100%;
  filter: blur(120px);

  :global(.cut-image) {
    transition: 0.3s linear;
  }
}
</style>
