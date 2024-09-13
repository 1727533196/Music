import { MusicPlayerInstanceType } from '@/components/MusicPlayer/index.vue'
import { ElectronAPI } from '@electron-toolkit/preload'

type Channel = 'maximize' | 'unmaximize' | 'minimize' | 'restore' | 'close'

declare global {
  interface Window {
    $audio: MusicPlayerInstanceType
    $login: any
    electron: ElectronAPI
  }

  interface ImportMetaEnv {
    VITE_APP_WEB_URL: string
  }
}

declare module '@electron-toolkit/preload' {
  interface IpcRenderer {
    send(channel: Channel, ...args: any[]): void
  }
}
