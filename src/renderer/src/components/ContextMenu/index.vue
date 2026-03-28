<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import { useContextMenu } from './useContextMenu'

const { MENU_KEY } = useContextMenu()
const menuManager = inject(MENU_KEY)

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select'])

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const menuRef = ref(null)
const menuId = ref(Symbol('menu-id'))

const showMenu = (e) => {
  e.preventDefault()
  if (menuManager.activeMenu.value) {
    menuManager.setActiveMenu(null)
  }
  x.value = e.clientX
  y.value = e.clientY
  visible.value = true
  menuManager.setActiveMenu({
    id: menuId.value,
    hideMenu
  })
}

const hideMenu = () => {
  visible.value = false
}

const handleSelect = (item, event) => {
  emit('select', item)
  hideMenu()
  event.stopPropagation()
}

const handleClickOutside = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    hideMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (menuManager.activeMenu.value?.id === menuId.value) {
    menuManager.setActiveMenu(null)
  }
})
</script>

<template>
  <div class="context-menu-wrapper" @contextmenu="showMenu">
    <slot></slot>
  </div>

  <teleport to="body">
    <transition name="context-menu-fade">
      <div
        v-if="visible"
        ref="menuRef"
        class="context-menu"
        :style="{ left: x + 'px', top: y + 'px' }"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="menu-item"
          @click="(e) => handleSelect(item, e)"
        >
          <span class="menu-item-label">{{ item.label }}</span>
        </div>
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
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.9));
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 8px;
  min-width: 160px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.menu-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &:active {
    transform: scale(0.98);
  }

  .menu-item-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    transition: color 0.2s ease;
    font-weight: 500;
  }
}

// 淡入动画
.context-menu-fade-enter-active,
.context-menu-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.context-menu-fade-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}

.context-menu-fade-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.context-menu-fade-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.context-menu-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
</style>
