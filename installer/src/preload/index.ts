import {contextBridge, ipcRenderer} from 'electron'

/**
 * 安装器 preload — 将所有安装相关的 IPC 调用暴露给渲染进程
 * 渲染进程通过 window.installer.xxx 调用
 */
const installerAPI = {
  // ── 窗口控制 ──────────────────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('installer:minimize'),
  maximize: () => ipcRenderer.send('installer:maximize'),
  unmaximize: () => ipcRenderer.send('installer:unmaximize'),
  close:    () => ipcRenderer.send('installer:close'),

  // ── 目录选择 ──────────────────────────────────────────────────────────────
  /** 获取主进程计算的默认安装目录 */
  getDefaultDir: (): Promise<string> =>
    ipcRenderer.invoke('installer:default-dir'),

  /** 弹出系统目录选择对话框，返回选中路径或 null */
  chooseDir: (): Promise<string | null> =>
    ipcRenderer.invoke('installer:choose-dir'),

  // ── 磁盘信息 ──────────────────────────────────────────────────────────────
  /** 获取指定路径所在磁盘的可用空间（字节）、总空间（字节）和本次安装所需空间（字节）*/
  getDiskInfo: (path: string): Promise<{ available: number; total: number; required: number }> =>
    ipcRenderer.invoke('installer:disk-info', path),

  // ── 核心安装 ──────────────────────────────────────────────────────────────
  /**
   * 开始安装，返回 { success, appPath?, error? }
   * 安装进度通过 onProgress 回调实时上报
   */
  runInstall: (opts: InstallOptions): Promise<{ success: boolean; appPath?: string; error?: string }> =>
    ipcRenderer.invoke('installer:run', opts),

  /** 监听安装进度 */
  onProgress: (cb: (payload: ProgressPayload) => void) => {
    const handler = (_evt: Electron.IpcRendererEvent, payload: ProgressPayload) => cb(payload)
    ipcRenderer.on('installer:progress', handler)
    // 返回取消监听函数
    return () => ipcRenderer.removeListener('installer:progress', handler)
  },

  // ── 安装后启动 ────────────────────────────────────────────────────────────
  /** 启动刚安装好的主应用，然后关闭安装器 */
  launchApp: (appPath: string): Promise<boolean> =>
    ipcRenderer.invoke('installer:launch-app', appPath),

  // ── 平台信息 ──────────────────────────────────────────────────────────────
  platform: process.platform as NodeJS.Platform,

  // ── 外部链接 ──────────────────────────────────────────────────────────────
  /** 在默认浏览器中打开链接 */
  openUrl: (url: string): Promise<boolean> =>
    ipcRenderer.invoke('installer:open-url', url),

  // ── 日志监听 ──────────────────────────────────────────────────────────────
  onLog: (cb: (msg: string) => void) => {
    const handler = (_evt: Electron.IpcRendererEvent, msg: string) => cb(msg)
    ipcRenderer.on('installer:log', handler)
    return () => ipcRenderer.removeListener('installer:log', handler)
  },
  onLogError: (cb: (msg: string) => void) => {
    const handler = (_evt: Electron.IpcRendererEvent, msg: string) => cb(msg)
    ipcRenderer.on('installer:log-error', handler)
    return () => ipcRenderer.removeListener('installer:log-error', handler)
  }
}

contextBridge.exposeInMainWorld('installer', installerAPI)

// ── 类型 ──────────────────────────────────────────────────────────────────────
interface InstallOptions {
  installDir: string
  createShortcut: boolean
  autoStart: boolean
  associateFiles: boolean
  installServer: boolean
}

interface ProgressPayload {
  step: string
  progress: number
}

