export interface UpdateRelease {
  version: string
  platform: 'win32'
  arch: 'x64'
  url: string
  sha256: string
  size: number
  notes: string
  mirrors?: string[]
}

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing' | 'error'
  currentVersion: string
  supported: boolean
  canInstall: boolean
  release: UpdateRelease | null
  progress: number
  bytesPerSecond: number
  downloadSource: string
  message: string
}

export interface UpdateAPI {
  getState(): Promise<UpdateState>
  check(): Promise<UpdateState>
  download(): Promise<UpdateState>
  cancel(): Promise<void>
  install(): Promise<UpdateState>
  onState(callback: (state: UpdateState) => void): () => void
}
