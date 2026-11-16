<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDesktopLyrics } from '@/store/desktopLyrics'
import { useFlags } from '@/store/flags'
import { getSongCommentLabel, loadSongCommentCount } from '@/utils/songComments'

const props = defineProps<{ songId?: number | string }>()
const desktop = useDesktopLyrics()
const flags = useFlags()
const router = useRouter()
const menuId = useId()
const trigger = ref<HTMLButtonElement>()
const menu = ref<HTMLDivElement>()
const opened = ref(false)
const onlineSongId = computed(() =>
  typeof props.songId === 'number' && props.songId > 0 ? props.songId : undefined
)
const canShowComments = computed(() => typeof props.songId !== 'string')
const commentLabel = computed(() => getSongCommentLabel(onlineSongId.value || 0))

function close(restoreFocus = false) {
  menu.value?.hidePopover()
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}

function placeMenu(event: Event) {
  if ((event as ToggleEvent).newState !== 'open' || !trigger.value || !menu.value) return
  const rect = trigger.value.getBoundingClientRect()
  const width = Math.min(216, window.innerWidth - 24)
  const above = rect.top > window.innerHeight - rect.bottom
  menu.value.style.width = `${width}px`
  menu.value.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`
  menu.value.style.top = above ? 'auto' : `${rect.bottom + 8}px`
  menu.value.style.bottom = above ? `${window.innerHeight - rect.top + 8}px` : 'auto'
  menu.value.style.maxHeight = `${Math.max(0, (above ? rect.top : window.innerHeight - rect.bottom) - 20)}px`
}

function menuItems() {
  return [...(menu.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])]
}

async function onToggle(event: Event) {
  opened.value = (event as ToggleEvent).newState === 'open'
  if (!opened.value) return
  if (onlineSongId.value) void loadSongCommentCount(onlineSongId.value)
  await nextTick()
  if (menu.value?.matches(':popover-open')) menuItems()[0]?.focus({ preventScroll: true })
}

function navigate(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close(true)
    return
  }
  if (event.key === 'Tab') {
    close(true)
    return
  }
  const items = menuItems()
  if (!items.length) return
  const index = items.indexOf(document.activeElement as HTMLButtonElement)
  let next: number
  if (event.key === 'ArrowDown') next = (index + 1) % items.length
  else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = items.length - 1
  else return
  event.preventDefault()
  event.stopPropagation()
  items[next]?.focus({ preventScroll: true })
}

function openFromKeyboard(event: KeyboardEvent) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  menu.value?.showPopover()
}

function toggleDesktopLyrics() {
  void desktop.configure({ enabled: !desktop.state.enabled })
  close(true)
}

function openComments() {
  if (!onlineSongId.value) return
  close()
  void router.push({ path: '/comment', query: { id: onlineSongId.value } })
  flags.isOpenDetail = false
}

function onResize() {
  close()
}

function onScroll(event: Event) {
  // 歌词自动滚动不影响菜单；仅在按钮所在容器滚动时收起。
  if (event.target instanceof Node && trigger.value && event.target.contains(trigger.value)) close()
}

watch([() => flags.isOpenDetail, () => flags.isOpenDrawer, () => props.songId], () => close())
onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('scroll', onScroll, true)
})
onBeforeUnmount(() => {
  close()
  window.removeEventListener('resize', onResize)
  document.removeEventListener('scroll', onScroll, true)
})
</script>

<template>
  <div v-if="desktop.available || canShowComments" class="detail-more">
    <button
      ref="trigger"
      type="button"
      class="more-trigger"
      :popovertarget="menuId"
      :aria-controls="menuId"
      :aria-expanded="opened"
      aria-haspopup="menu"
      aria-label="更多操作"
      title="更多操作"
      @keydown="openFromKeyboard"
    >
      <v-icon icon="mdi-dots-horizontal" size="22" />
    </button>
    <div
      :id="menuId"
      ref="menu"
      popover="auto"
      class="more-menu"
      role="menu"
      aria-label="更多操作"
      @beforetoggle="placeMenu"
      @toggle="onToggle"
      @keydown="navigate"
    >
      <button
        v-if="desktop.available"
        type="button"
        class="more-item"
        role="menuitemcheckbox"
        :aria-checked="desktop.state.enabled"
        tabindex="-1"
        @click="toggleDesktopLyrics"
      >
        <span class="lyrics-icon" aria-hidden="true">词</span>
        <span class="item-label">桌面歌词</span>
        <v-icon v-if="desktop.state.enabled" icon="mdi-check" size="16" />
      </button>
      <button
        v-if="canShowComments"
        type="button"
        class="more-item"
        role="menuitem"
        :disabled="!onlineSongId"
        tabindex="-1"
        @click="openComments"
      >
        <v-icon icon="mdi-comment-text-outline" size="18" />
        <span class="item-label">{{ commentLabel }}</span>
        <v-icon icon="mdi-chevron-right" size="16" class="item-chevron" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.detail-more {
  display: inline-flex;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}
.more-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  background: transparent;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.more-trigger:hover,
.more-trigger[aria-expanded='true'] {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.more-trigger:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 3px;
}
.more-menu {
  position: fixed;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid #ffffff33;
  border-radius: 12px;
  color: #fffffff2;
  background: linear-gradient(145deg, #ffffff24, #ffffff08 65%), #18181c38;
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  backdrop-filter: blur(24px) saturate(160%);
  box-shadow:
    inset 0 1px 0 #ffffff38,
    inset 0 -1px 0 #ffffff0a,
    0 12px 36px #00000026;
  font-family: inherit;
  -webkit-app-region: no-drag;
}
.more-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  color: inherit;
  background: transparent;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
}
.more-item + .more-item {
  margin-top: 4px;
}
.more-item:hover:not(:disabled),
.more-item:focus-visible {
  outline: none;
  background: #ffffff1a;
}
.more-item:disabled {
  opacity: 0.35;
  cursor: default;
}
.item-label {
  flex: 1;
  white-space: nowrap;
}
.lyrics-icon {
  display: inline-flex;
  justify-content: center;
  width: 18px;
  font-size: 15px;
}
.item-chevron {
  color: #ffffffad;
}
@media (prefers-reduced-motion: reduce) {
  .more-trigger {
    transition: none;
  }
}
</style>
