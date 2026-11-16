// 首页只保存展示/播放所需数据，不保存 cookie 或登录凭据；每个服务和账号独立存放。
const PREFIX = 'TINGLAN_HOME_V1:'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 24
const MAX_ENTRY_BYTES = 2 * 1024 * 1024

interface Cached<T> {
  savedAt: number
  data: T
}

export function homeCacheKey(server: string, account: string, section: string): string {
  return `${PREFIX}${encodeURIComponent(server.trim().replace(/\/+$/, ''))}:${account}:${section}`
}

export function readHomeCache<T>(
  key: string,
  valid: (data: unknown) => data is T
): Cached<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw || raw.length > MAX_ENTRY_BYTES) return null
    const value = JSON.parse(raw) as Cached<unknown>
    if (
      !Number.isFinite(value.savedAt) ||
      value.savedAt <= 0 ||
      value.savedAt > Date.now() + 60_000 ||
      Date.now() - value.savedAt > MAX_AGE ||
      !valid(value.data)
    ) {
      localStorage.removeItem(key)
      return null
    }
    return value as Cached<T>
  } catch {
    return null
  }
}

export function writeHomeCache<T>(key: string, data: T): void {
  try {
    const now = Date.now()
    const entries: { key: string; savedAt: number }[] = []
    for (let index = 0; index < localStorage.length; index++) {
      const storedKey = localStorage.key(index)
      if (!storedKey?.startsWith(PREFIX)) continue
      try {
        const { savedAt } = JSON.parse(localStorage.getItem(storedKey) || '{}')
        entries.push({ key: storedKey, savedAt: Number(savedAt) || 0 })
      } catch {
        entries.push({ key: storedKey, savedAt: 0 })
      }
    }
    entries.sort((a, b) => b.savedAt - a.savedAt)
    entries.forEach((entry, index) => {
      if (now - entry.savedAt > MAX_AGE || index >= MAX_ENTRIES - 1) {
        localStorage.removeItem(entry.key)
      }
    })
    const raw = JSON.stringify({ savedAt: now, data })
    if (new Blob([raw]).size <= MAX_ENTRY_BYTES) localStorage.setItem(key, raw)
  } catch {
    // 禁用存储或空间不足不应阻止正常在线加载。
  }
}

export function clearHomePersonalCache(server: string, account: string): void {
  try {
    for (const section of ['songs', 'albums', 'recent']) {
      localStorage.removeItem(homeCacheKey(server, account, section))
    }
  } catch {
    // 存储不可用时仍正常退出页面账号。
  }
}
