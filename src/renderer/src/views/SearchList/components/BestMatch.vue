<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GetMusicDetailData } from '@/api/musicList'

interface Props {
  song?: GetMusicDetailData
  artist?: { id: number; name: string; picUrl?: string; img1v1Url?: string }
  loading?: boolean
  playingId?: number
  busy?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  play: [song: GetMusicDetailData]
  artist: [id: number]
}>()
const songImageFailed = ref(false)
const artistImageFailed = ref(false)
const imageUrl = (source?: string) => {
  if (!source || !/^https?:\/\//i.test(source)) return source || ''
  try {
    const url = new URL(source)
    url.searchParams.set('param', '200y200')
    return url.toString()
  } catch {
    return source
  }
}
const songImage = computed(() => imageUrl(props.song?.al?.picUrl))
const artistImage = computed(() => imageUrl(props.artist?.picUrl || props.artist?.img1v1Url))
const artistNames = computed(
  () => props.song?.ar?.map((artist) => artist.name).join(' / ') || props.song?.artist || ''
)
const unavailable = computed(() => (props.song?.privilege?.st ?? 0) < 0)
watch(songImage, () => (songImageFailed.value = false))
watch(artistImage, () => (artistImageFailed.value = false))

const playSong = () => {
  if (props.song && !unavailable.value && !props.busy) emit('play', props.song)
}
</script>

<template>
  <section v-if="loading || song || artist" class="best-match" :aria-busy="loading">
    <h2>最佳匹配</h2>
    <div v-if="loading" class="match-grid" aria-label="正在加载最佳匹配" role="status">
      <div v-for="item in 2" :key="item" class="match-card match-skeleton" aria-hidden="true">
        <span class="skeleton-artwork" :class="{ round: item === 2 }"></span>
        <span class="skeleton-text"><i></i><i></i><i></i></span>
      </div>
    </div>
    <div v-else class="match-grid" :class="{ 'single-match': !song || !artist }">
      <article v-if="song" class="match-card song-match">
        <span class="match-artwork">
          <v-icon icon="mdi-music-note" size="30" aria-hidden="true" />
          <img
            v-if="songImage && !songImageFailed"
            :src="songImage"
            alt=""
            loading="lazy"
            decoding="async"
            @error="songImageFailed = true"
          />
        </span>
        <div class="match-info">
          <span class="match-kind">单曲</span>
          <h3 :class="{ 'is-playing': playingId === song.id }" :title="song.name">
            {{ song.name }}
          </h3>
          <p :title="artistNames">{{ artistNames || '未知歌手' }}</p>
          <span v-if="unavailable" class="unavailable-label">暂不可播放</span>
        </div>
        <button
          type="button"
          class="match-play"
          :disabled="busy || unavailable"
          :aria-label="unavailable ? `${song.name} 暂不可播放` : `播放 ${song.name}`"
          :title="unavailable ? '暂不可播放' : undefined"
          @click="playSong"
        >
          <v-icon icon="mdi-play" size="25" aria-hidden="true" />
        </button>
      </article>
      <button
        v-if="artist"
        type="button"
        class="match-card artist-match"
        :aria-label="`查看歌手 ${artist.name}`"
        @click="emit('artist', artist.id)"
      >
        <span class="match-artwork round">
          <v-icon icon="mdi-account-music-outline" size="30" aria-hidden="true" />
          <img
            v-if="artistImage && !artistImageFailed"
            :src="artistImage"
            alt=""
            loading="lazy"
            decoding="async"
            @error="artistImageFailed = true"
          />
        </span>
        <span class="match-info">
          <span class="match-kind">歌手</span>
          <span class="artist-name" :title="artist.name">{{ artist.name }}</span>
          <span class="artist-link">查看歌手</span>
        </span>
        <v-icon icon="mdi-chevron-right" size="21" class="artist-arrow" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<style lang="less" scoped>
.best-match {
  min-width: 0;
  h2 {
    margin: 0 0 12px;
    color: var(--app-text);
    font-size: 17px;
    font-weight: 600;
    line-height: 1.5;
  }
}
.match-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
  &.single-match {
    grid-template-columns: minmax(0, 1fr);
  }
}
.match-card {
  display: flex;
  min-width: 0;
  min-height: 112px;
  align-items: center;
  gap: 16px;
  padding: 12px 16px 12px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  color: var(--app-text);
}
.match-artwork,
.skeleton-artwork {
  position: relative;
  display: grid;
  flex: 0 0 86px;
  width: 86px;
  height: 86px;
  overflow: hidden;
  place-items: center;
  border-radius: 8px;
  background: var(--app-surface-strong);
  color: var(--app-muted);
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  &.round {
    border-radius: 50%;
  }
}
.match-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  h3,
  p,
  .artist-name {
    display: block;
    width: 100%;
    overflow: hidden;
    margin: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  h3,
  .artist-name {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
  }
  p,
  .artist-link {
    color: var(--app-muted);
    font-size: 12px;
    line-height: 1.5;
  }
  .is-playing {
    color: var(--app-playing);
  }
}
.match-kind,
.unavailable-label {
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.4;
}
.match-play {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--app-accent);
  color: var(--app-on-accent);
  cursor: pointer;
  transition: opacity 0.16s;
  &:hover:not(:disabled) {
    opacity: 0.8;
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
}
.artist-match {
  width: 100%;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.16s;
  &:hover {
    background: var(--app-hover);
  }
  .match-artwork {
    flex-basis: 72px;
    width: 72px;
    height: 72px;
  }
}
.artist-arrow {
  flex-shrink: 0;
  color: var(--app-muted);
}
.match-play,
.artist-match {
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.match-skeleton {
  .skeleton-text {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 10px;
    i {
      display: block;
      width: 70%;
      max-width: 220px;
      height: 12px;
      border-radius: 4px;
      background: var(--app-surface-strong);
      &:first-child {
        width: 36px;
        height: 8px;
      }
      &:last-child {
        width: 50%;
        height: 9px;
      }
    }
  }
}
@media (max-width: 900px) {
  .match-grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  }
  .match-card {
    gap: 12px;
  }
  .artist-match .match-artwork {
    flex-basis: 60px;
    width: 60px;
    height: 60px;
  }
}
@media (max-width: 680px) {
  .match-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .artist-match {
    min-height: 88px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .match-play,
  .artist-match {
    transition: none;
  }
}
</style>
