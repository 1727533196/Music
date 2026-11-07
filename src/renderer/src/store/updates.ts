import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UpdateState } from '../../../shared/update'

export const useUpdates = defineStore('appUpdates', () => {
  const state = ref<UpdateState | null>(null)
  const dismissedVersion = ref('')
  let unsubscribe: (() => void) | undefined
  let revision = 0

  async function connect() {
    if (!window.updates || unsubscribe) return
    unsubscribe = window.updates.onState((value) => {
      revision++
      state.value = value
    })
    const before = revision
    try {
      const value = await window.updates.getState()
      if (before === revision) state.value = value
    } catch {
      /* A web-only preview has no update service. */
    }
  }
  function disconnect() {
    unsubscribe?.()
    unsubscribe = undefined
  }
  async function action(name: 'check' | 'download' | 'install' | 'cancel') {
    if (!window.updates) return
    try {
      const value = await window.updates[name]()
      // Events carry the newest state; a late IPC reply must not overwrite them.
      if (!unsubscribe && value) state.value = value
      if (name === 'check') dismissedVersion.value = ''
    } catch {
      if (state.value)
        state.value = { ...state.value, status: 'error', message: '更新服务暂时不可用，请重试' }
    }
  }
  return { state, dismissedVersion, connect, disconnect, action }
})
