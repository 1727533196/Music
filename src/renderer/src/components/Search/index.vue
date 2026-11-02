<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import useSearch from '@/components/Search/useSearch'
import { searchDefault, searchHotDetail, searchSuggest } from '@/api/search'
import List from './List.vue'
import { useFlags } from '@/store/flags'
import { useMusicAction } from '@/store/music'
import { RECORD_KEY, RecordContent } from '@/components/Search/type'
import { isString } from '@/utils'

const state = reactive({
  scoreList: [],
  keywordsList: {}
})
const loading = ref(false)
const router = useRouter()
const route = useRoute()
const keywords = ref('')
const showSuggest = ref(false)
const { search } = useSearch()
const flags = useFlags()
const model = ref<'hot' | 'keywords'>('hot')
const music = useMusicAction()
const searchContainerEl = ref<HTMLDivElement>()
const recordContent = ref<RecordContent[]>([])
const placeholderInfo = ref({
  realkeyword: '',
  showKeyword: ''
})
let blurTimer: ReturnType<typeof setTimeout> | undefined
let defaultTimer: ReturnType<typeof setTimeout> | undefined
let disposed = false
const closeSuggest = () => {
  clearTimeout(blurTimer)
  flags.isOpenSearch = false
  showSuggest.value = false
}
const outsidePointer = (event: PointerEvent) => {
  if (!searchContainerEl.value?.contains(event.target as Node)) closeSuggest()
}
const escapeSearch = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  closeSuggest()
  searchContainerEl.value?.querySelector('input')?.blur()
}
onMounted(() => document.addEventListener('pointerdown', outsidePointer))
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(blurTimer)
  clearTimeout(defaultTimer)
  document.removeEventListener('pointerdown', outsidePointer)
  flags.isOpenSearch = false
})

watch(route, (value) => {
  closeSuggest()
  const { key } = value.query
  if (key && key !== keywords.value) {
    keywords.value = key
  }
})
watch(
  () => flags.isOpenDetail,
  (open) => {
    if (open) closeSuggest()
  }
)
recordContent.value = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]')
const searchHandler = (
  item: string | object,
  key?: 'allMatch' | 'songs' | 'artists' | 'albums' | 'playlists' | 'search' | 'hot'
) => {
  if (isString(item) && !item.length) {
    return
  }
  let path = ''
  let keyword = ''

  closeSuggest()

  if (key === 'allMatch') {
    path = `/search?key=${item.keyword}`
    keyword = item.keyword
  } else if (key === 'songs') {
    music.getMusicUrlHandler(item)
  } else if (key === 'artists') {
    path = `/singer-page?id=${item.id}`
  } else if (key === 'albums') {
    path = `/play-list?id=${item.id}&type=album`
  } else if (key === 'playlists') {
    path = `/play-list?id=${item.id}`
  } else if (key === 'search') {
    path = `/search?key=${item}`
    keyword = item as string
  } else if (key === 'hot') {
    path = `/search?key=${item.searchWord}`
    keyword = item.searchWord
  }

  keywords.value = keyword

  if (key !== 'songs') {
    const index = recordContent.value.findIndex((item) => item.term === keyword)
    if (index >= 0) {
      recordContent.value.splice(index, 1)
    }
    recordContent.value.unshift({
      term: keyword,
      time: Date.now(),
      path
    })
    localStorage.setItem(RECORD_KEY, JSON.stringify(recordContent.value))

    router.push(path)
  }
}
const clearRecord = () => {
  localStorage.removeItem(RECORD_KEY)
  recordContent.value = []
}
const recordTagClick = (item: RecordContent, index: number) => {
  closeSuggest()
  recordContent.value.splice(index, 1)
  recordContent.value.unshift(item)
  localStorage.setItem(RECORD_KEY, JSON.stringify(recordContent.value))
  router.push(item.path)
  keywords.value = item.term
}
const deleteTag = (index: number) => {
  recordContent.value.splice(index, 1)
  localStorage.setItem(RECORD_KEY, JSON.stringify(recordContent.value))
}
const focusHandler = async () => {
  clearTimeout(blurTimer)
  showSuggest.value = true
  flags.isOpenSearch = true
  if (!state.scoreList.length) {
    loading.value = true
  }
  const res = await searchHotDetail()
  loading.value = false
  state.scoreList = res.data
}
const blurHandler = () => {
  blurTimer = setTimeout(closeSuggest, 200)
}
let timer: NodeJS.Timeout
const inputHandler = () => {
  if (keywords.value === '') {
    model.value = 'hot'
    focusHandler()
    return
  }
  model.value = keywords.value === '' ? 'hot' : 'keywords'
  getSearchSuggest(keywords.value)
}
// 高亮元素
const hig = (result: object) => {
  if (!Object.keys(result)) {
    return
  }
  const regExp = new RegExp(keywords.value, 'i')
  const len = result.order.length
  for (let i = 0; i < len; i++) {
    const key = result.order[i]
    const list = result[key]
    if (key === 'allMatch') {
      list.forEach((item) => {
        item.text = item.keyword.replace(
          regExp,
          (text) => `<span style="color:lightskyblue">${text}</span>`
        )
      })
    } else {
      list.forEach((item) => {
        item.text = item.name.replace(
          regExp,
          (text) => `<span style="color:lightskyblue">${text}</span>`
        )
      })
    }
  }
}
const getSearchSuggest = async (keywords: string) => {
  loading.value = true
  state.keywordsList = {}
  const [suggest, songs] = await Promise.all([
    searchSuggest(keywords),
    searchSuggest(keywords, 'mobile')
  ])
  // 单曲、专辑、歌手、歌单
  if (Object.keys(suggest)) {
    state.keywordsList = suggest.result
  }
  // 猜你想搜
  if (Object.keys(songs)) {
    state.keywordsList.allMatch = songs.result.allMatch
    if (!state.keywordsList.order) {
      state.keywordsList.order = []
    }
    state.keywordsList.order.unshift('allMatch')
  }
  hig(state.keywordsList)
  loading.value = false
}

const getSearchDefault = async () => {
  const { data } = await searchDefault()
  placeholderInfo.value.realkeyword = data.realkeyword
  placeholderInfo.value.showKeyword = data.showKeyword
  if (!disposed) defaultTimer = setTimeout(getSearchDefault, 30000)
}
getSearchDefault()

const realkeyword = computed(() => {
  return keywords.value.length ? keywords.value : placeholderInfo.value.realkeyword
})
</script>

<template>
  <div @keydown="escapeSearch" ref="searchContainerEl" class="search-container">
    <button
      type="button"
      aria-label="搜索音乐"
      @click="searchHandler(realkeyword, 'search')"
      class="search-icon"
    >
      <el-icon :size="17"><Search /></el-icon>
    </button>
    <input
      v-model.trim="keywords"
      @keydown.stop="escapeSearch"
      @keyup.enter="searchHandler(realkeyword, 'search')"
      @focus="focusHandler"
      @blur="blurHandler"
      @input="inputHandler"
      class="search"
      aria-label="搜索歌曲、歌手或歌单"
      :aria-expanded="showSuggest"
      aria-controls="header-search-suggestions"
      :placeholder="placeholderInfo.showKeyword || '搜索音乐'"
    />
    <div id="header-search-suggestions" v-loading="loading" v-show="showSuggest" class="suggest">
      <List
        :model="model"
        @click="searchHandler"
        @clear="clearRecord"
        @recordTagClick="recordTagClick"
        @deleteTag="deleteTag"
        :recordContent="recordContent"
        :keywordsList="state.keywordsList"
        :list="state.scoreList"
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
  border: 1px solid rgba(255, 255, 255, 0.075);
  background: rgba(255, 255, 255, 0.035);
  box-sizing: border-box;
  -webkit-app-region: no-drag;
  transition:
    border-color 160ms ease,
    background 160ms ease;
  &:focus-within {
    border-color: rgba(232, 189, 209, 0.5);
    background: rgba(255, 255, 255, 0.055);
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
    color: #a19aaa;
    cursor: pointer;
    &:hover {
      color: #f2eff5;
    }
    &:focus-visible {
      outline: 2px solid #e8bdd1;
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
    color: #f2eff5;
    text-overflow: ellipsis;
    &::placeholder {
      color: #8d8598;
    }
  }
  :deep(.suggest) {
    position: absolute;
    top: calc(100% + 14px);
    right: 0;
    width: min(400px, calc(100vw - 32px));
    max-height: min(600px, calc(100vh - 180px));
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 14px;
    background: #24222e;
    box-shadow: 0 20px 65px rgba(0, 0, 0, 0.4);
    z-index: 10;
    overflow: auto;
    -webkit-app-region: no-drag;
    .el-loading-mask {
      background: transparent;
    }
  }
}
</style>
