import {useFlags} from "@/store/flags";
import {isElectron} from '@/utils';

// 定义 ipcRenderer 变量
let ipcRenderer = null;

// 使用异步函数来处理 ipcRenderer 的动态导入
// const loadIpcRenderer = async () => {
//   if (isElectron()) {
//     ipcRenderer = await import('electron').then(electron => electron.ipcRenderer);
//   }
// }

// 在模块加载时立即调用此函数以确保 ipcRenderer 被正确加载
// loadIpcRenderer();

export const handle = () => {
  const flags = useFlags();
  const maximize = () => {
    window.electron?.maximize()
    flags.isMaximize = true;
  }
  const unmaximize = () => {
    window.electron?.unmaximize()
    flags.isMaximize = false;
  }
  const minimize = () => {
    window.electron?.minimize()
    flags.isMinimize = true;
  }
  const restore = () => {
    window.electron?.restore()
    flags.isMinimize = false;
  }
  const close = () => {
    window.electron?.close()
  }

  return {
    maximize,
    unmaximize,
    minimize,
    restore,
    close,
  }
}
