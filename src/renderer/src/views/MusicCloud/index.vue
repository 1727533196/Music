<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useMusicAction } from '@/store/music'
import { getUserCloud } from '@/api/musicList'
import type { GetMusicDetailData, PlayList } from '@/api/musicList'
import { columns } from './config'
import SongList from '@/components/SongList/index.vue'

const music = useMusicAction()
const state = reactive({
  loading: false,
  ids: [] as number[],
  list: [] as GetMusicDetailData[],
  total: 0,
  page: 1,
  limit: 100
})
const cloudListInfo = computed(
  () => ({ id: `cloud-songs-${state.page}`, name: '音乐云盘' }) as unknown as PlayList
)
const loadError = ref(false)
const requestedPage = ref(1)
let requestVersion = 0

async function getUserCloudFn(page = state.page) {
  if (state.loading) return
  const version = ++requestVersion
  requestedPage.value = page
  state.loading = true
  loadError.value = false
  try {
    const { data, count } = await getUserCloud(state.limit, (page - 1) * state.limit)
    if (version !== requestVersion) return
    if (!Array.isArray(data)) throw new Error('Invalid cloud response')
    const list = data.map(({ simpleSong, ...cloudSong }) => ({
      ...simpleSong,
      ...cloudSong,
      id: simpleSong?.id || cloudSong.songId
    }))
    const pageChanged = page !== state.page
    state.list = list
    state.ids = list.map((item) => item.id)
    state.total = Number(count) || 0
    state.page = page
    music.updateCurrentItem({ ...cloudListInfo.value, tracks: list })
    if (pageChanged) document.querySelector('.body')?.scrollTo({ top: 0 })
  } catch (error) {
    if (version === requestVersion) loadError.value = true
    console.error('加载音乐云盘失败', error)
  } finally {
    if (version === requestVersion) state.loading = false
  }
}

const currentChange = (page: number) => void getUserCloudFn(page)
onBeforeUnmount(() => {
  requestVersion++
})
void getUserCloudFn()
</script>

<template>
  <div class="cloud-page" :aria-busy="state.loading">
    <header class="cloud-heading">
      <div>
        <p class="eyebrow">我的音乐</p>
        <h1>音乐云盘</h1>
        <p class="heading-caption">收藏在云端的音乐，随时重听。</p>
      </div>
      <div class="heading-actions">
        <span class="cloud-count">{{ state.total }} 首歌曲</span>
        <button
          class="refresh-button"
          :disabled="state.loading"
          title="刷新音乐云盘"
          aria-label="刷新音乐云盘"
          @click="getUserCloudFn(state.page)"
        >
          <v-icon icon="mdi-refresh" size="21" :class="{ spinning: state.loading }" />
        </button>
      </div>
    </header>

    <div v-if="state.loading && !state.list.length" class="cloud-state" role="status">
      <v-icon icon="mdi-loading" size="32" class="spinning" />
      <h2>正在加载音乐云盘</h2>
      <p>稍等片刻，你的歌曲即将出现。</p>
    </div>
    <template v-else>
      <div
        v-if="loadError"
        :class="state.list.length ? 'cloud-error' : 'cloud-state'"
        role="status"
      >
        <template v-if="state.list.length">
          <span>第 {{ requestedPage }} 页加载失败，当前保留第 {{ state.page }} 页的歌曲。</span>
          <button class="retry-button" @click="getUserCloudFn(requestedPage)">重新加载</button>
        </template>
        <template v-else>
          <v-icon icon="mdi-cloud-alert-outline" size="35" />
          <h2>音乐云盘加载失败</h2>
          <p>请检查网络连接后重试。</p>
          <button class="retry-button" @click="getUserCloudFn(requestedPage)">重新加载</button>
        </template>
      </div>
      <template v-if="state.list.length">
        <p v-if="state.loading" class="cloud-loading-note" role="status">
          正在加载第 {{ requestedPage }} 页…
        </p>
        <div
          class="cloud-songs"
          :class="{ pending: state.loading }"
          :inert="state.loading || undefined"
        >
          <SongList
            @play="music.getMusicUrlHandler"
            @current-change="currentChange"
            is-paging
            :songs="music.state.songs"
            :columns="columns"
            :loading="false"
            :ids="state.ids"
            :list="state.list"
            :list-info="cloudListInfo"
            :page-size="state.limit"
            :total="state.total"
            :current-page="state.page"
          />
        </div>
      </template>
      <div v-else-if="!loadError" class="cloud-state">
        <v-icon icon="mdi-cloud-music-outline" size="36" />
        <h2>{{ state.total ? '本页暂无歌曲' : '还没有云盘歌曲' }}</h2>
        <p>
          {{
            state.total
              ? '歌曲可能已发生变化，回到第一页看看。'
              : '在网易云音乐上传到云盘的歌曲，会显示在这里。'
          }}
        </p>
        <button v-if="state.total" class="retry-button" @click="getUserCloudFn(1)">
          回到第一页
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
.cloud-page {
  width: 100%;
  color: #f2eff5;
  padding-bottom: 40px;
  button {
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
    opacity: 0.45;
  }
  button:focus-visible {
    outline: 2px solid #e8bdd1;
    outline-offset: 4px;
  }
}
.cloud-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px var(--app-gutter, 32px) 26px;
}
.eyebrow {
  margin: 0 0 8px;
  color: #a19aaa;
  letter-spacing: 0.18em;
  font-size: 11px;
  font-weight: 600;
}
h1 {
  font-size: 32px;
  line-height: 1.2;
  font-weight: 650;
  margin: 0;
  letter-spacing: -0.04em;
}
.heading-caption {
  margin: 10px 0 0;
  color: #a19aaa;
  font-size: 13px;
}
.heading-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.cloud-count {
  font-size: 12px;
  color: #a19aaa;
  white-space: nowrap;
}
.refresh-button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid #ffffff16;
  background: transparent;
  color: #a19aaa;
  &:hover {
    color: #f2eff5;
    background: #ffffff08;
  }
}
.cloud-state {
  min-height: 330px;
  margin: 0 var(--app-gutter, 32px);
  border-top: 1px solid #ffffff0d;
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #a19aaa;
  h2 {
    font-size: 19px;
    font-weight: 600;
    color: #f2eff5;
    margin: 17px 0 9px;
  }
  p {
    font-size: 13px;
    line-height: 1.8;
    margin: 0;
  }
  .retry-button {
    margin-top: 22px;
  }
}
.retry-button {
  border: 1px solid #e8bdd126;
  border-radius: 7px;
  background: #e8bdd10a;
  color: #e8bdd1;
  font-size: 13px !important;
  padding: 8px 13px;
  white-space: nowrap;
  &:hover {
    background: #e8bdd116;
  }
}
.cloud-error {
  margin: 0 var(--app-gutter, 32px) 20px;
  padding: 13px 16px;
  border: 1px solid #e8bdd119;
  background: #e8bdd109;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #c6b8c3;
  font-size: 13px;
}
.cloud-loading-note {
  margin: 0 var(--app-gutter, 32px) 12px;
  font-size: 12px;
  color: #a19aaa;
}
.cloud-songs {
  :deep(.song-list-container) {
    padding: 0 var(--app-gutter, 32px);
  }
  &.pending {
    opacity: 0.5;
  }
}
.spinning {
  animation: cloud-spin 1s linear infinite;
}
@keyframes cloud-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 650px) {
  .cloud-heading {
    gap: 12px;
    padding-top: 22px;
  }
  .heading-actions {
    gap: 10px;
  }
  .cloud-count {
    display: none;
  }
  .cloud-error {
    align-items: flex-start;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
