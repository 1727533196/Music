export type LocalTrackId = `local:${string}`

export interface LocalTrack {
  id: LocalTrackId
  source: 'local'
  name: string
  ar: { id: number; name: string }[]
  al: { id: number; name: string; picUrl: string }
  dt: number
  local: {
    filePath: string
    format: string
    bitrate?: number
    sampleRate?: number
    bitsPerSample?: number
    missing: boolean
  }
}

export interface LocalLibrarySnapshot {
  tracks: LocalTrack[]
  folders: string[]
  scanning: boolean
  processed: number
  error?: string
}

export interface LocalMusicSource {
  track: LocalTrack
  url: string
  lyric: string
}

export interface LocalMusicUploadRequest {
  id: LocalTrackId
  requestId: string
  baseURL: string
  cookie: string
}

export interface LocalMusicUploadProgress {
  requestId: string
  id: LocalTrackId
  phase: 'uploading' | 'processing'
  loaded: number
  total: number
}

export interface LocalMusicUploadResult {
  songId?: number
}

export interface LocalMusicAPI {
  list(): Promise<LocalLibrarySnapshot>
  importFiles(): Promise<LocalLibrarySnapshot>
  importFolder(): Promise<LocalLibrarySnapshot>
  refresh(): Promise<LocalLibrarySnapshot>
  remove(id: LocalTrackId): Promise<LocalLibrarySnapshot>
  relocate(id: LocalTrackId): Promise<LocalLibrarySnapshot>
  resolve(id: LocalTrackId): Promise<LocalMusicSource>
  upload(request: LocalMusicUploadRequest): Promise<LocalMusicUploadResult>
  cancelUpload(requestId: string): Promise<void>
  onUploadProgress(callback: (progress: LocalMusicUploadProgress) => void): () => void
  onChange(callback: (snapshot: LocalLibrarySnapshot) => void): () => void
}
