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
const DEFAULT_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Music PingFang SC", "Helvetica Neue", "Segoe UI", "Microsoft YaHei", sans-serif'

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
    bold: false,
    font: DEFAULT_FONT,
    themeMode: 'system',
    accentColor: defaultAccentColor
  })
  const initialState = JSON.parse(JSON.stringify(state))
  const $reset = () => setState(initialState)

  const setState = (values?: Partial<typeof state>) => {
    Object.assign(state, values)
    if (!isThemeMode(state.themeMode)) state.themeMode = 'system'
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
        if (parsedStore.font === 'Avenir, Helvetica, Arial, sans-serif') {
          parsedStore.font = DEFAULT_FONT
        }
        ;(document.querySelector('#app') as HTMLDivElement)!.style.fontFamily =
          parsedStore.font || ''
        Object.assign(state, parsedStore)
        if (!isThemeMode(state.themeMode)) state.themeMode = 'system'
        if (!isAccentColor(state.accentColor)) state.accentColor = defaultAccentColor
      } catch (e) {
        console.error('解析 USER_SETTINGS 时出错:', e)
      }
    }
  }
  getState()
  watch(
    () => state.font,
    (font) => document.documentElement.style.setProperty('--app-font-family', font),
    { immediate: true, flush: 'sync' }
  )
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
