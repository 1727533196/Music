<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useSettings } from '@/store/settings'
import { useMusicAction } from '@/store/music'
import { audioQualities, type AudioQuality } from '../../../../shared/audioCache'

const props = defineProps<{ light?: boolean }>()
const settings = useSettings()
const music = useMusicAction()
const menuId = useId()
const trigger = ref<HTMLButtonElement>()
const menu = ref<HTMLDivElement>()
const opened = ref(false)
const selected = computed(() =>
  audioQualities.find((item) => item.value === settings.state.audioQuality)
)
const playbackNote = computed(() => {
  const actual = audioQualities.find((item) => item.value === music.state.actualQuality)
  return [
    actual && actual.value !== settings.state.audioQuality ? '实际播放：' + actual.label : '',
    music.state.sourceTrial ? '当前为试听片段' : ''
  ]
    .filter(Boolean)
    .join(' · ')
})
function placeMenu(event: Event) {
  if ((event as ToggleEvent).newState !== 'open' || !trigger.value || !menu.value) return
  const rect = trigger.value.getBoundingClientRect()
  const width = Math.min(224, window.innerWidth - 24)
  menu.value.style.width = `${width}px`
  menu.value.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`
  const above = rect.top > window.innerHeight - rect.bottom
  menu.value.style.top = above ? 'auto' : `${rect.bottom + 8}px`
  menu.value.style.bottom = above ? `${window.innerHeight - rect.top + 8}px` : 'auto'
  menu.value.style.maxHeight = `${Math.max(0, (above ? rect.top : window.innerHeight - rect.bottom) - 20)}px`
}
function close() {
  menu.value?.hidePopover()
}
async function onToggle(event: Event) {
  opened.value = (event as ToggleEvent).newState === 'open'
  if (opened.value) {
    await nextTick()
    menu.value
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus({ preventScroll: true })
  }
}
function change(quality: AudioQuality) {
  settings.setState({ audioQuality: quality })
  close()
  trigger.value?.focus({ preventScroll: true })
}
function navigate(event: KeyboardEvent) {
  const items = [
    ...(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || [])
  ]
  const index = items.indexOf(document.activeElement as HTMLButtonElement)
  let next: number
  if (event.key === 'ArrowDown') next = (index + 1) % items.length
  else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = items.length - 1
  else return
  event.preventDefault()
  items[next]?.focus()
}
onMounted(() => window.addEventListener('resize', close))
onBeforeUnmount(() => window.removeEventListener('resize', close))
</script>

<template>
  <div class="audio-quality" :class="{ light: props.light }">
    <button
      ref="trigger"
      type="button"
      class="quality-trigger"
      :popovertarget="menuId"
      aria-label="播放音质"
      aria-haspopup="menu"
      :aria-expanded="opened"
      :title="playbackNote || '切换播放音质'"
    >
      <span>{{ selected?.label }}</span>
      <svg viewBox="0 0 12 12" aria-hidden="true" :class="{ rotated: opened }">
        <path d="m3 4.5 3 3 3-3" />
      </svg>
    </button>
    <div
      :id="menuId"
      ref="menu"
      popover="auto"
      class="quality-menu"
      :class="{ 'quality-menu-light': props.light }"
      role="menu"
      aria-label="播放音质"
      @beforetoggle="placeMenu"
      @toggle="onToggle"
      @keydown="navigate"
    >
      <div class="menu-heading">播放音质</div>
      <button
        v-for="quality in audioQualities"
        :key="quality.value"
        type="button"
        class="quality-option"
        role="menuitemradio"
        :aria-checked="settings.state.audioQuality === quality.value"
        :tabindex="settings.state.audioQuality === quality.value ? 0 : -1"
        @click="change(quality.value)"
      >
        <span class="option-label">{{ quality.label }}</span>
        <span class="option-description">{{ quality.description }}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path v-if="settings.state.audioQuality === quality.value" d="m3.5 8 3 3 6-6" />
        </svg>
      </button>
      <p class="menu-note">{{ playbackNote || '可用音质取决于歌曲资源与账号权限' }}</p>
    </div>
  </div>
</template>

<style scoped>
.audio-quality {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}
.quality-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  color: var(--app-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.quality-trigger:hover,
.quality-trigger[aria-expanded='true'] {
  color: var(--app-text);
  background: var(--app-hover);
}
.quality-trigger svg {
  width: 10px;
  height: 10px;
  opacity: 0.6;
}
.quality-trigger svg.rotated {
  transform: rotate(180deg);
}
svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.quality-trigger:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.light .quality-trigger {
  color: #ffffffb3;
  border-color: #ffffff40;
}
.light .quality-trigger:hover,
.light .quality-trigger[aria-expanded='true'] {
  color: #fff;
  background: #ffffff14;
}
.light .quality-trigger:focus-visible {
  outline-color: #ffffffb3;
}
.quality-menu {
  --quality-glass-tint: color-mix(in srgb, var(--app-panel) 72%, transparent);
  position: fixed;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: linear-gradient(145deg, #ffffff14, #ffffff00 60%), var(--quality-glass-tint);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  backdrop-filter: blur(24px) saturate(160%);
  color: var(--app-text);
  box-shadow:
    inset 0 1px 0 #ffffff24,
    0 12px 36px #00000026;
  font-family: inherit;
  -webkit-app-region: no-drag;
}
.menu-heading {
  padding: 7px 10px 8px;
  color: var(--app-muted);
  font-size: 11px;
  line-height: 16px;
}
.quality-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.quality-option + .quality-option {
  margin-top: 4px;
}
.quality-option:hover,
.quality-option:focus-visible {
  background: var(--app-hover);
  outline: none;
}
.quality-option[aria-checked='true'] {
  background: var(--app-hover);
}
.option-label {
  flex: 1;
}
.option-description {
  color: var(--app-muted);
  font-size: 11px;
}
.quality-option svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.menu-note {
  margin: 6px 4px 0;
  padding: 9px 6px 5px;
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 10px;
  line-height: 16px;
}
.quality-menu-light {
  --app-text: #fffffff2;
  --app-muted: #ffffffad;
  --app-border: #ffffff33;
  --app-hover: #ffffff1a;
  --quality-glass-tint: #18181c38;
  background: linear-gradient(145deg, #ffffff24, #ffffff08 65%), var(--quality-glass-tint);
  box-shadow:
    inset 0 1px 0 #ffffff38,
    inset 0 -1px 0 #ffffff0a,
    0 12px 36px #00000026;
}
@media (prefers-reduced-motion: reduce) {
  .quality-trigger {
    transition: none;
  }
}
</style>
