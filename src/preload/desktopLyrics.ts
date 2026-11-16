import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopLyricsAPI } from '../shared/desktopLyrics'

export function desktopLyricsAPI(): DesktopLyricsAPI {
  const listen = (channel: string, callback: (value: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown) => callback(value)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
  return {
    setLyricBounds: (bounds) => ipcRenderer.invoke('desktop-lyrics:lyric-bounds', bounds),
    setUnlockBounds: (bounds) => ipcRenderer.invoke('desktop-lyrics:unlock-bounds', bounds),
    onLockHover: (callback) => listen('desktop-lyrics:lock-hover', callback),
    drag: (action) => ipcRenderer.invoke('desktop-lyrics:drag', action),
    getSnapshot: () => ipcRenderer.invoke('desktop-lyrics:snapshot'),
    configure: (settings) => ipcRenderer.invoke('desktop-lyrics:configure', settings),
    resetPosition: () => ipcRenderer.invoke('desktop-lyrics:reset-position'),
    command: (command) => ipcRenderer.invoke('desktop-lyrics:command', command),
    onState: (callback) => listen('desktop-lyrics:state', callback),
    onTrack: (callback) => listen('desktop-lyrics:track', callback),
    onClock: (callback) => listen('desktop-lyrics:clock', callback)
  }
}

// 独立窗口只暴露显示和控制接口，不暴露播放器、文件或通用 IPC。
contextBridge.exposeInMainWorld('desktopLyrics', desktopLyricsAPI())
