export type RecordContent = {
  term: string
  time: number
  path: string
}

export const RECORD_KEY = 'RECORD_LIST'

export type SuggestionKey = 'allMatch' | 'songs' | 'artists' | 'albums' | 'playlists'
export interface Suggestion {
  id?: number
  name?: string
  keyword?: string
  ar?: { name: string }[]
  artists?: { name: string }[]
  al?: { name: string; picUrl?: string }
}
export type Suggestions = Partial<Record<SuggestionKey, Suggestion[]>> & {
  order?: SuggestionKey[]
}
export interface HotSearch {
  searchWord: string
  content?: string
  score?: number | string
  iconUrl?: string
}
