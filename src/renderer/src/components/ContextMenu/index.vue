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
        {{ item.label }}
      </div>
    </div>
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
  backdrop-filter: blur(30px) saturate(210%);
  border-radius: 6px;
  overflow: hidden;
  background-color: rgba(40, 40, 40, 0.7);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 6px 0;
  min-width: 120px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.menu-item {
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}
</style>
