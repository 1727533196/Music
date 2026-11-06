<script setup lang="ts">
import { computed, h, nextTick, ref, TransitionGroup, useId, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { lookup } from '@/utils'
import { GetMusicDetailData, PlayList } from '@/api/musicList'
import { useUserInfo } from '@/store'
import useMusic from '@/components/MusicPlayer/useMusic'
import { useMusicAction } from '@/store/music'
import Pagination from '@/components/Pagination/index.vue'
import NotFound from '@/assets/not-found.png'
import ContextMenu from '@/components/ContextMenu/index.vue'
import { checkMusic, deleteSong } from '@/api/play'
import { message } from '@/utils/message'
import { getUserPlayListFn } from '@/utils/userInfo'
import { getSongCommentLabel, loadSongCommentCount } from '@/utils/songComments'
import CorrectSongDialog from './CorrectSongDialog.vue'
import CollectionDialog from './CollectionDialog.vue'
import CopyrightDialog from './components/CopyrightDialog.vue'
import { useSongReorder } from './useSongReorder'

export interface Columns {
  title: string
  hidden?: boolean
  picUrl?: string
  icon?: string[]
  prop?: string
  on?: object
  style?: CSSProperties
  width?: string
  type?: 'index' | 'handle' | 'title' | 'album'
  class?: string
  processEl?: (createVNode: typeof h, arg: any, index: number) => any
}

const playlistMenuItems = (song: GetMusicDetailData) => {
  const result = [
    { label: '添加歌曲', value: 'collection' },
    { label: getSongCommentLabel(song.id), value: 'comment' },
    { label: '删除歌曲', value: 'delete' }
  ]
  if (song?.pc?.privateCloud || ['/cloud'].includes(route.path)) {
    result.push({ label: '纠正信息', value: 'correct' })
  }
  return result.map((item) => ({
    ...item,
    disabled: props.reorderSaving && ['collection', 'delete', 'correct'].includes(item.value)
  }))
}
interface Props {
  list: GetMusicDetailData[]
  songs: GetMusicDetailData
  columns: Columns[]
  loading?: boolean
  ids?: number[]
  listInfo?: PlayList | any
  scroll?: boolean
  isPaging?: boolean
  total?: number
  pageSize?: number
  currentPage?: number
  isLoadingEndflyback?: boolean
  lazy?: boolean
  isNeedTitle?: boolean
  isSearch?: boolean
  reorderable?: boolean
  reorderSaving?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  listInfo: {},
  isSearch: true,
  isPaging: true,
  pageSize: 50,
  currentPage: 1,
  isLoadingEndflyback: false,
  lazy: true,
  isNeedTitle: true
})
const emit = defineEmits(['play', 'current-change', 'update:modelValue', 'reorder'])

const isSecondaryColumn = (column: Columns) =>
  !['index', 'title', 'handle'].includes(column.type || '') &&
  !['empty', 'title', 'album', 'handle', 'time'].includes(column.class || '')
const gridColumns = (mode: 'full' | 'compact' | 'narrow') =>
  props.columns
    .filter(
      (column) =>
        !column.hidden &&
        (mode === 'full' || !isSecondaryColumn(column)) &&
        (mode !== 'narrow' || column.class !== 'album')
    )
    .map((column) => {
      if (column.type === 'index') return mode === 'narrow' ? '28px' : '36px'
      if (column.type === 'handle') return '36px'
      if (column.class === 'time') return column.width?.endsWith('px') ? column.width : '72px'
      if (column.width?.endsWith('%')) return `minmax(0, ${parseFloat(column.width)}fr)`
      return column.width || 'minmax(0, 1fr)'
    })
    .join(' ')
const tableStyle = computed(() => ({
  '--song-columns': gridColumns('full'),
  '--song-columns-compact': gridColumns('compact'),
  '--song-columns-narrow': gridColumns('narrow')
}))

const store = useUserInfo()
const music = useMusicAction()
const { likeMusic, deleteSongHandler } = useMusic()
const router = useRouter()
const route = useRoute()

const id = ref(0)
const filterList = ref(props.list)
const copyrightVisible = ref(false)
const searchKeyword = ref('')
const collectionDialogVisible = ref(false)
const collectionLoading = ref(false)
const correctDialogVisible = ref(false)
const currentMenuSongItem = ref<null | GetMusicDetailData>(null)
const sortableList = ref<HTMLElement | { $el: HTMLElement }>()
const songMenu = ref<{ showMenu: (event: MouseEvent) => Promise<void> }>()
const getListElement = () => {
  const list = sortableList.value
  return list instanceof HTMLElement ? list : list?.$el ?? null
}
const activeMenuItems = computed(() =>
  currentMenuSongItem.value ? playlistMenuItems(currentMenuSongItem.value) : []
)
const loadingListHeight = ref(0)
const loadingRowCount = ref(7)
const reorderHelpId = useId()
const reorderListId = useId()
const reorderMode = ref(false)
const reorderIds = computed(() => props.list.map((song) => song.id))
let reorderFocusId: number | null = null
const canDrag = computed(
  () =>
    props.reorderable &&
    reorderMode.value &&
    !props.reorderSaving &&
    !props.loading &&
    !searchKeyword.value.trim()
)
const {
  draggingId,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  cancelDrag,
  moveBy,
  onPointerDown
} = useSongReorder({
  getIds: () => reorderIds.value,
  enabled: () => !!canDrag.value,
  getContainer: getListElement,
  onReorder: (ids) => emit('reorder', ids)
})

function onReorderKey(songId: number, direction: -1 | 1): void {
  if (moveBy(songId, direction)) reorderFocusId = songId
}

function toggleReorderMode(): void {
  if (props.reorderSaving) return
  reorderMode.value = !reorderMode.value
  reorderFocusId = null
}

watch([() => props.reorderable, () => props.listInfo?.id], () => {
  reorderMode.value = false
  reorderFocusId = null
})

watch(
  () => props.reorderSaving,
  async (saving) => {
    if (saving || reorderFocusId === null) return
    const songId = reorderFocusId
    reorderFocusId = null
    await nextTick()
    const row = getListElement()?.querySelector<HTMLElement>(`[data-song-id="${songId}"] .list`)
    if (row && (document.activeElement === document.body || document.activeElement === row)) {
      row.focus({ preventScroll: true })
      row.scrollIntoView({ block: 'nearest' })
    }
  }
)

const formatCount = (index: number) => {
  return index.toString().length > 1 ? index : '0' + index
}

const handlePlaylistMenuSelect = (item: { label: string; value: string }, row, index) => {
  if (props.reorderSaving && ['collection', 'delete', 'correct'].includes(item.value)) return
  switch (item.value) {
    case 'collection':
      collectionDialogVisible.value = true
      currentMenuSongItem.value = row
      break
    case 'delete':
      deleteSongHandler(row.id, props.listInfo.id, index)
      break
    case 'comment':
      router.push({
        path: '/comment',
        query: {
          id: row.id
        }
      })
      break
    case 'correct':
      currentMenuSongItem.value = row
      correctDialogVisible.value = true
      break
  }
}

const openSongMenu = (event: MouseEvent) => {
  const row = (event.target as Element).closest<HTMLElement>('.song-sort-row')
  if (!row) return
  const song = filterList.value.find((item) => item.id === Number(row.dataset.songId))
  if (!song) return
  currentMenuSongItem.value = song
  void loadSongCommentCount(song.id)
  void songMenu.value?.showMenu(event)
}
const selectSongMenu = (item: { label: string; value: string }) => {
  const song = currentMenuSongItem.value
  if (!song) return
  const index = filterList.value.findIndex((row) => row.id === song.id)
  if (index >= 0) handlePlaylistMenuSelect(item, song, index)
}

const hideFailedArtwork = (event: Event) => {
  ;(event.target as HTMLImageElement).style.visibility = 'hidden'
}
const showLoadedArtwork = (event: Event) => {
  ;(event.target as HTMLImageElement).style.visibility = ''
}

const playHandler = async (item: GetMusicDetailData, index: number) => {
  const { success } = await checkMusic(item.id)
  if (success === false) {
    copyrightVisible.value = true
    return
  }

  if (music.state.runtimeList?.id === music.state.currentItem?.id) {
    if (window.$audio.isPlay && props.songs.id === item.id) {
      return
    }
    if (!window.$audio.isPlay && props.songs.id === item.id) {
      return window.$audio.play()
    }
  }

  id.value = item.id
  emit('play', item, index)

  if (music.state.runtimeList?.id !== music.state.currentItem?.id && props.ids && props.listInfo) {
    music.updateRuntimeList({ tracks: props.list, ...props.listInfo }, props.ids)
  }
}

const mousedownHandler = (item: GetMusicDetailData) => {
  id.value = item.id
}

const isLike = (item: GetMusicDetailData) => {
  return store.userLikeIds.includes(item.id)
}

const activeText = (item: GetMusicDetailData) =>
  item.id !== undefined && item.id === props.songs?.id

const singerDetail = (id: number) => {
  router.push(`/singer-page?id=${id}`)
}

const closeCopyrightVisible = () => {
  copyrightVisible.value = false
}

const handleSearch = (val: string) => {
  searchKeyword.value = val
  if (!val.trim().length) {
    filterList.value = props.list
  } else {
    filterList.value = props.list.filter((item) => {
      const alName = item.al?.name || ' '
      const keywords = [item.name?.toLowerCase(), alName.toLowerCase()]
      item.ar?.forEach((a) => {
        if (a.name) {
          keywords.push(a.name.toLowerCase())
        }
      })
      return keywords.some((keyword) => keyword.includes(val?.toLowerCase()))
    })
  }
}

watch(
  () => props.loading,
  (val) => {
    // 在旧列表卸载前记录实际高度，翻页等待时保留分页栏的位置。
    const list = val && props.isPaging && props.total ? getListElement() : null
    loadingListHeight.value = list?.getBoundingClientRect().height || 0
    loadingRowCount.value = list?.children.length || 7
    if (props.isLoadingEndflyback && val) {
      document.querySelector('.main')!.scrollTop = 0
    }
  },
  { flush: 'pre' }
)
const itemRefs = ref<Record<number, HTMLDivElement>>({})
const setItemRef = (el: any, id: number) => {
  if (el) {
    itemRefs.value[id] = el.$el || el
  }
}
watch(
  () => props.loading,
  async (value) => {
    if (!value && route.query.position && music.state.searchList.length > 0) {
      const target = music.state.searchList.find((item) =>
        props.list.find((listItem) => item.id === listItem.id)
      )
      console.log('target', target)

      if (target) {
        nextTick(() => {
          const targetEl = itemRefs.value[target.id]
          targetEl.classList.add('position-target')
          const scrollEl = document.querySelector('.body')
          if (targetEl && scrollEl) {
            scrollEl.scrollTo({
              top: targetEl.getBoundingClientRect().top - scrollEl.clientHeight / 2.35,
              behavior: 'smooth'
            })
            const highlightColor = getComputedStyle(targetEl).getPropertyValue('--app-hover').trim()
            targetEl.style.backgroundColor = highlightColor
            targetEl
              .animate([{ backgroundColor: highlightColor }, { backgroundColor: 'transparent' }], {
                duration: 1300,
                easing: 'ease-in-out',
                delay: 3000
              })
              .finished.then(() => {
                targetEl.style.backgroundColor = ''
              })
          }
        })
      }
    }
  },
  {
    immediate: true
  }
)

watch(
  () => props.list,
  () => handleSearch(searchKeyword.value)
)

const menuList = computed(() => {
  console.log(
    'store.userPlayListInfo',
    store.userPlayListInfo.filter((item) => !item.subscribed)
  )
  return store.userPlayListInfo.filter((item) => !item.subscribed)
})

const collectionHandler = async (menu: { id: number }) => {
  if (collectionLoading.value) return
  const songId = currentMenuSongItem.value?.id
  if (!songId || !menu.id) {
    message.warning('请重新选择要添加的歌曲和歌单')
    return
  }
  collectionLoading.value = true
  try {
    await deleteSong('add', menu.id, songId)
    collectionDialogVisible.value = false
    message.success('添加成功')
    void getUserPlayListFn().catch(() => {})
  } catch {
    // 请求层显示错误，保留选择以便重试。
  } finally {
    collectionLoading.value = false
  }
}

const handleCollectionConfirm = (playlist: { id: number }) => {
  void collectionHandler(playlist)
}
</script>

<template>
  <!-- 收藏到歌单对话框 -->
  <CollectionDialog
    v-model="collectionDialogVisible"
    :playlist="menuList"
    :loading="collectionLoading"
    @confirm="handleCollectionConfirm"
  />

  <CorrectSongDialog
    v-model="correctDialogVisible"
    :song-data="currentMenuSongItem"
    :userId="store.profile.userId!"
  />
  <ContextMenu ref="songMenu" :items="activeMenuItems" @select="selectSongMenu" />

  <div
    class="song-list-container"
    :style="{ ...tableStyle, overflowY: scroll ? 'auto' : 'visible' }"
    :aria-busy="loading || reorderSaving"
    :class="{
      'is-reorderable': reorderable && reorderMode,
      'is-reordering': draggingId !== null
    }"
  >
    <!-- 搜索框 -->
    <div
      v-if="isSearch || reorderable"
      class="search-container"
      :style="{ visibility: loading ? 'hidden' : undefined }"
    >
      <VTextField
        v-if="isSearch"
        density="compact"
        :placeholder="isPaging && (total || 0) > pageSize ? '搜索本页歌曲' : '搜索此列表歌曲'"
        aria-label="搜索此列表歌曲"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        :max-width="320"
        hide-details
        base-color="var(--app-muted)"
        color="var(--app-accent)"
        v-model="searchKeyword"
        @update:modelValue="handleSearch"
      />
      <span v-if="isSearch && searchKeyword.trim()" class="search-count" role="status">
        {{ filterList.length }} 首匹配
      </span>
      <div v-if="reorderable" class="reorder-controls">
        <span
          v-if="reorderMode || searchKeyword.trim()"
          :id="reorderHelpId"
          class="reorder-hint"
          role="status"
        >
          {{
            reorderSaving
              ? '正在保存顺序…'
              : searchKeyword.trim()
                ? '清空搜索后可排序'
                : '拖动歌曲行，松开自动保存'
          }}
        </span>
        <button
          type="button"
          class="reorder-toggle"
          :class="{ active: reorderMode }"
          :aria-pressed="reorderMode"
          :aria-controls="reorderListId"
          :disabled="reorderSaving || (!reorderMode && !!searchKeyword.trim())"
          :title="!reorderMode && searchKeyword.trim() ? '清空搜索后可排序' : undefined"
          @click="toggleReorderMode"
        >
          <v-icon
            :icon="reorderSaving ? 'mdi-loading' : reorderMode ? 'mdi-check' : 'mdi-sort-variant'"
            :class="{ 'reorder-spinner': reorderSaving }"
            size="16"
            aria-hidden="true"
          />
          {{ reorderSaving ? '保存中…' : reorderMode ? '完成排序' : '调整顺序' }}
        </button>
      </div>
    </div>

    <!-- 版权提示对话框 -->
    <CopyrightDialog v-model="copyrightVisible" @confirm="closeCopyrightVisible" />

    <!-- 主要内容 -->
    <template v-if="loading || filterList.length">
      <!-- 标题行 -->
      <div
        v-if="isNeedTitle"
        class="title-container"
        :style="{ visibility: loading ? 'hidden' : undefined }"
      >
        <div
          v-for="config in columns"
          v-show="!config.hidden"
          :key="config.title"
          class="title-item"
          :class="[config.class, { 'secondary-column': isSecondaryColumn(config) }]"
          :style="config.style"
        >
          {{ config.title }}
        </div>
      </div>

      <!-- 加载时卸载列表，避免排序过渡记录隐藏行的 (0, 0) 位置 -->
      <component
        :is="reorderMode ? TransitionGroup : 'div'"
        v-if="!loading"
        ref="sortableList"
        :name="reorderMode ? 'song-reorder' : undefined"
        :tag="reorderMode ? 'div' : undefined"
        class="list-container"
        :id="reorderListId"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @contextmenu="openSongMenu"
      >
        <div
          v-for="(data, i) in filterList"
          :key="data.id"
          class="song-sort-row"
          :class="{
            'is-dragging': draggingId === data.id,
            'drop-before': dropPosition(i) === 'before',
            'drop-after': dropPosition(i) === 'after'
          }"
          :data-song-id="data.id"
        >
          <div
            class="list"
            :ref="(el) => setItemRef(el, data.id)"
            :class="{
              'disable-list': (data.privilege?.st ?? 0) < 0,
              'is-playing': activeText(data),
              'can-drag': canDrag
            }"
            :draggable="canDrag"
            :tabindex="canDrag ? 0 : undefined"
            :aria-label="
              reorderable && reorderMode
                ? `调整 ${data.name} 的顺序，当前第 ${i + 1} 首`
                : undefined
            "
            :aria-describedby="reorderable && reorderMode ? reorderHelpId : undefined"
            :aria-keyshortcuts="canDrag ? 'Alt+ArrowUp Alt+ArrowDown' : undefined"
            @pointerdown.capture="onPointerDown"
            @dragstart.stop="onDragStart($event, data.id)"
            @dragend="cancelDrag"
            @keydown.alt.up.self.prevent.stop="onReorderKey(data.id, -1)"
            @keydown.alt.down.self.prevent.stop="onReorderKey(data.id, 1)"
            @dblclick="() => playHandler(data, i)"
            @mousedown="() => mousedownHandler(data)"
          >
            <div
              v-for="config in columns"
              v-show="!config.hidden"
              :key="config.title"
              class="item"
              :class="[config.class, { 'secondary-column': isSecondaryColumn(config) }]"
              :style="config.style"
            >
              <template v-if="config.processEl">
                <!-- 自定义处理元素 -->
                <component :is="h('div', config.processEl(h, data, i))" />
              </template>
              <template v-else-if="config.icon">
                <!-- 图标处理 -->
                <button
                  v-for="val in config.icon"
                  :key="val"
                  type="button"
                  class="row-favorite"
                  :class="{ liked: isLike(data) }"
                  :aria-label="isLike(data) ? `取消喜欢 ${data.name}` : `喜欢 ${data.name}`"
                  :aria-pressed="isLike(data)"
                  :disabled="reorderSaving"
                  @click="$event.detail < 2 && val === 'love' && likeMusic(data.id, !isLike(data))"
                  @dblclick.stop
                >
                  <v-icon :icon="isLike(data) ? 'mdi-star' : 'mdi-star-outline'" size="19" />
                </button>
              </template>
              <template v-else-if="!config.type && config.prop">
                <!-- 普通属性 -->
                {{ lookup(data, config.prop) }}
              </template>
              <template v-else-if="config.type === 'index'">
                <!-- 索引 -->
                <span class="row-number">{{
                  formatCount(isPaging ? pageSize * (currentPage - 1) + (i + 1) : i + 1)
                }}</span>
              </template>
              <template v-else-if="config.type === 'title'">
                <!-- 歌曲标题 -->
                <div class="title-box">
                  <button
                    type="button"
                    class="song-artwork"
                    :aria-label="`播放 ${data.name}`"
                    @click.stop="$event.detail < 2 && playHandler(data, i)"
                    @dblclick.stop
                  >
                    <v-icon icon="mdi-music-note" size="21" class="artwork-placeholder" />
                    <img
                      v-if="config.picUrl && lookup(data, config.picUrl)"
                      :src="lookup(data, config.picUrl) + '?param=150y150'"
                      class="pic-url"
                      width="44"
                      height="44"
                      loading="lazy"
                      decoding="async"
                      alt=""
                      @error="hideFailedArtwork"
                      @load="showLoadedArtwork"
                    />
                    <span class="artwork-play"><v-icon icon="mdi-play" size="23" /></span>
                  </button>
                  <div class="name-box">
                    <div class="song-title" :title="data.name">
                      {{ lookup(data, config.prop) }}
                    </div>
                    <div class="name-container">
                      <div class="tag-box">
                        <span v-if="data.fee === 1" class="song-tag vip-tag">VIP</span>
                        <span v-if="data?.pc?.privateCloud" class="song-tag">云盘</span>
                      </div>
                      <div class="ar-box">
                        <template v-if="!data.ar">
                          {{ data.artist }}
                        </template>
                        <template v-else>
                          <span
                            v-for="(ar, index) in data.ar"
                            :key="ar.id || index"
                            class="ar"
                            :style="{
                              cursor: ar.id ? 'pointer' : 'default'
                            }"
                            :data-no-reorder="ar.id ? '' : undefined"
                            @click="ar.id && singerDetail(ar.id)"
                          >
                            {{ ar.name || data.artist || '未知艺人' }}
                            <span v-if="index < data.ar.length - 1" class="artist-divider">
                              /
                            </span>
                          </span>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else-if="config.type === 'album'">
                <!-- 专辑 -->
                {{ lookup(data, config.prop) || '未知专辑' }}
              </template>
            </div>
          </div>
        </div>
      </component>
      <div
        v-else
        class="loading"
        :style="{ minHeight: loadingListHeight ? `${loadingListHeight}px` : undefined }"
        role="status"
        aria-label="正在加载歌曲"
      >
        <div v-for="row in loadingRowCount" :key="row" class="song-skeleton" aria-hidden="true">
          <span class="skeleton-cover" /><span class="skeleton-lines"><i /><i /></span>
          <span class="skeleton-album" />
        </div>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-content">
        <div class="empty-icon-wrapper">
          <v-icon
            :icon="searchKeyword.trim() ? 'mdi-magnify' : 'mdi-music-note-outline'"
            size="32"
            class="empty-icon"
          />
        </div>
        <div class="empty-text">
          <div class="empty-title">{{ searchKeyword.trim() ? '未找到相关歌曲' : '暂无歌曲' }}</div>
          <div class="empty-desc">
            {{ searchKeyword.trim() ? '换个关键词，或清空搜索再看看。' : '此列表还没有歌曲。' }}
          </div>
        </div>
        <button
          v-if="searchKeyword.trim()"
          type="button"
          class="clear-search"
          @click="handleSearch('')"
        >
          清空搜索
        </button>
      </div>
    </div>

    <!-- 分页 -->
    <Pagination
      v-if="isPaging && total"
      background
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="(page) => $emit('current-change', page)"
    />
  </div>
</template>

<style lang="less" scoped>
:deep(.v-overlay__scrim) {
  background-color: rgba(0, 0, 0, 1) !important;
}
.position-target {
}

// 空状态样式
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 32px 20px;

  .empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;

    .empty-icon-wrapper {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-surface, #ffffff09);
      border-radius: 18px;
      border: 1px solid var(--app-border, #ffffff14);

      .empty-icon {
        color: var(--app-muted, #9399a2);
      }
    }

    .empty-text {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .empty-title {
        font-size: 19px;
        font-weight: 600;
        color: var(--app-text, #f2f3f5);
      }

      .empty-desc {
        font-size: 13px;
        color: var(--app-muted, #9399a2);
        line-height: 1.8;
      }
    }
  }
}
.clear-search {
  height: var(--app-control-height, 36px);
  padding: 0 14px;
  border: 1px solid var(--app-border, #ffffff14);
  border-radius: var(--app-control-radius, 10px);
  color: var(--app-accent, #fff);
  background: var(--app-surface, #ffffff09);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  &:hover {
    background: var(--app-hover);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent, #fff);
    outline-offset: 3px;
  }
}
.song-list-container {
  flex: 1;
  min-width: 0;
  container-type: inline-size;
  position: relative;
  padding: 16px var(--app-gutter, 32px) 24px;
  .search-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
    justify-content: start;
    margin-bottom: 16px;
    :deep(.v-input) {
      width: 100%;
      max-width: 320px;
    }
    :deep(.v-field) {
      height: var(--app-control-height, 36px);
      min-height: var(--app-control-height, 36px);
      border: 1px solid var(--app-border, #ffffff14);
      border-radius: var(--app-control-radius, 10px);
      background: var(--app-surface, #ffffff09);
      box-shadow: none;
      padding-inline: 11px;
      --v-input-control-height: var(--app-control-height, 36px);
      --v-field-input-padding-top: 0px;
      --v-field-input-padding-bottom: 0px;
      --v-field-padding-start: 0px;
      --v-field-padding-end: 0px;
      &:focus-within {
        border-color: var(--app-accent-border);
        box-shadow: 0 0 0 2px var(--app-accent-soft);
      }
    }
    :deep(.v-field__outline) {
      display: none;
    }
    :deep(.v-field__field) {
      align-items: center;
    }
    :deep(.v-field__input) {
      min-height: 0;
      padding-block: 0;
      font-size: 13px;
    }
    :deep(.v-field__prepend-inner) {
      padding-top: 0;
      align-items: center;
      .v-icon {
        font-size: 19px;
      }
    }
  }
  .search-count {
    flex-shrink: 0;
    color: var(--app-muted);
    font-size: 12px;
  }
  .reorder-controls {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-left: auto;
  }
  .reorder-hint {
    color: var(--app-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .reorder-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex-shrink: 0;
    height: var(--app-control-height, 36px);
    padding: 0 12px;
    border: 1px solid var(--app-border);
    border-radius: var(--app-control-radius, 10px);
    background: var(--app-surface);
    color: var(--app-secondary);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 140ms ease,
      border-color 140ms ease;
    &:hover:not(:disabled) {
      background: var(--app-hover);
      color: var(--app-text);
    }
    &.active {
      border-color: var(--app-accent-border);
      background: var(--app-accent-soft);
      color: var(--app-accent);
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
  .reorder-spinner {
    animation: reorder-spin 0.8s linear infinite;
  }
  .song-sort-row {
    position: relative;
    &.is-dragging {
      opacity: 0.4;
    }
    &.drop-before::before,
    &.drop-after::before {
      position: absolute;
      z-index: 1;
      right: 8px;
      left: 8px;
      height: 2px;
      border-radius: 2px;
      background: var(--app-accent);
      content: '';
      pointer-events: none;
    }
    &.drop-before::before {
      top: -1px;
    }
    &.drop-after::before {
      bottom: -1px;
    }
  }
  .song-reorder-move {
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .list.can-drag {
    cursor: grab;
    user-select: none;
    &:active {
      cursor: grabbing;
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: -2px;
    }
    :deep(img) {
      -webkit-user-drag: none;
    }
  }
  .title-container,
  .list {
    display: grid;
    grid-template-columns: var(--song-columns);
    align-items: center;
    gap: 16px;
    padding-inline: 12px;
  }
  .title-item,
  .item {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .title-container {
    min-height: 36px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--app-border);
    color: var(--app-muted);
    font-size: 12px;
    font-weight: 400;
  }
  .empty,
  .handle {
    text-align: center;
  }
  .time {
    text-align: right;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .list {
    min-height: 64px;
    border-radius: 8px;
    color: var(--app-muted);
    font-size: 13px;
    transition: background-color 140ms ease;
    &:hover,
    &:focus-within {
      background: var(--app-hover);
    }
    &.disable-list .song-title {
      color: var(--app-muted);
      opacity: 0.65;
    }
    &.is-playing {
      background: transparent;
      .song-title {
        color: var(--app-playing);
        opacity: 1;
      }
    }
  }
  .title-box {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .song-artwork {
    position: relative;
    display: grid;
    place-items: center;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    overflow: hidden;
    border: 1px solid var(--app-border);
    border-radius: 7px;
    color: var(--app-muted);
    background: var(--app-surface);
    cursor: pointer;
    .pic-url {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .artwork-play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.42);
    color: white;
    opacity: 0;
    transition: opacity 140ms ease;
  }
  .list:hover .artwork-play,
  .song-artwork:focus-visible .artwork-play {
    opacity: 1;
  }
  .name-box {
    flex: 1;
    min-width: 0;
  }
  .song-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--app-text);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.6;
  }
  .name-container {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.6;
    .tag-box {
      display: flex;
      flex-shrink: 0;
      gap: 4px;
      &:empty {
        display: none;
      }
    }
    .ar-box {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ar:hover {
      color: var(--app-accent);
    }
  }
  .song-tag {
    display: inline-flex;
    align-items: center;
    height: 16px;
    padding: 0 4px;
    border: 1px solid var(--app-border);
    border-radius: 4px;
    color: var(--app-muted);
    font-size: 10px;
    line-height: 1;
    &.vip-tag {
      border-color: var(--app-warning-border, #a86f244d);
      color: var(--app-warning-text, #8e5b12);
    }
  }
  .artist-divider {
    margin-inline: 2px;
    opacity: 0.6;
  }
  .row-favorite {
    display: inline-grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--app-muted);
    cursor: pointer;
    &:hover {
      background: var(--app-surface);
      color: var(--app-text);
    }
    &.liked {
      color: var(--app-accent);
    }
  }
  .song-artwork:focus-visible,
  .row-favorite:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 2px;
  }
  .song-skeleton {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 64px;
    padding: 10px 12px 10px 64px;
    animation: skeleton-pulse 1.8s ease-in-out infinite alternate;
  }
  .skeleton-cover {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 7px;
    background: var(--app-surface);
  }
  .skeleton-lines {
    display: grid;
    gap: 9px;
    width: 35%;
    i {
      display: block;
      height: 7px;
      border-radius: 4px;
      background: var(--app-surface);
      &:last-child {
        width: 60%;
      }
    }
  }
  .skeleton-album {
    width: 18%;
    height: 7px;
    margin-left: auto;
    border-radius: 4px;
    background: var(--app-surface);
  }
}
@container (max-width: 800px) {
  .song-list-container .title-container,
  .song-list-container .list {
    grid-template-columns: var(--song-columns-compact);
  }
  .song-list-container .secondary-column {
    display: none;
  }
}
@container (max-width: 600px) {
  .song-list-container .title-container,
  .song-list-container .list {
    grid-template-columns: var(--song-columns-narrow);
    gap: 10px;
    padding-inline: 8px;
  }
  .song-list-container .album {
    display: none;
  }
  .song-list-container .song-skeleton {
    padding-left: 46px;
  }
}
@keyframes skeleton-pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
@keyframes reorder-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .song-list-container {
    .list,
    .artwork-play,
    .song-reorder-move,
    .reorder-toggle {
      transition: none;
    }
    .song-skeleton,
    .reorder-spinner {
      animation: none;
    }
  }
}
</style>
