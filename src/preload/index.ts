import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import os from 'os'
import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  platform: os.platform(),
  maximize: () => ipcRenderer.send('maximize'),
  unmaximize: () => ipcRenderer.send('unmaximize'),
  minimize: () => ipcRenderer.send('minimize'),
  restore: () => ipcRenderer.send('restore'),
  close: () => ipcRenderer.send('close'),
  reset: () => ipcRenderer.send('reset')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
