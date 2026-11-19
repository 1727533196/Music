import { ElectronAPI } from '@electron-toolkit/preload'
import type { UpdateAPI } from '../shared/update'
import type { ShortcutAPI } from '../shared/shortcuts'
import type { AudioCacheAPI } from '../shared/audioCache'
import type { DesktopLyricsAPI, LyricPublisherAPI } from '../shared/desktopLyrics'
import type { LocalMusicAPI } from '../shared/localMusic'
import type { AudioOutputAPI } from '../shared/audioOutput'

declare global {
  interface Window {
    localMusic?: LocalMusicAPI
    audioOutput?: AudioOutputAPI
    desktopLyrics?: DesktopLyricsAPI
    lyricPublisher?: LyricPublisherAPI
    electron: ElectronAPI
    updates?: UpdateAPI
    shortcuts?: ShortcutAPI
    audioCache?: AudioCacheAPI
    api: unknown
  }
}
