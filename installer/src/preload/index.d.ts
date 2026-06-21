export interface InstallOptions {
  installDir: string
  createShortcut: boolean
  autoStart: boolean
  associateFiles: boolean
  installServer: boolean
}

export interface ProgressPayload {
  step: string
  progress: number
}

export interface InstallerAPI {
  // 窗口控制
  minimize:     () => void
  maximize:     () => void
  unmaximize:   () => void
  close:        () => void
  // 目录选择
  getDefaultDir: () => Promise<string>
  chooseDir:     () => Promise<string | null>
  // 磁盘信息
  getDiskInfo:   (path: string) => Promise<{ available: number; total: number; required: number }>
  // 核心安装
  runInstall:    (opts: InstallOptions) => Promise<{ success: boolean; appPath?: string; error?: string }>
  onProgress:    (cb: (payload: ProgressPayload) => void) => () => void
  // 启动应用
  launchApp:     (appPath: string) => Promise<boolean>
  // 外部链接
  openUrl:       (url: string) => Promise<boolean>
  // 平台
  platform:      NodeJS.Platform
  // 日志监听
  onLog:         (cb: (msg: string) => void) => () => void
  onLogError:    (cb: (msg: string) => void) => () => void
}

declare global {
  interface Window {
    installer: InstallerAPI
  }
}
