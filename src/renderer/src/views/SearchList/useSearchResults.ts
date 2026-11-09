import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  searchMultimatch,
  searchResults,
  type SearchAlbum,
  type SearchArtist,
  type SearchPlaylist
} from '@/api/search'
import type { GetMusicDetailData } from '@/api/musicList'

export const searchTabs = [
  { name: 'all', label: '综合' },
  { name: 'songs', label: '单曲' },
  { name: 'artists', label: '歌手' },
  { name: 'albums', label: '专辑' },
  { name: 'playlists', label: '歌单' }
] as const
export type SearchTab = (typeof searchTabs)[number]['name']
type Category = Exclude<SearchTab, 'all'>

interface ResultPage<T> {
  items: T[]
  loading: boolean
  loaded: boolean
  error: boolean
}
interface ResultSection<T> {
  total: number
  page: number
  pages: Record<number, ResultPage<T>>
}
const emptyPage = <T>(): ResultPage<T> => ({
  items: [],
  loading: false,
  loaded: false,
  error: false
})
const pageNumber = (value: unknown) => {
  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function useSearchResults() {
  const route = useRoute()
  const router = useRouter()
  const keyword = computed(() =>
    typeof route.query.key === 'string' ? route.query.key.trim() : ''
  )
  const activeTab = computed<SearchTab>(() =>
    searchTabs.some((tab) => tab.name === route.query.tab) ? (route.query.tab as SearchTab) : 'all'
  )
  let revision = 0
  let controller = new AbortController()
  let disposed = false

  const createSection = <T>(
    pageSize: number,
    request: (
      term: string,
      offset: number,
      limit: number,
      signal: AbortSignal
    ) => Promise<{
      items: T[]
      total: number
    }>
  ) => {
    const state = reactive({ total: 0, page: 1, pages: {} }) as ResultSection<T>
    const current = computed(() => state.pages[state.page] ?? emptyPage<T>())
    const preview = computed(() => state.pages[1] ?? emptyPage<T>())
    const reset = () => {
      state.total = 0
      state.page = 1
      state.pages = {}
    }
    const ensure = async (page = state.page, force = false) => {
      if (!keyword.value || disposed) return
      const existing = state.pages[page]
      if (existing?.loading || (!force && existing?.loaded)) return
      const version = revision
      const signal = controller.signal
      state.pages[page] = { ...emptyPage<T>(), items: existing?.items ?? [], loading: true }
      const target = state.pages[page]
      try {
        const result = await request(keyword.value, (page - 1) * pageSize, pageSize, signal)
        if (disposed || version !== revision || signal.aborted || target !== state.pages[page])
          return
        target.items = Array.isArray(result.items) ? result.items : []
        state.total = Math.max(0, Number(result.total) || 0)
        target.loaded = true
      } catch {
        if (!disposed && version === revision && !signal.aborted) target.error = true
      } finally {
        if (!disposed && version === revision) target.loading = false
      }
    }
    return { state, pageSize, current, preview, ensure, reset }
  }

  const songs = createSection<GetMusicDetailData>(50, async (term, offset, limit, signal) => {
    const { result } = await searchResults(term, offset, limit, 1, { signal })
    return { items: result?.songs ?? [], total: result?.songCount ?? 0 }
  })
  const artists = createSection<SearchArtist>(24, async (term, offset, limit, signal) => {
    const { result } = await searchResults(term, offset, limit, 100, { signal })
    return { items: result?.artists ?? [], total: result?.artistCount ?? 0 }
  })
  const albums = createSection<SearchAlbum>(24, async (term, offset, limit, signal) => {
    const { result } = await searchResults(term, offset, limit, 10, { signal })
    return { items: result?.albums ?? [], total: result?.albumCount ?? 0 }
  })
  const playlists = createSection<SearchPlaylist>(24, async (term, offset, limit, signal) => {
    const { result } = await searchResults(term, offset, limit, 1000, { signal })
    return { items: result?.playlists ?? [], total: result?.playlistCount ?? 0 }
  })
  const sections = { songs, artists, albums, playlists }
  const matchedArtist = ref<SearchArtist>()
  const matchLoading = ref(false)
  let matchLoaded = false
  const loadMatch = async () => {
    if (matchLoaded || matchLoading.value || !keyword.value) return
    const version = revision
    const signal = controller.signal
    matchLoading.value = true
    try {
      const { result } = await searchMultimatch(keyword.value, { signal })
      if (!disposed && version === revision && !signal.aborted) {
        matchedArtist.value = result?.artist?.[0]
      }
    } catch {
      // 最佳匹配是补充信息；接口不可用时仍展示正常的分类结果。
    } finally {
      if (!disposed && version === revision) {
        matchLoading.value = false
        matchLoaded = true
      }
    }
  }
  const bestSong = computed(() => songs.preview.value.items[0])
  const bestArtist = computed(() => {
    if (matchedArtist.value) return matchedArtist.value
    const term = keyword.value.toLocaleLowerCase()
    return artists.preview.value.items.find((artist) =>
      [artist.name, ...(artist.alias ?? []), ...(artist.alia ?? [])].some(
        (name) => name.toLocaleLowerCase() === term
      )
    )
  })
  const bestLoading = computed(
    () =>
      !bestSong.value &&
      !bestArtist.value &&
      (songs.preview.value.loading || artists.preview.value.loading || matchLoading.value)
  )
  const overviewEmpty = computed(() =>
    Object.values(sections).every(
      (section) => section.preview.value.loaded && !section.preview.value.items.length
    )
  )
  const overviewFailed = computed(() =>
    Object.values(sections).every((section) => section.preview.value.error)
  )
  const retryOverview = () => {
    for (const section of Object.values(sections)) void section.ensure(1, true)
  }
  const navigate = (tab: SearchTab, page = 1) =>
    router.push({
      path: '/search',
      query: {
        ...route.query,
        tab: tab === 'all' ? undefined : tab,
        page: tab === 'all' || page === 1 ? undefined : String(page)
      }
    })
  const selectTab = (tab: SearchTab) => {
    if (tab === activeTab.value) return
    void navigate(tab, tab === 'all' ? 1 : sections[tab].state.page)
  }
  // 综合页的入口从第一页开始，类型切换则保留各分类已浏览的页码。
  const viewAll = (category: Category) => void navigate(category, 1)
  const changePage = (page: number) => {
    if (activeTab.value === 'all') return
    void navigate(activeTab.value, page)
  }
  const summary = computed(() => {
    if (!keyword.value) return '搜索歌曲、歌手、专辑与歌单'
    if (activeTab.value !== 'all') {
      const section = sections[activeTab.value]
      if (section.current.value.loading) return '正在搜索…'
      if (section.current.value.error) return '搜索暂时无法完成'
      return `找到 ${section.state.total.toLocaleString()} ${
        { songs: '首单曲', artists: '位歌手', albums: '张专辑', playlists: '个歌单' }[
          activeTab.value
        ]
      }`
    }
    if (Object.values(sections).some((section) => section.preview.value.loading))
      return '正在搜索音乐…'
    return (
      [
        [songs.state.total, '首单曲'],
        [artists.state.total, '位歌手'],
        [albums.state.total, '张专辑'],
        [playlists.state.total, '个歌单']
      ]
        .filter(([count]) => Number(count) > 0)
        .map(([count, unit]) => `${Number(count).toLocaleString()} ${unit}`)
        .join(' · ') || '搜索结果'
    )
  })

  watch(
    () => [route.path, keyword.value, activeTab.value, route.query.page] as const,
    ([path, term, tab, rawPage], previous) => {
      if (path !== '/search') return
      const keywordChanged = !previous || term !== previous[1]
      if (keywordChanged) {
        controller.abort()
        controller = new AbortController()
        revision++
        for (const section of Object.values(sections)) section.reset()
        matchedArtist.value = undefined
        matchLoading.value = false
        matchLoaded = false
      }
      if (!term) return
      if (keywordChanged && previous && pageNumber(rawPage) !== 1) {
        void router.replace({ path: '/search', query: { ...route.query, page: undefined } })
        return
      }
      if (tab === 'all') {
        for (const section of Object.values(sections)) void section.ensure(1)
        void loadMatch()
      } else {
        const category: Category = tab
        sections[category].state.page = pageNumber(rawPage)
        void sections[category].ensure()
      }
    },
    { immediate: true }
  )
  onBeforeUnmount(() => {
    disposed = true
    revision++
    controller.abort()
  })

  return {
    keyword,
    activeTab,
    summary,
    songs,
    artists,
    albums,
    playlists,
    bestSong,
    bestArtist,
    bestLoading,
    overviewEmpty,
    overviewFailed,
    selectTab,
    viewAll,
    changePage,
    retryOverview
  }
}
