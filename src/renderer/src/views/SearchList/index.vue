<script setup lang="ts" name="SearchList">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SongList from '@/components/SongList/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import AppSelect from '@/components/AppSelect/index.vue'
import type { SelectValue } from '@/components/AppSelect/types'
import { useMusicAction } from '@/store/music'
import type { GetMusicDetailData } from '@/api/musicList'
import type { SearchAlbum, SearchArtist, SearchPlaylist } from '@/api/search'
import { columns } from './config'
import { searchTabs, useSearchResults } from './useSearchResults'
import BestMatch from './components/BestMatch.vue'
import EntityCard from './components/EntityCard.vue'
import SearchFeedback from './components/SearchFeedback.vue'

const router = useRouter()
const music = useMusicAction()
const {
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
} = useSearchResults()
const isOverview = computed(() => activeTab.value === 'all')
const categoryOptions = searchTabs.filter((category) => category.name !== 'all')
const categorySelectOptions = categoryOptions.map((category) => ({
  label: category.label,
  value: category.name
}))
const selectedCategory = computed(() =>
  categoryOptions.find((category) => category.name === activeTab.value)
)
const categorySection = computed(() =>
  activeTab.value === 'all' ? undefined : { songs, artists, albums, playlists }[activeTab.value]
)
const categoryCount = computed(() => {
  const section = categorySection.value
  return section && (section.current.value.loaded || section.state.total > 0)
    ? section.state.total
    : undefined
})
const categoryStatus = computed(() => {
  if (categorySection.value?.current.value.loading) return '正在搜索…'
  if (categorySection.value?.current.value.error) return '暂时无法加载'
  return ''
})
const changeCategory = (value: SelectValue) => {
  const category = categoryOptions.find((option) => option.name === value)
  if (category) selectTab(category.name)
}
const songPage = computed(() => (isOverview.value ? songs.preview.value : songs.current.value))
const artistPage = computed(() =>
  isOverview.value ? artists.preview.value : artists.current.value
)
const albumPage = computed(() => (isOverview.value ? albums.preview.value : albums.current.value))
const playlistPage = computed(() =>
  isOverview.value ? playlists.preview.value : playlists.current.value
)
const displayedSongs = computed(() =>
  isOverview.value ? songPage.value.items.slice(0, 5) : songPage.value.items
)
const displayedArtists = computed(() =>
  isOverview.value ? artistPage.value.items.slice(0, 6) : artistPage.value.items
)
const displayedAlbums = computed(() =>
  isOverview.value ? albumPage.value.items.slice(0, 6) : albumPage.value.items
)
const displayedPlaylists = computed(() =>
  isOverview.value ? playlistPage.value.items.slice(0, 6) : playlistPage.value.items
)
const playingBest = ref(false)

watch(displayedSongs, (items) => music.updateSearchList(items), { immediate: true })

const playBest = async (song: GetMusicDetailData) => {
  if (playingBest.value || (song.privilege?.st ?? 0) < 0) return
  playingBest.value = true
  try {
    await music.getMusicUrlHandler(song)
  } finally {
    playingBest.value = false
  }
}
const openArtist = (id: number) => router.push({ path: '/singer-page', query: { id } })
const openAlbum = (id: number) => router.push({ path: '/play-list', query: { id, type: 'album' } })
const openPlaylist = (id: number) => router.push({ path: '/play-list', query: { id, position: 1 } })
const artistCaption = (artist: SearchArtist) => {
  const alias = (artist.alias?.length ? artist.alias : artist.alia)?.filter(Boolean).join(' / ')
  if (alias) return alias
  const counts: string[] = []
  if (artist.musicSize) counts.push(`${artist.musicSize.toLocaleString()} 首单曲`)
  if (artist.albumSize) counts.push(`${artist.albumSize.toLocaleString()} 张专辑`)
  return counts.join(' · ') || '歌手'
}
const albumCaption = (album: SearchAlbum) => {
  const names =
    album.artists
      ?.map((artist) => artist.name)
      .filter(Boolean)
      .join(' / ') || album.artist?.name
  const year = album.publishTime ? new Date(album.publishTime).getFullYear() : undefined
  return (
    [names, year && Number.isFinite(year) ? year : undefined].filter(Boolean).join(' · ') || '专辑'
  )
}
const playlistCaption = (playlist: SearchPlaylist) =>
  [
    typeof playlist.trackCount === 'number'
      ? `${playlist.trackCount.toLocaleString()} 首`
      : undefined,
    playlist.creator?.nickname
  ]
    .filter(Boolean)
    .join(' · ')
// 等待末页返回时仍保留完整一页的占位，避免分页按钮提前上跳。
const skeletonCount = (total: number, pageSize: number) =>
  isOverview.value ? 6 : total ? Math.min(pageSize, total) : 12
</script>

<template>
  <div class="search-page padding-container">
    <header class="search-heading">
      <button
        v-if="keyword && !isOverview"
        type="button"
        class="back-to-results"
        @click="selectTab('all')"
      >
        <v-icon icon="mdi-arrow-left" size="17" aria-hidden="true" />
        全部结果
      </button>
      <div class="search-title-row">
        <div class="search-title-copy">
          <h1 v-if="keyword && !isOverview" id="search-category-heading">
            {{ selectedCategory?.label }}
            <span v-if="categoryCount !== undefined" class="category-count">
              · {{ categoryCount.toLocaleString() }}
            </span>
          </h1>
          <h1 v-else>{{ keyword || '搜索' }}</h1>
          <p v-if="isOverview || !keyword" role="status">{{ summary }}</p>
          <p v-else class="category-context" role="status">
            <span :title="keyword">“{{ keyword }}”的搜索结果</span>
            <span v-if="categoryStatus" class="category-status">· {{ categoryStatus }}</span>
          </p>
        </div>
        <div v-if="keyword && !isOverview" class="category-filter">
          <label for="search-result-type">结果类型</label>
          <AppSelect
            id="search-result-type"
            class="category-select"
            :model-value="activeTab"
            :options="categorySelectOptions"
            size="small"
            placement="bottom-end"
            @update:model-value="changeCategory"
          />
        </div>
      </div>
    </header>
    <div v-if="!keyword" class="search-invitation" role="status">
      <v-icon icon="mdi-magnify" size="36" aria-hidden="true" />
      <h2>想听什么？</h2>
      <p>在上方输入歌名、歌手、专辑或歌单名称。</p>
    </div>
    <SearchFeedback
      v-else-if="isOverview && (overviewEmpty || overviewFailed)"
      :error="overviewFailed"
      label="音乐"
      @retry="retryOverview"
    />
    <div v-else class="search-results">
      <BestMatch
        v-if="isOverview"
        :song="bestSong"
        :artist="bestArtist"
        :loading="bestLoading"
        :playing-id="music.state.songs?.id"
        :busy="playingBest"
        @play="playBest"
        @artist="openArtist"
      />
      <section
        v-if="activeTab === 'songs' || (isOverview && (!songPage.loaded || songPage.items.length))"
        class="result-section song-results"
        :aria-labelledby="isOverview ? 'search-songs-heading' : 'search-category-heading'"
        :aria-busy="songPage.loading"
      >
        <header v-if="isOverview" class="section-heading">
          <h2 id="search-songs-heading">
            单曲 <span v-if="songPage.loaded">{{ songs.state.total.toLocaleString() }}</span>
          </h2>
          <button
            v-if="isOverview && songs.state.total > displayedSongs.length"
            type="button"
            class="view-all"
            @click="viewAll('songs')"
          >
            查看全部单曲 <v-icon icon="mdi-chevron-right" size="18" aria-hidden="true" />
          </button>
        </header>
        <SearchFeedback
          v-if="songPage.error || (!songPage.loading && !displayedSongs.length)"
          :error="songPage.error"
          label="单曲"
          @retry="songs.ensure(isOverview ? 1 : songs.state.page, true)"
        />
        <SongList
          v-else
          :loading="songPage.loading"
          :columns="columns"
          :songs="music.state.songs"
          :list="displayedSongs"
          :is-paging="!isOverview"
          :total="songs.state.total"
          :page-size="songs.pageSize"
          :current-page="songs.state.page"
          :is-search="false"
          @current-change="changePage"
          @play="music.getMusicUrlHandler"
        />
        <Pagination
          v-if="
            !isOverview &&
            !songPage.loading &&
            (songPage.error || !displayedSongs.length) &&
            songs.state.total > songs.pageSize
          "
          :total="songs.state.total"
          :page-size="songs.pageSize"
          :current-page="songs.state.page"
          @current-change="changePage"
        />
      </section>
      <section
        v-if="
          activeTab === 'artists' || (isOverview && (!artistPage.loaded || artistPage.items.length))
        "
        class="result-section entity-section"
        :aria-labelledby="isOverview ? 'search-artists-heading' : 'search-category-heading'"
        :aria-busy="artistPage.loading"
      >
        <header v-if="isOverview" class="section-heading">
          <h2 id="search-artists-heading">
            歌手 <span v-if="artistPage.loaded">{{ artists.state.total.toLocaleString() }}</span>
          </h2>
          <button
            v-if="isOverview && artists.state.total > displayedArtists.length"
            type="button"
            class="view-all"
            @click="viewAll('artists')"
          >
            查看全部歌手 <v-icon icon="mdi-chevron-right" size="18" aria-hidden="true" />
          </button>
        </header>
        <SearchFeedback
          v-if="artistPage.loading || artistPage.error || !displayedArtists.length"
          :loading="artistPage.loading"
          :error="artistPage.error"
          label="歌手"
          kind="artist"
          :skeleton-count="skeletonCount(artists.state.total, artists.pageSize)"
          @retry="artists.ensure(isOverview ? 1 : artists.state.page, true)"
        />
        <div v-else class="entity-grid">
          <EntityCard
            v-for="artist in displayedArtists"
            :id="artist.id"
            :key="artist.id"
            kind="artist"
            :name="artist.name"
            :image="artist.picUrl || artist.img1v1Url"
            :caption="artistCaption(artist)"
            @open="openArtist(artist.id)"
          />
        </div>
        <Pagination
          v-if="!isOverview && artists.state.total > artists.pageSize"
          :total="artists.state.total"
          :page-size="artists.pageSize"
          :current-page="artists.state.page"
          @current-change="changePage"
        />
      </section>
      <section
        v-if="
          activeTab === 'albums' || (isOverview && (!albumPage.loaded || albumPage.items.length))
        "
        class="result-section entity-section"
        :aria-labelledby="isOverview ? 'search-albums-heading' : 'search-category-heading'"
        :aria-busy="albumPage.loading"
      >
        <header v-if="isOverview" class="section-heading">
          <h2 id="search-albums-heading">
            专辑 <span v-if="albumPage.loaded">{{ albums.state.total.toLocaleString() }}</span>
          </h2>
          <button
            v-if="isOverview && albums.state.total > displayedAlbums.length"
            type="button"
            class="view-all"
            @click="viewAll('albums')"
          >
            查看全部专辑 <v-icon icon="mdi-chevron-right" size="18" aria-hidden="true" />
          </button>
        </header>
        <SearchFeedback
          v-if="albumPage.loading || albumPage.error || !displayedAlbums.length"
          :loading="albumPage.loading"
          :error="albumPage.error"
          label="专辑"
          :skeleton-count="skeletonCount(albums.state.total, albums.pageSize)"
          @retry="albums.ensure(isOverview ? 1 : albums.state.page, true)"
        />
        <div v-else class="entity-grid">
          <EntityCard
            v-for="album in displayedAlbums"
            :id="album.id"
            :key="album.id"
            kind="album"
            :name="album.name"
            :image="album.picUrl || album.blurPicUrl"
            :caption="albumCaption(album)"
            @open="openAlbum(album.id)"
          />
        </div>
        <Pagination
          v-if="!isOverview && albums.state.total > albums.pageSize"
          :total="albums.state.total"
          :page-size="albums.pageSize"
          :current-page="albums.state.page"
          @current-change="changePage"
        />
      </section>
      <section
        v-if="
          activeTab === 'playlists' ||
          (isOverview && (!playlistPage.loaded || playlistPage.items.length))
        "
        class="result-section entity-section"
        :aria-labelledby="isOverview ? 'search-playlists-heading' : 'search-category-heading'"
        :aria-busy="playlistPage.loading"
      >
        <header v-if="isOverview" class="section-heading">
          <h2 id="search-playlists-heading">
            歌单
            <span v-if="playlistPage.loaded">{{ playlists.state.total.toLocaleString() }}</span>
          </h2>
          <button
            v-if="isOverview && playlists.state.total > displayedPlaylists.length"
            type="button"
            class="view-all"
            @click="viewAll('playlists')"
          >
            查看全部歌单 <v-icon icon="mdi-chevron-right" size="18" aria-hidden="true" />
          </button>
        </header>
        <SearchFeedback
          v-if="playlistPage.loading || playlistPage.error || !displayedPlaylists.length"
          :loading="playlistPage.loading"
          :error="playlistPage.error"
          label="歌单"
          :skeleton-count="skeletonCount(playlists.state.total, playlists.pageSize)"
          @retry="playlists.ensure(isOverview ? 1 : playlists.state.page, true)"
        />
        <div v-else class="entity-grid">
          <EntityCard
            v-for="playlist in displayedPlaylists"
            :id="playlist.id"
            :key="playlist.id"
            kind="playlist"
            :name="playlist.name"
            :image="playlist.coverImgUrl"
            :caption="playlistCaption(playlist)"
            :play-count="playlist.playCount"
            @open="openPlaylist(playlist.id)"
          />
        </div>
        <Pagination
          v-if="!isOverview && playlists.state.total > playlists.pageSize"
          :total="playlists.state.total"
          :page-size="playlists.pageSize"
          :current-page="playlists.state.page"
          @current-change="changePage"
        />
      </section>
    </div>
  </div>
</template>

<style lang="less" scoped>
.search-page.padding-container {
  padding: 26px var(--app-gutter, 32px) 32px;
}
.search-page {
  --search-columns: 6;
}
.search-heading {
  margin-bottom: 28px;
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
    min-height: 20px;
    margin: 0;
    color: var(--app-muted);
    font-size: 12px;
    line-height: 1.6;
    font-variant-numeric: tabular-nums;
  }
}
.search-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.search-title-copy {
  flex: 1;
  min-width: 0;
}
.category-count {
  color: var(--app-muted);
  font-size: 0.75em;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.category-context {
  display: flex;
  gap: 6px;
  span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .category-status {
    flex-shrink: 0;
  }
}
.back-to-results {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 18px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    color: var(--app-text);
  }
}
.category-filter {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  label {
    color: var(--app-muted);
    font-size: 12px;
  }
}
.category-select {
  width: 112px;
}
.search-results {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 32px;
}
.result-section {
  min-width: 0;
}
.section-heading {
  display: flex;
  min-height: 26px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  h2 {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0;
    color: var(--app-text);
    font-size: 17px;
    font-weight: 600;
    span {
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 400;
      font-variant-numeric: tabular-nums;
    }
  }
}
.view-all {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
  padding: 4px 0 4px 8px;
  border: 0;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    color: var(--app-text);
  }
}
.back-to-results,
.view-all {
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: -2px;
    border-radius: 4px;
  }
}
.entity-grid {
  display: grid;
  grid-template-columns: repeat(var(--search-columns), minmax(0, 1fr));
  align-items: start;
  gap: 24px 20px;
}
.song-results :deep(.song-list-container) {
  padding: 0;
}
.search-invitation {
  display: flex;
  min-height: 300px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: var(--app-muted);
  h2 {
    color: var(--app-text);
    font-size: 18px;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 13px;
    text-align: center;
  }
}
@media (max-width: 1100px) {
  .search-page {
    --search-columns: 4;
  }
}
@media (max-width: 800px) {
  .search-page {
    --search-columns: 3;
  }
  .entity-grid {
    gap: 20px 16px;
  }
}
@media (max-width: 520px) {
  .search-page {
    --search-columns: 2;
  }
  .search-title-row {
    align-items: flex-start;
    gap: 16px;
  }
  .category-filter {
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    label {
      font-size: 11px;
    }
  }
  .category-select {
    width: 100px;
  }
}
@media (max-height: 720px) {
  .search-page.padding-container {
    padding-top: 20px;
  }
}
</style>
