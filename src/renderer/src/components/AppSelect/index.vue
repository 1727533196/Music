<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import type { SelectOption, SelectValue } from './types'

const props = withDefaults(
  defineProps<{
    modelValue?: SelectValue | null
    options: readonly SelectOption[]
    id?: string
    ariaLabel?: string
    ariaLabelledby?: string
    disabled?: boolean
    loading?: boolean
    placeholder?: string
    size?: 'small' | 'default'
    placement?: 'bottom-start' | 'bottom-end'
  }>(),
  {
    placeholder: '请选择',
    size: 'default',
    placement: 'bottom-start'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: SelectValue]
  change: [value: SelectValue]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const instanceId = `app-select-${useId()}`
const triggerId = computed(() => props.id || instanceId)
const menuId = `${instanceId}-listbox`
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLDivElement | null>(null)
const isOpen = ref(false)
const positioned = ref(false)
const opensAbove = ref(false)
const activeIndex = ref(-1)
const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue)
)
const selectedOption = computed(() => props.options[selectedIndex.value])
const activeDescendant = computed(() =>
  isOpen.value && !props.loading && activeIndex.value >= 0
    ? `${instanceId}-option-${activeIndex.value}`
    : undefined
)

let positionFrame = 0
let openVersion = 0
let resizeObserver: ResizeObserver | undefined
let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

const enabledIndices = () =>
  props.loading ? [] : props.options.flatMap((option, index) => (option.disabled ? [] : [index]))

const scrollActiveIntoView = () => {
  if (!isOpen.value || activeIndex.value < 0 || !menuRef.value) return
  const option = document.getElementById(`${instanceId}-option-${activeIndex.value}`)
  if (!option) return
  const menuBounds = menuRef.value.getBoundingClientRect()
  const optionBounds = option.getBoundingClientRect()
  const inset = 6
  if (optionBounds.top < menuBounds.top + inset) {
    menuRef.value.scrollTop += optionBounds.top - menuBounds.top - inset
  } else if (optionBounds.bottom > menuBounds.bottom - inset) {
    menuRef.value.scrollTop += optionBounds.bottom - menuBounds.bottom + inset
  }
}

const setActive = (index: number) => {
  activeIndex.value = index
  void nextTick(scrollActiveIntoView)
}

const clearTypeahead = () => {
  typeahead = ''
  clearTimeout(typeaheadTimer)
  typeaheadTimer = undefined
}

const closeMenu = (restoreFocus = false) => {
  openVersion += 1
  isOpen.value = false
  positioned.value = false
  removeOpenListeners()
  clearTypeahead()
  if (restoreFocus && triggerRef.value?.isConnected) {
    triggerRef.value.focus({ preventScroll: true })
  }
}

const updatePosition = () => {
  const trigger = triggerRef.value
  const menu = menuRef.value
  if (!isOpen.value || !trigger || !menu) return
  const bounds = trigger.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = window.innerHeight
  if (
    bounds.bottom <= 0 ||
    bounds.top >= viewportHeight ||
    bounds.right <= 0 ||
    bounds.left >= viewportWidth
  ) {
    closeMenu()
    return
  }

  const margin = 8
  const gap = 6
  const availableWidth = Math.max(0, viewportWidth - margin * 2)
  menu.style.minWidth = `${Math.min(bounds.width, availableWidth)}px`
  menu.style.maxWidth = `${availableWidth}px`

  const desiredHeight = Math.min(menu.scrollHeight + 2, 280)
  const below = Math.max(0, viewportHeight - bounds.bottom - gap - margin)
  const above = Math.max(0, bounds.top - gap - margin)
  opensAbove.value = below < desiredHeight && above > below
  menu.style.maxHeight = `${Math.min(280, opensAbove.value ? above : below)}px`

  const menuWidth = menu.offsetWidth
  const menuHeight = menu.offsetHeight
  const anchorX = props.placement === 'bottom-end' ? bounds.right - menuWidth : bounds.left
  const anchorY = opensAbove.value ? bounds.top - gap - menuHeight : bounds.bottom + gap
  menu.style.left = `${Math.max(margin, Math.min(anchorX, viewportWidth - menuWidth - margin))}px`
  menu.style.top = `${Math.max(margin, Math.min(anchorY, viewportHeight - menuHeight - margin))}px`
  positioned.value = true
}

const schedulePosition = () => {
  if (positionFrame) return
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0
    updatePosition()
  })
}

const isInside = (target: EventTarget | null) =>
  target instanceof Node && (triggerRef.value?.contains(target) || menuRef.value?.contains(target))

const handleOutsidePointer = (event: PointerEvent) => {
  if (!isInside(event.target)) closeMenu()
}

const handleOutsideFocus = (event: FocusEvent) => {
  if (!isInside(event.target)) closeMenu()
}

const handleScroll = (event: Event) => {
  if (event.target instanceof Node && menuRef.value?.contains(event.target)) return
  schedulePosition()
}

const removeOpenListeners = () => {
  document.removeEventListener('pointerdown', handleOutsidePointer, true)
  document.removeEventListener('focusin', handleOutsideFocus, true)
  document.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', schedulePosition)
  resizeObserver?.disconnect()
  resizeObserver = undefined
  cancelAnimationFrame(positionFrame)
  positionFrame = 0
}

const openMenu = (initial: 'selected' | 'first' | 'last' = 'selected') => {
  if (props.disabled || isOpen.value) return
  const version = ++openVersion
  const indices = enabledIndices()
  const selectedIsEnabled = indices.includes(selectedIndex.value)
  activeIndex.value =
    initial === 'last'
      ? indices.at(-1) ?? -1
      : initial === 'selected' && selectedIsEnabled
        ? selectedIndex.value
        : indices[0] ?? -1
  positioned.value = false
  isOpen.value = true
  document.addEventListener('pointerdown', handleOutsidePointer, true)
  document.addEventListener('focusin', handleOutsideFocus, true)
  document.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', schedulePosition)
  void nextTick(() => {
    if (!isOpen.value || version !== openVersion) return
    resizeObserver = new ResizeObserver(schedulePosition)
    if (triggerRef.value) resizeObserver.observe(triggerRef.value)
    if (menuRef.value) resizeObserver.observe(menuRef.value)
    updatePosition()
    scrollActiveIntoView()
  })
}

const toggleMenu = () => {
  if (isOpen.value) closeMenu()
  else openMenu()
}

const selectOption = (index: number) => {
  const option = props.options[index]
  if (!option || option.disabled || props.disabled || props.loading) return
  closeMenu(true)
  if (option.value === props.modelValue) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
}

const moveActive = (direction: 1 | -1) => {
  const indices = enabledIndices()
  if (!indices.length) return
  const current = indices.indexOf(activeIndex.value)
  const next =
    current < 0
      ? direction === 1
        ? 0
        : indices.length - 1
      : (current + direction + indices.length) % indices.length
  setActive(indices[next])
}

const handleTypeahead = (key: string) => {
  openMenu()
  clearTimeout(typeaheadTimer)
  typeahead += key.toLocaleLowerCase()
  typeaheadTimer = setTimeout(clearTypeahead, 600)
  const repeatedCharacter = [...typeahead].every((character) => character === typeahead[0])
  const query = repeatedCharacter ? typeahead[0] : typeahead
  const indices = enabledIndices()
  const current = indices.indexOf(activeIndex.value)
  const offset = repeatedCharacter ? 1 : 0
  for (let step = 0; step < indices.length; step += 1) {
    const index = indices[(Math.max(current, 0) + step + offset) % indices.length]
    if (props.options[index].label.trim().toLocaleLowerCase().startsWith(query)) {
      setActive(index)
      break
    }
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (props.disabled || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key === 'Tab') {
    if (isOpen.value) closeMenu()
    return
  }
  if (event.key === 'Escape') {
    if (isOpen.value) {
      event.preventDefault()
      event.stopPropagation()
      closeMenu(true)
    }
    return
  }
  if (event.key === ' ' && typeahead) {
    event.preventDefault()
    event.stopPropagation()
    handleTypeahead(event.key)
    return
  }
  if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (isOpen.value) moveActive(event.key === 'ArrowDown' ? 1 : -1)
      else openMenu(event.key === 'ArrowUp' && selectedIndex.value < 0 ? 'last' : 'selected')
    } else if (event.key === 'Home' || event.key === 'End') {
      openMenu()
      const indices = enabledIndices()
      setActive(event.key === 'Home' ? indices[0] ?? -1 : indices.at(-1) ?? -1)
    } else if (isOpen.value) {
      selectOption(activeIndex.value)
    } else {
      openMenu()
    }
    return
  }
  if (event.key.length === 1) {
    event.preventDefault()
    event.stopPropagation()
    handleTypeahead(event.key)
  }
}

watch(
  [() => props.options, () => props.modelValue, () => props.loading],
  () => {
    if (!isOpen.value) return
    const indices = enabledIndices()
    activeIndex.value = indices.includes(selectedIndex.value)
      ? selectedIndex.value
      : indices[0] ?? -1
    void nextTick(() => {
      updatePosition()
      scrollActiveIntoView()
    })
  },
  { deep: true }
)

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeMenu()
  }
)

watch(() => props.placement, schedulePosition)

onBeforeUnmount(() => closeMenu())

defineExpose({ focus: () => triggerRef.value?.focus() })
</script>

<template>
  <div class="app-select" :class="{ 'is-small': size === 'small', 'is-disabled': disabled }">
    <button
      :id="triggerId"
      ref="triggerRef"
      type="button"
      class="app-select-trigger"
      :class="{ 'is-open': isOpen, 'is-placeholder': !selectedOption }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? menuId : undefined"
      :aria-activedescendant="activeDescendant"
      :aria-busy="loading || undefined"
      :disabled="disabled"
      :title="selectedOption?.label || placeholder"
      @click="toggleMenu"
      @keydown="handleKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    >
      <span class="app-select-value">{{ selectedOption?.label ?? placeholder }}</span>
      <v-icon
        :icon="loading ? 'mdi-loading' : 'mdi-chevron-down'"
        size="16"
        class="app-select-chevron"
        :class="{ 'is-loading': loading }"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body">
      <Transition name="app-select-popup">
        <div
          v-if="isOpen"
          :id="menuId"
          ref="menuRef"
          class="app-select-menu"
          :class="{ 'is-small': size === 'small', 'opens-above': opensAbove }"
          :style="{ visibility: positioned ? 'visible' : 'hidden' }"
          role="listbox"
          :aria-label="ariaLabel"
          :aria-labelledby="ariaLabel ? undefined : ariaLabelledby || triggerId"
          :aria-busy="loading || undefined"
          @mousedown.prevent
          @click.stop
        >
          <div v-if="loading" class="app-select-state" role="status">加载中…</div>
          <div v-else-if="!options.length" class="app-select-state" role="status">暂无可选项</div>
          <template v-else>
            <div
              v-for="(option, index) in options"
              :id="`${instanceId}-option-${index}`"
              :key="`${typeof option.value}:${option.value}`"
              class="app-select-option"
              :class="{
                'is-selected': option.value === modelValue,
                'is-active': index === activeIndex,
                'is-disabled': option.disabled
              }"
              role="option"
              :aria-selected="option.value === modelValue"
              :aria-disabled="!!option.disabled"
              @pointermove="!option.disabled && (activeIndex = index)"
              @click="selectOption(index)"
            >
              <span class="app-select-option-copy">
                <span class="app-select-option-label">{{ option.label }}</span>
                <span v-if="option.description" class="app-select-option-description">
                  {{ option.description }}
                </span>
              </span>
              <v-icon
                icon="mdi-check"
                size="16"
                class="app-select-check"
                :class="{ 'is-visible': option.value === modelValue }"
                aria-hidden="true"
              />
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="less" scoped>
.app-select {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}

.app-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 36px;
  padding: 7px 11px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-control-radius, 10px);
  color: var(--app-text);
  background: var(--app-surface);
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease;

  &:hover:not(:disabled),
  &.is-open {
    border-color: var(--app-accent-border);
    background: var(--app-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--app-accent-border);
    outline-offset: 3px;
  }

  &:disabled {
    color: var(--app-disabled);
    cursor: not-allowed;
  }

  &.is-placeholder {
    color: var(--app-muted);
  }
}

.app-select-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-select-chevron {
  flex: 0 0 auto;
  color: var(--app-muted);
  transition: transform 140ms ease;

  .is-open &:not(.is-loading) {
    transform: rotate(180deg);
  }

  &.is-loading {
    animation: app-select-spin 850ms linear infinite;
  }
}

.is-small > .app-select-trigger {
  min-height: 32px;
  padding: 5px 9px;
  font-size: 12px;
}

.app-select-menu {
  position: fixed;
  z-index: 99999;
  box-sizing: border-box;
  width: max-content;
  max-height: 280px;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 5px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-control-radius, 10px);
  color: var(--app-text);
  background: var(--app-panel);
  box-shadow: var(--app-shadow);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.45;
  transform-origin: top;

  &.opens-above {
    transform-origin: bottom;
  }

  &.is-small {
    font-size: 12px;
  }
}

.app-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 35px;
  padding: 7px 9px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;

  &.is-active:not(.is-disabled) {
    background: var(--app-hover);
  }

  &.is-selected .app-select-option-label {
    font-weight: 600;
  }

  &.is-disabled {
    color: var(--app-disabled);
    cursor: not-allowed;
  }
}

.app-select-option-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}

.app-select-option-description {
  margin-top: 2px;
  color: var(--app-muted);
  font-size: 11px;
  font-weight: 400;

  .is-disabled & {
    color: inherit;
  }
}

.app-select-check {
  flex: 0 0 auto;
  visibility: hidden;

  &.is-visible {
    visibility: visible;
  }
}

.app-select-state {
  padding: 12px 14px;
  color: var(--app-muted);
  text-align: center;
}

.app-select-popup-enter-active,
.app-select-popup-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.app-select-popup-enter-from,
.app-select-popup-leave-to {
  opacity: 0;
  transform: translateY(-3px) scale(0.985);

  &.opens-above {
    transform: translateY(3px) scale(0.985);
  }
}

@keyframes app-select-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-select-trigger,
  .app-select-chevron,
  .app-select-popup-enter-active,
  .app-select-popup-leave-active {
    transition: none;
    animation: none;
  }
}
</style>
