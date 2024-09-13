<script setup lang="ts">
import {computed, reactive, ref} from "vue";
import {useRouter} from 'vue-router'
import useSearch from "@/components/Search/useSearch";
import {searchDefault, searchHotDetail, searchSuggest} from "@/api/search";
import List from './List.vue'
import {useFlags} from "@/store/flags";
import {useMusicAction} from "@/store/music";
import {RECORD_KEY, RecordContent} from "@/components/Search/type";
import {isString} from "@/utils";

const state = reactive({
  scoreList: [],
  keywordsList: {},
})
const loading = ref(false)
const router = useRouter()
const keywords = ref('');
const showSuggest = ref(false)
const {search} = useSearch()
const flags = useFlags()
const model = ref<'hot' | 'keywords'>("hot")
const music = useMusicAction()
const searchContainerEl = ref<HTMLDivElement>()
const recordContent = ref<RecordContent[]>([])
const placeholderInfo = ref({
  realkeyword: '',
  showKeyword: '',
})

recordContent.value = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]')
const searchHandler = (item: string | object, key?: 'allMatch' | 'songs' | 'artists' | 'albums' | 'playlists' | 'search' | 'hot') => {

  console.log('item', item, key)
  if(isString(item) && !item.length) {
    return
  }
  let path = ''
  let keyword = ''

  showSuggest.value = false

  if(key === "allMatch") {
    path = `/search?key=${item.keyword}`
    keyword = item.keyword
  } else if(key === 'songs') {
    music.getMusicUrlHandler(item)
  } else if(key === 'artists') {
    path = `/singer-page?id=${item.id}`
  } else if(key === 'albums') {
    path = `/play-list?id=${item.id}&type=album`
  } else if(key === "playlists") {
    path = `/play-list?id=${item.id}`
  } else if(key === 'search') {
    path = `/search?key=${item}`
    keyword = item as string
  } else if(key === 'hot') {
    path = `/search?key=${item.searchWord}`
    keyword = item.searchWord
  }

  keywords.value = keyword

  if(key !== 'songs') {
    const index = recordContent.value.findIndex(item => item.term === keyword)
    if(index >= 0) {
      recordContent.value.splice(index, 1)
    }
    recordContent.value.unshift({
      term: keyword,
      time: Date.now(),
      path,
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
  showSuggest.value = true
  flags.isOpenSearch = true
  if(!state.scoreList.length) {
    loading.value = true
  }
  const res =  await searchHotDetail()
  loading.value = false
  state.scoreList = res.data
}
const blurHandler = () => {
  setTimeout(() => {
    flags.isOpenSearch = false
    showSuggest.value = false
  },300)
}
let timer: NodeJS.Timeout
const inputHandler = () => {
  if(keywords.value === '') {
    model.value = 'hot'
    focusHandler()
    return
  }
  model.value = keywords.value === '' ? 'hot' : 'keywords'
  getSearchSuggest(keywords.value)
}
// 高亮元素
const hig = (result: object) => {
  if(!Object.keys(result)) {
    return
  }
  const regExp = new RegExp(keywords.value, 'i')
  const len = result.order.length
  for (let i = 0; i < len; i++) {
    const key = result.order[i]
    const list = result[key]
    if(key === 'allMatch') {
      list.forEach(item => {
        item.text = item.keyword.replace(regExp, (text) => `<span style="color:lightskyblue">${text}</span>`)
      })
    } else {
      list.forEach(item => {
        item.text = item.name.replace(regExp, (text) => `<span style="color:lightskyblue">${text}</span>`)
      })
    }
  }
}
const getSearchSuggest = async (keywords: string) => {
  loading.value = true
  state.keywordsList = {}
  const [suggest, songs] = await Promise.all([searchSuggest(keywords) ,searchSuggest(keywords, 'mobile')])
  // 单曲、专辑、歌手、歌单
  if(Object.keys(suggest)) {
    state.keywordsList = suggest.result
  }
  // 猜你想搜
  if(Object.keys(songs)) {
    state.keywordsList.allMatch = songs.result.allMatch
    if(!state.keywordsList.order) {
      state.keywordsList.order = []
    }
    state.keywordsList.order.unshift('allMatch')
  }
  hig(state.keywordsList)
  loading.value = false
}

const getSearchDefault = async () => {
  const {data} = await searchDefault()
  placeholderInfo.value.realkeyword = data.realkeyword
  placeholderInfo.value.showKeyword = data.showKeyword
  setTimeout(getSearchDefault, 30000)
}
getSearchDefault()

const realkeyword = computed(() => {
  return keywords.value.length ? keywords.value : placeholderInfo.value.realkeyword
})
</script>

<template>
  <div @keyup.enter="searchHandler(realkeyword, 'search')" ref="searchContainerEl" class="search-container">
    <el-icon
      @click="searchHandler(realkeyword, 'search')"
      class="search-icon"
      size="18px"
      color="rgba(255, 255, 255, 0.5)"
    >
      <Search />
    </el-icon>
    <input
      v-model.trim="keywords"
      @keydown.stop
      @focus="focusHandler"
      @blur="blurHandler"
      @input="inputHandler"
      class="search"
      :placeholder="placeholderInfo.showKeyword"
    />
    <div v-loading="loading" v-show="showSuggest" class="suggest">
      <List
        :model="model"
        @click="searchHandler"
        @clear="clearRecord"
        @recordTagClick="recordTagClick"
        @deleteTag="deleteTag"
        :recordContent="recordContent"
        :keywordsList="state.keywordsList"
        :list="state.scoreList"/>
    </div>
  </div>
</template>

<style lang="less" scoped>
.search-container {
  position: relative;
  padding: 0 15px;
  border-radius: 8px;
  //background-color: rgba(255, 255, 255, 0.06);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255,255,255,0.1);
  input::-webkit-input-placeholder {
    color: white;
  }

  .search-icon {
    position: relative;
    top: 1px;
    margin-right: 10px;
    cursor: pointer;
  }
  .search {
    border: none;
    box-shadow: none;
    width: 230px;
    height: 37px;
    outline: none;
    box-sizing: border-box;
    background-color: transparent;
    font-size: 14px;
    color: white;

    &::-webkit-input-placeholder {
      color: rgba(255,255,255,0.5);
    }
  }
  :deep(.suggest) {
    position: absolute;
    border-radius: 10px;
    width: 400px;
    max-height: 77vh;
    background-color: rgba(45,45,56, 1);
    transform: translateX(-50%) translateY(100%);
    left: 50%;
    bottom: -3vh;
    z-index: 10;
    overflow: auto;
    //backdrop-filter: blur(60px) saturate(210%);
    .el-loading-mask {
      background: transparent;
    }
  }
}
</style>
