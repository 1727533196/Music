<script lang="ts" setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUserRecord, type GetMusicDetailData, type CurrentItem } from '@/api/musicList'
import SongList, { type Columns } from '@/components/SongList/index.vue'
import { columns as columnConfig } from './config'
import { useMusicAction } from '@/store/music'
import AccessNotice from '@/components/AccessNotice/index.vue'
import { getAccessRestriction, type AccessRestriction } from '@/utils/accessRestriction'

type Range = 'recent' | 'history'
type RecordSong = GetMusicDetailData & { playCount: number }
interface RecordResponse {
  weekData?: { song: GetMusicDetailData; playCount: number }[]
  allData?: { song: GetMusicDetailData; playCount: number }[]
}
const route = useRoute()
const router = useRouter()
const music = useMusicAction()
const columns = columnConfig as Columns[]
const tab = ref<Range>('recent')
const userId = computed(() => {
  const uid = typeof route.query.uid === 'string' ? Number(route.query.uid) : 0
  return Number.isSafeInteger(uid) && uid > 0 ? uid : 0
})
interface RecordState {
  songs: RecordSong[]
  loading: boolean
  error: boolean
  restriction: AccessRestriction | null
}
const state = reactive<Record<Range, RecordState>>({
  recent: { songs: [], loading: false, error: false, restriction: null },
  history: { songs: [], loading: false, error: false, restriction: null }
})
const versions = { recent: 0, history: 0 }
const tabs: { value: Range; label: string }[] = [
  { value: 'recent', label: '最近一周' },
  { value: 'history', label: '所有时间' }
]
const current = computed(() => state[tab.value])
const ids = computed(() => current.value.songs.map((song) => song.id))
const listInfo = computed<CurrentItem>(() => ({
  id: -(userId.value * 2 + (tab.value === 'recent' ? 1 : 0)),
  name: '听歌排行',
  coverImgUrl: '',
  userId: userId.value,
  updateTime: 0,
  createTime: 0,
  specialType: 300,
  playCount: 0,
  trackCount: current.value.songs.length,
  tags: [],
  trackIds: [],
  tracks: current.value.songs,
  creator: { nickname: '', userId: userId.value, avatarUrl: '', userType: 4, vipType: 11 },
  subscribed: false,
  ordered: false,
  subscribedCount: 0
}))
async function load(range: Range) {
  const uid = userId.value
  if (!uid || state[range].loading) return
  const version = ++versions[range]
  state[range].loading = true
  state[range].error = false
  state[range].restriction = null
  try {
    const response = (await getUserRecord(uid, range === 'recent' ? 1 : 0)) as RecordResponse
    if (version !== versions[range] || uid !== userId.value) return
    const records = response[range === 'recent' ? 'weekData' : 'allData']
    state[range].songs = Array.isArray(records)
      ? records
          .filter((item) => item.song?.id)
          .map((item) => ({ ...item.song, playCount: item.playCount }))
      : []
  } catch (error) {
    if (version === versions[range]) {
      state[range].restriction = getAccessRestriction(error)
      state[range].error = !state[range].restriction
      if (state[range].restriction) state[range].songs = []
    }
  } finally {
    if (version === versions[range]) state[range].loading = false
  }
}
watch(
  userId,
  () => {
    for (const range of ['recent', 'history'] as Range[]) {
      versions[range]++
      state[range] = { songs: [], loading: false, error: false, restriction: null }
    }
    tab.value = 'recent'
    void load('recent')
    void load('history')
  },
  { immediate: true }
)
watch(
  listInfo,
  (value) => {
    if (userId.value) music.updateCurrentItem(value)
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  versions.recent++
  versions.history++
})
</script>

<template>
  <header class="ranking-heading">
    <p>听歌记录</p>
    <h1>听歌排行</h1>
    <div class="ranking-toolbar">
      <div class="ranking-tabs" role="group" aria-label="排行时间范围">
        <button
          v-for="item in tabs"
          :key="item.value"
          type="button"
          :aria-pressed="tab === item.value"
          @click="tab = item.value"
        >
          {{ item.label }}
        </button>
      </div>
      <button
        v-if="userId"
        type="button"
        class="refresh-button"
        :disabled="current.loading"
        @click="load(tab)"
      >
        <v-icon icon="mdi-refresh" size="16" />{{ current.loading ? '刷新中…' : '刷新' }}
      </button>
    </div>
  </header>
  <section v-if="!userId" class="ranking-state" role="status">
    <v-icon icon="mdi-chart-bar" size="34" />
    <h2>无法打开听歌排行</h2>
    <p>请从个人主页重新进入。</p>
    <button type="button" @click="router.back()">返回上一页</button>
  </section>
  <template v-else>
    <AccessNotice
      v-if="current.restriction"
      :restriction="current.restriction"
      subject="该用户的听歌记录"
      :user-id="userId"
    />
    <div v-if="current.error" class="ranking-error" role="status">
      <span>{{
        current.songs.length
          ? '刷新失败，已保留当前听歌记录。'
          : '暂时无法加载听歌记录，请确认该用户已公开记录。'
      }}</span
      ><button type="button" :disabled="current.loading" @click="load(tab)">重试</button>
    </div>
    <SongList
      v-if="current.loading || current.songs.length"
      :key="`${userId}-${tab}`"
      @play="music.getMusicUrlHandler"
      :columns="columns"
      :loading="current.loading && !current.songs.length"
      :songs="music.state.songs"
      :ids="ids"
      :list="current.songs"
      :list-info="listInfo"
      :isNeedTitle="false"
      lazy
    />
    <section v-else-if="!current.restriction && !current.error" class="ranking-state" role="status">
      <v-icon icon="mdi-music-note-outline" size="34" />
      <h2>暂无公开的听歌记录</h2>
      <p>
        {{
          tab === 'recent'
            ? '最近一周还没有可展示的记录，试试查看所有时间。'
            : '该用户暂未公开记录，或还没有听歌记录。'
        }}
      </p>
    </section>
  </template>
</template>

<style lang="less" scoped>
.ranking-heading {
  padding: 26px var(--app-gutter) 0;
  p {
    margin: 0 0 6px;
    color: var(--app-muted);
    font-size: 11px;
    letter-spacing: 0.16em;
  }
  h1 {
    margin: 0 0 22px;
    color: var(--app-text);
    font-size: var(--app-title-size);
    font-weight: 650;
    line-height: 1.3;
  }
}
.ranking-tabs {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--app-border);
  border-radius: 11px;
  button {
    min-height: 30px;
    padding: 0 14px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--app-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    &[aria-pressed='true'] {
      background: var(--app-accent-soft);
      color: var(--app-accent);
      font-weight: 600;
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 4px;
    }
  }
}
.ranking-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.refresh-button,
.ranking-error button,
.ranking-state button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: var(--app-text);
    background: var(--app-surface);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.ranking-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 20px var(--app-gutter);
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.7;
  button {
    flex-shrink: 0;
    color: var(--app-accent);
  }
}
.ranking-state {
  display: flex;
  min-height: 280px;
  padding: 40px var(--app-gutter);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--app-muted);
  text-align: center;
  h2 {
    color: var(--app-text);
    font-size: 17px;
    font-weight: 550;
  }
  p {
    font-size: 12px;
    line-height: 1.7;
  }
}
</style>
