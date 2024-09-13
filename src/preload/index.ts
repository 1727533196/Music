import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const extendsAPI = {
  ...electronAPI
  // test: '111'
}
try {
  contextBridge.exposeInMainWorld('electron', extendsAPI)
} catch (error) {
  console.error(error)
}
