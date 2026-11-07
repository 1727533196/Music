import { ElectronAPI } from '@electron-toolkit/preload'
import type { UpdateAPI } from '../shared/update'
import type { ShortcutAPI } from '../shared/shortcuts'
import type { AudioCacheAPI } from '../shared/audioCache'

declare global {
  interface Window {
    electron: ElectronAPI
    updates?: UpdateAPI
    shortcuts?: ShortcutAPI
    audioCache?: AudioCacheAPI
    api: unknown
  }
}
