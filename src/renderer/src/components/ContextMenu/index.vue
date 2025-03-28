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

// 显示菜单
const showMenu = (e) => {
  e.preventDefault()
  // 先关闭其他菜单
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

// 隐藏菜单
const hideMenu = () => {
  visible.value = false
}

// 处理菜单项点击
const handleSelect = (item) => {
  emit('select', item)
  hideMenu()
}

// 点击其他地方时隐藏菜单
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
        @click="handleSelect(item)"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.context-menu-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 120px;
  z-index: 9999;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
}
</style>
