import { getMusicUrl } from '@/api/musicList'
import { useUserInfo } from '@/store'
import { useSettings } from '@/store/settings'
import { isAudioQuality, type AudioQuality, type AudioCacheKey } from '../../../shared/audioCache'
import { getMusicUrlExpiresAt } from './musicSource'

export function audioCacheKey(songId: number, quality: AudioQuality): AudioCacheKey {
  const settings = useSettings()
  const user = useUserInfo()
  return {
    songId,
    quality,
    scope: JSON.stringify([settings.state.baseUrl, user.profile.userId || 'anonymous'])
  }
}
export async function resolveAudioSource(
  songId: number,
  quality: AudioQuality,
  bypassCache = false
) {
  const key = audioCacheKey(songId, quality)
  if (!bypassCache) {
    const hit = await window.audioCache?.find(key).catch(() => null)
    if (hit)
      return { ...hit, trial: false, qualityVerified: true, expiresAt: Number.MAX_SAFE_INTEGER }
  } else await window.audioCache?.invalidate(key).catch(() => {})
  const requestedAt = Date.now()
  let { data } = await getMusicUrl(songId, quality)
  if (!data?.[0]?.url && quality !== 'standard') ({ data } = await getMusicUrl(songId, 'standard'))
  const value = data?.[0]
  if (!value?.url) throw new Error('当前歌曲暂无可播放的音频链接')
  const actual = isAudioQuality(value.level) ? value.level : quality
  const qualityVerified = isAudioQuality(value.level)
  const expiresAt = getMusicUrlExpiresAt(value.expi, requestedAt)
  const fallback = { url: value.url, quality: actual, duration: value.time, cached: false }
  // 试听片段不作为完整歌曲缓存。播放地址仅由现有接口获取。
  const trial = value.freeTrialInfo != null && value.freeTrialInfo !== 'null'
  const source =
    !bypassCache && !trial && qualityVerified && window.audioCache
      ? await window.audioCache
          .prepare({
            ...key,
            quality: actual,
            url: value.url,
            size: value.size,
            duration: value.time
          })
          .catch(() => fallback)
      : fallback
  return {
    ...source,
    qualityVerified,
    trial,
    expiresAt: source.url.startsWith('tinglan-audio:') ? Number.MAX_SAFE_INTEGER : expiresAt
  }
}
