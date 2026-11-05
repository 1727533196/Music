<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMusicAction } from '@/store/music'
import usePlayList, { playListState } from '@/layout/BaseAside/usePlayList'
import SongInfo from '@/components/SongInfo/index.vue'
import SongList from '@/components/SongList/index.vue'
import { columns } from '@/views/PlayList/config'

const { getPlayListDetailFn, getRecommendSongs } = usePlayList()
const route = useRoute()
const music = useMusicAction()
const loading = ref(true)
const failed = ref(false)
const starting = ref(false)
const today = new Date()

const load = async () => {
  loading.value = true
  failed.value = false
  try {
    if (route.query.id === 'recommendSongs') {
      await getRecommendSongs()
    } else if (route.query.id) {
      await getPlayListDetailFn(Number(route.query.id))
    }
  } catch (error) {
    failed.value = true
    console.error('加载每日推荐失败', error)
  } finally {
    loading.value = false
  }
}

const playAll = async () => {
  if (loading.value || starting.value || !playListState.playList.length) return
  starting.value = true
  try {
    music.updateRuntimeList(
      { ...playListState.listInfo, tracks: playListState.playList },
      playListState.ids
    )
    await music.getMusicUrlHandler(playListState.playList[0], 0)
  } finally {
    starting.value = false
  }
}

watch(() => route.query.id, load, { immediate: true })
</script>

<template>
  <SongInfo v-if="route.query.id !== 'recommendSongs'" />
  <header v-else class="daily-heading">
    <div class="calendar" aria-hidden="true">
      <span>{{ today.getMonth() + 1 }} 月</span>
      <strong>{{ today.getDate() }}</strong>
    </div>
    <div class="daily-info">
      <p class="eyebrow">为你推荐</p>
      <h1>每日歌曲推荐</h1>
      <p class="caption">根据你的音乐口味，每天 6:00 更新</p>
      <span v-if="!loading && !failed" class="song-count">
        {{ playListState.playList.length }} 首歌曲
      </span>
    </div>
    <button
      class="play-all"
      type="button"
      :disabled="loading || failed || starting || !playListState.playList.length"
      @click="playAll"
    >
      <v-icon
        :icon="starting ? 'mdi-loading' : 'mdi-play'"
        :class="{ spinning: starting }"
        size="21"
      />
      {{ starting ? '正在播放…' : '播放全部' }}
    </button>
  </header>
  <section v-if="failed" class="daily-error" role="status">
    <v-icon icon="mdi-music-note-off-outline" size="32" />
    <h2>推荐歌曲加载失败</h2>
    <p>请检查网络连接后重试。</p>
    <button type="button" @click="load">重新加载</button>
  </section>
  <SongList
    v-else
    @play="music.getMusicUrlHandler"
    :columns="columns"
    :loading="loading"
    :songs="music.state.songs"
    :ids="playListState.ids"
    :list="playListState.playList"
    :list-info="playListState.listInfo"
  />
</template>

<style lang="less" scoped>
.daily-heading {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px var(--app-gutter) 12px;
}
.calendar {
  display: flex;
  flex: 0 0 96px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 104px;
  border: 1px solid var(--app-accent-border);
  border-radius: 14px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  span {
    font-size: 12px;
    font-weight: 550;
  }
  strong {
    font-size: 44px;
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }
}
.daily-info {
  flex: 1;
  min-width: 0;
  h1 {
    margin: 0 0 7px;
    color: var(--app-text);
    font-size: var(--app-title-size);
    font-weight: 650;
    line-height: 1.3;
  }
  .eyebrow {
    margin-bottom: 6px;
    color: var(--app-muted);
    font-size: 11px;
    letter-spacing: 0.16em;
  }
  .caption {
    color: var(--app-muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .song-count {
    display: block;
    margin-top: 8px;
    color: var(--app-muted);
    font-size: 12px;
  }
}
.play-all {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 17px;
  border: 0;
  border-radius: var(--app-control-radius);
  background: var(--app-accent);
  color: var(--app-on-accent);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 4px;
}
.daily-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 280px;
  padding: 60px var(--app-gutter);
  color: var(--app-muted);
  h2 {
    color: var(--app-text);
    font-size: 16px;
    font-weight: 600;
  }
  p {
    font-size: 13px;
  }
  button {
    padding: 8px 16px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    color: var(--app-text);
    background: var(--app-surface);
    cursor: pointer;
  }
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 650px) {
  .daily-heading {
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 22px;
  }
  .calendar {
    flex-basis: 72px;
    height: 84px;
    strong {
      font-size: 34px;
    }
  }
  .daily-info {
    flex-basis: calc(100% - 88px);
  }
  .play-all {
    margin-left: 88px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
