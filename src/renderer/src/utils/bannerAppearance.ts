export interface BannerAppearance {
  songId: number
  /** 此调色板所属封面，可能仍是新封面取色完成前保留的上一张。 */
  cover: string
  colors: number[][]
}

const prefix = 'TINGLAN_BANNER_APPEARANCE_V1:'
const limit = 16
const memory = new Map<string, BannerAppearance>()
const clone = (value: BannerAppearance): BannerAppearance => ({
  ...value,
  colors: value.colors.map((color) => [...color])
})

export function isBannerPalette(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 10 &&
    value.every(
      (color) =>
        Array.isArray(color) &&
        color.length === 3 &&
        color.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255)
    )
  )
}

function valid(value: unknown): value is BannerAppearance {
  if (!value || typeof value !== 'object') return false
  const entry = value as BannerAppearance
  return (
    Number.isSafeInteger(entry.songId) &&
    entry.songId > 0 &&
    typeof entry.cover === 'string' &&
    entry.cover.length > 0 &&
    entry.cover.length <= 4096 &&
    isBannerPalette(entry.colors)
  )
}

function remember(key: string, value: BannerAppearance) {
  memory.delete(key)
  memory.set(key, clone(value))
  while (memory.size > limit) memory.delete(memory.keys().next().value!)
}

export function readBannerAppearance(key: string): BannerAppearance | null {
  const cached = memory.get(key)
  if (cached) {
    remember(key, cached)
    return clone(cached)
  }
  try {
    const raw = localStorage.getItem(prefix + key)
    if (raw && raw.length <= 8192) {
      const value: unknown = JSON.parse(raw)
      if (valid(value)) {
        remember(key, value)
        return clone(value)
      }
    }
  } catch {
    // 存储不可用/损坏不阻断首页；当前进程仍可以保留上次已显示的颜色。
  }
  return null
}

export function writeBannerAppearance(key: string, value: BannerAppearance): void {
  if (!valid(value)) return
  remember(key, value)
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const stored = localStorage.key(i)
      if (stored?.startsWith(prefix) && stored !== prefix + key) keys.push(stored)
    }
    // 只保留有限个服务/账号的外观，不缓存封面二进制或登录凭据。
    for (const stored of keys.slice(0, Math.max(0, keys.length - limit + 1))) {
      localStorage.removeItem(stored)
    }
    localStorage.setItem(prefix + key, JSON.stringify(value))
  } catch {
    // 配额满时使用上面的内存回退，不将背景重置成默认色。
  }
}

export function clearBannerAppearance(key: string): void {
  memory.delete(key)
  try {
    localStorage.removeItem(prefix + key)
  } catch {
    // 不影响退出登录。
  }
}
