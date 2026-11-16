import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useUserInfo } from '@/store'
import { useSettings } from '@/store/settings'
import { getMusicAuthCookie } from '@/utils/musicAuth'
import type { LocalTrack } from '../../../shared/localMusic'

export const useLocalCloudUpload = defineStore('localCloudUpload', () => {
  const user = useUserInfo()
  const settings = useSettings()
  const revision = ref(0)
  const state = reactive({
    id: '',
    name: '',
    requestId: '',
    phase: 'idle' as 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'canceled',
    loaded: 0,
    total: 0,
    error: '',
    canceling: false
  })
  const busy = computed(() => state.phase === 'uploading' || state.phase === 'processing')
  const available = Boolean(window.localMusic?.upload)
  const session = () => `${user.isLogin}:${user.profile.userId}:${settings.state.baseUrl}`
  let currentTrack: LocalTrack | undefined

  async function cancel() {
    if (!busy.value || state.canceling) return
    state.canceling = true
    try {
      await window.localMusic?.cancelUpload(state.requestId)
    } catch {
      state.canceling = false
    }
  }
  // 上传可以在切换页面后继续；切换账号或服务地址时则中止，避免混用账号。
  watch(session, () => {
    if (busy.value) void cancel()
    else clear()
  })

  async function upload(track: LocalTrack) {
    const api = window.localMusic
    if (!api?.upload || busy.value || track.local.missing) return
    const cookie = getMusicAuthCookie()
    if (!user.isLogin || !user.profile.userId || !cookie) {
      window.$login?.show()
      return
    }
    const owner = session()
    const requestId = crypto.randomUUID()
    currentTrack = track
    Object.assign(state, {
      id: track.id,
      name: track.name,
      requestId,
      phase: 'uploading',
      loaded: 0,
      total: 0,
      error: '',
      canceling: false
    })
    let off: (() => void) | undefined
    try {
      off = api.onUploadProgress((progress) => {
        if (progress.requestId !== requestId || progress.id !== track.id || !busy.value) return
        state.phase = progress.phase
        state.loaded = progress.loaded
        state.total = progress.total
      })
      await api.upload({
        id: track.id,
        requestId,
        baseURL: settings.state.baseUrl,
        cookie
      })
      if (owner !== session()) {
        clear()
        return
      }
      state.phase = 'success'
      revision.value++
    } catch (error) {
      if (owner !== session()) {
        clear()
        return
      }
      state.phase = state.canceling ? 'canceled' : 'error'
      state.error =
        (error instanceof Error ? error.message : '')
          .replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '')
          .slice(0, 240) || '上传失败，请检查音乐服务、登录状态和云盘容量后重试。'
    } finally {
      off?.()
      state.canceling = false
    }
  }
  function clear() {
    state.id = ''
    state.phase = 'idle'
    currentTrack = undefined
  }
  const retry = () => currentTrack && upload(currentTrack)
  return { state, busy, available, revision, upload, cancel, retry, clear }
})
