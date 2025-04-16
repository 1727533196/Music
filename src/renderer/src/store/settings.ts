import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { setBaseURL } from '@/utils/request'

const USER_SETTINGS = 'USER_SETTINGS'

// 定义状态接口
interface SettingsState {
  baseUrl: string
  lyricBg: 'rgb' | 'rhythm'
  bold: true
  font: string
}
export const useSettings = defineStore('settingsId', () => {
  const state: SettingsState = reactive({
    baseUrl: 'http://127.0.0.1:3006',
    lyricBg: 'rhythm',
    bold: true,
    font: 'Avenir, Helvetica, Arial, sans-serif'
  })
  const initialState = JSON.parse(JSON.stringify(state))
  const $reset = () => setState(initialState)

  const setState = (values?: Partial<typeof state>) => {
    Object.assign(state, values)
    localStorage.setItem(
      USER_SETTINGS,
      JSON.stringify({
        ...state,
        ...values
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
      } catch (e) {
        console.error('解析 USER_SETTINGS 时出错:', e)
      }
    }
  }
  getState()
  return {
    state,
    setState,
    $reset
  }
})
