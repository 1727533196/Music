<script lang="ts" setup>
import { toggleImg, Yrc } from '@/utils'
import { Lyric } from '@/store/music'
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { useRouter } from 'vue-router'
import { useFlags } from '@/store/flags'

interface Props {
  lyric: Lyric[] | Yrc[]
  lrcMode: 1 | 0
  title: string
  bg?: string
  isBlur?: boolean
  ar: any[]
  videoPlayUrl: string | null
}
const props = withDefaults(defineProps<Props>(), {
  isBlur: true
})
const router = useRouter()
const flash = useFlags()
const videoCover = useTemplateRef('videoCover')

nextTick(() => {
  const bgEl = document.querySelector('.cover-container') as HTMLDivElement
  const coverEl = document.querySelector('.img-cover') as HTMLDivElement

  watch(
    () => $audio.isPlay,
    (value) => {
      if (!props.videoPlayUrl) {
        return
      }
      if (!value) {
        videoCover.value.pause()
      } else {
        videoCover.value.play()
      }
    }
  )
  watch(
    () => props.bg,
    async (val) => {
      if (!bgEl) return // 如果找不到元素，直接返回
      // 创建一个 GSAP 时间轴
      const tl = gsap.timeline()
      // 使用时间轴先缩小元素
      tl.to(bgEl, {
        height: '10vh',
        width: '10vh',
        duration: 0.3, // 缩小动画时长，单位为秒
        ease: 'power1.out', // 缓动函数
        transformOrigin: 'center' // 确保缩放围绕中心
      })

      toggleImg(val, '600y600').then((img) => {
        tl.to(bgEl, {
          height: '45vh',
          width: '45vh',
          duration: 0.3, // 放大动画时长，单位为秒
          ease: 'power1.out', // 缓动函数
          transformOrigin: 'center', // 确保缩放围绕中心
          // 在动画开始时设置背景图片
          onStart: () => {
            if (!props.videoPlayUrl) {
              ;(coverEl as HTMLDivElement).style.backgroundImage = `url(${img.src})`
            }
          }
        })
      })
    }
  )
})
const arNames = computed(() => {
  let result = ''
  props.ar.forEach((item, index) => {
    result += props.ar.length - 1 !== index ? item.name + '/' : item.name
  })
  return result
})
</script>

<template>
  <div :style="{ 'backdrop-filter': isBlur ? 'blur(0px)' : 'none' }" class="shadow">
    <div class="lyric-and-bg-container">
      <div
        class="cover-container"
        :style="{ transform: props.lyric.length ? '' : 'translateX(0)' }"
      >
        <div
          @click="
            () => {
              flash.isOpenDetail = false
              router.push({
                path: `/search`,
                query: {
                  key: props.title + '-' + arNames
                }
              })
            }
          "
          class="title"
        >
          {{ props.title }} -
          <span v-for="(item, index) in props.ar"
            >{{ item.name }} <span v-if="props.ar.length - 1 !== index">/</span></span
          >
        </div>
        <video
          ref="videoCover"
          class="video-cover"
          autoplay
          loop
          muted
          v-show="props.videoPlayUrl"
          :src="props.videoPlayUrl"
        ></video>
        <div v-show="!props.videoPlayUrl" class="img-cover" />
      </div>

      <div class="lyric-container" v-show="props.lyric.length"></div>
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
  background-color: rgba(0, 0, 0, 0.5);
  .lyric-and-bg-container {
    display: flex;
    margin-top: 17vh;
    justify-content: space-around;
    align-items: center;
    height: 58vh;
    transition: 1s;
    .cover-container {
      width: 45vh;
      transform-origin: center;
      transition: 0.8s;
    }
    .title {
      font-size: 25px;
      font-weight: 500;
      width: 100%;
      cursor: pointer;
      .textOverflow(1);
    }
    .video-cover {
      height: 100%;
      width: 100%;
      border-radius: 5px;
    }
    .img-cover {
      height: 100%;
      width: 100%;
      border-radius: 5px;
      transition: 0.8s;
      .bgSetting();
    }
    .lyric-container {
      height: 145%;
      width: 40vw;
      border-radius: 5px;
      overflow: auto;
      mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent,
        black 10%,
        black 90%,
        transparent
      );
      position: relative;
    }
  }
}
</style>
