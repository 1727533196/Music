import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { setBaseURL } from '@/utils/request'
import {
  applyAppTheme,
  defaultAccentColor,
  isThemeMode,
  isAccentColor,
  type ThemeMode,
  type AccentColor
} from '@/theme'

const USER_SETTINGS = 'USER_SETTINGS'

// 定义状态接口
interface SettingsState {
  baseUrl: string
  lyricBg: 'rgb' | 'shader' | 'rhythm'
  bold: boolean
  font: string
  themeMode: ThemeMode
  accentColor: AccentColor
}
export const useSettings = defineStore('settingsId', () => {
  const state: SettingsState = reactive({
    baseUrl: import.meta.env.VITE_URL,
    lyricBg: 'shader',
    bold: true,
    font: 'Avenir, Helvetica, Arial, sans-serif',
    themeMode: 'dark',
    accentColor: defaultAccentColor
  })
  const initialState = JSON.parse(JSON.stringify(state))
  const $reset = () => setState(initialState)

  const setState = (values?: Partial<typeof state>) => {
    Object.assign(state, values)
    if (!isThemeMode(state.themeMode)) state.themeMode = 'dark'
    if (!isAccentColor(state.accentColor)) state.accentColor = defaultAccentColor
    localStorage.setItem(
      USER_SETTINGS,
      JSON.stringify({
        ...state
      })
    )
    values?.baseUrl && setBaseURL(values.baseUrl)
  }
  const getState = () => {
    const store = localStorage.getItem(USER_SETTINGS)
    if (store) {
      try {
        const parsedStore: Partial<SettingsState> = JSON.parse(store)
        ;(document.querySelector('#app') as HTMLDivElement)!.style.fontFamily =
          parsedStore.font || ''
        Object.assign(state, parsedStore)
        if (!isThemeMode(state.themeMode)) state.themeMode = 'dark'
        if (!isAccentColor(state.accentColor)) state.accentColor = defaultAccentColor
      } catch (e) {
        console.error('解析 USER_SETTINGS 时出错:', e)
      }
    }
  }
  getState()
  watch(
    () => [state.themeMode, state.accentColor] as const,
    ([mode, accent]) => applyAppTheme(mode, accent),
    { immediate: true, flush: 'sync' }
  )
  return {
    state,
    setState,
    $reset
  }
})
