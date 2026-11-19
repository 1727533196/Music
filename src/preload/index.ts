import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { UpdateAPI, UpdateState } from '../shared/update'
import type { ShortcutAPI, ShortcutId } from '../shared/shortcuts'
import type { AudioCacheAPI } from '../shared/audioCache'
import type { DesktopLyricsAPI, LyricPublisherAPI } from '../shared/desktopLyrics'
import type { LocalMusicAPI } from '../shared/localMusic'
import type { AudioOutputAPI } from '../shared/audioOutput'

const audioOutput: AudioOutputAPI = {
  getCurrent: () => ipcRenderer.invoke('audio-output:get-current'),
  onChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, device: Parameters<typeof callback>[0]) =>
      callback(device)
    ipcRenderer.on('audio-output:change', handler)
    return () => ipcRenderer.removeListener('audio-output:change', handler)
  }
}

const localMusic: LocalMusicAPI = {
  list: () => ipcRenderer.invoke('local-music:list'),
  importFiles: () => ipcRenderer.invoke('local-music:importFiles'),
  importFolder: () => ipcRenderer.invoke('local-music:importFolder'),
  refresh: () => ipcRenderer.invoke('local-music:refresh'),
  remove: (id) => ipcRenderer.invoke('local-music:remove', id),
  relocate: (id) => ipcRenderer.invoke('local-music:relocate', id),
  resolve: (id) => ipcRenderer.invoke('local-music:resolve', id),
  upload: (request) => ipcRenderer.invoke('local-music:upload', request),
  cancelUpload: (requestId) => ipcRenderer.invoke('local-music:cancelUpload', requestId),
  onUploadProgress: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, value: Parameters<typeof callback>[0]) =>
      callback(value)
    ipcRenderer.on('local-music:upload-progress', handler)
    return () => ipcRenderer.removeListener('local-music:upload-progress', handler)
  },
  onChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, value: Parameters<typeof callback>[0]) =>
      callback(value)
    ipcRenderer.on('local-music:change', handler)
    return () => ipcRenderer.removeListener('local-music:change', handler)
  }
}

const onLyric = <T>(channel: string, callback: (value: T) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, value: T) => callback(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}
const desktopLyrics: DesktopLyricsAPI = {
  setLyricBounds: (bounds) => ipcRenderer.invoke('desktop-lyrics:lyric-bounds', bounds),
  setUnlockBounds: (bounds) => ipcRenderer.invoke('desktop-lyrics:unlock-bounds', bounds),
  onLockHover: (callback) => onLyric('desktop-lyrics:lock-hover', callback),
  drag: (action) => ipcRenderer.invoke('desktop-lyrics:drag', action),
  getSnapshot: () => ipcRenderer.invoke('desktop-lyrics:snapshot'),
  configure: (settings) => ipcRenderer.invoke('desktop-lyrics:configure', settings),
  resetPosition: () => ipcRenderer.invoke('desktop-lyrics:reset-position'),
  command: (command) => ipcRenderer.invoke('desktop-lyrics:command', command),
  onState: (callback) => onLyric('desktop-lyrics:state', callback),
  onTrack: (callback) => onLyric('desktop-lyrics:track', callback),
  onClock: (callback) => onLyric('desktop-lyrics:clock', callback)
}
const lyricPublisher: LyricPublisherAPI = {
  connect: () => ipcRenderer.invoke('desktop-lyrics:connect'),
  track: (value) => ipcRenderer.send('desktop-lyrics:track', value),
  clock: (value) => ipcRenderer.send('desktop-lyrics:clock', value),
  onCommand: (callback) => onLyric('desktop-lyrics:command', callback),
  onVisibility: (callback) => onLyric('desktop-lyrics:owner-visible', callback)
}

const audioCache: AudioCacheAPI = {
  find: (key) => ipcRenderer.invoke('audio-cache:find', key),
  prepare: (value) => ipcRenderer.invoke('audio-cache:prepare', value),
  details: (key, value) => ipcRenderer.invoke('audio-cache:details', key, value),
  invalidate: (key) => ipcRenderer.invoke('audio-cache:invalidate', key),
  stats: () => ipcRenderer.invoke('audio-cache:stats'),
  clear: (keepUrl) => ipcRenderer.invoke('audio-cache:clear', keepUrl)
}

const shortcuts: ShortcutAPI = {
  configure: (config) => ipcRenderer.invoke('shortcuts:configure', config),
  recording: (value) => ipcRenderer.invoke('shortcuts:recording', value),
  onAction: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, id: ShortcutId) => callback(id)
    ipcRenderer.on('shortcuts:action', handler)
    return () => ipcRenderer.removeListener('shortcuts:action', handler)
  }
}

const updates: UpdateAPI = {
  getState: () => ipcRenderer.invoke('updates:get-state'),
  check: () => ipcRenderer.invoke('updates:check'),
  download: () => ipcRenderer.invoke('updates:download'),
  cancel: () => ipcRenderer.invoke('updates:cancel'),
  install: () => ipcRenderer.invoke('updates:install'),
  onState: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => callback(state)
    ipcRenderer.on('updates:state', handler)
    return () => ipcRenderer.removeListener('updates:state', handler)
  }
}

const extendsAPI = {
  ...electronAPI
  // test: '111'
}
try {
  contextBridge.exposeInMainWorld('desktopLyrics', desktopLyrics)
  contextBridge.exposeInMainWorld('lyricPublisher', lyricPublisher)
  contextBridge.exposeInMainWorld('electron', extendsAPI)
  contextBridge.exposeInMainWorld('updates', updates)
  contextBridge.exposeInMainWorld('shortcuts', shortcuts)
  contextBridge.exposeInMainWorld('audioCache', audioCache)
  contextBridge.exposeInMainWorld('localMusic', localMusic)
  contextBridge.exposeInMainWorld('audioOutput', audioOutput)
} catch (error) {
  console.error(error)
}
