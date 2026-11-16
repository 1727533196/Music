import type { CurrentItem, GetMusicDetailData } from '@/api/musicList'
import type { LocalTrack } from '../../../shared/localMusic'

export type PlaybackTrack = GetMusicDetailData | LocalTrack
export type TrackId = PlaybackTrack['id']
export type PlaybackQueue = Omit<CurrentItem, 'id' | 'tracks' | 'trackIds'> & {
  id: TrackId
  tracks: PlaybackTrack[]
  trackIds: { id: TrackId; uid?: number }[]
}

export function isLocalTrack(track: unknown): track is LocalTrack {
  if (!track || typeof track !== 'object') return false
  const value = track as Partial<LocalTrack>
  return value.source === 'local' && typeof value.id === 'string' && value.id.startsWith('local:')
}

export function trackArtwork(url: string, size = '150y150'): string {
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) return url
  const value = new URL(url)
  value.searchParams.set('param', size)
  return value.href
}
