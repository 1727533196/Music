<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import PlayerGlyph from '@/components/MusicPlayer/PlayerGlyph.vue'
import TrialBadge from '@/components/MusicPlayer/TrialBadge.vue'
import '@/assets/iconfont/iconfont.css'
import {
  desktopLyricDefaults,
  type DesktopLyricSettings,
  type DesktopLyricTrack,
  type DesktopLyricClock,
  type DesktopLyricLine,
  type DesktopLyricWord,
  type DesktopLyricCommand
} from '../../../shared/desktopLyrics'

const settings = ref<DesktopLyricSettings>({ ...desktopLyricDefaults })
const track = shallowRef<DesktopLyricTrack | null>(null)
const clock = shallowRef<DesktopLyricClock | null>(null)
const time = ref(0)
const error = ref('')
const lockHovered = ref(false)
let hoverReceived = false
const unlockButton = ref<HTMLButtonElement>()
const previousGlyph = ref<InstanceType<typeof PlayerGlyph>>()
const nextGlyph = ref<InstanceType<typeof PlayerGlyph>>()
function skipSong(next: boolean) {
  if (settings.value.locked) return
  ;(next ? nextGlyph.value : previousGlyph.value)?.animate()
  void command(next ? 'next' : 'previous')
}
let received = 0,
  anchor = 0,
  frame = 0,
  disposed = false
const cleanups: (() => void)[] = []
function sample(value: DesktopLyricClock) {
  if (
    value.revision !== track.value?.revision ||
    (clock.value && value.sequence <= clock.value.sequence)
  )
    return
  received = performance.now()
  anchor =
    value.positionMs +
    (value.playing && !value.buffering
      ? Math.min(1000, Math.max(0, Date.now() - value.sampledAt)) * value.rate
      : 0)
  clock.value = value
  tickTime()
  if (value.playing && !value.buffering && !frame) frame = requestAnimationFrame(animate)
  else if (!value.playing || value.buffering) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}
function tickTime() {
  const value = clock.value
  const elapsed =
    value?.playing && !value.buffering
      ? Math.min(1000, performance.now() - received) * value.rate
      : 0
  time.value = Math.max(0, anchor + elapsed + settings.value.offsetMs)
}
function animate() {
  tickTime()
  frame =
    clock.value?.playing && !clock.value.buffering && performance.now() - received < 1000
      ? requestAnimationFrame(animate)
      : 0
}
watch(() => settings.value.offsetMs, tickTime)
function acceptTrack(value: DesktopLyricTrack) {
  if (track.value && value.revision < track.value.revision) return
  track.value = value
  clock.value = null
  cancelAnimationFrame(frame)
  frame = 0
  anchor = 0
  time.value = 0
}
const lineIndex = computed(() => {
  const lines = track.value?.lines || []
  let low = 0,
    high = lines.length - 1,
    found = -1
  while (low <= high) {
    const middle = (low + high) >> 1
    if (lines[middle].startMs <= time.value) {
      found = middle
      low = middle + 1
    } else high = middle - 1
  }
  return found
})
const current = computed(() => track.value?.lines[lineIndex.value])
const message = computed(() =>
  !track.value?.id ? 'Tinglan' : track.value.loading ? '正在加载歌词…' : '暂无歌词'
)
function progress(word: DesktopLyricWord): number {
  return word.endMs <= word.startMs
    ? time.value >= word.startMs
      ? 100
      : 0
    : Math.max(0, Math.min(100, ((time.value - word.startMs) / (word.endMs - word.startMs)) * 100))
}
function segments(line: DesktopLyricLine) {
  return line.words.length
    ? line.words
    : [{ text: line.text, startMs: line.startMs, endMs: line.endMs }]
}
const lineView = ref<HTMLDivElement>()
const textLine = ref<HTMLDivElement>()
const lyricText = ref<HTMLSpanElement>()
const toolbar = ref<HTMLDivElement>()
const overflow = ref(0)
let observer: ResizeObserver | undefined
const measure = () => {
  overflow.value = Math.max(
    0,
    (textLine.value?.scrollWidth || 0) - (lineView.value?.clientWidth || 0)
  )
  const button = unlockButton.value?.getBoundingClientRect()
  if (button)
    void window.desktopLyrics
      ?.setUnlockBounds({ x: button.x, y: button.y, width: button.width, height: button.height })
      .catch(() => {})
  const text = lyricText.value?.getBoundingClientRect()
  const viewport = lineView.value?.getBoundingClientRect()
  if (text && viewport) {
    const x = Math.max(text.x, viewport.x),
      y = Math.max(text.y, viewport.y)
    void window.desktopLyrics
      ?.setLyricBounds({
        x,
        y,
        width: Math.max(0, Math.min(text.right, viewport.right) - x),
        height: Math.max(0, Math.min(text.bottom, viewport.bottom) - y)
      })
      .catch(() => {})
  }
}
// 长行随演唱进度平移；短行保持居中，避免整句截断。
const pan = computed(() => {
  const line = current.value
  if (!line || !overflow.value) return 0
  const ratio = Math.max(
    0,
    Math.min(1, (time.value - line.startMs) / Math.max(1, line.endMs - line.startMs))
  )
  return -overflow.value * ratio
})
const style = computed(() => ({
  '--lyric-font':
    settings.value.fontFamily === 'system'
      ? '"Segoe UI", "Microsoft YaHei", sans-serif'
      : `"${settings.value.fontFamily}", sans-serif`,
  '--lyric-size': `${settings.value.fontSize}px`,
  '--lyric-base': settings.value.color,
  '--lyric-highlight': settings.value.highlight,
  '--lyric-opacity': settings.value.opacity
}))
async function command(value: DesktopLyricCommand) {
  try {
    await window.desktopLyrics?.command(value)
    error.value = ''
  } catch {
    error.value = '操作失败，请在主窗口重试'
  }
}
const dragging = ref(false)
const controlsVisible = ref(false)
let hideControlsTimer: ReturnType<typeof setTimeout> | undefined
function showControls() {
  clearTimeout(hideControlsTimer)
  controlsVisible.value = true
}
function hideControlsSoon() {
  clearTimeout(hideControlsTimer)
  if (dragging.value || !controlsVisible.value) return
  hideControlsTimer = setTimeout(() => {
    controlsVisible.value = false
  }, 220)
}
let dragPointer: number | null = null
let dragFrame = 0
function beginDrag(event: PointerEvent) {
  const target = event.target as Element
  const onLyrics = !!target.closest('.lyric-text')
  const onVisibleToolbar = controlsVisible.value && !!target.closest('.toolbar')
  if (
    settings.value.locked ||
    !event.isPrimary ||
    event.button !== 0 ||
    target.closest('button') ||
    (!onLyrics && !onVisibleToolbar)
  )
    return
  const surface = event.currentTarget as HTMLElement
  surface.setPointerCapture(event.pointerId)
  dragPointer = event.pointerId
  dragging.value = true
  if (onLyrics) showControls()
  void window.desktopLyrics?.drag('start').catch(() => {
    dragging.value = false
  })
}
function moveDrag(event: PointerEvent) {
  if (dragPointer === null) {
    if ((event.target as Element).closest('.lyric-text, .toolbar')) showControls()
    else hideControlsSoon()
    return
  }
  if (event.pointerId !== dragPointer || dragFrame) return
  dragFrame = requestAnimationFrame(() => {
    dragFrame = 0
    void window.desktopLyrics?.drag('move').catch(() => {})
  })
}
function endDrag(event?: PointerEvent) {
  if (dragPointer === null || (event && event.pointerId !== dragPointer)) return
  cancelAnimationFrame(dragFrame)
  dragFrame = 0
  dragPointer = null
  dragging.value = false
  if (!lyricText.value?.matches(':hover') && !toolbar.value?.matches(':hover')) hideControlsSoon()
  void window.desktopLyrics?.drag('move').catch(() => {})
  void window.desktopLyrics?.drag('end').catch(() => {})
  const surface = event?.currentTarget as HTMLElement | undefined
  if (event && surface?.hasPointerCapture(event.pointerId))
    surface.releasePointerCapture(event.pointerId)
}
const onBlur = () => {
  endDrag()
  clearTimeout(hideControlsTimer)
  controlsVisible.value = false
}
watch(
  () => settings.value.locked,
  (locked) => {
    if (locked) endDrag()
  }
)
onMounted(async () => {
  window.addEventListener('blur', onBlur)
  const api = window.desktopLyrics
  if (!api) {
    error.value = '请在 Tinglan 桌面应用中打开'
    return
  }
  cleanups.push(
    api.onLockHover((value) => {
      hoverReceived = true
      lockHovered.value = value
    }),
    api.onState((value) => {
      settings.value = value
    }),
    api.onTrack(acceptTrack),
    api.onClock(sample)
  )
  try {
    const snapshot = await api.getSnapshot()
    if (disposed) return
    settings.value = snapshot.settings
    if (!hoverReceived) lockHovered.value = snapshot.lockHovered
    // 订阅先于快照，保留读取期间到达的较新数据。
    if (snapshot.track && (!track.value || snapshot.track.revision > track.value.revision))
      acceptTrack(snapshot.track)
    if (snapshot.clock) sample(snapshot.clock)
  } catch {
    error.value = '歌词同步暂时不可用'
  }
  observer = new ResizeObserver(measure)
  if (lineView.value) observer.observe(lineView.value)
  if (textLine.value) observer.observe(textLine.value)
  if (lyricText.value) observer.observe(lyricText.value)
})
onUnmounted(() => {
  window.removeEventListener('blur', onBlur)
  endDrag()
  clearTimeout(hideControlsTimer)
  disposed = true
  cancelAnimationFrame(frame)
  observer?.disconnect()
  cleanups.forEach((stop) => stop())
})
</script>

<template>
  <main
    class="desktop-lyrics"
    :class="{ locked: settings.locked, 'lock-hovered': lockHovered }"
    :style="style"
    @contextmenu.prevent
  >
    <div
      class="lyric-surface"
      :class="{ dragging, 'controls-visible': controlsVisible }"
      @pointerdown="beginDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @lostpointercapture="endDrag"
      @pointerleave="hideControlsSoon"
    >
      <div
        ref="toolbar"
        class="toolbar"
        aria-label="桌面歌词控制"
        @pointerenter="showControls"
        @pointerleave="hideControlsSoon"
      >
        <span
          class="toolbar-brand"
          :title="settings.locked ? '点击右侧锁图标解锁' : '拖动歌词或空白位置移动窗口'"
          >{{ settings.locked ? '已锁定' : 'Tinglan' }}</span
        >
        <div class="playback-actions">
          <button
            type="button"
            :disabled="settings.locked"
            aria-label="上一首"
            title="上一首"
            @click="skipSong(false)"
          >
            <PlayerGlyph ref="previousGlyph" name="previous" />
          </button>
          <button
            type="button"
            :disabled="settings.locked"
            class="play-button"
            :aria-label="clock?.playing ? '暂停' : '播放'"
            :title="clock?.playing ? '暂停' : '播放'"
            @click="command('play-pause')"
          >
            <Transition name="transport-glyph" mode="out-in">
              <PlayerGlyph
                :key="clock?.playing ? 'pause' : 'play'"
                :name="clock?.playing ? 'pause' : 'play'"
              />
            </Transition>
          </button>
          <button
            type="button"
            :disabled="settings.locked"
            aria-label="下一首"
            title="下一首"
            @click="skipSong(true)"
          >
            <PlayerGlyph ref="nextGlyph" name="next" />
          </button>
        </div>
        <div class="utility-actions">
          <button
            ref="unlockButton"
            class="unlock-button"
            type="button"
            :aria-label="settings.locked ? '解锁桌面歌词' : '锁定桌面歌词'"
            :title="settings.locked ? '解锁桌面歌词' : '锁定并穿透鼠标'"
            @click="command('toggle-lock')"
          >
            <svg class="lock-glyph" viewBox="0 0 20 20" aria-hidden="true">
              <rect x="4" y="9" width="12" height="8" rx="2" />
              <path :d="settings.locked ? 'M7 9V6a3 3 0 0 1 6 0' : 'M7 9V6a3 3 0 0 1 6 0v3'" />
            </svg>
          </button>
          <button
            type="button"
            class="close-button"
            :disabled="settings.locked"
            aria-label="关闭桌面歌词"
            title="关闭桌面歌词"
            @click="command('close')"
          >
            <i class="iconfont icon-guanbi" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="lyric-area">
        <div ref="lineView" class="current-line-viewport">
          <div
            ref="textLine"
            class="current-line"
            :class="{ 'long-line': overflow > 0 }"
            :style="{ transform: `translateX(${pan}px)` }"
          >
            <span
              ref="lyricText"
              class="lyric-text"
              @pointerenter="showControls"
              @pointerleave="hideControlsSoon"
            >
              <TrialBadge :trial="!!track?.trial" light class="desktop-trial" />
              <template v-if="current?.text && !track?.loading">
                <span
                  v-for="(word, index) in segments(current)"
                  :key="`${track?.revision}-${lineIndex}-${index}`"
                  class="word"
                >
                  <span class="word-base">{{ word.text }}</span>
                  <span
                    class="word-fill"
                    aria-hidden="true"
                    :style="{ clipPath: `inset(0 ${100 - progress(word)}% 0 0)` }"
                    >{{ word.text }}</span
                  >
                </span>
              </template>
              <span v-else>{{
                track?.loading
                  ? message
                  : current
                    ? '♪'
                    : track?.lines.length
                      ? '♪'
                      : track?.title || message
              }}</span>
            </span>
          </div>
        </div>
        <span v-if="error" class="error" role="status">{{ error }}</span>
      </div>
    </div>
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#desktop-lyrics {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
}
.desktop-lyrics {
  height: 100%;
  padding: 5px 10px;
  user-select: none;
  color: white;
  font-family: var(--lyric-font);
}
.lyric-surface {
  position: relative;
  height: 100%;
  border: 1px solid transparent;
  border-radius: 15px;
  touch-action: none;
  cursor: default;
  background: transparent;
  -webkit-app-region: no-drag;
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
}
.desktop-lyrics:not(.locked) .lyric-surface:is(.controls-visible, :has(:focus-visible)) {
  background: linear-gradient(145deg, #ffffff0d, #ffffff00 70%), #1e1f26bf;
  border-color: #ffffff29;
}
.lyric-surface.dragging {
  cursor: grabbing;
}
.toolbar {
  position: absolute;
  top: 5px;
  left: 10px;
  right: 10px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  cursor: grab;
  transition: opacity 150ms ease;
}
.desktop-lyrics:not(.locked) .lyric-surface:is(.controls-visible, :has(:focus-visible)) .toolbar {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.desktop-lyrics.locked.lock-hovered .lyric-surface {
  background: #1e1f2699;
  border-color: #ffffff29;
  cursor: default;
}
.locked.lock-hovered .toolbar {
  opacity: 1;
  visibility: visible;
  pointer-events: none;
}
.locked .playback-actions,
.locked .close-button {
  visibility: hidden;
  pointer-events: none;
}
.locked.lock-hovered .unlock-button {
  visibility: visible;
  pointer-events: auto;
  color: #fff;
  background: #ffffff20;
}
.toolbar-brand {
  position: absolute;
  left: 6px;
  color: #ffffff70;
  font:
    11px 'Segoe UI',
    sans-serif;
  letter-spacing: 0.04em;
}
.playback-actions,
.utility-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.utility-actions {
  position: absolute;
  right: 0;
  gap: 3px;
}
.toolbar button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 6px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #ffffffcf;
  cursor: pointer;
  transition:
    opacity 150ms ease,
    background-color 150ms ease;
}
.toolbar button:active:not(:disabled) {
  opacity: 0.65;
  transform: scale(0.94);
}
.transport-glyph-enter-active,
.transport-glyph-leave-active {
  transition:
    opacity 100ms ease,
    transform 100ms ease;
}
.transport-glyph-enter-from,
.transport-glyph-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.toolbar button:hover {
  background: #ffffff14;
  color: #fff;
}
.toolbar button:focus-visible {
  outline: 1px solid #ffffffa3;
  outline-offset: 1px;
}
.toolbar button.play-button {
  padding: 5px;
  color: #fff;
}
.toolbar button svg {
  width: 100%;
  height: 100%;
}
.toolbar .lock-glyph {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.toolbar .iconfont {
  font-size: 14px;
  line-height: 1;
}
.toolbar .close-button:hover {
  background: #ffffff24;
}
.lyric-area {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 34px 14px 8px;
  opacity: var(--lyric-opacity);
}
.current-line-viewport {
  width: 100%;
  overflow: hidden;
  padding: 4px 0;
}
.current-line {
  width: max-content;
  min-width: 100%;
  white-space: pre;
  text-align: center;
  font-size: var(--lyric-size);
  line-height: 1.5;
  font-weight: 500;
  color: var(--lyric-base);
  text-shadow: none;
  -webkit-text-stroke: 0;
}
.current-line.long-line {
  text-align: left;
}
.lyric-text {
  display: inline-block;
  overflow: hidden;
  vertical-align: middle;
  line-height: 1.1;
  cursor: grab;
}
.desktop-trial {
  margin-right: 8px;
}
.dragging .lyric-text,
.dragging .toolbar {
  cursor: grabbing;
}
.word {
  display: inline-block;
  position: relative;
  vertical-align: top;
}
.word-fill {
  position: absolute;
  inset: 0;
  color: var(--lyric-highlight);
}
.error {
  display: block;
  text-align: center;
  font: 11px sans-serif;
}
@media (prefers-reduced-motion: reduce) {
  .toolbar,
  .lyric-surface,
  .toolbar button,
  .transport-glyph-enter-active,
  .transport-glyph-leave-active {
    transition: none;
  }
}
</style>
