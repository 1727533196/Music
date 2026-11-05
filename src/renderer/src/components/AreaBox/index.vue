<script lang="ts" setup>
import { getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'

interface Props {
  isMove?: boolean
}
const props = withDefaults(defineProps<Props>(), { isMove: true })
const emit = defineEmits(['titleClick'])
const instance = getCurrentInstance()
const content = ref<HTMLDivElement>()
const leftDisabled = ref(true)
const rightDisabled = ref(true)
let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined
let updateFrame = 0

const hasTitleAction = () => !!instance?.vnode.props?.onTitleClick
const updateScrollState = () => {
  updateFrame = 0
  const element = content.value
  if (!element) return
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth)
  leftDisabled.value = element.scrollLeft <= 1
  rightDisabled.value = element.scrollLeft >= maxScroll - 1
}
const scheduleUpdate = () => {
  if (!updateFrame) updateFrame = requestAnimationFrame(updateScrollState)
}
const observeContent = () => {
  const element = content.value
  if (!element) return
  resizeObserver?.disconnect()
  resizeObserver?.observe(element)
  for (const child of element.children) resizeObserver?.observe(child)
  scheduleUpdate()
}
const moveHandler = (direction: 'left' | 'right') => {
  const element = content.value
  if (!element || (direction === 'left' ? leftDisabled.value : rightDisabled.value)) return
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth)
  const step = Math.max(1, element.clientWidth * 0.9)
  const next = element.scrollLeft + (direction === 'right' ? step : -step)
  element.scrollTo({
    left: Math.max(0, Math.min(maxScroll, next)),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  })
}
onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleUpdate)
  mutationObserver = new MutationObserver(observeContent)
  if (content.value) {
    mutationObserver.observe(content.value, { childList: true, subtree: true, characterData: true })
  }
  observeContent()
  window.addEventListener('resize', scheduleUpdate, { passive: true })
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  if (updateFrame) cancelAnimationFrame(updateFrame)
  window.removeEventListener('resize', scheduleUpdate)
})
</script>

<template>
  <section class="area-box">
    <header class="head">
      <h2 class="title">
        <button
          v-if="hasTitleAction()"
          type="button"
          class="title-button"
          @click="emit('titleClick')"
        >
          <slot name="title"></slot>
          <v-icon icon="mdi-chevron-right" size="21" aria-hidden="true" />
        </button>
        <slot v-else name="title"></slot>
      </h2>
      <div v-if="props.isMove" class="move-container">
        <button
          type="button"
          class="move left"
          aria-label="向左翻页"
          :disabled="leftDisabled"
          @click="moveHandler('left')"
        >
          <v-icon icon="mdi-chevron-left" size="20" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="move right"
          aria-label="向右翻页"
          :disabled="rightDisabled"
          @click="moveHandler('right')"
        >
          <v-icon icon="mdi-chevron-right" size="20" aria-hidden="true" />
        </button>
      </div>
    </header>
    <div
      ref="content"
      class="content"
      @scroll.passive="scheduleUpdate"
      @load.capture="scheduleUpdate"
    >
      <slot></slot>
    </div>
  </section>
</template>

<style lang="less" scoped>
.area-box {
  position: relative;
  min-width: 0;
  margin-top: 24px;
  container-type: inline-size;
  color: var(--app-text);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.title {
  min-width: 0;
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
}
.title-button {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:hover {
    color: var(--app-accent);
  }
}
.move-container {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}
.move {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  background: transparent;
  color: var(--app-muted);
  cursor: pointer;
  transition:
    background 0.16s,
    color 0.16s;
  &:hover:not(:disabled) {
    background: var(--app-surface);
    color: var(--app-text);
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}
.move,
.title-button {
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.content {
  position: relative;
  display: flex;
  gap: 18px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px 6px 8px;
  margin: -6px -6px -8px;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  &::-webkit-scrollbar {
    display: none;
  }
}
@media (max-width: 600px) {
  .content {
    gap: 14px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .move {
    transition: none;
  }
}
</style>
