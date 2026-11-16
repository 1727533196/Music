export interface DesktopLyricWord {
  text: string
  startMs: number
  endMs: number
}
export interface DesktopLyricLine {
  text: string
  startMs: number
  endMs: number
  words: DesktopLyricWord[]
}
export interface DesktopLyricTrack {
  trial?: boolean
  revision: number
  id: string
  title: string
  artist: string
  loading: boolean
  lines: DesktopLyricLine[]
}
export interface DesktopLyricClock {
  revision: number
  sequence: number
  positionMs: number
  sampledAt: number
  playing: boolean
  buffering: boolean
  rate: number
}
export interface DesktopLyricSettings {
  enabled: boolean
  locked: boolean
  fontFamily: 'system' | 'Microsoft YaHei' | 'SimHei' | 'Arial'
  fontSize: number
  color: string
  highlight: string
  opacity: number
  offsetMs: number
  width: number
}
export const desktopLyricDefaults: DesktopLyricSettings = {
  enabled: false,
  locked: false,
  fontFamily: 'system',
  fontSize: 28,
  color: 'rgba(255, 255, 255, 0.3)',
  highlight: 'rgba(255, 255, 255, 1)',
  opacity: 1,
  offsetMs: 0,
  width: 760
}
export const desktopLyricCommands = [
  'play-pause',
  'previous',
  'next',
  'toggle',
  'toggle-lock',
  'close'
] as const
export type DesktopLyricCommand = (typeof desktopLyricCommands)[number]
export interface DesktopLyricSnapshot {
  lockHovered: boolean
  settings: DesktopLyricSettings
  track: DesktopLyricTrack | null
  clock: DesktopLyricClock | null
}
export interface DesktopLyricsAPI {
  setLyricBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>
  setUnlockBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>
  onLockHover(callback: (hovered: boolean) => void): () => void
  drag(action: 'start' | 'move' | 'end'): Promise<void>
  getSnapshot(): Promise<DesktopLyricSnapshot>
  configure(settings: Partial<DesktopLyricSettings>): Promise<DesktopLyricSettings>
  resetPosition(): Promise<void>
  command(command: DesktopLyricCommand): Promise<void>
  onState(callback: (settings: DesktopLyricSettings) => void): () => void
  onTrack(callback: (track: DesktopLyricTrack) => void): () => void
  onClock(callback: (clock: DesktopLyricClock) => void): () => void
}
export interface LyricPublisherAPI {
  connect(): Promise<void>
  track(track: DesktopLyricTrack): void
  clock(clock: DesktopLyricClock): void
  onCommand(callback: (command: DesktopLyricCommand) => void): () => void
  onVisibility(callback: (visible: boolean) => void): () => void
}
export function parseDesktopLyricColor(value: unknown): { hex: string; alpha: number } | null {
  if (typeof value !== 'string') return null
  const hex = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i)
  if (hex) return { hex: '#' + hex[1], alpha: hex[2] ? parseInt(hex[2], 16) / 255 : 1 }
  const rgba = value.match(
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i
  )
  if (!rgba || rgba.slice(1, 4).some((channel) => Number(channel) > 255)) return null
  return {
    hex:
      '#' +
      rgba
        .slice(1, 4)
        .map((channel) => Number(channel).toString(16).padStart(2, '0'))
        .join(''),
    alpha: Number(rgba[4])
  }
}
export function desktopLyricRgba(hex: string, alpha: number): string {
  const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  return `rgba(${rgb.join(', ')}, ${alpha})`
}
export function sanitizeDesktopLyricSettings(
  value: Partial<DesktopLyricSettings>
): Partial<DesktopLyricSettings> {
  const result: Partial<DesktopLyricSettings> = {}
  for (const key of ['enabled', 'locked'] as const)
    if (typeof value[key] === 'boolean') result[key] = value[key]
  for (const [key, min, max] of [
    ['fontSize', 20, 72],
    ['opacity', 0.4, 1],
    ['offsetMs', -5000, 5000],
    ['width', 320, 1400]
  ] as const) {
    const n = value[key]
    if (typeof n === 'number' && Number.isFinite(n)) result[key] = Math.min(max, Math.max(min, n))
  }
  for (const key of ['color', 'highlight'] as const)
    if (parseDesktopLyricColor(value[key])) result[key] = value[key]
  if (['system', 'Microsoft YaHei', 'SimHei', 'Arial'].includes(value.fontFamily || ''))
    result.fontFamily = value.fontFamily
  return result
}
