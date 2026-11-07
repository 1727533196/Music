export const audioQualities = [
  { value: 'standard', label: '标准', description: '128 kbps' },
  { value: 'higher', label: '较高', description: '192 kbps' },
  { value: 'exhigh', label: '极高', description: '320 kbps' },
  { value: 'lossless', label: '无损', description: 'FLAC' },
  { value: 'hires', label: 'Hi-Res', description: '高解析度' }
] as const
export type AudioQuality = (typeof audioQualities)[number]['value']
export const isAudioQuality = (value: unknown): value is AudioQuality =>
  audioQualities.some((item) => item.value === value)
export interface AudioCacheKey {
  scope: string
  songId: number
  quality: AudioQuality
}
export interface AudioSource {
  url: string
  quality: AudioQuality
  duration: number
  cached: boolean
  details?: string
}
export interface AudioCacheStats {
  bytes: number
  count: number
  pending: number
  limit: number
}
export interface AudioCacheAPI {
  find(key: AudioCacheKey): Promise<AudioSource | null>
  prepare(
    value: AudioCacheKey & { url: string; size?: number; duration: number }
  ): Promise<AudioSource>
  details(key: AudioCacheKey, details: string): Promise<void>
  invalidate(key: AudioCacheKey): Promise<void>
  stats(): Promise<AudioCacheStats>
  clear(keepUrl?: string): Promise<AudioCacheStats>
}
