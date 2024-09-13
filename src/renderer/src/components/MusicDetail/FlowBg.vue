<script setup lang="ts">
import {colorExtraction, gradualChange, useRhythm} from '@/components/MusicDetail/useMusic';
import {onMounted, ref, watch} from 'vue';
import {findBestColors, toggleImg} from '@/utils';
import {useMusicAction} from '@/store/music';
import ShaderToy from '@/components/ShaderToy/ShaderToy.vue';

interface Props {
  bg: string
}

const props = defineProps<Props>()
const music = useMusicAction()
const rgb = ref([[], []])
onMounted(() => {
  const rhythmBox = document.querySelector('#rhythm-box') as HTMLDivElement
  const {splitImg} = useRhythm(rhythmBox)

  // 图片切换时，更新流动背景
  watch(() => props.bg, (val) => {
    toggleImg(val, '200y200').then(img => {
      rgb.value = colorExtraction(img)
      console.log('rgb', rgb.value)
      const bestColors = findBestColors(rgb.value, 2)
      gradualChange(img, bestColors);
      music.updateBgColor(bestColors)
      splitImg(img)
    })
  })
})
function convertColors(colors) {
  return colors.map(color => `rgb(${color[0]},${color[1]},${color[2]})`);
}


</script>

<template>
  <div>
<!--    <ShaderToy :key="rgb" :main-color="[rgb[0], rgb[1]]"/>-->
    <div id="gradual1"/>
    <div id="gradual2"/>
    <div id="rhythm-box"/>
  </div>
</template>

<style scoped lang="less">
#gradual1, #gradual2 {
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
