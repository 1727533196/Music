<script setup>
import { nextTick, onUnmounted, ref, inject, watch } from 'vue'
import { useContextMenu } from './useContextMenu'

const { MENU_KEY } = useContextMenu()
const menuManager = inject(MENU_KEY)

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select', 'open'])

const visible = ref(false)
const positioned = ref(false)
const x = ref(0)
const y = ref(0)
const menuRef = ref(null)
const menuId = Symbol('menu-id')
let origin = null
let anchor = { x: 0, y: 0 }

const icons = {
  'play-next': 'mdi-playlist-play',
  collection: 'mdi-playlist-plus',
  comment: 'mdi-comment-text-outline',
  delete: 'mdi-trash-can-outline',
  correct: 'mdi-pencil-outline',
  open: 'mdi-playlist-music-outline'
}

const fitMenu = () => {
  if (!menuRef.value) return
  const gap = 8
  x.value = Math.max(gap, Math.min(anchor.x, window.innerWidth - menuRef.value.offsetWidth - gap))
  y.value = Math.max(gap, Math.min(anchor.y, window.innerHeight - menuRef.value.offsetHeight - gap))
}

const hideMenu = (restoreFocus = false) => {
  visible.value = false
  positioned.value = false
  removeListeners()
  if (restoreFocus && origin?.isConnected) origin.focus({ preventScroll: true })
}

const handleClickOutside = (event) => {
  if (!menuRef.value?.contains(event.target)) hideMenu()
}

const handleScroll = (event) => {
  if (!menuRef.value?.contains(event.target)) hideMenu()
}

const handleResize = () => hideMenu()

const removeListeners = () => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleResize)
}

const menuButtons = () =>
  Array.from(menuRef.value?.querySelectorAll('.menu-item:not(:disabled)') || [])

const showMenu = async (event) => {
  event.preventDefault()
  if (menuManager.activeMenu.value) menuManager.setActiveMenu(null)
  const target = event.target instanceof Element ? event.target : null
  origin =
    target?.closest('button, a[href], input, [tabindex]') ||
    target?.closest('[data-song-id]')?.querySelector('button, a[href], input, [tabindex]') ||
    event.currentTarget.querySelector('button, a[href], input, [tabindex]') ||
    document.activeElement
  const targetBounds = target?.getBoundingClientRect()
  anchor =
    event.clientX === 0 && event.clientY === 0 && targetBounds
      ? { x: targetBounds.left, y: targetBounds.bottom }
      : { x: event.clientX, y: event.clientY }
  x.value = anchor.x
  y.value = anchor.y
  positioned.value = false
  visible.value = true
  menuManager.setActiveMenu({ id: menuId, hideMenu })
  emit('open')
  await nextTick()
  if (!visible.value || !menuRef.value) return
  fitMenu()
  positioned.value = true
  await nextTick()
  if (!visible.value || !menuRef.value) return
  menuRef.value.focus({ preventScroll: true })
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleResize)
}

const handleSelect = (item, event) => {
  event.stopPropagation()
  if (item.disabled) return
  hideMenu(true)
  emit('select', item)
}

const handleKeydown = (event) => {
  // Only handle the menu itself and its buttons, not controls in a child overlay.
  if (event.target !== menuRef.value && !event.target.matches('.menu-item')) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    hideMenu(true)
    return
  }
  if (event.key === 'Tab') {
    hideMenu(true)
    return
  }
  const buttons = menuButtons()
  if (!buttons.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  event.stopPropagation()
  const current = buttons.indexOf(document.activeElement)
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : event.key === 'ArrowDown'
          ? (current + 1) % buttons.length
          : (current <= 0 ? buttons.length : current) - 1
  buttons[index].focus({ preventScroll: true })
}

watch(
  () => props.items,
  async () => {
    if (!visible.value) return
    await nextTick()
    fitMenu()
  },
  { deep: true }
)

onUnmounted(() => {
  removeListeners()
  if (menuManager.activeMenu.value?.id === menuId) menuManager.setActiveMenu(null)
})
defineExpose({ showMenu })
</script>

<template>
  <div v-if="$slots.default" class="context-menu-wrapper" @contextmenu="showMenu">
    <slot></slot>
  </div>

  <teleport to="body">
    <transition name="context-menu-fade">
      <div
        v-if="visible"
        ref="menuRef"
        class="context-menu"
        role="menu"
        aria-label="更多操作"
        tabindex="-1"
        :style="{ left: x + 'px', top: y + 'px', visibility: positioned ? 'visible' : 'hidden' }"
        @keydown="handleKeydown"
        @contextmenu.prevent.stop
      >
        <template v-for="(item, index) in items" :key="item.value || index">
          <div
            v-if="item.value === 'delete' && index > 0"
            class="menu-separator"
            role="separator"
          />
          <button
            type="button"
            class="menu-item"
            :class="{ 'is-danger': item.value === 'delete' }"
            :disabled="!!item.disabled"
            role="menuitem"
            tabindex="-1"
            @click="(event) => handleSelect(item, event)"
          >
            <span class="menu-item-icon" aria-hidden="true">
              <v-icon v-if="icons[item.value]" :icon="icons[item.value]" size="18" />
            </span>
            <span class="menu-item-label">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </transition>
  </teleport>
</template>

<style lang="less" scoped>
.context-menu-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.context-menu {
  position: fixed;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  min-width: ~'min(188px, calc(100vw - 16px))';
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 5px;
  border: 1px solid var(--app-border, rgba(255, 255, 255, 0.08));
  border-radius: var(--app-control-radius, 10px);
  outline: none;
  color: var(--app-text, #f2f3f5);
  background: var(--app-panel);
  box-shadow: var(--app-shadow);
  transform-origin: center;
}

.menu-item {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 11px;
  width: 100%;
  min-height: 35px;
  padding: 7px 10px;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover:not(:disabled),
  &:focus-visible {
    color: var(--app-accent, #fff);
    background: var(--app-hover);
    outline: none;
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 1px var(--app-accent, #fff);
  }

  &.is-danger {
    color: var(--app-danger-text);
  }

  &.is-danger:hover:not(:disabled),
  &.is-danger:focus-visible {
    background: var(--app-danger-soft);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
}

.menu-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 18px;
  opacity: 0.75;
}

.menu-item-label {
  overflow: hidden;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-separator {
  flex-shrink: 0;
  height: 1px;
  margin: 4px 7px;
  background: var(--app-border, rgba(255, 255, 255, 0.08));
}

.context-menu-fade-enter-active,
.context-menu-fade-leave-active {
  transition: opacity 0.13s ease;
}

.context-menu-fade-enter-from,
.context-menu-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .context-menu-fade-enter-active,
  .context-menu-fade-leave-active,
  .menu-item {
    transition: none;
  }
}
</style>
