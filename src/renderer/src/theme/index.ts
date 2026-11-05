export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeScheme = 'light' | 'dark'
export type AccentColor = 'white' | 'graphite' | 'violet' | 'teal' | 'amber'
export const defaultAccentColor: AccentColor = 'white'

export const themeModes: { value: ThemeMode; label: string; description: string }[] = [
  { value: 'light', label: '浅色', description: '清晰明亮，适合白天聆听' },
  { value: 'dark', label: '深色', description: '柔和暗色，专注音乐' },
  { value: 'system', label: '跟随系统', description: '随设备外观自动切换' }
]
export const accentColors: { value: AccentColor; label: string; light: string; dark: string }[] = [
  { value: 'white', label: '黑白', light: '#262626', dark: '#ffffff' },
  { value: 'graphite', label: '石墨', light: '#4b5563', dark: '#cbd0d8' },
  { value: 'violet', label: '紫罗兰', light: '#734ac6', dark: '#c5adf3' },
  { value: 'teal', label: '青绿', light: '#087d72', dark: '#8bcfc5' },
  { value: 'amber', label: '琥珀', light: '#a45c12', dark: '#e8be83' }
]
export const isThemeMode = (value: unknown): value is ThemeMode =>
  themeModes.some((option) => option.value === value)
export const isAccentColor = (value: unknown): value is AccentColor =>
  accentColors.some((option) => option.value === value)

let currentMode: ThemeMode = 'dark'
let currentAccent: AccentColor = defaultAccentColor
let systemPreference: MediaQueryList | undefined
const listeners = new Set<(scheme: ThemeScheme, accent: string) => void>()
const systemIsDark = () =>
  (systemPreference || window.matchMedia('(prefers-color-scheme: dark)')).matches

export function applyAppTheme(mode: ThemeMode, accent: AccentColor): void {
  currentMode = isThemeMode(mode) ? mode : 'dark'
  currentAccent = isAccentColor(accent) ? accent : defaultAccentColor
  const scheme: ThemeScheme =
    currentMode === 'system' ? (systemIsDark() ? 'dark' : 'light') : currentMode
  const root = document.documentElement
  root.dataset.theme = scheme
  root.dataset.themeMode = currentMode
  root.dataset.accent = currentAccent
  root.classList.toggle('dark', scheme === 'dark')
  root.style.colorScheme = scheme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', scheme === 'dark' ? '#121314' : '#f6f7f8')
  const accentValue = accentColors.find((option) => option.value === currentAccent)![scheme]
  listeners.forEach((listener) => listener(scheme, accentValue))
}

export function initializeAppTheme(
  onChange: (scheme: ThemeScheme, accent: string) => void
): () => void {
  listeners.add(onChange)
  systemPreference = window.matchMedia('(prefers-color-scheme: dark)')
  const handleSystemChange = () => {
    if (currentMode === 'system') applyAppTheme(currentMode, currentAccent)
  }
  systemPreference.addEventListener('change', handleSystemChange)
  const { themeMode, accent } = document.documentElement.dataset
  applyAppTheme(
    isThemeMode(themeMode) ? themeMode : currentMode,
    isAccentColor(accent) ? accent : currentAccent
  )
  return () => {
    listeners.delete(onChange)
    systemPreference?.removeEventListener('change', handleSystemChange)
  }
}
