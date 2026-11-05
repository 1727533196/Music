<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { message } from '@/utils/message'
import { cloudSearch } from '@/api/search'
import { matchCloudSong } from '@/api/play'

interface SongResult {
  id: number
  name: string
  artists?: Array<{ id?: number; name?: string }>
  album?: string | { id?: number; name?: string }
  picUrl?: string
  ar?: Array<{ id?: number; name?: string }>
  al?: { id?: number; name?: string; picUrl?: string }
}

interface Props {
  modelValue: boolean
  songData?: SongResult | null
  userId: number
}

const props = withDefaults(defineProps<Props>(), { songData: null })
const emit = defineEmits(['update:modelValue'])
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!isMatching.value) emit('update:modelValue', value)
  }
})

const searchInput = ref<HTMLInputElement | null>(null)
const searchKeyword = ref('')
const searchResults = ref<SongResult[]>([])
const isSearching = ref(false)
const isLoadingMore = ref(false)
const searchError = ref('')
const matchError = ref('')
const hasSearched = ref(false)
const hasMore = ref(false)
const totalCount = ref<number | null>(null)
const currentPage = ref(1)
const matchingId = ref<number | null>(null)
const isMatching = computed(() => matchingId.value !== null)
const failedCovers = ref(new Set<string>())
const pageSize = 10
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let searchRequestId = 0
let matchRequestId = 0
let opener: HTMLElement | null = null

const artistNames = (song: SongResult) =>
  (song.ar || song.artists || [])
    .map((artist) => artist.name)
    .filter(Boolean)
    .join(' / ') || '未知歌手'
const albumName = (song: SongResult) =>
  song.al?.name || (typeof song.album === 'string' ? song.album : song.album?.name) || ''
const coverUrl = (song: SongResult) => song.al?.picUrl || song.picUrl || ''
const currentSongCaption = computed(() =>
  props.songData ? `${props.songData.name || '未知歌曲'} · ${artistNames(props.songData)}` : ''
)
const resultsCaption = computed(() =>
  totalCount.value === null
    ? `已显示 ${searchResults.value.length} 首`
    : `${totalCount.value} 首匹配`
)

const clearDebounce = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = null
}
const invalidateSearch = () => {
  clearDebounce()
  searchRequestId++
  isSearching.value = false
  isLoadingMore.value = false
}
const resetSearch = () => {
  invalidateSearch()
  searchResults.value = []
  currentPage.value = 1
  hasMore.value = false
  hasSearched.value = false
  totalCount.value = null
  searchError.value = ''
  matchError.value = ''
}

const handleSearch = async (reset = true) => {
  if (!props.modelValue || isMatching.value) return
  clearDebounce()
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    resetSearch()
    return
  }
  if (!reset && (isLoadingMore.value || !hasMore.value)) return
  if (reset) {
    currentPage.value = 1
    searchResults.value = []
    totalCount.value = null
    hasMore.value = false
  }
  const requestId = ++searchRequestId
  const page = currentPage.value
  isSearching.value = reset
  isLoadingMore.value = !reset
  searchError.value = ''
  matchError.value = ''
  try {
    const response = await cloudSearch(keyword, (page - 1) * pageSize, pageSize)
    if (requestId !== searchRequestId || !props.modelValue) return
    const songs: SongResult[] = Array.isArray(response.result?.songs) ? response.result.songs : []
    searchResults.value = reset
      ? songs
      : [
          ...searchResults.value,
          ...songs.filter((song) => !searchResults.value.some((item) => item.id === song.id))
        ]
    const count = response.result?.songCount
    totalCount.value = typeof count === 'number' && Number.isFinite(count) ? count : null
    hasMore.value =
      songs.length > 0 &&
      (totalCount.value === null ? songs.length >= pageSize : page * pageSize < totalCount.value)
    currentPage.value = page + 1
    hasSearched.value = true
  } catch {
    if (requestId !== searchRequestId || !props.modelValue) return
    searchError.value = reset ? '搜索失败，请重试。' : '更多歌曲未能加载，请重试。'
    hasSearched.value = true
  } finally {
    if (requestId === searchRequestId) {
      isSearching.value = false
      isLoadingMore.value = false
    }
  }
}

const selectSong = async (song: SongResult) => {
  if (isMatching.value || isSearching.value || isLoadingMore.value) return
  if (!props.songData?.id || !props.userId) {
    matchError.value = '歌曲或账号信息不完整，请重新打开后重试。'
    return
  }
  const requestId = ++matchRequestId
  matchingId.value = song.id
  matchError.value = ''
  try {
    await matchCloudSong(props.userId, props.songData.id, song.id)
    if (requestId !== matchRequestId || !props.modelValue) return
    message.success('纠正歌曲信息成功')
    matchingId.value = null
    dialogVisible.value = false
  } catch {
    if (requestId === matchRequestId && props.modelValue) {
      matchError.value = '未能纠正歌曲信息，请重新选择后重试。'
    }
  } finally {
    if (requestId === matchRequestId) matchingId.value = null
  }
}

watch(
  searchKeyword,
  () => {
    resetSearch()
    if (!props.modelValue || !searchKeyword.value.trim()) return
    isSearching.value = true
    debounceTimer = setTimeout(() => void handleSearch(), 400)
  },
  { flush: 'sync' }
)
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    } else {
      resetSearch()
      searchKeyword.value = ''
      matchRequestId++
      matchingId.value = null
      failedCovers.value.clear()
    }
  },
  { flush: 'sync' }
)
const restoreFocus = () => {
  if (!props.modelValue && opener?.isConnected && !opener.closest('[inert]')) {
    opener.focus({ preventScroll: true })
  }
}
const focusSearch = async () => {
  await nextTick()
  searchInput.value?.focus()
}
onUnmounted(() => {
  invalidateSearch()
  matchRequestId++
})
</script>

<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="560"
    :persistent="isMatching"
    scrim="#09090e"
    :opacity="0.72"
    class="correct-song-dialog"
    aria-label="纠正歌曲信息"
    @after-enter="focusSearch"
    @after-leave="restoreFocus"
  >
    <section class="dialog-card" :aria-busy="isMatching">
      <header class="dialog-heading">
        <div class="heading-copy">
          <h2>纠正歌曲信息</h2>
          <p>搜索并选择这首歌对应的歌曲信息</p>
        </div>
        <button
          type="button"
          class="close-button"
          aria-label="关闭纠正歌曲信息"
          :disabled="isMatching"
          @click="dialogVisible = false"
        >
          <v-icon icon="mdi-close" size="20" />
        </button>
      </header>

      <div v-if="currentSongCaption" class="current-song">
        <v-icon icon="mdi-cloud-outline" size="18" aria-hidden="true" />
        <span
          ><small>当前歌曲</small
          ><strong :title="currentSongCaption">{{ currentSongCaption }}</strong></span
        >
      </div>

      <form class="search-form" role="search" @submit.prevent="handleSearch()">
        <label class="search-field">
          <v-icon icon="mdi-magnify" size="18" aria-hidden="true" />
          <input
            ref="searchInput"
            v-model="searchKeyword"
            type="search"
            placeholder="搜索歌曲或歌手"
            aria-label="搜索正确的歌曲信息"
            :disabled="isMatching"
          />
        </label>
        <button type="submit" class="search-button" :disabled="!searchKeyword.trim() || isMatching">
          搜索
        </button>
      </form>

      <div class="dialog-content" :aria-busy="isSearching || isLoadingMore">
        <div v-if="isSearching" class="state-panel" role="status">
          <v-progress-circular indeterminate size="24" width="2" color="primary" />
          <h3>正在搜索歌曲</h3>
        </div>
        <template v-else-if="searchResults.length">
          <div class="results-heading">
            <span>选择正确的歌曲</span><span>{{ resultsCaption }}</span>
          </div>
          <div class="results-list">
            <button
              v-for="song in searchResults"
              :key="song.id"
              type="button"
              class="result-item"
              :class="{ matching: matchingId === song.id }"
              :disabled="isMatching || isLoadingMore"
              @click="selectSong(song)"
            >
              <span class="song-cover">
                <v-icon icon="mdi-music-note" size="22" aria-hidden="true" />
                <img
                  v-if="coverUrl(song) && !failedCovers.has(coverUrl(song))"
                  :src="coverUrl(song)"
                  alt=""
                  loading="lazy"
                  @error="failedCovers.add(coverUrl(song))"
                />
              </span>
              <span class="song-copy">
                <strong :title="song.name">{{ song.name }}</strong>
                <span :title="artistNames(song)">{{ artistNames(song) }}</span>
                <small v-if="albumName(song)" :title="albumName(song)">{{ albumName(song) }}</small>
              </span>
              <v-progress-circular
                v-if="matchingId === song.id"
                indeterminate
                size="18"
                width="2"
                color="primary"
              />
              <v-icon
                v-else
                class="select-icon"
                icon="mdi-arrow-right"
                size="18"
                aria-hidden="true"
              />
            </button>
          </div>
          <div class="results-footer" aria-live="polite">
            <template v-if="searchError"
              ><p class="error-message">{{ searchError }}</p>
              <button
                type="button"
                class="text-button"
                :disabled="isMatching"
                @click="handleSearch(false)"
              >
                重试加载
              </button></template
            >
            <button
              v-else-if="hasMore"
              type="button"
              class="text-button load-more-button"
              :disabled="isLoadingMore || isMatching"
              @click="handleSearch(false)"
            >
              <v-progress-circular
                v-if="isLoadingMore"
                indeterminate
                size="14"
                width="2"
                color="primary"
              />{{ isLoadingMore ? '正在加载…' : '加载更多歌曲' }}
            </button>
            <span v-else class="end-caption">已显示全部结果</span>
          </div>
        </template>
        <div v-else-if="searchError" class="state-panel" role="status">
          <v-icon icon="mdi-wifi-off" size="30" aria-hidden="true" />
          <h3>暂时无法搜索</h3>
          <p>{{ searchError }}</p>
          <button type="button" class="text-button" @click="handleSearch()">重新搜索</button>
        </div>
        <div v-else-if="hasSearched" class="state-panel" role="status">
          <v-icon icon="mdi-magnify" size="30" aria-hidden="true" />
          <h3>未找到相关歌曲</h3>
          <p>换个歌曲名或歌手名再试试。</p>
        </div>
        <div v-else class="state-panel" role="status">
          <v-icon icon="mdi-music-note-outline" size="30" aria-hidden="true" />
          <h3>找到对应的歌曲</h3>
          <p>选择搜索结果后，将更新这首云盘歌曲的匹配信息。</p>
        </div>
      </div>
      <p v-if="matchError" class="match-error error-message" role="alert">{{ matchError }}</p>
      <footer class="dialog-footer">
        <span aria-live="polite">{{ isMatching ? '正在纠正歌曲信息…' : '点击歌曲即可匹配' }}</span
        ><button
          type="button"
          class="cancel-button"
          :disabled="isMatching"
          @click="dialogVisible = false"
        >
          取消
        </button>
      </footer>
    </section>
  </v-dialog>
</template>

<style lang="less" scoped>
.dialog-card {
  display: flex;
  flex-direction: column;
  max-height: ~"min(680px, calc(100dvh - 48px))";
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
    &:disabled {
      cursor: default;
      opacity: 0.45;
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 2px;
    }
  }
}
.dialog-heading {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 18px;
}
.heading-copy {
  flex: 1;
  min-width: 0;
  h2 {
    margin: 0 0 6px;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.4;
  }
  p {
    margin: 0;
    color: var(--app-muted);
    font-size: 12px;
    line-height: 1.6;
  }
}
.close-button {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-muted);
  &:hover:not(:disabled) {
    color: var(--app-text);
    background: var(--app-surface);
  }
}
.current-song {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  margin: 0 24px 18px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-muted);
  > span {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    gap: 3px;
  }
  small {
    font-size: 10px;
  }
  strong {
    overflow: hidden;
    color: var(--app-text);
    font-size: 12px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.search-form {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  margin: 0 24px 16px;
}
.search-field {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--app-muted);
  &:focus-within {
    border-color: var(--app-accent-border);
  }
  input {
    width: 100%;
    min-width: 0;
    padding: 8px 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--app-text);
    font-size: 13px;
    &::placeholder {
      color: var(--app-muted);
    }
  }
}
.search-button,
.cancel-button {
  flex-shrink: 0;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font-size: 12px !important;
  &:hover:not(:disabled) {
    background: var(--app-surface);
  }
}
.search-button {
  border-color: transparent;
  background: var(--app-accent);
  color: var(--app-on-accent);
  font-weight: 600 !important;
  &:hover:not(:disabled) {
    background: var(--app-accent-hover);
  }
}
.dialog-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 14px;
}
.results-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 10px 8px;
  color: var(--app-muted);
  font-size: 11px;
}
.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 78px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  &:hover:not(:disabled) {
    background: var(--app-surface);
    .select-icon {
      color: var(--app-accent);
    }
  }
  &.matching:disabled {
    border-color: var(--app-accent-border);
    background: var(--app-accent-soft);
    opacity: 1;
  }
}
.song-cover {
  position: relative;
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-surface);
  color: var(--app-muted);
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.song-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
  strong,
  span,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  strong {
    font-size: 13px;
    font-weight: 500;
  }
  span {
    color: var(--app-muted);
    font-size: 11px;
  }
  small {
    color: var(--app-muted);
    font-size: 10px;
    opacity: 0.75;
  }
}
.select-icon {
  flex-shrink: 0;
  color: var(--app-muted);
}
.results-footer {
  display: flex;
  min-height: 54px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px;
}
.text-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 5px 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--app-accent);
  font-size: 12px !important;
  &:hover:not(:disabled) {
    background: var(--app-surface);
  }
}
.end-caption {
  color: var(--app-muted);
  font-size: 11px;
}
.state-panel {
  display: flex;
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px 16px;
  color: var(--app-muted);
  text-align: center;
  h3 {
    margin: 0;
    color: var(--app-text);
    font-size: 14px;
    font-weight: 500;
  }
  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.7;
  }
}
.error-message {
  margin: 0;
  color: var(--app-danger-text);
  font-size: 12px;
  line-height: 1.6;
}
.match-error {
  flex-shrink: 0;
  padding: 0 24px 14px;
}
.dialog-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--app-border);
  > span {
    color: var(--app-muted);
    font-size: 11px;
  }
}
@media (max-width: 480px) {
  .dialog-heading {
    padding: 20px 18px 16px;
  }
  .current-song {
    margin: 0 18px 16px;
  }
  .search-form {
    margin: 0 18px 14px;
  }
  .dialog-content {
    padding-inline: 8px;
  }
  .dialog-footer {
    padding: 14px 18px;
  }
  .match-error {
    padding-inline: 18px;
  }
}
@media (max-height: 560px) {
  .dialog-card {
    max-height: calc(100dvh - 24px);
  }
  .dialog-heading {
    padding-block: 16px 12px;
  }
  .current-song {
    margin-bottom: 12px;
    padding: 9px 12px;
  }
  .state-panel {
    min-height: 150px;
  }
  .dialog-footer {
    padding-block: 10px;
  }
}
</style>
