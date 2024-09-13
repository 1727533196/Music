import request from "@/utils/request";
import {GetMusicDetailData} from "@/api/musicList";

interface CloudSearch {
  code: number
  result: {
    searchQcReminder: null
    songCount: number
    songs: GetMusicDetailData[]
  }
}

interface SearchDefaultRes {
  code: number
  data: {
    realkeyword: string
    showKeyword: string
  }
}
export const cloudSearch = (keywords: string, offset: number, limit: number, type = 1) =>
  request<{keywords: string, limit: number, offset: number, type: number}, any>('/cloudsearch', {keywords, limit, offset, type})

// 热搜列表(详细)
export const searchHotDetail = () => request('/search/hot/detail')

// 搜索建议
export const searchSuggest = (keywords: string, type: 'mobile' | '' = '') => request(`/search/suggest?keywords=${keywords}&type=${type}`)

// 搜索多重匹配
export const searchMultimatch = (keywords: string) => request(`/search/multimatch?keywords=${keywords}`)

// 默认搜索关键词
export const searchDefault = () => request<null, SearchDefaultRes>('/search/default')
