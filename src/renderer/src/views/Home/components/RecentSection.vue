<script setup lang="ts">
import type { GetMusicDetailData } from '@/api/musicList'

defineProps<{ songs: GetMusicDetailData[] }>()
const emit = defineEmits<{ play: [song: GetMusicDetailData] }>()

const duration = (ms: number) => {
  const seconds = Math.floor((ms || 0) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<template>
  <section class="recent-section" aria-label="最近播放">
    <div class="section-header">
      <h2>最近播放</h2>
      <v-icon icon="mdi-history" size="20" />
    </div>
    <div v-if="songs.length" class="recent-list">
      <button
        v-for="song in songs"
        :key="song.id"
        type="button"
        class="recent-song"
        :aria-label="`播放 ${song.name}`"
        @click="emit('play', song)"
      >
        <div class="recent-cover">
          <v-img :src="song.al?.picUrl || ''" cover class="cover-img" />
          <span class="cover-play"><v-icon icon="mdi-play" size="22" /></span>
        </div>
        <div class="recent-info">
          <div class="song-name">{{ song.name }}</div>
          <div class="song-artist">{{ song.ar?.map((artist) => artist.name).join(' / ') }}</div>
        </div>
        <span v-if="song.dt" class="song-duration">{{ duration(song.dt) }}</span>
      </button>
    </div>
    <div v-else class="empty-state">
      <v-icon icon="mdi-history" size="32" />
      <span>播放过的歌曲会出现在这里</span>
    </div>
  </section>
</template>

<style lang="less" scoped>
.recent-section {
  min-width: 0;
}
.section-header {
  min-height: 40px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  h2 {
    font-size: 21px;
    font-weight: 650;
    letter-spacing: 0.02em;
    color: var(--discovery-text);
  }
  > .v-icon {
    color: var(--discovery-muted);
  }
}
.recent-list {
  display: grid;
  gap: 8px;
}
.recent-song {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 10px 0;
  text-align: left;
  border-radius: 10px;
  color: var(--discovery-text);
  cursor: pointer;
  &:hover .cover-play,
  &:focus-visible .cover-play {
    opacity: 1;
  }
  &:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 2px;
  }
}
.recent-cover {
  position: relative;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border-radius: 7px;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.18s;
}
.recent-info {
  flex: 1;
  min-width: 0;
}
.song-name,
.song-artist {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.song-name {
  font-size: 14px;
  font-weight: 550;
  line-height: 1.6;
}
.song-artist {
  font-size: 12px;
  line-height: 1.6;
  margin-top: 3px;
  color: var(--discovery-muted);
}
.song-duration {
  flex-shrink: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--discovery-muted);
}
.empty-state {
  min-height: 232px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--discovery-muted);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}
@container (min-width: 541px) and (max-width: 900px) {
  .recent-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
  .recent-song {
    flex-wrap: wrap;
    gap: 10px;
  }
  .recent-info {
    flex-basis: calc(100% - 64px);
  }
  .song-duration {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cover-play {
    transition: none;
  }
}
</style>
