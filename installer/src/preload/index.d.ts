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
  minimize:    () => void
  close:       () => void
  chooseDir:   () => Promise<string | null>
  getDiskInfo: (path: string) => Promise<{ available: number; required: number }>
  runInstall:  (opts: InstallOptions) => Promise<{ success: boolean; appPath?: string; error?: string }>
  onProgress:  (cb: (payload: ProgressPayload) => void) => () => void
  launchApp:   (appPath: string) => Promise<boolean>
  platform:    NodeJS.Platform
}

declare global {
  interface Window {
    installer: InstallerAPI
  }
}

