<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchDefault, searchHotDetail, searchSuggest } from '@/api/search'
import { getMusicDetail } from '@/api/musicList'
import List from './List.vue'
import { useFlags } from '@/store/flags'
import { useMusicAction } from '@/store/music'
import {
  RECORD_KEY,
  type HotSearch,
  type RecordContent,
  type Suggestion,
  type SuggestionKey,
  type Suggestions
} from './type'

const state = reactive<{ scoreList: HotSearch[]; keywordsList: Suggestions }>({
  scoreList: [],
  keywordsList: {}
})
const loading = ref(false)
const error = ref('')
const router = useRouter()
const route = useRoute()
const keywords = ref(typeof route.query.key === 'string' ? route.query.key : '')
const showSuggest = ref(false)
const flags = useFlags()
const model = ref<'hot' | 'keywords'>('hot')
const music = useMusicAction()
const searchContainerEl = ref<HTMLDivElement>()
const recordContent = ref<RecordContent[]>([])
const placeholderInfo = ref({ realkeyword: '', showKeyword: '' })
let blurTimer: ReturnType<typeof setTimeout> | undefined
let defaultTimer: ReturnType<typeof setTimeout> | undefined
let suggestTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0
let songRequestId = 0
let disposed = false
let hotPending: Promise<void> | undefined

try {
  const stored = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]')
  recordContent.value = Array.isArray(stored)
    ? stored
        .filter(
          (item) =>
            typeof item?.term === 'string' &&
            item.term.trim() &&
            typeof item.path === 'string' &&
            item.path.startsWith('/')
        )
        .slice(0, 20)
    : []
} catch {
  recordContent.value = []
}

const closeSuggest = () => {
  clearTimeout(blurTimer)
  clearTimeout(suggestTimer)
  requestId++
  loading.value = false
  flags.isOpenSearch = false
  showSuggest.value = false
}
const outsidePointer = (event: PointerEvent) => {
  if (!searchContainerEl.value?.contains(event.target as Node)) closeSuggest()
}
const blurHandler = () => {
  clearTimeout(blurTimer)
  blurTimer = setTimeout(() => {
    if (!searchContainerEl.value?.contains(document.activeElement)) closeSuggest()
  }, 0)
}
const openSearch = async () => {
  flags.isOpenDetail = false
  await nextTick()
  searchContainerEl.value?.querySelector('input')?.focus()
  focusHandler()
}
onMounted(() => {
  document.addEventListener('pointerdown', outsidePointer)
  window.addEventListener('open-search', openSearch)
})
onBeforeUnmount(() => {
  disposed = true
  closeSuggest()
  clearTimeout(defaultTimer)
  document.removeEventListener('pointerdown', outsidePointer)
  window.removeEventListener('open-search', openSearch)
})
watch(
  () => route.fullPath,
  () => {
    closeSuggest()
    if (typeof route.query.key === 'string') keywords.value = route.query.key
  }
)
watch(
  () => flags.isOpenDetail,
  (open) => {
    if (open) closeSuggest()
  }
)

const saveHistory = () => localStorage.setItem(RECORD_KEY, JSON.stringify(recordContent.value))
const searchHandler = async (
  item: string | Suggestion | HotSearch,
  key: SuggestionKey | 'search' | 'hot'
) => {
  const actionId = ++songRequestId
  let path = ''
  let keyword = ''
  if (key === 'songs') {
    const id = (item as Suggestion).id
    if (!id) return
    const previousSelection = music.state.songs
    closeSuggest()
    try {
      const { songs } = await getMusicDetail(String(id))
      if (
        !disposed &&
        actionId === songRequestId &&
        music.state.songs === previousSelection &&
        songs?.[0]
      ) {
        await music.getMusicUrlHandler(songs[0])
      }
    } catch {
      /* The shared request handler displays the network error. */
    }
    return
  }
  if (key === 'artists' || key === 'albums' || key === 'playlists') {
    const id = (item as Suggestion).id
    if (!id) return
    path =
      key === 'artists'
        ? `/singer-page?id=${id}`
        : `/play-list?id=${id}${key === 'albums' ? '&type=album' : ''}`
  } else {
    keyword = (
      typeof item === 'string'
        ? item
        : key === 'hot'
          ? (item as HotSearch).searchWord
          : (item as Suggestion).keyword || ''
    ).trim()
    if (!keyword) return
    path = `/search?key=${encodeURIComponent(keyword)}`
  }
  closeSuggest()
  if (keyword) {
    keywords.value = keyword
    recordContent.value = [
      { term: keyword, time: Date.now(), path },
      ...recordContent.value.filter((record) => record.term !== keyword)
    ].slice(0, 20)
    saveHistory()
  }
  void router.push(path)
}
const clearRecord = () => {
  recordContent.value = []
  localStorage.removeItem(RECORD_KEY)
}
const recordTagClick = (item: RecordContent, index: number) => {
  songRequestId++
  closeSuggest()
  recordContent.value.splice(index, 1)
  recordContent.value.unshift({ ...item, time: Date.now() })
  saveHistory()
  keywords.value = item.term
  void router.push(item.path)
}
const deleteTag = (index: number) => {
  recordContent.value.splice(index, 1)
  saveHistory()
}
const loadHot = async () => {
  if (hotPending) return hotPending
  if (!state.scoreList.length) loading.value = true
  error.value = ''
  hotPending = (async () => {
    try {
      const res = (await searchHotDetail()) as { data?: HotSearch[] }
      if (!disposed) state.scoreList = Array.isArray(res.data) ? res.data : []
    } catch {
      if (!disposed && showSuggest.value && model.value === 'hot') error.value = '热搜暂时无法加载'
    } finally {
      hotPending = undefined
      if (model.value === 'hot') loading.value = false
    }
  })()
  return hotPending
}
const getSearchSuggest = async (term: string, id: number) => {
  try {
    const [suggest, mobile] = await Promise.all([
      searchSuggest(term),
      searchSuggest(term, 'mobile')
    ])
    if (disposed || id !== requestId || !showSuggest.value) return
    const result = suggest.result || {}
    const allMatch = mobile.result?.allMatch || []
    const order: SuggestionKey[] = ['allMatch', 'songs', 'artists', 'albums', 'playlists']
    state.keywordsList = {
      ...result,
      allMatch,
      order: order.filter((key) => (key === 'allMatch' ? allMatch : result[key])?.length)
    }
  } catch {
    if (!disposed && id === requestId && showSuggest.value) error.value = '搜索建议暂时无法加载'
  } finally {
    if (id === requestId) loading.value = false
  }
}
const inputHandler = (event?: Event) => {
  if (event instanceof InputEvent && event.isComposing) return
  clearTimeout(suggestTimer)
  const id = ++requestId
  error.value = ''
  const term = keywords.value.trim()
  model.value = term ? 'keywords' : 'hot'
  showSuggest.value = true
  flags.isOpenSearch = true
  if (!term) {
    void loadHot()
    return
  }
  loading.value = true
  state.keywordsList = {}
  suggestTimer = setTimeout(() => void getSearchSuggest(term, id), 200)
}
const focusHandler = () => {
  clearTimeout(blurTimer)
  if (showSuggest.value) return
  inputHandler()
}
const retry = () => {
  searchContainerEl.value?.querySelector('input')?.focus()
  if (model.value === 'hot') void loadHot()
  else inputHandler()
}
const searchKeydown = async (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return
  if (event.key === 'Escape') {
    if (!showSuggest.value) return
    event.preventDefault()
    event.stopPropagation()
    searchContainerEl.value?.querySelector('input')?.focus()
    closeSuggest()
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  event.stopPropagation()
  if (!showSuggest.value) {
    focusHandler()
    await nextTick()
  }
  const options = [
    ...(searchContainerEl.value?.querySelectorAll<HTMLButtonElement>('[data-search-option]') || [])
  ]
  if (!options.length) return
  const index = options.indexOf(document.activeElement as HTMLButtonElement)
  const next =
    event.key === 'ArrowDown'
      ? (index + 1) % options.length
      : index <= 0
        ? options.length - 1
        : index - 1
  options[next].focus({ preventScroll: true })
  options[next].scrollIntoView({ block: 'nearest' })
}
const inputKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.isComposing) return
  event.preventDefault()
  event.stopPropagation()
  searchHandler(realkeyword.value, 'search')
}
const getSearchDefault = async () => {
  try {
    const { data } = await searchDefault()
    if (!disposed && data) placeholderInfo.value = data
  } catch {
    /* The static placeholder remains available when suggestions are offline. */
  } finally {
    if (!disposed) defaultTimer = setTimeout(getSearchDefault, 30000)
  }
}
void getSearchDefault()
const realkeyword = computed(() => keywords.value.trim() || placeholderInfo.value.realkeyword)
</script>

<template>
  <div
    ref="searchContainerEl"
    class="search-container"
    @keydown="searchKeydown"
    @focusout="blurHandler"
  >
    <button
      type="button"
      aria-label="搜索音乐"
      class="search-icon"
      @click="searchHandler(realkeyword, 'search')"
    >
      <el-icon :size="17"><Search /></el-icon>
    </button>
    <input
      v-model="keywords"
      class="search"
      type="search"
      autocomplete="off"
      aria-label="搜索歌曲、歌手或歌单"
      :aria-expanded="showSuggest"
      aria-controls="header-search-suggestions"
      :placeholder="placeholderInfo.showKeyword || '搜索音乐'"
      @keydown="inputKeydown"
      @focus="focusHandler"
      @input="inputHandler"
    />
    <div id="header-search-suggestions" v-show="showSuggest" class="suggest" :aria-busy="loading">
      <List
        :model="model"
        :keywords="keywords"
        :loading="loading"
        :error="error"
        :recordContent="recordContent"
        :keywordsList="state.keywordsList"
        :list="state.scoreList"
        @click="searchHandler"
        @clear="clearRecord"
        @recordTagClick="recordTagClick"
        @deleteTag="deleteTag"
        @retry="retry"
      />
    </div>
  </div>
</template>

<style lang="less" scoped>
.search-container {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  height: 36px;
  padding: 0 11px;
  border-radius: 9px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  box-sizing: border-box;
  -webkit-app-region: no-drag;
  transition:
    border-color 160ms ease,
    background 160ms ease;
  &:focus-within {
    border-color: var(--app-accent-border);
    background: var(--app-hover);
  }
  .search-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 26px;
    margin-right: 7px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--app-muted);
    cursor: pointer;
    &:hover {
      color: var(--app-text);
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      border-radius: 4px;
    }
  }
  .search {
    width: 100%;
    min-width: 0;
    height: 34px;
    border: none;
    box-shadow: none;
    outline: none;
    box-sizing: border-box;
    background: transparent;
    font-size: 12px;
    color: var(--app-text);
    text-overflow: ellipsis;
    &::placeholder {
      color: var(--app-muted);
    }
  }
  :deep(.suggest) {
    position: absolute;
    top: calc(100% + 14px);
    right: 0;
    width: ~'min(400px, calc(100vw - 32px))';
    max-height: ~'min(600px, calc(100dvh - var(--app-header-height, 76px) - var(--app-player-height, 75px) - 24px))';
    border: 1px solid var(--app-border);
    border-radius: 14px;
    background: var(--app-panel);
    box-shadow: var(--app-shadow);
    z-index: 10;
    overflow: auto;
    -webkit-app-region: no-drag;
    .el-loading-mask {
      background: transparent;
    }
  }
}
</style>
