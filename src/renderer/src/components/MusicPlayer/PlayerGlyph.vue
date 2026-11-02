<script setup lang="ts">
import { onBeforeUnmount, useTemplateRef } from 'vue'
import gsap from 'gsap'

const props = defineProps<{
  name: 'previous' | 'next' | 'play' | 'pause' | 'speaker' | 'volume' | 'mute' | 'star'
  filled?: boolean
}>()

const skipTriangles = useTemplateRef<SVGGElement>('skipTriangles')
const favoriteMark = useTemplateRef<SVGGElement>('favoriteMark')
const favoriteRing = useTemplateRef<SVGCircleElement>('favoriteRing')
let favoriteAnimation: gsap.core.Timeline | undefined
const resetFavorite = () => {
  favoriteAnimation?.kill()
  favoriteMark.value?.removeAttribute('transform')
  favoriteRing.value?.removeAttribute('transform')
  favoriteRing.value?.setAttribute('opacity', '0')
}
const animateFavorite = (adding: boolean) => {
  resetFavorite()
  const mark = favoriteMark.value
  const ring = favoriteRing.value
  if (
    props.name !== 'star' ||
    !mark ||
    !ring ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return

  const motion = { scale: 1, rotation: 0, ringScale: 0.65, ringOpacity: 0 }
  const render = () => {
    mark.setAttribute(
      'transform',
      `translate(16 16) rotate(${motion.rotation}) scale(${motion.scale}) translate(-16 -16)`
    )
    ring.setAttribute('transform', `translate(16 16) scale(${motion.ringScale}) translate(-16 -16)`)
    ring.setAttribute('opacity', String(motion.ringOpacity))
  }
  favoriteAnimation = gsap.timeline({ onUpdate: render, onComplete: resetFavorite })
  if (adding) {
    favoriteAnimation
      .to(motion, { scale: 0.72, rotation: -12, duration: 0.1, ease: 'power2.out' })
      .to(motion, { scale: 1.18, rotation: 5, duration: 0.2, ease: 'power2.out' })
      .to(motion, { scale: 1, rotation: 0, duration: 0.3, ease: 'elastic.out(1, 0.55)' })
      .set(motion, { ringOpacity: 0.4 }, 0.1)
      .to(motion, { ringScale: 1.08, ringOpacity: 0, duration: 0.4, ease: 'power2.out' }, 0.1)
  } else {
    favoriteAnimation
      .to(motion, { scale: 0.72, rotation: -8, duration: 0.12, ease: 'power2.out' })
      .to(motion, { scale: 1, rotation: 0, duration: 0.26, ease: 'back.out(1.7)' })
  }
}
const triangle =
  'M3.7 6.2C2.6 5.5 1.5 6.2 1.5 7.5v17c0 1.3 1.1 2 2.2 1.3l12.2-8.4c1.1-.7 1.1-2.1 0-2.8L3.7 6.2Z'
let animation: gsap.core.Timeline | undefined
const reset = () => {
  animation?.kill()
  const paths = skipTriangles.value?.querySelectorAll('path')
  paths?.forEach((path, index) => {
    path.removeAttribute('transform')
    path.setAttribute('opacity', index === 0 ? '0' : '1')
  })
}
const animate = () => {
  reset()
  if (!skipTriangles.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const triangles = [...skipTriangles.value.querySelectorAll('path')].map((path, index) => ({
    path,
    x: index === 0 ? -14 : 0,
    scale: index === 0 ? 0.25 : 1,
    opacity: index === 0 ? 0 : 1
  }))
  // 固定在 SVG 本地坐标的同一条中心线上，避免缩放中心随镜像或复位漂移。
  const render = () => {
    triangles.forEach(({ path, x, scale, opacity }) => {
      path.setAttribute('transform', `translate(${x + 9} 16) scale(${scale}) translate(-9 -16)`)
      path.setAttribute('opacity', String(opacity))
    })
  }
  render()
  const [incoming, trailing, leading] = triangles
  animation = gsap
    .timeline({ onUpdate: render, onComplete: reset })
    .to(
      incoming,
      {
        x: 0,
        scale: 1,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      },
      0.04
    )
    .to(trailing, { x: 14, duration: 0.34, ease: 'power2.inOut' }, 0)
    .to(
      leading,
      {
        x: 14,
        scale: 0.25,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in'
      },
      0
    )
}
onBeforeUnmount(() => {
  reset()
  resetFavorite()
})
defineExpose({ animate, animateFavorite })
</script>

<template>
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
    <g
      v-if="name === 'previous' || name === 'next'"
      :transform="name === 'previous' ? 'translate(32 0) scale(-1 1)' : undefined"
    >
      <g ref="skipTriangles">
        <path :d="triangle" opacity="0" />
        <path :d="triangle" />
        <g transform="translate(14 0)"><path :d="triangle" /></g>
      </g>
    </g>
    <path
      v-else-if="name === 'play'"
      d="M8.4 3.8C6.9 2.9 5.5 3.7 5.5 5.4v21.2c0 1.7 1.4 2.5 2.9 1.6l18.1-10.5c1.6-.9 1.6-2.5 0-3.4L8.4 3.8Z"
    />
    <g v-else-if="name === 'pause'">
      <rect x="6" y="4" width="7.5" height="24" rx="1.6" />
      <rect x="18.5" y="4" width="7.5" height="24" rx="1.6" />
    </g>
    <g v-else-if="name === 'star'">
      <circle
        ref="favoriteRing"
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        opacity="0"
      />
      <g ref="favoriteMark">
        <path
          d="m16 3.8 3.7 7.5 8.3 1.2-6 5.9 1.4 8.3-7.4-3.9-7.4 3.9L10 18.4l-6-5.9 8.3-1.2L16 3.8Z"
          :fill="filled ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </g>
    </g>
    <g v-else>
      <path
        d="M3.5 12h4.2l7-5.8c.8-.7 1.8-.2 1.8.9v17.8c0 1.1-1 1.6-1.8.9l-7-5.8H3.5c-.8 0-1.3-.5-1.3-1.3v-5.4c0-.8.5-1.3 1.3-1.3Z"
      />
      <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <template v-if="name === 'volume'">
          <path d="M21 10.5a8 8 0 0 1 0 11" />
          <path d="M25 6.5a13.5 13.5 0 0 1 0 19" />
        </template>
        <path v-else-if="name === 'mute'" d="m22 12 7 8m0-8-7 8" />
      </g>
    </g>
  </svg>
</template>
