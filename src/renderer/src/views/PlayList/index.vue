<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import SongInfo from '@/components/SongInfo/index.vue'
import usePlayList, { playListState } from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import { columns } from '@/views/PlayList/config'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistOrder } from '@/utils/usePlaylistOrder'

const route = useRoute()
const music = useMusicAction()
const { getPlayListDetailFn } = usePlayList()
const { canReorder, saving: savingOrder, saveOrder } = usePlaylistOrder()
const failed = ref(false)
let requestVersion = 0
const load = async () => {
  if (!route.query.id || route.path !== '/play-list') return
  const version = ++requestVersion
  failed.value = false
  try {
    await getPlayListDetailFn(Number(route.query.id), route.query.type as 'album')
  } catch (error) {
    if (version === requestVersion) failed.value = true
    console.error('加载歌曲列表失败', error)
  }
}
watch(
  () => route.fullPath,
  () => {
    if (route.query.id && route.path === '/play-list') {
      void load()
      const body = document.querySelector('.body')
      if (body) body.scrollTop = 0
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <div v-if="playListState.loading" class="info-skeleton" aria-label="正在加载详情">
    <div class="cover-skeleton"></div>
    <div class="text-skeleton"><span></span><span></span><span></span></div>
  </div>
  <section v-else-if="failed" class="list-error" role="status">
    <v-icon icon="mdi-music-note-off-outline" size="34" />
    <h1>加载失败</h1>
    <p>请检查网络连接后重试。</p>
    <button type="button" @click="load">重新加载</button>
  </section>
  <SongInfo v-else />
  <SongList
    v-if="!failed"
    @play="music.getMusicUrlHandler"
    :key="route.query.id"
    :columns="columns"
    :loading="playListState.loading"
    :songs="music.state.songs"
    :ids="playListState.ids"
    :list="playListState.playList"
    :list-info="playListState.listInfo"
    :reorderable="canReorder"
    :reorder-saving="savingOrder"
    @reorder="saveOrder"
    lazy
  />
</template>

<style lang="less" scoped>
.info-skeleton {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 24px var(--app-gutter);
}
.cover-skeleton {
  flex: 0 0 192px;
  height: 192px;
  border-radius: 14px;
  background: var(--app-surface);
}
.text-skeleton {
  flex: 1;
  min-width: 0;
  span {
    display: block;
    max-width: 420px;
    height: 24px;
    margin: 14px 0;
    border-radius: 5px;
    background: var(--app-surface);
    &:first-child {
      width: 70px;
      height: 12px;
    }
    &:last-child {
      width: 180px;
      height: 12px;
    }
  }
}
.list-error {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px var(--app-gutter);
  color: var(--app-muted);
  h1 {
    color: var(--app-text);
    font-size: 20px;
    font-weight: 600;
  }
  p {
    font-size: 13px;
  }
  button {
    padding: 8px 16px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: var(--app-surface);
    color: var(--app-text);
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 4px;
    }
  }
}
@media (max-width: 1050px), (max-height: 760px) {
  .cover-skeleton {
    flex-basis: 160px;
    height: 160px;
  }
}
@media (max-width: 600px) {
  .info-skeleton {
    gap: 18px;
  }
  .cover-skeleton {
    flex-basis: 112px;
    height: 112px;
    border-radius: 10px;
  }
}
</style>
