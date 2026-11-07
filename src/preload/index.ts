import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { UpdateAPI, UpdateState } from '../shared/update'
import type { ShortcutAPI, ShortcutId } from '../shared/shortcuts'
import type { AudioCacheAPI } from '../shared/audioCache'

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
  contextBridge.exposeInMainWorld('electron', extendsAPI)
  contextBridge.exposeInMainWorld('updates', updates)
  contextBridge.exposeInMainWorld('shortcuts', shortcuts)
  contextBridge.exposeInMainWorld('audioCache', audioCache)
} catch (error) {
  console.error(error)
}
