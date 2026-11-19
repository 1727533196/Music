/** The app follows the operating system's default media output; it never changes that output. */
export interface AudioOutputDevice {
  /** Stable, local-only identity. Windows endpoint IDs are hashed before crossing IPC. */
  id: string
  label: string
  available: boolean
}

export interface AudioOutputAPI {
  getCurrent: () => Promise<AudioOutputDevice | null>
  onChange: (callback: (device: AudioOutputDevice | null) => void) => () => void
}
