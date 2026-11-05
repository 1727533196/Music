<script setup lang="ts" name="SearchList">
import SongList from '@/components/SongList/index.vue'
import { useMusicAction } from '@/store/music'
import { columns, tabsConfig } from './config'
import { useRoute, useRouter } from 'vue-router'
import { cloudSearch } from '@/api/search'
import { reactive, ref, watch } from 'vue'
import { GetMusicDetailData } from '@/api/musicList'
import AreaBox from '@/components/AreaBox/index.vue'
import { formatNumberToMillion } from '@/utils'
import Card from '@/components/Card/index.vue'

interface State {
  songs: {
    result: GetMusicDetailData[]
    songCount: number
  }
  songList: {
    playlists: any[]
    playlistCount: number
  }
}
const music = useMusicAction()
const route = useRoute()
const router = useRouter()
const limit = ref(50)
const page = ref(1)
const loading = ref(false)
const state: State = reactive({
  songs: {
    result: [],
    songCount: 0
  },
  songList: {
    playlists: [],
    playlistCount: 0
  }
})
const activeName = ref<string>(tabsConfig[0].name)

function init() {
  const { key } = route.query as { key: string }
  search(key, (page.value - 1) * limit.value, limit.value)
  getKeySongList(key, 0, 20)
}
const search = async (key: string, offset: number, limit: number) => {
  loading.value = true
  try {
    const { result } = await cloudSearch(key, offset, limit)
    state.songs.songCount = result.songCount
    state.songs.result = result.songs
    music.updateSearchList(result.songs)
  } finally {
    loading.value = false
  }
}

const currentChange = (val: number) => {
  page.value = val
  init()
}

const getKeySongList = async (key: string, offset: number, limit: number) => {
  const { result } = await cloudSearch(key, offset, limit, 1000)
  state.songList.playlistCount = result.playlistCount
  state.songList.playlists = result.playlists
  // console.log('result', result)
}

const gotoSongList = (item: any) => {
  router.push({
    path: '/play-list',
    query: {
      id: item.id,
      position: 1
    }
  })
}

const titleClick = () => {}

watch(
  () => route.fullPath,
  (val) => {
    if (route.path === '/search') {
      init()
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <div class="padding-container search-overview">
    <header class="search-heading">
      <h1>{{ route.query.key || '搜索' }}</h1>
      <p role="status">
        <template v-if="loading">正在搜索音乐…</template>
        <template v-else>
          找到 {{ (state.songs.songCount || 0).toLocaleString() }} 首单曲
          <span v-if="state.songList.playlistCount">
            · {{ state.songList.playlistCount.toLocaleString() }} 个歌单</span
          >
        </template>
      </p>
    </header>
    <AreaBox v-if="state.songList.playlists?.length" class="playlist-results">
      <template #title>歌单</template>
      <Card
        v-for="item in state.songList.playlists"
        :key="item.id"
        :is-click="true"
        @click="gotoSongList(item)"
        :name="item.name"
        :caption="`${item.trackCount || 0} 首${item.creator?.nickname ? ` · ${item.creator.nickname}` : ''}`"
        :pic-url="item.coverImgUrl"
      >
        <span v-if="item.playCount" class="playlist-play-count">
          <v-icon icon="mdi-play-outline" size="13" aria-hidden="true" />
          {{ formatNumberToMillion(item.playCount) }}
        </span>
      </Card>
    </AreaBox>
    <h2 class="songs-heading">单曲</h2>
  </div>
  <SongList
    @current-change="currentChange"
    @play="music.getMusicUrlHandler"
    is-loading-endflyback
    :loading="loading"
    :columns="columns"
    :songs="music.state.songs"
    :list="state.songs.result"
    is-paging
    :total="state.songs.songCount"
    :page-size="limit"
    :current-page="page"
    :is-search="false"
  ></SongList>
  <!--  <tabs v-model="activeName">-->
  <!--    <tab-pane-->
  <!--      v-for="item in tabsConfig"-->
  <!--      :name="item.name"-->
  <!--      :label="item.label"-->
  <!--    ></tab-pane>-->
  <!--  </tabs>-->
</template>

<style lang="less" scoped>
.search-overview.padding-container {
  padding: 26px var(--app-gutter, 32px) 0;
}
.search-heading {
  margin-bottom: 26px;
  h1 {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    margin: 0 0 8px;
    color: var(--app-text);
    font-size: var(--app-title-size, 28px);
    font-weight: 650;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  p {
    margin: 0;
    color: var(--app-muted);
    font-size: 12px;
    line-height: 1.6;
    font-variant-numeric: tabular-nums;
  }
}
.playlist-results {
  --card-width: clamp(140px, 18cqw, 184px);
  margin: 0 0 28px;
}
.playlist-play-count {
  position: absolute;
  right: 7px;
  bottom: 7px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: calc(100% - 14px);
  padding: 3px 6px;
  border-radius: 5px;
  background: #111b;
  color: #fff;
  font-size: 10px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}
.songs-heading {
  margin: 0 0 2px;
  color: var(--app-text);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.5;
}
.song-list-container {
  padding-top: 12px;
}
@media (max-height: 720px) {
  .search-overview.padding-container {
    padding-top: 20px;
  }
  .search-heading {
    margin-bottom: 22px;
  }
}
</style>
