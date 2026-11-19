import type { TrackId } from './playbackTrack'

const KEY = 'PLAYBACK_POSITION_V1'

export function playbackSeconds(value: unknown, duration = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 7 * 24 * 60 * 60)
    return 0
  // 已播放结束或旧记录超出实际音频长度时，从头待播，避免恢复即触发 ended。
  return Number.isFinite(duration) && duration > 0 && value >= duration ? 0 : value
}

export function readPlaybackPosition(id: TrackId, fallback: unknown, duration: number): number {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved?.id === id && saved.version === 1 && typeof saved.ended === 'boolean') {
      return saved.ended ? 0 : playbackSeconds(saved.time, duration)
    }
  } catch {
    /* 损坏记录不阻止恢复旧版 MUSIC_CONFIG。 */
  }
  if (typeof id === 'string' && id.startsWith('local:')) {
    try {
      const local = JSON.parse(localStorage.getItem('LOCAL_MUSIC_POSITION') || 'null')
      if (local?.id === id) return playbackSeconds(local.time, duration)
    } catch {
      /* 兼容旧版本地进度记录。 */
    }
  }
  return playbackSeconds(fallback, duration)
}

export function writePlaybackPosition(
  id: TrackId,
  time: number,
  duration: number,
  ended = false
): void {
  if (
    !(
      (typeof id === 'number' && Number.isFinite(id) && id > 0) ||
      (typeof id === 'string' && id.startsWith('local:'))
    )
  )
    return
  try {
    const position = { id, time: ended ? 0 : playbackSeconds(time, duration) }
    localStorage.setItem(KEY, JSON.stringify({ version: 1, ...position, duration, ended }))
    if (typeof id === 'string') {
      localStorage.setItem('LOCAL_MUSIC_POSITION', JSON.stringify(position))
    }
  } catch {
    /* 禁用存储或配额不足不影响播放。 */
  }
}

export function sameAudioSource(current: string, expected: string): boolean {
  if (!current || !expected) return false
  try {
    return new URL(current, document.baseURI).href === new URL(expected, document.baseURI).href
  } catch {
    return current === expected
  }
}
