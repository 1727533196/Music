export const shortcutIds = ['play_pause', 'prev_track', 'next_track', 'toggle_lyrics'] as const
export type ShortcutId = (typeof shortcutIds)[number]
export type ShortcutConfig = Record<ShortcutId, string[]>
export const globalShortcutDefaults: ShortcutConfig = {
  play_pause: ['Control', 'Alt', 'Space'],
  prev_track: ['Control', 'Alt', 'ArrowLeft'],
  next_track: ['Control', 'Alt', 'ArrowRight'],
  toggle_lyrics: ['Control', 'Alt', 'L']
}
export type ShortcutStatus = Record<ShortcutId, { registered: boolean; message: string }>
export function shortcutAccelerator(keys: unknown): string | null {
  if (
    !Array.isArray(keys) ||
    keys.length < 2 ||
    keys.length > 4 ||
    keys.some((key) => typeof key !== 'string')
  )
    return null
  const modifiers = keys.filter((key) => ['Control', 'Alt', 'Shift'].includes(key))
  const main = keys.filter((key) => !['Control', 'Alt', 'Shift'].includes(key))
  if (
    main.length !== 1 ||
    new Set(keys).size !== keys.length ||
    !modifiers.some((key) => key === 'Control' || key === 'Alt')
  )
    return null
  const names: Record<string, string> = {
    Space: 'Space',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    '+': 'Plus'
  }
  const key =
    names[main[0]] ||
    (/^[a-z0-9]$/i.test(main[0]) || /^F([1-9]|1\d|2[0-4])$/.test(main[0])
      ? main[0].toUpperCase()
      : null)
  return key
    ? [
        ...['Control', 'Alt', 'Shift']
          .filter((value) => modifiers.includes(value))
          .map((value) => (value === 'Control' ? 'CommandOrControl' : value)),
        key
      ].join('+')
    : null
}
export interface ShortcutAPI {
  configure(config: ShortcutConfig): Promise<ShortcutStatus>
  recording(value: boolean): Promise<ShortcutStatus>
  onAction(callback: (id: ShortcutId) => void): () => void
}
