<script lang="ts" setup>
import {toggleImg, Yrc} from "@/utils";
import {Lyric} from "@/store/music";
import {nextTick, watch} from "vue";
import gsap from "gsap";

interface Props {
  lyric: Lyric[] | Yrc[]
  lrcMode: 1 | 0
  bg?: string
  isBlur?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  isBlur: true,
})

nextTick(() => {
  const bgEl = document.querySelector('.bg-img') as HTMLDivElement
  watch(() => props.bg, (val) => {
    if (!bgEl) return; // 如果找不到元素，直接返回

    // 创建一个 GSAP 时间轴
    const tl = gsap.timeline();
    // 使用时间轴先缩小元素
    tl.to(bgEl, {
      height: '10vh',
      width: '10vh',
      duration: 0.3, // 缩小动画时长，单位为秒
      ease: 'power1.out', // 缓动函数
    });

    toggleImg(val,'600y600').then(img => {
      bgEl.style.backgroundImage = `url(${img.src})`

      tl.to(bgEl, {
        height: '45vh',
        width: '45vh',
        duration: 0.3, // 放大动画时长，单位为秒
        ease: 'power1.out', // 缓动函数
        // 在动画开始时设置背景图片
        onStart: () => {
          bgEl.style.backgroundImage = `url(${img.src})`;
        }
      });

    })
  })
})

</script>

<template>
  <div :style="{'backdrop-filter': isBlur ? 'blur(0px)' : 'none' }" class="shadow">
    <div class="lyric-and-bg-container">
      <div :style="{transform: props.lyric.length ? '' : 'translateX(0)'}" class="bg-img"/>
      <div
        class="lyric-container"
        v-show="props.lyric.length"
      ></div>
    </div>
  </div>
</template>

<style scoped lang="less">
.shadow {
  backdrop-filter: blur(8px);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  .lyric-and-bg-container {
    display: flex;
    margin-top: 17vh;
    justify-content: space-around;
    align-items: center;
    height: 58vh;
    transition: 1s;
    .bg-img {
      transition: 0.8s;
      width: 45vh;
      height: 45vh;
      border-radius: 5px;
      transform: translateX(3vw);
      .bgSetting();
    }
    .lyric-container {
      height: 145%;
      width: 40vw;
      border-radius: 5px;
      overflow: auto;
      mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
      -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
      position: relative;
    }
  }
}
</style>
