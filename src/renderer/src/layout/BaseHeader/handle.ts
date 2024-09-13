import { useFlags } from '@/store/flags'
import { isElectron } from '@/utils'

// 定义 ipcRenderer 变量
let ipcRenderer = null

// 使用异步函数来处理 ipcRenderer 的动态导入
// const loadIpcRenderer = async () => {
//   if (isElectron()) {
//     ipcRenderer = await import('electron').then(electron => electron.ipcRenderer);
//   }
// }

// 在模块加载时立即调用此函数以确保 ipcRenderer 被正确加载
// loadIpcRenderer();

export const handle = () => {
  const flags = useFlags()
  const maximize = () => {
    flags.isMaximize = true
    window.electron?.ipcRenderer.send('maximize')
  }
  const unmaximize = () => {
    flags.isMaximize = false
    window.electron?.ipcRenderer.send('unmaximize')
  }
  const minimize = () => {
    flags.isMinimize = true
    window.electron?.ipcRenderer.send('minimize')
  }
  const restore = () => {
    flags.isMinimize = false
    window.electron?.ipcRenderer.send('restore')
  }
  const close = () => {
    window.electron?.ipcRenderer.send('close')
  }

  return {
    maximize,
    unmaximize,
    minimize,
    restore,
    close
  }
}
