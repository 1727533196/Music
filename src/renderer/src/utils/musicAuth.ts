import { normalizeMusicCookie } from '../../../shared/musicCookie'

export function getMusicAuthCookie(): string {
  try {
    return (
      normalizeMusicCookie(localStorage.getItem('MUSIC_U')) ||
      normalizeMusicCookie(localStorage.getItem('cookie-MUSIC_U'))
    )
  } catch {
    return ''
  }
}
