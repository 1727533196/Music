import { shallowRef } from 'vue'
import { useFlags } from '@/store/flags'
import { useMusicAction } from '@/store/music'
import {
  globalShortcutDefaults,
  shortcutIds,
  shortcutAccelerator,
  type ShortcutConfig,
  type ShortcutId,
  type ShortcutStatus
} from '../../../shared/shortcuts'

const localDefaults: ShortcutConfig = {
  play_pause: ['Space'],
  prev_track: ['Control', 'ArrowLeft'],
  next_track: ['Control', 'ArrowRight'],
  toggle_lyrics: ['L']
}
export const shortcutStatus = shallowRef<ShortcutStatus | null>(null)
let recording = false
let initialized = false
const sameKeys = (a: string[], b: string[]) =>
  a
    .map((key) => key.toLowerCase())
    .sort()
    .join('+') ===
  b
    .map((key) => key.toLowerCase())
    .sort()
    .join('+')
function savedKeys(key: string): string[] | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return Array.isArray(value) && value.length && value.every((item) => typeof item === 'string')
      ? value
      : null
  } catch {
    return null
  }
}
export function readGlobalShortcuts(): ShortcutConfig {
  return Object.fromEntries(
    shortcutIds.map((id) => {
      const saved = savedKeys(`global_shortcut_${id}`)
      const legacy = savedKeys(`shortcut_${id}`)
      const custom =
        legacy && !sameKeys(legacy, localDefaults[id]) && shortcutAccelerator(legacy)
          ? legacy
          : null
      return [
        id,
        [...(saved && shortcutAccelerator(saved) ? saved : custom || globalShortcutDefaults[id])]
      ]
    })
  ) as ShortcutConfig
}
export async function syncGlobalShortcuts() {
  if (window.shortcuts)
    shortcutStatus.value = await window.shortcuts.configure(readGlobalShortcuts())
  return shortcutStatus.value
}
export async function setShortcutRecording(value: boolean) {
  recording = value
  if (window.shortcuts) shortcutStatus.value = await window.shortcuts.recording(value)
}
function execute(id: ShortcutId) {
  if (recording) return
  const audio = window.$audio
  switch (id) {
    case 'play_pause':
      if (audio) {
        if (audio.isPlay) audio.pause()
        else void audio.play()
      }
      break
    case 'prev_track':
      useMusicAction().cutSongHandler(false)
      break
    case 'next_track':
      useMusicAction().cutSongHandler(true)
      break
    case 'toggle_lyrics': {
      const flags = useFlags()
      flags.isOpenDetail = !flags.isOpenDetail
      break
    }
  }
}
function keydown(event: KeyboardEvent) {
  if (recording || event.repeat || event.isComposing || !(event.target instanceof HTMLElement))
    return
  const pressed = [
    event.ctrlKey || event.metaKey ? 'Control' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.key === ' ' ? 'Space' : event.key
  ].filter(Boolean)
  const globals = readGlobalShortcuts()
  if (
    shortcutIds.some(
      (id) => shortcutStatus.value?.[id].registered && sameKeys(pressed, globals[id])
    )
  )
    return
  if (
    (event.ctrlKey || event.metaKey || event.altKey) &&
    sameKeys(pressed, savedKeys('shortcut_search') || ['Control', 'K'])
  ) {
    event.preventDefault()
    event.stopPropagation()
    window.dispatchEvent(new CustomEvent('open-search'))
    return
  }
  if (
    event.target.closest('input, textarea, select, button, a, summary, [role="tab"]') ||
    event.target.isContentEditable
  )
    return
  for (const id of shortcutIds) {
    const local = savedKeys(`shortcut_${id}`) || localDefaults[id]
    if (
      sameKeys(pressed, local) ||
      (!shortcutStatus.value?.[id].registered && sameKeys(pressed, globals[id]))
    ) {
      event.preventDefault()
      event.stopPropagation()
      execute(id)
      return
    }
  }
}
export function initializeShortcuts(): () => void {
  if (initialized) return () => {}
  initialized = true
  const unsubscribe = window.shortcuts?.onAction(execute)
  document.addEventListener('keydown', keydown)
  void syncGlobalShortcuts().catch(() => {
    shortcutStatus.value = null
  })
  return () => {
    initialized = false
    unsubscribe?.()
    document.removeEventListener('keydown', keydown)
  }
}
