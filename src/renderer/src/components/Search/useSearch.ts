import { cloudSearch } from '@/api/search'
import { reactive } from 'vue'
import { GetMusicDetailData } from '@/api/musicList'

interface State {
  resultList: GetMusicDetailData[]
  songCount: number
}

export default () => {
  const state: State = reactive({
    resultList: [],
    songCount: 0
  })
  const search = async (key: string, offset: number, limit = 30) => {
    const { result } = await cloudSearch(key, offset, limit)
    state.songCount = result.songCount
    state.resultList = result.songs
  }

  return {
    search
  }
}
