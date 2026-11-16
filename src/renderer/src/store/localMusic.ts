import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { LocalLibrarySnapshot, LocalMusicAPI, LocalTrackId } from '../../../shared/localMusic'

export const useLocalMusic = defineStore('localMusic', () => {
  const state = shallowRef<LocalLibrarySnapshot>({
    tracks: [],
    folders: [],
    scanning: false,
    processed: 0
  })
  const loading = ref(false)
  const pending = ref(false)
  const error = ref('')
  const available = Boolean(window.localMusic)
  const busy = computed(() => loading.value || pending.value || state.value.scanning)
  let unsubscribe: (() => void) | undefined
  let revision = 0
  let connections = 0
  const apply = (snapshot: LocalLibrarySnapshot) => {
    state.value = snapshot
    error.value = snapshot.error || ''
  }
  const failure = (value: unknown) => {
    const detail = value instanceof Error ? value.message : ''
    error.value =
      detail.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '') ||
      '暂时无法读取本地音乐，请重试。'
  }
  async function connect() {
    const api = window.localMusic
    if (!api) return
    connections++
    if (!unsubscribe)
      unsubscribe = api.onChange((snapshot) => {
        revision++
        apply(snapshot)
      })
    const started = revision
    loading.value = true
    try {
      const snapshot = await api.list()
      if (started === revision) apply(snapshot)
    } catch (value) {
      failure(value)
    } finally {
      loading.value = false
    }
  }
  async function run(action: (api: LocalMusicAPI) => Promise<LocalLibrarySnapshot>) {
    const api = window.localMusic
    if (!api || busy.value) return false
    const started = revision
    pending.value = true
    error.value = ''
    try {
      const snapshot = await action(api)
      if (started === revision) apply(snapshot)
      return !snapshot.error
    } catch (value) {
      failure(value)
      return false
    } finally {
      pending.value = false
    }
  }
  const importFiles = () => run((api) => api.importFiles())
  const importFolder = () => run((api) => api.importFolder())
  const refresh = () => run((api) => api.refresh())
  const remove = (id: LocalTrackId) => run((api) => api.remove(id))
  const relocate = (id: LocalTrackId) => run((api) => api.relocate(id))
  function disconnect() {
    connections = Math.max(0, connections - 1)
    if (connections) return
    unsubscribe?.()
    unsubscribe = undefined
    revision++
  }
  return {
    state,
    loading,
    error,
    available,
    busy,
    connect,
    disconnect,
    importFiles,
    importFolder,
    refresh,
    remove,
    relocate
  }
})
