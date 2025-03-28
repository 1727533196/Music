import { ref } from 'vue'

const MENU_KEY = Symbol('context-menu-key')

export const useContextMenu = () => {
  const activeMenu = ref(null)
  
  const setActiveMenu = (menu) => {
    if (activeMenu.value && activeMenu.value !== menu) {
      activeMenu.value.hideMenu()
    }
    activeMenu.value = menu
  }
  
  return {
    MENU_KEY,
    activeMenu,
    setActiveMenu
  }
} 