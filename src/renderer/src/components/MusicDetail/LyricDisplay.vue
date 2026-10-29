<script lang="ts" setup>
import type { Yrc } from '@/utils'
import type { Lyric } from '@/store/music'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'

interface Props {
  lyric: Lyric[] | Yrc[]
  lrcMode: 1 | 0
  title: string
  bg?: string
  ar: any[]
  videoPlayUrl: string | null
  active?: boolean
}
const props = defineProps<Props>()
const coverContainer = useTemplateRef<HTMLDivElement>('coverContainer')
const videoCover = useTemplateRef<HTMLVideoElement>('videoCover')
const displayedCoverSrc = ref('')
const coverFailed = ref(false)
const coverSrc = computed(() => {
  if (!props.bg) return ''
  const url = new URL(props.bg, window.location.href)
  if (url.protocol === 'http:' || url.protocol === 'https:')
    url.searchParams.set('param', '600y600')
  return url.href
})

const syncVideo = () => {
  const video = videoCover.value
  if (!video) return
  if (props.active && props.videoPlayUrl && window.$audio?.isPlay) {
    void video.play().catch(() => {})
  } else video.pause()
}
onMounted(() => {
  watch(
    coverSrc,
    (src, _previous, onCleanup) => {
      const cover = coverContainer.value!
      let cancelled = false
      let animation: gsap.core.Timeline | undefined
      const image = new Image()
      onCleanup(() => {
        cancelled = true
        animation?.kill()
        image.onload = image.onerror = null
      })

      if (!src || !props.active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        displayedCoverSrc.value = src
        coverFailed.value = false
        gsap.set(cover, { clearProps: 'width,height' })
        return
      }

      // 旧图先缩到 10vh，等新封面加载好后再换图放大。
      const loaded = new Promise<boolean>((resolve) => {
        image.onload = () => resolve(true)
        image.onerror = () => resolve(false)
        image.src = src
      })
      const tl = gsap.timeline()
      animation = tl
      tl.to(cover, {
        height: '10vh',
        width: '10vh',
        duration: 0.3,
        ease: 'power1.out',
        transformOrigin: 'center'
      })
      void loaded.then((success) => {
        if (cancelled) return
        tl.to(cover, {
          height: '45vh',
          width: '45vh',
          duration: 0.3,
          ease: 'power1.out',
          transformOrigin: 'center',
          onStart: () => {
            displayedCoverSrc.value = src
            coverFailed.value = !success
          }
        })
      })
    },
    { immediate: true }
  )

  watch([() => props.active, () => props.videoPlayUrl, () => window.$audio?.isPlay], syncVideo, {
    flush: 'post',
    immediate: true
  })
})
</script>

<template>
  <div class="listening-layout" :class="{ 'no-lyrics': !props.lyric.length }">
    <div class="now-playing-column">
      <div class="cover-frame">
        <div ref="coverContainer" class="cover-container">
          <video
            ref="videoCover"
            class="video-cover"
            loop
            muted
            playsinline
            v-show="props.videoPlayUrl"
            :src="props.videoPlayUrl || undefined"
            :poster="coverSrc"
            @loadeddata="syncVideo"
          />
          <div
            v-show="!props.videoPlayUrl"
            :style="{
              backgroundImage:
                displayedCoverSrc && !coverFailed
                  ? `url(${JSON.stringify(displayedCoverSrc)})`
                  : undefined
            }"
            role="img"
            :aria-label="`${props.title || '歌曲'}的专辑封面`"
            class="img-cover"
          />
          <div
            v-if="!props.videoPlayUrl && (!displayedCoverSrc || coverFailed)"
            class="cover-placeholder"
            aria-label="暂无专辑封面"
          >
            <v-icon icon="mdi-music-note" size="72" />
          </div>
        </div>
      </div>
      <!-- 保持 Teleport 目标常驻，详情与底栏共用同一个音频实例。 -->
      <div class="music-detail-bottom" />
    </div>
    <div class="lyrics-column" v-show="props.lyric.length">
      <!-- 歌词实例只挂载一次，空歌词时也保留此节点。 -->
      <div class="lyric-container" v-show="props.lyric.length" aria-label="同步歌词" />
    </div>
  </div>
</template>

<style scoped lang="less">
.listening-layout {
  --artwork-size: clamp(220px, min(38vh, 31vw), 410px);
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  align-items: center;
  gap: clamp(56px, 8vw, 144px);
  max-width: 1500px;
  height: 100%;
  margin: 0 auto;
  padding: 88px clamp(48px, 7.5vw, 140px) 38px;
}
.listening-layout.no-lyrics {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
}
.now-playing-column {
  width: var(--artwork-size);
  max-width: 100%;
  min-width: 0;
  justify-self: center;
}
.cover-frame {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  place-items: center;
  width: 100%;
  height: var(--artwork-size);
  aspect-ratio: 1;
}
.cover-container {
  transition: 0.8s;
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.23),
    0 2px 8px rgba(0, 0, 0, 0.12);
}
.img-cover {
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  transition: background-image 0.8s;
}
.img-cover,
.video-cover,
.cover-placeholder {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-cover {
  position: absolute;
  inset: 0;
}
.cover-placeholder {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.3);
}
.music-detail-bottom {
  position: relative;
  width: 100%;
  min-height: 258px;
  margin-top: 25px;
}
.lyrics-column {
  position: relative;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.lyric-container {
  position: relative;
  height: 100%;
  width: 100%;
  border-radius: 5px;
  overflow: auto;
  mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
}
@media (max-height: 700px) and (min-width: 761px) {
  .listening-layout {
    --artwork-size: min(40vh, 30vw);
    padding-top: 76px;
    padding-bottom: 20px;
  }
  .music-detail-bottom {
    margin-top: 18px;
    min-height: 245px;
  }
}
@media (max-width: 1000px) {
  .listening-layout {
    gap: 44px;
    padding-inline: 46px;
  }
}
@media (max-width: 760px) {
  .listening-layout {
    --artwork-size: min(30vh, 270px);
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    padding: 92px 24px 28px;
    gap: 24px;
  }
}
@media (max-width: 560px) {
  .listening-layout {
    --artwork-size: min(27vh, 240px);
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(160px, 1fr);
    padding: 84px 30px 12px;
    gap: 16px;
  }
  .now-playing-column {
    width: min(100%, 350px);
  }
  .cover-frame {
    width: var(--artwork-size);
    margin: 0 auto;
  }
  .music-detail-bottom {
    margin-top: 18px;
    min-height: 240px;
  }
}
</style>
