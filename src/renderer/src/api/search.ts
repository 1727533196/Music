import request from '@/utils/request'
import type { GetMusicDetailData } from '@/api/musicList'

export interface SearchArtist {
  id: number
  name: string
  picUrl?: string
  img1v1Url?: string
  alias?: string[]
  alia?: string[]
  albumSize?: number
  musicSize?: number
  fansSize?: number | null
  followed?: boolean
}

export interface SearchAlbum {
  id: number
  name: string
  picUrl?: string
  blurPicUrl?: string
  artist?: SearchArtist
  artists?: SearchArtist[]
  publishTime?: number
  size?: number
  type?: string
}

export interface SearchPlaylist {
  id: number
  name: string
  coverImgUrl?: string
  trackCount?: number
  playCount?: number
  creator?: { nickname?: string; userId?: number }
}

export interface SearchResultMap {
  1: { songs?: GetMusicDetailData[]; songCount?: number }
  100: { artists?: SearchArtist[]; artistCount?: number }
  10: { albums?: SearchAlbum[]; albumCount?: number }
  1000: { playlists?: SearchPlaylist[]; playlistCount?: number }
}

export type SearchType = keyof SearchResultMap
export interface SearchResponse<T extends SearchType> {
  code: number
  result?: SearchResultMap[T]
}

// 多重匹配的字段名与 /cloudsearch 不同，使用 artist / album / song 单数键。
// song 可能使用旧版歌曲结构，播放前仍需通过 /song/detail 获取完整数据。
export interface SearchMatchSong {
  id: number
  name: string
  artists?: SearchArtist[]
  album?: SearchAlbum
  duration?: number
}

export interface SearchMultiMatchResponse {
  code: number
  result?: {
    artist?: SearchArtist[]
    album?: SearchAlbum[]
    song?: SearchMatchSong[]
    playlist?: SearchPlaylist[]
    orders?: string[]
  }
}

interface SearchRequestOptions {
  signal?: AbortSignal
  silentError?: boolean
}

interface SearchDefaultRes {
  code: number
  data: {
    realkeyword: string
    showKeyword: string
  }
}
export const cloudSearch = (keywords: string, offset: number, limit: number, type = 1) =>
  request<{ keywords: string; limit: number; offset: number; type: number }, any>('/cloudsearch', {
    keywords,
    limit,
    offset,
    type
  })

// 分类结果页使用类型明确的请求，并由各区块自行展示错误和重试入口。
export const searchResults = <T extends SearchType>(
  keywords: string,
  offset: number,
  limit: number,
  type: T,
  options: SearchRequestOptions = {}
) =>
  request<unknown, SearchResponse<T>>({
    url: '/cloudsearch',
    method: 'get',
    params: { keywords, offset, limit, type },
    silentError: true,
    ...options
  })

// 热搜列表(详细)
export const searchHotDetail = () => request('/search/hot/detail')

// 搜索建议
export const searchSuggest = (keywords: string, type: 'mobile' | '' = '') =>
  request<
    { keywords: string; type: string },
    { result?: import('@/components/Search/type').Suggestions }
  >('/search/suggest', { keywords, type })

// 搜索多重匹配
export const searchMultimatch = (keywords: string, options: SearchRequestOptions = {}) =>
  request<unknown, SearchMultiMatchResponse>({
    url: '/search/multimatch',
    method: 'get',
    params: { keywords },
    silentError: true,
    ...options
  })

// 默认搜索关键词
export const searchDefault = () => request<null, SearchDefaultRes>('/search/default')
