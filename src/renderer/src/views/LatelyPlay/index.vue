<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import { columns, playListMock } from './config'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import { getRecordSong } from '@/api/musicList'
import type { GetMusicDetailData } from '@/api/musicList'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils'

type RecentSong = GetMusicDetailData & { playTime: number }
interface RecentResponse {
  data: { list: { data: GetMusicDetailData; playTime: number }[] }
}
const music = useMusicAction()
const router = useRouter()
const loading = ref(false)
const loadError = ref(false)
const recordSongList = ref<RecentSong[]>([])
const { getLikeMusicIds } = usePlayList()
const recentColumns = columns.map((column) =>
  column.class === 'time'
    ? {
        ...column,
        width: '88px',
        processEl: (h, row: RecentSong) =>
          h(
            'span',
            { title: formatDate(row.playTime, 'YY-MM-DD hh:mm:ss') },
            formatDate(row.playTime, 'MM-DD hh:mm')
          )
      }
    : column
)
const ids = computed(() => recordSongList.value.map((item) => item.id))
const listInfo = computed(() => ({
  ...playListMock,
  name: '最近播放',
  tracks: recordSongList.value,
  trackCount: recordSongList.value.length
}))
let requestVersion = 0

const getRecordSongHandler = async () => {
  if (loading.value) return
  const version = ++requestVersion
  loading.value = true
  loadError.value = false
  try {
    const response = (await getRecordSong()) as RecentResponse
    if (version !== requestVersion) return
    if (!Array.isArray(response.data?.list)) throw new Error('Invalid recent songs response')
    recordSongList.value = response.data.list
      .filter((item) => item.data?.id)
      .map((item) => ({ ...item.data, playTime: item.playTime }))
    music.updateCurrentItem(listInfo.value)
  } catch (error) {
    if (version === requestVersion) {
      loadError.value = true
      console.error('加载最近播放失败', error)
    }
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
onBeforeUnmount(() => {
  requestVersion++
})
// 喜欢列表暂时不可用时，也应能查看播放记录。
void getLikeMusicIds().catch((error) => console.error('同步喜欢的歌曲失败', error))
void getRecordSongHandler()
</script>

<template>
  <div class="recent-page" :aria-busy="loading">
    <header class="record-song">
      <div>
        <p class="eyebrow">我的音乐</p>
        <h1>最近播放</h1>
        <p>最多保留 300 首播放记录</p>
      </div>
      <div class="record-actions">
        <span v-if="recordSongList.length" class="record-count">
          <v-icon icon="mdi-history" size="17" />{{ recordSongList.length }} 首歌曲
        </span>
        <button
          type="button"
          class="refresh-button"
          :disabled="loading"
          aria-label="刷新最近播放"
          title="刷新最近播放"
          @click="getRecordSongHandler"
        >
          <v-icon icon="mdi-refresh" size="21" />
        </button>
      </div>
    </header>
    <div
      v-if="loadError"
      :class="recordSongList.length ? 'record-error' : 'record-state'"
      role="status"
    >
      <template v-if="recordSongList.length">
        <span>刷新失败，当前保留已加载的播放记录。</span>
      </template>
      <template v-else>
        <v-icon icon="mdi-history" size="34" />
        <h2>播放记录加载失败</h2>
        <p>请检查网络连接后重试。</p>
      </template>
      <button type="button" class="retry-button" :disabled="loading" @click="getRecordSongHandler">
        {{ loading ? '正在加载…' : '重新加载' }}
      </button>
    </div>
    <p v-if="loading && recordSongList.length" class="record-loading-note" role="status">
      正在同步播放记录…
    </p>
    <div
      v-if="recordSongList.length || (loading && !loadError)"
      class="recent-songs"
      :class="{ pending: loading && recordSongList.length }"
      :inert="loading && recordSongList.length ? true : undefined"
    >
      <SongList
        @play="music.getMusicUrlHandler"
        :columns="recentColumns"
        :loading="loading && !recordSongList.length"
        :songs="music.state.songs"
        :list="recordSongList"
        :list-info="listInfo"
        :ids="ids"
      />
    </div>
    <div v-else-if="!loadError" class="record-state" role="status">
      <v-icon icon="mdi-history" size="34" />
      <h2>还没有播放记录</h2>
      <p>去听点音乐，最近播放的歌曲会显示在这里。</p>
      <button type="button" class="retry-button" @click="router.push('/home')">去推荐页</button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.record-song {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px var(--app-gutter) 20px;
  h1 {
    margin: 0 0 8px;
    color: var(--app-text);
    font-size: var(--app-title-size);
    line-height: 1.2;
    font-weight: 650;
  }
  p {
    color: var(--app-muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .eyebrow {
    margin: 0 0 6px;
    font-size: 11px;
    letter-spacing: 0.18em;
    font-weight: 600;
  }
}
.record-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.record-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-muted);
  font-size: 12px;
  white-space: nowrap;
}
.refresh-button {
  display: grid;
  place-items: center;
  width: var(--app-control-height, 36px);
  height: var(--app-control-height, 36px);
  padding: 0;
  border: 1px solid var(--app-border);
  border-radius: var(--app-control-radius, 10px);
  color: var(--app-muted);
  background: transparent;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: var(--app-text);
    background: var(--app-surface);
  }
}
.refresh-button:disabled,
.retry-button:disabled {
  opacity: 0.4;
  cursor: default;
}
.refresh-button:focus-visible,
.retry-button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.record-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 280px;
  margin: 0 var(--app-gutter);
  padding: 36px 20px;
  border-top: 1px solid var(--app-border);
  text-align: center;
  color: var(--app-muted);
  h2 {
    color: var(--app-text);
    font-size: 18px;
    font-weight: 600;
  }
  p {
    font-size: 13px;
    line-height: 1.7;
  }
  .retry-button {
    margin-top: 6px;
  }
}
.retry-button {
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid var(--app-accent-border);
  border-radius: 9px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  &:hover:not(:disabled) {
    background: var(--app-accent-soft);
  }
}
.record-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 0 var(--app-gutter) 18px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.7;
}
.record-loading-note {
  margin: 0 var(--app-gutter) 12px;
  color: var(--app-muted);
  font-size: 12px;
}
.recent-songs.pending {
  opacity: 0.5;
}
.recent-songs :deep(.song-list-container) {
  padding-top: 0;
}
@media (max-width: 600px) {
  .record-count {
    display: none;
  }
  .record-actions {
    gap: 8px;
  }
}
</style>
