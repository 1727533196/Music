<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMusicAction } from '@/store/music'
import { isLocalTrack, trackArtwork } from '@/utils/playbackTrack'

const music = useMusicAction()
const search = ref('')
const scroller = ref<HTMLElement>()
const scrollTop = ref(0)
const height = ref(480)
const rowHeight = 64
const tracks = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return (music.state.runtimeList?.tracks || []).filter(
    (track) =>
      !query ||
      `${track.name} ${track.ar?.map((artist) => artist.name).join(' ')}`
        .toLocaleLowerCase()
        .includes(query)
  )
})
const first = computed(() => Math.max(0, Math.floor(scrollTop.value / rowHeight) - 4))
const visible = computed(() =>
  tracks.value.slice(first.value, first.value + Math.ceil(height.value / rowHeight) + 8)
)
const time = (value: number) => {
  const seconds = Math.max(0, Math.floor(value / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
function locate() {
  const index = tracks.value.findIndex((track) => track.id === music.state.songs.id)
  if (index < 0 || !scroller.value) return
  const top = Math.max(0, index * rowHeight - (scroller.value.clientHeight - rowHeight) / 2)
  scroller.value.scrollTop = top
  scrollTop.value = top
}
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    height.value = entry.contentRect.height
  })
  if (scroller.value) observer.observe(scroller.value)
  locate()
})
onBeforeUnmount(() => observer?.disconnect())
watch(search, () => {
  scrollTop.value = 0
  scroller.value?.scrollTo({ top: 0 })
})
watch(
  () => music.state.songs.id,
  async () => {
    await nextTick()
    locate()
  }
)
defineExpose({ locate })
</script>

<template>
  <div class="local-queue">
    <input
      v-if="(music.state.runtimeList?.tracks.length || 0) > 10"
      v-model="search"
      class="queue-search"
      type="search"
      placeholder="搜索此列表歌曲"
      aria-label="搜索待播列表"
    />
    <div
      ref="scroller"
      class="song-list-container queue-scroll"
      @scroll="scrollTop = ($event.target as HTMLElement).scrollTop"
    >
      <div :style="{ height: `${tracks.length * rowHeight}px`, position: 'relative' }">
        <div :style="{ transform: `translateY(${first * rowHeight}px)` }">
          <div v-for="track in visible" :key="track.id" class="song-sort-row">
            <button
              type="button"
              class="list"
              :class="{ 'is-playing': track.id === music.state.songs.id }"
              :aria-current="track.id === music.state.songs.id ? 'true' : undefined"
              :disabled="isLocalTrack(track) && track.local.missing"
              @click="music.getMusicUrlHandler(track)"
            >
              <span class="song-artwork">
                <img
                  v-if="track.al?.picUrl"
                  :src="trackArtwork(track.al.picUrl)"
                  alt=""
                  loading="lazy"
                  @error="($event.target as HTMLImageElement).style.visibility = 'hidden'"
                />
                <v-icon v-else icon="mdi-music-note" size="22" />
              </span>
              <span class="track-text">
                <span class="song-title">{{ track.name }}</span>
                <span class="name-container"
                  ><span v-if="isLocalTrack(track)" class="local-label">本地</span
                  >{{ track.ar?.map((artist) => artist.name).join(' / ') || '未知艺术家' }}</span
                >
              </span>
              <span class="time">{{ time(track.dt) }}</span>
            </button>
          </div>
        </div>
      </div>
      <p v-if="!tracks.length" class="no-result">没有找到匹配的歌曲</p>
    </div>
  </div>
</template>

<style scoped>
.local-queue {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
.queue-search {
  margin: 12px 16px 2px;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-text);
  background: var(--app-surface);
  font: inherit;
  font-size: 12px;
}
.queue-search::placeholder {
  color: var(--app-muted);
}
.queue-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
  overscroll-behavior: contain;
}
.song-sort-row {
  height: 64px;
}
.list {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 60px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  color: var(--app-text);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.list:hover,
.list.is-playing {
  background: var(--app-hover);
}
.list:focus-visible,
.queue-search:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: -2px;
}
.song-artwork {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  color: var(--app-muted);
  background: var(--app-surface-strong);
}
.song-artwork img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.track-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.song-title,
.name-container {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.song-title {
  font-size: 13px;
}
.name-container,
.time {
  color: var(--app-muted);
  font-size: 11px;
}
.local-label {
  margin-right: 6px;
  padding: 0 3px;
  border: 1px solid var(--app-border);
  border-radius: 3px;
  font-size: 10px;
}
.time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.no-result {
  padding: 24px 12px;
  color: var(--app-muted);
  font-size: 13px;
  text-align: center;
}
</style>
