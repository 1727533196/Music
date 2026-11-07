<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getEventVideoUrl } from '@/api/events'

export interface PreviewVideo {
  kind: 'mv' | 'video'
  id: string
  title: string
  cover?: string
}
const props = withDefaults(
  defineProps<{
    images?: string[]
    initialIndex?: number
    video?: PreviewVideo
  }>(),
  { images: () => [], initialIndex: 0 }
)
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const videoEl = ref<HTMLVideoElement>()
const stage = ref<HTMLDivElement>()
const imageEl = ref<HTMLImageElement>()
const index = ref(Math.max(0, Math.min(props.initialIndex, props.images.length - 1)))
const image = computed(() => props.images[index.value] || '')
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
let drag: {
  id: number
  x: number
  y: number
  offsetX: number
  offsetY: number
  element: HTMLElement
} | null = null
const loading = ref(true)
const failed = ref(false)
const imageAttempt = ref(0)
const videoUrl = ref('')
let alive = true

function close() {
  dialog.value?.close()
}
function move(delta: number) {
  if (props.images.length < 2) return
  index.value = (index.value + delta + props.images.length) % props.images.length
}
function endDrag() {
  const previous = drag
  drag = null
  dragging.value = false
  if (previous?.element.hasPointerCapture(previous.id))
    previous.element.releasePointerCapture(previous.id)
}
function resetView() {
  endDrag()
  scale.value = 1
  offset.value = { x: 0, y: 0 }
}
function zoom(delta: number, pointer?: { x: number; y: number }) {
  if (props.video || failed.value || loading.value || !imageEl.value || !stage.value) return
  endDrag()
  const next = Math.max(0.5, Math.min(3, Math.round((scale.value + delta) * 10) / 10))
  const imageBounds = imageEl.value.getBoundingClientRect()
  const viewport = stage.value.getBoundingClientRect()
  const anchor = pointer ?? {
    x: viewport.left + viewport.width / 2,
    y: viewport.top + viewport.height / 2
  }
  const ratio = next / scale.value
  // 平移量使用屏幕像素；按缩放比修正偏移，让锚点下的图片内容保持原位。
  offset.value = {
    x: offset.value.x + (anchor.x - imageBounds.left - imageBounds.width / 2) * (1 - ratio),
    y: offset.value.y + (anchor.y - imageBounds.top - imageBounds.height / 2) * (1 - ratio)
  }
  scale.value = next
}
function onWheel(event: WheelEvent) {
  if (props.video) return
  event.preventDefault()
  event.stopPropagation()
  if (event.deltaY) zoom(event.deltaY > 0 ? -0.2 : 0.2, { x: event.clientX, y: event.clientY })
}
function startDrag(event: PointerEvent) {
  if (loading.value || failed.value || drag || event.button !== 0 || !imageEl.value) return
  event.preventDefault()
  const element = imageEl.value
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    offsetX: offset.value.x,
    offsetY: offset.value.y,
    element
  }
  element.setPointerCapture(event.pointerId)
  dragging.value = true
}
function dragImage(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id || !stage.value || !imageEl.value) return
  const bounds = imageEl.value.getBoundingClientRect()
  const viewport = stage.value
  const style = getComputedStyle(viewport)
  const width =
    viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  const height =
    viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  // 拖动到边缘时仍保留一部分图片，避免整张图被拖出视野。
  const limitX = Math.max(0, (bounds.width + width) / 2 - Math.min(32, bounds.width / 2))
  const limitY = Math.max(0, (bounds.height + height) / 2 - Math.min(32, bounds.height / 2))
  offset.value = {
    x: Math.max(-limitX, Math.min(limitX, drag.offsetX + event.clientX - drag.x)),
    y: Math.max(-limitY, Math.min(limitY, drag.offsetY + event.clientY - drag.y))
  }
}
function finishDrag(event: PointerEvent) {
  if (event.pointerId === drag?.id) endDrag()
}
function onKey(event: KeyboardEvent) {
  if (props.video) return
  if (event.key === 'ArrowLeft') move(-1)
  else if (event.key === 'ArrowRight') move(1)
  else if (event.key === '+' || event.key === '=') zoom(0.2)
  else if (event.key === '-') zoom(-0.2)
  else return
  event.preventDefault()
  event.stopPropagation()
}
function retryImage() {
  resetView()
  loading.value = true
  failed.value = false
  imageAttempt.value++
}
function failMedia() {
  loading.value = false
  failed.value = true
}
async function loadVideo() {
  if (!props.video || !alive) return
  loading.value = true
  failed.value = false
  videoUrl.value = ''
  try {
    const url = await getEventVideoUrl(props.video.kind, props.video.id)
    if (alive) videoUrl.value = url
  } catch {
    if (alive) failed.value = true
  } finally {
    if (alive) loading.value = false
  }
}
async function onVideoPlay() {
  try {
    if (window.$audio?.el && !window.$audio.el.paused) await window.$audio.pause()
  } catch {
    /* 播放器关闭时仍允许预览视频。 */
  }
}
watch(image, () => {
  retryImage()
})
onMounted(() => {
  dialog.value?.showModal()
  if (props.video) void loadVideo()
})
onBeforeUnmount(() => {
  endDrag()
  alive = false
  videoEl.value?.pause()
  dialog.value?.close()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="media-preview"
    :aria-label="video?.title || '动态图片预览'"
    @close="emit('close')"
    @cancel.prevent="close"
    @keydown="onKey"
    @wheel.stop
    @click="
      (event) => {
        if (event.target === dialog) close()
      }
    "
  >
    <div class="preview-shell">
      <header>
        <span>{{ video?.title || `图片 ${index + 1} / ${images.length}` }}</span>
        <div class="preview-controls">
          <template v-if="!video">
            <button
              type="button"
              aria-label="缩小图片"
              :disabled="scale <= 0.5 || failed"
              @click="zoom(-0.2)"
            >
              <v-icon icon="mdi-minus" size="20" />
            </button>
            <button type="button" class="zoom-reset" aria-label="重置图片缩放" @click="resetView">
              {{ Math.round(scale * 100) }}%
            </button>
            <button
              type="button"
              aria-label="放大图片"
              :disabled="scale >= 3 || failed"
              @click="zoom(0.2)"
            >
              <v-icon icon="mdi-plus" size="20" />
            </button>
          </template>
          <button
            type="button"
            class="close-preview"
            autofocus
            aria-label="关闭预览"
            @click="close"
          >
            <v-icon icon="mdi-close" size="24" />
          </button>
        </div>
      </header>
      <div ref="stage" class="media-stage" @wheel="onWheel">
        <template v-if="video">
          <video
            v-if="videoUrl && !failed"
            ref="videoEl"
            :src="videoUrl"
            :poster="video.cover"
            controls
            playsinline
            preload="metadata"
            @play="onVideoPlay"
            @error="failMedia"
          />
        </template>
        <img
          v-else-if="image && !failed"
          :key="image + imageAttempt"
          ref="imageEl"
          class="preview-image"
          :class="{ 'image-loading': loading, dragging }"
          :src="image"
          :alt="`动态图片 ${index + 1}`"
          :style="{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }"
          draggable="false"
          @pointerdown="startDrag"
          @pointermove="dragImage"
          @pointerup="finishDrag"
          @pointercancel="finishDrag"
          @lostpointercapture="finishDrag"
          @load="loading = false"
          @error="failMedia"
        />
        <p v-if="loading" class="media-state" role="status">
          正在加载{{ video ? '视频' : '图片' }}…
        </p>
        <div v-else-if="failed" class="media-state" role="status">
          <p>{{ video ? '视频暂时无法播放' : '图片加载失败' }}</p>
          <button type="button" @click="video ? loadVideo() : retryImage()">重试</button>
        </div>
        <template v-if="!video && images.length > 1">
          <button
            type="button"
            class="picture-nav previous-picture"
            aria-label="上一张图片"
            @click="move(-1)"
          >
            <v-icon icon="mdi-chevron-left" size="30" />
          </button>
          <button
            type="button"
            class="picture-nav next-picture"
            aria-label="下一张图片"
            @click="move(1)"
          >
            <v-icon icon="mdi-chevron-right" size="30" />
          </button>
        </template>
      </div>
    </div>
  </dialog>
</template>

<style scoped lang="less">
.media-preview {
  width: calc(100vw - 48px);
  height: calc(100vh - 64px);
  max-width: 1100px;
  max-height: 820px;
  padding: 0;
  margin: auto;
  overflow: hidden;
  border: 1px solid #ffffff20;
  border-radius: 12px;
  background: #141416;
  color: #fff;
  -webkit-app-region: no-drag;
  &::backdrop {
    background: #000c;
  }
}
.preview-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 60px;
  padding: 10px 14px 10px 20px;
  border-bottom: 1px solid #ffffff1a;
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
  }
}
.preview-controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 5px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 6px;
  border: 0;
  border-radius: 7px;
  color: #eee;
  background: transparent;
  font: inherit;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #ffffff20;
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
}
.zoom-reset {
  min-width: 54px;
  font-size: 12px;
}
.close-preview {
  margin-left: 10px;
}
.media-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  padding: 16px 56px;
  overflow: hidden;
  overscroll-behavior: contain;
}
.preview-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
  &.dragging {
    cursor: grabbing;
  }
  &.image-loading {
    visibility: hidden;
  }
}
video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.media-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #ddd;
  font-size: 13px;
  button {
    border: 1px solid #ffffff40;
    padding-inline: 14px;
  }
}
.picture-nav {
  position: absolute;
  top: calc(50% - 22px);
  width: 42px;
  height: 44px;
  background: #0008;
}
.previous-picture {
  left: 8px;
}
.next-picture {
  right: 8px;
}
@media (max-width: 650px) {
  .media-preview {
    width: calc(100vw - 20px);
    height: calc(100vh - 40px);
  }
  header {
    padding-left: 12px;
    gap: 8px;
  }
  .media-stage {
    padding-inline: 44px;
  }
  .preview-controls {
    gap: 0;
  }
  .close-preview {
    margin-left: 2px;
  }
}
</style>
