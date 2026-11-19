import { readonly, shallowRef, watch } from 'vue'
import type { AudioOutputAPI, AudioOutputDevice } from '../../../shared/audioOutput'

const CACHE_KEY = 'TINGLAN_DEVICE_VOLUME_V1'
const MAX_DEVICES = 32
const NEW_DEVICE_LIMIT = 0.3
interface VolumeProfile {
  id: string
  label: string
  volume: number
  audible: number
  updatedAt: number
}
let currentAudible: number | null = null
// undefined: 正在识别；null: 无法区分输出设备，沿用应用音量。
const currentOutput = shallowRef<AudioOutputDevice | null>()
export const currentAudioOutput = readonly(currentOutput)
const savedOutputs = shallowRef<Pick<VolumeProfile, 'id' | 'label' | 'volume'>[]>([])
export const rememberedAudioOutputs = readonly(savedOutputs)
let removeProfile: ((id: string) => boolean) | undefined

export function forgetAudioOutput(id: string): boolean {
  return removeProfile?.(id) ?? false
}

function deviceLabel(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 512) : ''
}

const validVolume = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
const normalize = (value: number) => Math.min(1, Math.max(0, value))

export function readStoredVolume(): number {
  try {
    const saved = localStorage.getItem('volume')
    if (saved === null || !saved.trim()) return 1
    const value = Number(saved)
    return Number.isFinite(value) ? normalize(value) : 1
  } catch {
    return 1
  }
}

export function saveStoredVolume(value: number): void {
  if (!validVolume(value)) return
  try {
    localStorage.setItem('volume', String(value))
  } catch {
    // 缓存不可用不影响音量控制。
  }
}

export function getUnmuteVolume(fallback: number): number {
  return currentAudible ?? (validVolume(fallback) && fallback > 0 ? fallback : NEW_DEVICE_LIMIT)
}

function readProfiles() {
  const profiles = new Map<string, VolumeProfile>()
  const saved = { profiles, initialized: false }
  try {
    const text = localStorage.getItem(CACHE_KEY)
    if (!text || text.length > 131072) return saved
    const value = JSON.parse(text)
    if (value?.version !== 1 || !Array.isArray(value.devices)) return saved
    for (const entry of value.devices.slice(0, MAX_DEVICES)) {
      if (
        !entry ||
        typeof entry.id !== 'string' ||
        !entry.id.length ||
        entry.id.length > 512 ||
        !validVolume(entry.volume) ||
        !validVolume(entry.audible) ||
        entry.audible <= 0 ||
        !Number.isFinite(entry.updatedAt)
      )
        continue
      profiles.set(entry.id, {
        id: entry.id,
        label: deviceLabel(entry.label),
        volume: entry.volume,
        audible: entry.audible,
        updatedAt: entry.updatedAt
      })
    }
    saved.initialized = value.initialized === true || profiles.size > 0
  } catch {
    // 损坏的设备缓存不影响播放。
  }
  return saved
}

/** 只改变 Tinglan 的媒体音量，不修改 Windows 系统音量或默认设备。 */
export function connectDeviceVolume(
  state: { volume: number },
  audio: () => HTMLAudioElement | undefined,
  api: AudioOutputAPI | undefined = window.audioOutput,
  devices: MediaDevices | undefined = navigator.mediaDevices
): () => void {
  const { profiles, initialized } = readProfiles()
  const legacyVolume = validVolume(state.volume) ? state.volume : readStoredVolume()
  let currentId: string | null = null
  let currentLabel = ''
  let hasSeenOutput = initialized
  let identified = false
  let applying = false
  let disposed = false
  let revision = 0
  let pendingUserVolume: number | null = null
  let fallbackAudible = legacyVolume > 0 ? legacyVolume : NEW_DEVICE_LIMIT
  currentAudible = fallbackAudible
  currentOutput.value = undefined
  const applyMedia = (value: number) => {
    const element = audio()
    if (element) element.volume = value
  }
  const publishProfiles = () => {
    const ordered = [...profiles.values()].sort((a, b) => b.updatedAt - a.updatedAt)
    for (const entry of ordered.slice(MAX_DEVICES)) profiles.delete(entry.id)
    const devices = ordered.slice(0, MAX_DEVICES)
    savedOutputs.value = devices.map(({ id, label, volume }) => ({ id, label, volume }))
    return devices
  }
  const persist = () => {
    const devices = publishProfiles()
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ version: 1, initialized: hasSeenOutput, devices })
      )
    } catch {
      // 写入失败时仍在本次会话内分别记忆，不回读旧磁盘值覆盖新音量。
    }
  }
  const forget = (id: string) => {
    if (disposed || !profiles.delete(id)) return false
    // 删除只影响记忆，不调用 apply；同一输出的重复通知不会补回记录。
    persist()
    return true
  }
  removeProfile = forget
  publishProfiles()
  const remember = (value: number) => {
    if (!currentId) return
    profiles.set(currentId, {
      id: currentId,
      label: currentLabel || profiles.get(currentId)?.label || '',
      volume: value,
      audible: currentAudible ?? fallbackAudible,
      updatedAt: Date.now()
    })
    persist()
  }
  const apply = (value: number) => {
    applying = true
    try {
      state.volume = value
      applyMedia(value)
    } finally {
      applying = false
    }
  }
  const stopVolume = watch(
    () => state.volume,
    (value) => {
      if (!validVolume(value)) return
      applyMedia(value)
      if (applying) return
      if (value > 0) currentAudible = fallbackAudible = value
      saveStoredVolume(value)
      if (currentId) remember(value)
      else pendingUserVolume = value
    },
    { flush: 'sync' }
  )
  const select = (device: AudioOutputDevice | null) => {
    if (disposed) return
    if (
      !device?.available ||
      typeof device.id !== 'string' ||
      !device.id ||
      device.id.length > 512
    ) {
      currentId = null
      currentLabel = ''
      currentAudible ??= fallbackAudible
      if (!identified && pendingUserVolume === null) apply(legacyVolume)
      currentOutput.value = null
      return
    }
    const { id } = device
    const label = deviceLabel(device.label)
    if (id === currentId) {
      if (currentOutput.value?.label !== device.label) currentOutput.value = device
      currentLabel = label
      const existing = profiles.get(id)
      if (existing && label && label !== existing.label) {
        profiles.set(id, { ...existing, label })
        persist()
      }
      return
    }
    const entry = profiles.get(id)
    const value =
      pendingUserVolume ??
      entry?.volume ??
      (hasSeenOutput ? Math.min(state.volume, NEW_DEVICE_LIMIT) : legacyVolume)
    currentId = id
    currentLabel = label
    // 即使清空最后一条记录，之后识别到的输出也走新设备的保守音量。
    hasSeenOutput = true
    identified = true
    currentAudible =
      pendingUserVolume !== null && pendingUserVolume > 0
        ? pendingUserVolume
        : entry?.audible ?? (value > 0 ? value : NEW_DEVICE_LIMIT)
    fallbackAudible = currentAudible
    pendingUserVolume = null
    apply(value)
    saveStoredVolume(value)
    remember(value)
    currentOutput.value = device
  }
  const browserDevice = async (): Promise<AudioOutputDevice | null> => {
    if (!devices?.enumerateDevices) return null
    const outputs = (await devices.enumerateDevices()).filter((item) => item.kind === 'audiooutput')
    const actual = outputs.filter(
      (item) => item.deviceId && !['default', 'communications'].includes(item.deviceId)
    )
    const defaultDevice = outputs.find((item) => item.deviceId === 'default')
    const selected =
      actual.find((item) => defaultDevice?.groupId && item.groupId === defaultDevice.groupId) ??
      (actual.length === 1 ? actual[0] : undefined)
    // 不把固定的 default ID 当作不同耳机/音响，更不为识别输出去申请麦克风权限。
    return selected
      ? { id: 'browser:' + selected.deviceId, label: selected.label, available: true }
      : null
  }
  const refresh = async () => {
    const request = ++revision
    try {
      const device = (api ? await api.getCurrent() : null) ?? (await browserDevice())
      if (!disposed && request === revision) select(device)
    } catch {
      // 识别暂时失败时保留音量，且不把未知设备写入已有设备的配置。
      if (!disposed && request === revision) select(null)
    }
  }
  const stopDevice = api?.onChange((device) => {
    revision++
    select(device)
  })
  const onDeviceChange = () => void refresh()
  devices?.addEventListener('devicechange', onDeviceChange)
  const onFocus = () => void refresh()
  window.addEventListener('focus', onFocus)
  // 识别结果到达前避免把上次音响的大音量直接送到这次刚接入的耳机。
  // 这不是用户改动，不回写旧设备配置；识别完成后再恢复对应音量。
  apply(Math.min(legacyVolume, NEW_DEVICE_LIMIT))
  void refresh()
  return () => {
    disposed = true
    revision++
    stopVolume()
    stopDevice?.()
    devices?.removeEventListener('devicechange', onDeviceChange)
    window.removeEventListener('focus', onFocus)
    currentAudible = null
    currentOutput.value = undefined
    if (removeProfile === forget) {
      removeProfile = undefined
      savedOutputs.value = []
    }
  }
}
