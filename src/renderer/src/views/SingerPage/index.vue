<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArtistDetail } from '@/api/user'
import type { getArtistDetailRes } from '@/api/user'
import { getArtistAlbum } from '@/api/musicList'
import type { GetArtistAlbumRes } from '@/api/musicList'
import { useTheme } from '@/store/theme'

interface State {
  singerDetail: getArtistDetailRes['data']
  artist: getArtistDetailRes['data']['artist']
  albums: GetArtistAlbumRes['hotAlbums']
}
const state: State = reactive({
  singerDetail: {} as getArtistDetailRes['data'],
  artist: {} as getArtistDetailRes['data']['artist'],
  albums: []
})
const route = useRoute()
const router = useRouter()
const theme = useTheme()
const detailLoading = ref(false)
const albumLoading = ref(false)
const detailError = ref(false)
const albumError = ref(false)
const failedImages = ref(new Set<string>())
let requestVersion = 0

watch(
  () => route.fullPath,
  () => {
    if (route.path === '/singer-page') init()
  },
  { immediate: true }
)

function init() {
  const id = Number(route.query.id)
  const version = ++requestVersion
  state.singerDetail = {} as getArtistDetailRes['data']
  state.artist = {} as getArtistDetailRes['data']['artist']
  state.albums = []
  failedImages.value.clear()
  detailError.value = false
  albumError.value = false
  if (!Number.isFinite(id) || id <= 0) {
    detailError.value = true
    detailLoading.value = false
    albumLoading.value = false
    return
  }
  void getSingerDetail(id, version)
  void getSingerAlbum(id, version)
}

async function getSingerDetail(id: number, version: number) {
  detailLoading.value = true
  try {
    const { data } = await getArtistDetail(id)
    if (version !== requestVersion) return
    if (!data?.artist) throw new Error('Invalid artist response')
    state.singerDetail = data
    state.artist = data.artist
    theme.change(state.artist.avatar)
  } catch (error) {
    if (version === requestVersion) detailError.value = true
    console.error('加载歌手信息失败', error)
  } finally {
    if (version === requestVersion) detailLoading.value = false
  }
}
async function getSingerAlbum(id: number, version: number) {
  albumLoading.value = true
  albumError.value = false
  try {
    const { hotAlbums } = await getArtistAlbum(id)
    if (version !== requestVersion) return
    if (!Array.isArray(hotAlbums)) throw new Error('Invalid artist albums response')
    state.albums = hotAlbums
  } catch (error) {
    if (version === requestVersion) albumError.value = true
    console.error('加载歌手专辑失败', error)
  } finally {
    if (version === requestVersion) albumLoading.value = false
  }
}
const alias = computed(() => state.artist.alias?.filter(Boolean).join(' / '))
const retryAlbums = () => void getSingerAlbum(Number(route.query.id), requestVersion)
const gotoUserDetail = () => {
  if (!state.singerDetail.user) return
  router.push({ path: '/detail', query: { uid: state.singerDetail.user.userId } })
}
const getAlbumContentHandler = (id: number) => {
  router.push({ path: '/play-list', query: { id, type: 'album' } })
}
const imageFallback = (event: Event) => {
  const src = (event.target as HTMLImageElement).getAttribute('src')
  if (src) failedImages.value.add(src)
}
onBeforeUnmount(() => {
  requestVersion++
})
</script>

<template>
  <div class="singer-page">
    <header class="artist-heading" :aria-busy="detailLoading">
      <div class="artist-portrait" :class="{ skeleton: detailLoading }">
        <v-icon icon="mdi-account-music-outline" size="54" aria-hidden="true" />
        <img
          v-if="state.artist.avatar && !failedImages.has(state.artist.avatar)"
          :src="state.artist.avatar"
          :alt="state.artist.name"
          @error="imageFallback"
        />
      </div>
      <div class="artist-info">
        <p class="eyebrow">歌手</p>
        <template v-if="detailLoading">
          <div class="name-skeleton skeleton"></div>
          <div class="caption-skeleton skeleton"></div>
        </template>
        <template v-else-if="detailError">
          <h1>歌手信息加载失败</h1>
          <p class="artist-alias">请检查网络连接后重试。</p>
          <button class="profile-button" @click="init">重新加载</button>
        </template>
        <template v-else>
          <h1>{{ state.artist.name }}</h1>
          <p v-if="alias" class="artist-alias">{{ alias }}</p>
          <div class="artist-counts">
            <span v-if="state.artist.musicSize != null">{{ state.artist.musicSize }} 首单曲</span>
            <span v-if="state.artist.albumSize != null">{{ state.artist.albumSize }} 张专辑</span>
            <span v-if="state.artist.mvSize != null">{{ state.artist.mvSize }} 支 MV</span>
          </div>
          <button v-if="state.singerDetail.user" class="profile-button" @click="gotoUserDetail">
            <v-icon icon="mdi-account-outline" size="17" />个人主页
            <v-icon icon="mdi-chevron-right" size="17" />
          </button>
        </template>
      </div>
    </header>

    <p v-if="state.artist.briefDesc" class="artist-description">{{ state.artist.briefDesc }}</p>

    <section class="album-section" :aria-busy="albumLoading" aria-labelledby="artist-albums-title">
      <div class="section-heading">
        <h2 id="artist-albums-title">专辑</h2>
        <span v-if="state.albums.length">已加载 {{ state.albums.length }} 张</span>
      </div>
      <div v-if="albumLoading" class="album-grid" aria-label="正在加载专辑">
        <div v-for="i in 6" :key="i" class="album-skeleton">
          <div class="skeleton"></div>
          <span class="skeleton"></span>
        </div>
      </div>
      <div v-else-if="albumError" class="album-state" role="status">
        <v-icon icon="mdi-album" size="32" />
        <h3>专辑加载失败</h3>
        <p>请检查网络连接后重试。</p>
        <button class="profile-button" @click="retryAlbums">重新加载</button>
      </div>
      <div v-else-if="state.albums.length" class="album-grid">
        <button
          v-for="item in state.albums"
          :key="item.id"
          class="album-card"
          :aria-label="`打开专辑：${item.name}`"
          @click="getAlbumContentHandler(item.id)"
        >
          <span class="album-cover">
            <v-icon class="cover-placeholder" icon="mdi-album" size="46" aria-hidden="true" />
            <img
              v-if="item.picUrl && !failedImages.has(item.picUrl)"
              :src="item.picUrl"
              :alt="item.name"
              loading="lazy"
              @error="imageFallback"
            />
            <span class="cover-open"><v-icon icon="mdi-arrow-top-right" size="23" /></span>
          </span>
          <strong :title="item.name">{{ item.name }}</strong>
          <span v-if="item.company" class="album-caption" :title="item.company">{{
            item.company
          }}</span>
        </button>
      </div>
      <div v-else class="album-state">
        <v-icon icon="mdi-album" size="32" />
        <h3>暂无专辑</h3>
        <p>这位歌手还没有可展示的专辑。</p>
      </div>
    </section>
  </div>
</template>

<style lang="less" scoped>
.singer-page {
  width: 100%;
  padding: 28px var(--app-gutter, 32px) 40px;
  color: var(--app-text, #f2eff5);
  button {
    font: inherit;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--app-accent, #e8bdd1);
    outline-offset: 4px;
  }
}
.artist-heading {
  display: flex;
  align-items: center;
  gap: 28px;
  min-width: 0;
}
.artist-portrait {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 clamp(128px, 14vw, 176px);
  width: clamp(128px, 14vw, 176px);
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  color: var(--app-muted);
  background: var(--app-surface, #ffffff09);
  border: 1px solid var(--app-border, #ffffff14);
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.artist-info {
  flex: 1;
  min-width: 0;
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--app-muted);
  letter-spacing: 0.18em;
  font-size: 11px;
  font-weight: 600;
}
h1 {
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.25;
  font-weight: 650;
  margin: 0;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
.artist-alias {
  margin: 7px 0 0;
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.artist-counts {
  display: flex;
  flex-wrap: wrap;
  column-gap: 18px;
  row-gap: 5px;
  margin-top: 14px;
  color: var(--app-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.profile-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  min-height: var(--app-control-height, 36px);
  margin-top: 18px;
  padding: 0 12px;
  border-radius: var(--app-control-radius, 10px);
  border: 1px solid var(--app-border, #ffffff14);
  color: var(--app-text, #f2eff5);
  background: var(--app-surface, #ffffff09);
  font-size: 12px !important;
  transition:
    background 0.18s,
    border-color 0.18s;
  &:hover {
    background: var(--app-border);
    border-color: var(--app-border);
  }
}
.artist-description {
  max-width: 860px;
  margin: 24px 0 0;
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.9;
  white-space: pre-line;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.album-section {
  margin-top: 30px;
  padding-top: 22px;
  border-top: 1px solid var(--app-border, #ffffff14);
}
.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.015em;
  }
  > span {
    font-size: 12px;
    color: var(--app-muted);
  }
}
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  align-items: start;
  gap: 24px 20px;
}
.album-card {
  width: 100%;
  min-width: 0;
  max-width: 210px;
  border: 0;
  padding: 0;
  border-radius: 11px;
  background: transparent;
  color: var(--app-text, #f2eff5);
  text-align: left;
  strong {
    display: block;
    margin-top: 10px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  &:hover,
  &:focus-visible {
    .cover-open {
      opacity: 1;
    }
    .album-cover img {
      transform: scale(1.025);
    }
  }
}
.album-cover {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 11px;
  background: var(--app-surface, #ffffff09);
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1px solid var(--app-border, #ffffff14);
    border-radius: inherit;
    pointer-events: none;
  }
  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s ease;
  }
}
.cover-placeholder {
  color: var(--app-muted);
}
.cover-open {
  position: absolute;
  right: 9px;
  bottom: 9px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #ffffff19;
  border-radius: 50%;
  background: #16131ae6;
  color: white;
  opacity: 0;
  transition: opacity 0.18s;
}
.album-caption {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.6;
  margin-top: 3px;
}
.album-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  text-align: center;
  color: var(--app-muted);
  h3 {
    margin: 12px 0 6px;
    font-size: 16px;
    font-weight: 550;
    color: var(--app-text, #f2eff5);
  }
  p {
    margin: 0;
    font-size: 13px;
  }
}
.skeleton {
  background: var(--app-surface);
  animation: skeleton-pulse 1.6s ease-in-out infinite alternate;
}
.name-skeleton {
  width: min(220px, 75%);
  height: 34px;
  border-radius: 7px;
}
.caption-skeleton {
  width: min(160px, 55%);
  height: 13px;
  margin-top: 15px;
  border-radius: 4px;
}
.album-skeleton {
  max-width: 210px;
  > div {
    aspect-ratio: 1;
    border-radius: 11px;
  }
  > span {
    display: block;
    width: 75%;
    height: 12px;
    margin-top: 12px;
    border-radius: 4px;
  }
}
@keyframes skeleton-pulse {
  to {
    opacity: 0.5;
  }
}
@media (max-width: 650px) {
  .singer-page {
    padding-top: 22px;
  }
  .artist-heading {
    gap: 18px;
    align-items: flex-start;
  }
  .artist-portrait {
    flex-basis: 104px;
    width: 104px;
  }
  h1 {
    font-size: 27px;
  }
  .artist-counts {
    column-gap: 12px;
    margin-top: 10px;
  }
  .profile-button {
    margin-top: 13px;
  }
  .album-grid {
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 22px 16px;
  }
}
@media (max-width: 420px) {
  .artist-portrait {
    flex-basis: 84px;
    width: 84px;
  }
  .artist-heading {
    gap: 14px;
  }
  h1 {
    font-size: 24px;
  }
  .artist-counts {
    column-gap: 10px;
    font-size: 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .singer-page *,
  .singer-page *::before,
  .singer-page *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>
