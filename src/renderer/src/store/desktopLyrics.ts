import { defineStore } from 'pinia'
import { ref } from 'vue'
import { desktopLyricDefaults, type DesktopLyricSettings } from '../../../shared/desktopLyrics'

export const useDesktopLyrics = defineStore('desktopLyrics', () => {
  const state = ref<DesktopLyricSettings>({ ...desktopLyricDefaults })
  const error = ref('')
  const available = !!window.desktopLyrics
  let unsubscribe: (() => void) | undefined
  let revision = 0
  async function connect() {
    if (!window.desktopLyrics || unsubscribe) return
    unsubscribe = window.desktopLyrics.onState((value) => {
      revision++
      state.value = value
    })
    const started = revision
    try {
      const snapshot = await window.desktopLyrics.getSnapshot()
      if (started === revision) state.value = snapshot.settings
    } catch {
      error.value = '桌面歌词暂时不可用，请重新启动应用'
    }
  }
  async function configure(value: Partial<DesktopLyricSettings>) {
    if (!window.desktopLyrics) return
    try {
      await window.desktopLyrics.configure(value)
      error.value = ''
    } catch {
      error.value = '桌面歌词设置失败，请重试'
    }
  }
  async function resetPosition() {
    try {
      await window.desktopLyrics?.resetPosition()
      error.value = ''
    } catch {
      error.value = '暂时无法重置位置'
    }
  }
  function disconnect() {
    unsubscribe?.()
    unsubscribe = undefined
    revision++
  }
  return { state, error, available, connect, configure, resetPosition, disconnect }
})
