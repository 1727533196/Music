<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppSelect from '@/components/AppSelect/index.vue'
import type { SelectOption, SelectValue } from '@/components/AppSelect/types'
import { useLocalMusic } from '@/store/localMusic'
import { useMusicAction } from '@/store/music'
import { message } from '@/utils/message'
import { getMusicAuthCookie } from '@/utils/musicAuth'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserInfo } from '@/store'
import { useSettings } from '@/store/settings'
import { useLocalCloudUpload } from '@/store/localCloudUpload'
import type { LocalTrack } from '../../../../shared/localMusic'

type SortKey = 'default' | 'name' | 'artist' | 'album' | 'duration'
const library = useLocalMusic()
const music = useMusicAction()
const user = useUserInfo()
const settings = useSettings()
const router = useRouter()
const cloudUpload = useLocalCloudUpload()
const uploadConfirming = ref(false)
const uploadPercent = computed(() =>
  cloudUpload.state.total
    ? Math.min(100, Math.floor((cloudUpload.state.loaded / cloudUpload.state.total) * 100))
    : 0
)
const uploadLabel = computed(() => {
  if (cloudUpload.state.canceling) return '正在取消…'
  switch (cloudUpload.state.phase) {
    case 'uploading':
      return `正在上传 ${uploadPercent.value}%`
    case 'processing':
      return '文件已发送，云盘正在处理…'
    case 'success':
      return '已上传到云盘'
    case 'canceled':
      return '已取消本次请求'
    default:
      return '上传失败'
  }
})
const search = ref('')
const sort = ref<SortKey>('default')
const failedCovers = ref(new Set<string>())
const scrollArea = ref<HTMLElement>()
const scrollTop = ref(0)
const viewportHeight = ref(400)
const focusedId = ref('')
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
const rowHeight = 64
const overscan = 5
const sorts: SelectOption[] = [
  { label: '导入顺序', value: 'default' },
  { label: '歌曲名称', value: 'name' },
  { label: '歌手', value: 'artist' },
  { label: '专辑', value: 'album' },
  { label: '时长', value: 'duration' }
]
const artist = (track: LocalTrack) => track.ar.map((item) => item.name).join(' / ') || '未知歌手'
const filteredTracks = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  const tracks = library.state.tracks.filter((track) => {
    if (!query) return true
    return [track.name, artist(track), track.al.name, track.local.filePath]
      .join('\n')
      .toLocaleLowerCase()
      .includes(query)
  })
  if (sort.value !== 'default') {
    tracks.sort((a, b) => {
      if (sort.value === 'duration') return a.dt - b.dt || collator.compare(a.name, b.name)
      const field = (track: LocalTrack) =>
        sort.value === 'artist'
          ? artist(track)
          : sort.value === 'album'
            ? track.al.name
            : track.name
      return collator.compare(field(a), field(b)) || collator.compare(a.name, b.name)
    })
  }
  return tracks
})
const playableTracks = computed(() => filteredTracks.value.filter((track) => !track.local.missing))
const missingCount = computed(
  () => library.state.tracks.filter((track) => track.local.missing).length
)
const start = computed(() =>
  Math.min(
    Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan),
    Math.max(0, filteredTracks.value.length - 1)
  )
)
const visibleTracks = computed(() =>
  filteredTracks.value.slice(
    start.value,
    start.value + Math.ceil(viewportHeight.value / rowHeight) + overscan * 2
  )
)
const totalHeight = computed(() => filteredTracks.value.length * rowHeight)
const emptyTitle = computed(() =>
  search.value.trim() ? '没有找到匹配的音乐' : '把电脑里的音乐放进来'
)
let observer: ResizeObserver | undefined
let active = true

const setSort = (value: SelectValue) => {
  if (sorts.some((item) => item.value === value)) sort.value = value as SortKey
}
const resetScroll = () => {
  scrollTop.value = 0
  scrollArea.value?.scrollTo({ top: 0 })
}
watch([search, sort], resetScroll)
watch(filteredTracks, (tracks) => {
  if (!tracks.some((track) => track.id === focusedId.value)) focusedId.value = tracks[0]?.id || ''
})
watch(
  scrollArea,
  (element) => {
    observer?.disconnect()
    if (!element) return
    const measure = () => {
      viewportHeight.value = element.clientHeight
    }
    measure()
    observer = new ResizeObserver(measure)
    observer.observe(element)
  },
  { flush: 'post' }
)
onMounted(async () => {
  await library.connect()
  if (active && library.available) void library.refresh()
})
onBeforeUnmount(() => {
  active = false
  observer?.disconnect()
  library.disconnect()
})
function play(track = playableTracks.value[0]) {
  if (!track || track.local.missing) return
  void music.playLocalTracks(playableTracks.value, track.id)
}
function enqueue(track: LocalTrack) {
  if (!track.local.missing && music.enqueueLocalTrack(track)) message.success('已加入待播列表')
}
async function uploadToCloud(track: LocalTrack) {
  if (cloudUpload.busy || uploadConfirming.value || track.local.missing) return
  if (!user.isLogin || !getMusicAuthCookie()) {
    message.info('登录后即可将本地音乐上传到云盘')
    window.$login?.show()
    return
  }
  const account = user.profile.userId
  const baseURL = settings.state.baseUrl
  let destination: string
  try {
    destination = new URL(baseURL).origin
  } catch {
    message.error('请先在设置中配置有效的音乐服务地址')
    return
  }
  uploadConfirming.value = true
  try {
    await ElMessageBox.confirm(
      `将“${track.name}”经音乐服务（${destination}）上传到当前账号的网易云音乐云盘。请仅上传你有权使用的音乐；电脑中的原文件不会移动或删除。`,
      '上传到云盘',
      { confirmButtonText: '确认上传', cancelButtonText: '取消', type: 'info' }
    )
  } catch {
    return
  } finally {
    uploadConfirming.value = false
  }
  if (account !== user.profile.userId || baseURL !== settings.state.baseUrl || !user.isLogin) {
    message.info('账号或音乐服务已改变，请重新确认上传')
    return
  }
  void cloudUpload.upload(track)
}
async function remove(track: LocalTrack) {
  if (await library.remove(track.id)) {
    music.removeLocalFromQueue(track.id)
    message.success('已从资料库移除，原文件仍保留')
  }
}
function imageError(url: string) {
  failedCovers.value = new Set([...failedCovers.value, url])
}
function duration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—'
  const seconds = Math.floor(value / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
function format(track: LocalTrack) {
  const codec = track.local.format || '音频'
  return track.local.bitrate ? `${codec} · ${Math.round(track.local.bitrate / 1000)} kbps` : codec
}
async function navigateTrack(event: KeyboardEvent, index: number) {
  let target: number
  if (event.key === 'ArrowDown') target = Math.min(filteredTracks.value.length - 1, index + 1)
  else if (event.key === 'ArrowUp') target = Math.max(0, index - 1)
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = filteredTracks.value.length - 1
  else return
  event.preventDefault()
  const track = filteredTracks.value[target]
  const area = scrollArea.value
  if (!track || !area) return
  focusedId.value = track.id
  const top = target * rowHeight
  if (top < area.scrollTop) area.scrollTop = top
  else if (top + rowHeight > area.scrollTop + area.clientHeight)
    area.scrollTop = top + rowHeight - area.clientHeight
  scrollTop.value = area.scrollTop
  await nextTick()
  area
    .querySelector<HTMLButtonElement>(`[data-local-song="${CSS.escape(track.id)}"]`)
    ?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="local-page">
    <header class="local-heading">
      <div>
        <h1>本地音乐</h1>
        <p>无需登录，直接播放电脑里的音乐。</p>
      </div>
      <div class="heading-actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="!library.available || library.busy"
          @click="library.importFolder"
        >
          <v-icon icon="mdi-folder-plus-outline" size="18" /><span>添加文件夹</span>
        </button>
        <button
          class="primary-button"
          type="button"
          :disabled="!library.available || library.busy"
          @click="library.importFiles"
        >
          <v-icon icon="mdi-plus" size="18" /><span>添加音乐</span>
        </button>
      </div>
    </header>
    <section
      v-if="cloudUpload.state.id"
      class="upload-status"
      :class="{ 'upload-error': cloudUpload.state.phase === 'error' }"
      aria-label="本地音乐上传状态"
    >
      <v-icon
        :icon="
          cloudUpload.state.phase === 'success'
            ? 'mdi-cloud-check-outline'
            : 'mdi-cloud-upload-outline'
        "
        size="22"
      />
      <div class="upload-copy">
        <p role="status" aria-live="polite">
          <strong>{{ cloudUpload.state.name }}</strong> · {{ uploadLabel }}
        </p>
        <progress
          v-if="cloudUpload.busy"
          :value="cloudUpload.state.phase === 'processing' ? undefined : uploadPercent"
          max="100"
          aria-label="发送文件进度（发送完成后仍需等待云盘确认）"
        />
        <p v-if="cloudUpload.state.phase === 'error'" role="alert">{{ cloudUpload.state.error }}</p>
        <p v-else-if="cloudUpload.state.phase === 'processing'">
          请等待服务确认，暂时不要退出应用。
        </p>
        <p v-else-if="cloudUpload.state.phase === 'canceled'">
          若文件已经发送，云盘可能仍在处理，请刷新云盘确认。
        </p>
      </div>
      <button
        v-if="cloudUpload.busy"
        class="secondary-button"
        type="button"
        :disabled="cloudUpload.state.canceling"
        @click="cloudUpload.cancel"
      >
        取消
      </button>
      <button
        v-else-if="cloudUpload.state.phase === 'success'"
        class="secondary-button"
        type="button"
        @click="router.push('/cloud')"
      >
        查看云盘
      </button>
      <button v-else class="secondary-button" type="button" @click="cloudUpload.retry">重试</button>
      <button
        v-if="!cloudUpload.busy"
        class="icon-button"
        type="button"
        aria-label="关闭上传状态"
        @click="cloudUpload.clear"
      >
        <v-icon icon="mdi-close" size="18" />
      </button>
    </section>
    <div v-if="!library.available" class="local-notice" role="status">
      <v-icon icon="mdi-information-outline" size="18" />请在 Tinglan 桌面版中导入和播放本地音乐。
    </div>
    <div v-if="library.error" class="local-notice error-notice" role="alert">
      <v-icon icon="mdi-alert-circle-outline" size="18" /><span>{{ library.error }}</span>
      <button type="button" :disabled="library.busy" @click="library.refresh">重试</button>
    </div>
    <div
      v-if="library.state.scanning || library.loading"
      class="scan-status"
      role="status"
      aria-live="polite"
    >
      <v-icon icon="mdi-loading" size="17" class="spinning" /><span>{{
        library.loading ? '正在读取资料库…' : `正在扫描，已处理 ${library.state.processed} 个文件…`
      }}</span>
    </div>
    <div class="local-toolbar">
      <button
        class="primary-button play-all"
        type="button"
        :disabled="!playableTracks.length"
        @click="play()"
      >
        <v-icon icon="mdi-play" size="19" /><span>播放全部</span>
      </button>
      <span class="track-count"
        >{{ search.trim() ? `${filteredTracks.length} / ` : ''
        }}{{ library.state.tracks.length }} 首</span
      >
      <div class="toolbar-spacer" />
      <label class="local-search"
        ><v-icon icon="mdi-magnify" size="18" /><input
          v-model="search"
          type="search"
          placeholder="搜索本地音乐"
          aria-label="按歌曲、歌手、专辑或文件名搜索"
      /></label>
      <AppSelect
        class="sort-select"
        :model-value="sort"
        :options="sorts"
        aria-label="本地音乐排序"
        size="small"
        placement="bottom-end"
        @update:model-value="setSort"
      />
      <button
        class="icon-button refresh-button"
        type="button"
        :disabled="!library.available || library.busy"
        :aria-busy="library.busy"
        aria-label="刷新本地音乐"
        title="重新扫描已添加的音乐和文件夹"
        @click="library.refresh"
      >
        <v-icon icon="mdi-refresh" size="20" :class="{ spinning: library.state.scanning }" />
      </button>
    </div>
    <div v-if="library.state.folders.length || missingCount" class="library-meta">
      <details v-if="library.state.folders.length" class="folder-details">
        <summary>{{ library.state.folders.length }} 个音乐文件夹</summary>
        <ul>
          <li v-for="folder in library.state.folders" :key="folder" :title="folder">
            {{ folder }}
          </li>
        </ul>
      </details>
      <span v-if="missingCount" class="missing-summary"
        >{{ missingCount }} 首文件不存在，可重新定位</span
      >
    </div>
    <section
      v-if="filteredTracks.length"
      class="track-table"
      role="table"
      aria-label="本地歌曲列表"
      :aria-rowcount="filteredTracks.length + 1"
      :aria-busy="library.state.scanning"
    >
      <div class="track-header track-grid" role="row">
        <span role="columnheader">#</span><span role="columnheader">歌曲</span
        ><span role="columnheader" class="album-column">专辑</span
        ><span role="columnheader">时长</span
        ><span role="columnheader" class="actions-heading">操作</span>
      </div>
      <div
        ref="scrollArea"
        class="track-scroll"
        @scroll="scrollTop = ($event.target as HTMLElement).scrollTop"
      >
        <div class="virtual-space" :style="{ height: `${totalHeight}px` }" role="rowgroup">
          <div class="virtual-rows" :style="{ transform: `translateY(${start * rowHeight}px)` }">
            <div
              v-for="(track, index) in visibleTracks"
              :key="track.id"
              class="track-row track-grid"
              :class="{
                'is-playing': music.state.songs?.id === track.id,
                'is-missing': track.local.missing
              }"
              role="row"
              :aria-rowindex="start + index + 2"
              @dblclick="play(track)"
            >
              <div class="index-cell" role="cell">
                <span class="row-number" aria-hidden="true">{{ start + index + 1 }}</span
                ><button
                  class="row-play icon-button"
                  type="button"
                  :disabled="track.local.missing"
                  :aria-label="`播放 ${track.name}`"
                  tabindex="-1"
                  @click.stop="play(track)"
                >
                  <v-icon
                    :icon="music.state.songs?.id === track.id ? 'mdi-volume-high' : 'mdi-play'"
                    size="18"
                  />
                </button>
              </div>
              <div class="song-cell" role="cell">
                <span class="song-cover" aria-hidden="true"
                  ><v-icon icon="mdi-music-note" size="21" /><img
                    v-if="track.al.picUrl && !failedCovers.has(track.al.picUrl)"
                    :src="track.al.picUrl"
                    alt=""
                    loading="lazy"
                    @error="imageError(track.al.picUrl)"
                /></span>
                <div class="song-meta">
                  <button
                    class="song-title"
                    type="button"
                    :data-local-song="track.id"
                    :tabindex="focusedId === track.id ? 0 : -1"
                    :title="track.local.filePath"
                    :aria-label="
                      track.local.missing ? `${track.name}，文件不存在` : `播放 ${track.name}`
                    "
                    @focus="focusedId = track.id"
                    @click.stop="play(track)"
                    @keydown="navigateTrack($event, start + index)"
                  >
                    {{ track.name }}
                  </button>
                  <span class="song-subtitle" :title="artist(track)"
                    ><template v-if="track.local.missing"
                      ><span class="missing-label">文件不存在</span><span> · </span></template
                    >{{ artist(track)
                    }}<span class="audio-format"> · {{ format(track) }}</span></span
                  >
                </div>
              </div>
              <span class="album-column album-cell" role="cell" :title="track.al.name">{{
                track.al.name || '未知专辑'
              }}</span
              ><span class="duration-cell" role="cell">{{ duration(track.dt) }}</span>
              <div class="row-actions" role="cell" @dblclick.stop>
                <button
                  v-if="track.local.missing"
                  type="button"
                  class="relocate-button"
                  :disabled="library.busy"
                  @click.stop="library.relocate(track.id)"
                >
                  重新定位
                </button>
                <button
                  v-else
                  type="button"
                  class="icon-button"
                  :aria-label="`将 ${track.name} 加入待播列表`"
                  title="加入待播列表"
                  @click.stop="enqueue(track)"
                >
                  <v-icon icon="mdi-playlist-plus" size="19" />
                </button>
                <button
                  v-if="!track.local.missing"
                  type="button"
                  class="icon-button upload-button"
                  :disabled="!cloudUpload.available || cloudUpload.busy || uploadConfirming"
                  :aria-label="`将 ${track.name} 上传到云盘`"
                  :title="user.isLogin ? '上传到云盘' : '登录后上传到云盘'"
                  @click.stop="uploadToCloud(track)"
                >
                  <v-icon icon="mdi-cloud-upload-outline" size="19" />
                </button>
                <button
                  type="button"
                  class="icon-button remove-button"
                  :disabled="
                    library.busy || (cloudUpload.busy && cloudUpload.state.id === track.id)
                  "
                  :aria-label="`从资料库移除 ${track.name}，保留原文件`"
                  title="从资料库移除，保留原文件"
                  @click.stop="remove(track)"
                >
                  <v-icon icon="mdi-minus-circle-outline" size="18" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section v-else-if="!library.loading && !library.state.scanning" class="local-empty">
      <span class="empty-icon"
        ><v-icon :icon="search.trim() ? 'mdi-magnify' : 'mdi-folder-music-outline'" size="40"
      /></span>
      <h2>{{ emptyTitle }}</h2>
      <p>
        {{
          search.trim()
            ? '试试其他歌曲名、歌手或专辑。'
            : '添加音乐文件或文件夹，歌名、封面和同名歌词会自动读取。'
        }}
      </p>
      <button v-if="search.trim()" class="secondary-button" type="button" @click="search = ''">
        清空搜索</button
      ><button
        v-else
        class="secondary-button"
        type="button"
        :disabled="!library.available || library.busy"
        @click="library.importFolder"
      >
        选择音乐文件夹
      </button>
    </section>
    <p v-if="library.state.tracks.length" class="library-footnote">
      音乐保留在原来的位置，从资料库移除不会删除电脑里的文件。
    </p>
  </div>
</template>

<style scoped lang="less">
.local-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 440px;
  max-width: calc(var(--app-content-width, 1360px) + 2 * var(--app-gutter, 40px));
  margin: 0 auto;
  padding: 28px var(--app-gutter, clamp(20px, 3vw, 40px)) 20px;
  color: var(--app-text);
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.local-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 20px;
  margin-bottom: 24px;
}
h1 {
  margin: 0;
  font-size: var(--app-title-size, clamp(26px, 2.3vw, 32px));
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.local-heading p {
  margin: 7px 0 0;
  color: var(--app-muted);
  font-size: 13px;
}
.heading-actions,
.local-toolbar,
.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.primary-button,
.secondary-button,
.relocate-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  white-space: nowrap;
  font-size: 13px !important;
}
.primary-button {
  border-color: transparent;
  background: var(--app-accent);
  color: var(--app-on-accent);
}
.primary-button:hover:not(:disabled) {
  opacity: 0.88;
}
.secondary-button:hover:not(:disabled),
.relocate-button:hover:not(:disabled) {
  background: var(--app-hover);
}
.local-toolbar {
  flex-shrink: 0;
  margin-bottom: 16px;
  gap: 12px;
}
.toolbar-spacer {
  flex: 1;
}
.track-count {
  color: var(--app-muted);
  font-size: 12px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.local-search {
  display: flex;
  align-items: center;
  gap: 7px;
  width: min(225px, 26vw);
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  color: var(--app-muted);
  background: var(--app-surface);
}
.local-search:focus-within {
  border-color: var(--app-accent-border);
  box-shadow: 0 0 0 2px var(--app-accent-soft);
}
.local-search input {
  min-width: 0;
  width: 100%;
  outline: none;
  border: 0;
  background: transparent;
  color: var(--app-text);
  font-size: 12px;
}
.local-search input::placeholder {
  color: var(--app-muted);
}
.sort-select {
  width: 116px;
  flex-shrink: 0;
}
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--app-muted);
}
.icon-button:hover:not(:disabled) {
  background: var(--app-hover);
  color: var(--app-text);
}
.refresh-button {
  width: 34px;
  height: 34px;
}
.local-notice {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 9px;
  margin-bottom: 12px;
  padding: 11px 13px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  background: var(--app-surface);
  color: var(--app-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.local-notice span {
  flex: 1;
  overflow-wrap: anywhere;
}
.local-notice button {
  margin-left: auto;
  padding: 1px 5px;
  text-decoration: underline;
}
.error-notice {
  color: var(--app-danger-text);
}
.upload-status {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  color: var(--app-secondary);
  font-size: 12px;
}
.upload-copy {
  flex: 1;
  min-width: 0;
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  p + p {
    margin-top: 5px;
    color: var(--app-muted);
  }
  strong {
    color: var(--app-text);
    font-weight: 500;
  }
  progress {
    display: block;
    width: min(100%, 360px);
    height: 5px;
    margin-top: 8px;
    accent-color: var(--app-accent);
  }
}
.upload-error {
  color: var(--app-danger-text);
}
.scan-status {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 7px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--app-muted);
}
.spinning {
  animation: spin 1s linear infinite;
}
.library-meta {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-bottom: 10px;
  font-size: 11px;
  color: var(--app-muted);
}
.folder-details summary {
  cursor: pointer;
}
.folder-details ul {
  margin: 7px 0 3px;
  padding-left: 16px;
  max-height: 76px;
  overflow: auto;
}
.folder-details li {
  margin: 3px 0;
  overflow-wrap: anywhere;
}
.missing-summary {
  color: var(--app-warning-text);
}
.track-table {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 160px;
}
.track-grid {
  display: grid;
  grid-template-columns: 34px minmax(180px, 1fr) minmax(90px, 0.62fr) 56px 120px;
  align-items: center;
  gap: 12px;
}
.track-header {
  flex-shrink: 0;
  min-height: 34px;
  padding: 0 10px;
  border-bottom: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 11px;
}
.actions-heading {
  text-align: right;
  padding-right: 5px;
}
.track-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
.virtual-space {
  position: relative;
  width: 100%;
}
.virtual-rows {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}
.track-row {
  height: 64px;
  padding: 0 10px;
  border-radius: 8px;
}
.track-row:hover,
.track-row:focus-within {
  background: var(--app-hover);
}
.track-row.is-playing {
  background: var(--app-accent-soft);
}
.index-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  color: var(--app-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.row-play {
  position: absolute;
  inset: 0;
  margin: auto;
  opacity: 0;
}
.track-row:hover .row-play,
.track-row:focus-within .row-play,
.is-playing .row-play {
  opacity: 1;
}
.track-row:hover .row-number,
.track-row:focus-within .row-number,
.is-playing .row-number {
  opacity: 0;
}
.is-playing .row-play {
  color: var(--app-accent);
}
.song-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 11px;
}
.song-cover {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 42px;
  height: 42px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-surface-strong);
  color: var(--app-muted);
}
.song-cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.song-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}
.song-title {
  display: block;
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px !important;
  line-height: 18px;
}
.song-title:hover {
  color: var(--app-accent);
}
.song-subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--app-muted);
  font-size: 11px;
  line-height: 15px;
}
.is-missing .song-title {
  color: var(--app-muted);
}
.missing-label {
  color: var(--app-warning-text);
}
.album-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--app-muted);
  font-size: 12px;
}
.duration-cell {
  color: var(--app-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.row-actions {
  justify-content: flex-end;
  gap: 5px;
}
.relocate-button {
  min-height: 28px;
  padding: 0 6px;
  border-color: transparent;
  color: var(--app-warning-text);
  font-size: 11px !important;
}
.remove-button:hover:not(:disabled) {
  color: var(--app-danger-text);
  background: var(--app-danger-soft);
}
.local-empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 30px 16px;
  text-align: center;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  margin-bottom: 20px;
  border: 1px solid var(--app-border);
  border-radius: 21px;
  background: var(--app-surface);
  color: var(--app-muted);
}
.local-empty h2 {
  margin: 0 0 9px;
  font-size: 19px;
  font-weight: 600;
}
.local-empty p {
  margin: 0 0 22px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.8;
}
.library-footnote {
  flex-shrink: 0;
  margin: 12px 0 0;
  color: var(--app-muted);
  font-size: 10px;
  line-height: 1.6;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 850px) {
  .track-grid {
    grid-template-columns: 30px minmax(160px, 1fr) 50px 120px;
    gap: 9px;
  }
  .album-column {
    display: none;
  }
  .local-toolbar {
    gap: 8px;
  }
}
@media (max-width: 640px) {
  .local-page {
    padding-inline: 18px;
  }
  .local-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }
  .local-toolbar {
    flex-wrap: wrap;
  }
  .toolbar-spacer {
    display: none;
  }
  .local-search {
    margin-left: auto;
    width: 175px;
  }
  .sort-select {
    margin-left: auto;
  }
  .track-grid {
    grid-template-columns: minmax(150px, 1fr) 45px 100px;
    gap: 8px;
  }
  .index-cell,
  .track-header > :first-child {
    display: none;
  }
  .audio-format {
    display: none;
  }
  .track-row {
    padding-inline: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
