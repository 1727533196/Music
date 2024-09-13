import {MusicPlayerInstanceType} from "@/components/MusicPlayer/index.vue";
import os from "os";
import {ipcRenderer} from "../../electron";

declare global {
    interface Window{
        $audio: MusicPlayerInstanceType
        $login: any
        electron?: {
            platform: string,
            maximize: () => void,
            unmaximize: () => void,
            minimize: () => void,
            restore: () => void,
            close: () => void,
            reset: () => void,
        }
    }
    const $audio: Window['$audio'];
    const electron: Window['electron'];
    interface ImportMetaEnv {
        VITE_APP_WEB_URL: string
    }
}

type Channel = 'maximize' | 'unmaximize' | 'minimize' | 'restore' | 'close'
declare module 'electron' {
    const ipcRenderer: {
        send: (channel: Channel) => void
    }
}

