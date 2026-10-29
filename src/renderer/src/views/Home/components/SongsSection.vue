<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { GetMusicDetailData } from '@/api/musicList'
import { useMusicAction } from '@/store/music'
import { useUserInfo } from '@/store'
import { deleteSong } from '@/api/play'
import { getUserPlayListFn } from '@/utils/userInfo'
import { getSongCommentLabel, loadSongCommentCount } from '@/utils/songComments'
import { ElMessage } from 'element-plus'
import ContextMenu from '@/components/ContextMenu/index.vue'
import CollectionDialog from '@/components/SongList/CollectionDialog.vue'

interface Props {
  title: string
  songs: GetMusicDetailData[]
  showNavigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showNavigation: true
})

const emit = defineEmits<{
  play: [song: GetMusicDetailData, index: number]
  like: [song: GetMusicDetailData]
  navigate: [direction: 'prev' | 'next']
}>()

const page = ref(0)
const pageSize = 6
const pageCount = computed(() => Math.ceil(props.songs.length / pageSize))
const visibleSongs = computed(() =>
  props.songs.slice(page.value * pageSize, (page.value + 1) * pageSize)
)
watch(
  () => props.songs,
  () => {
    page.value = 0
  }
)

const router = useRouter()
const music = useMusicAction()
const store = useUserInfo()

// 判断当前歌曲是否是正在播放的歌曲
const isPlaying = (item: GetMusicDetailData) => {
  return item.id === music.state.songs?.id
}

// 处理歌曲点击事件
const handleSongClick = (song: GetMusicDetailData, index: number) => {
  // 如果当前歌曲已经在播放，不触发任何操作
  if (isPlaying(song)) {
    return
  }
  emit('play', song, index)
}

// 右键菜单相关
const currentSongForMenu = ref<GetMusicDetailData | null>(null)
const collectionDialogVisible = ref(false)
const collectionLoading = ref(false)

const menuList = computed(() => {
  return store.userPlayListInfo.filter((item) => !item.subscribed)
})

// 生成菜单项
const getMenuItems = (song: GetMusicDetailData) => {
  return [
    { label: '播放下一首', value: 'play-next', song },
    { label: '添加到歌单', value: 'collection', song },
    {
      label: getSongCommentLabel(song.id),
      value: 'comment',
      song
    }
  ]
}

// 处理菜单选择
const handleMenuSelect = async (item: any) => {
  currentSongForMenu.value = item.song

  switch (item.value) {
    case 'play-next':
      // TODO: 实现播放下一首
      ElMessage.info('播放下一首功能待实现')
      break
    case 'collection':
      collectionDialogVisible.value = true
      break
    case 'comment':
      // 跳转到评论页面
      router.push({
        path: '/comment',
        query: {
          id: item.song.id
        }
      })
      break
  }
}

// 确认收藏
const handleCollectionConfirm = async (playlist: { id: number }) => {
  if (collectionLoading.value) return
  const songId = currentSongForMenu.value?.id
  if (!songId || !playlist.id) {
    ElMessage.warning('请重新选择要添加的歌曲和歌单')
    return
  }
  collectionLoading.value = true
  try {
    await deleteSong('add', playlist.id, songId)
    collectionDialogVisible.value = false
    ElMessage.success('添加成功')
    void getUserPlayListFn().catch(() => {})
  } catch {
    // 请求层显示错误，保留选择以便重试。
  } finally {
    collectionLoading.value = false
  }
}
</script>

<template>
  <div class="songs-section">
    <div class="section-header">
      <div class="section-heading">
        <h2>{{ title }}</h2>
        <span class="section-caption">{{ songs.length }} 首 · 每日更新</span>
      </div>
      <div v-if="showNavigation && pageCount > 1" class="page-controls">
        <span class="page-label">{{ page + 1 }} / {{ pageCount }}</span>
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          size="x-small"
          aria-label="上一页推荐歌曲"
          :disabled="page === 0"
          @click="page--"
        />
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          size="x-small"
          aria-label="下一页推荐歌曲"
          :disabled="page >= pageCount - 1"
          @click="page++"
        />
      </div>
    </div>

    <!-- Song List -->
    <div class="song-list">
      <template v-if="songs && songs.length > 0">
        <ContextMenu
          v-for="(song, index) in visibleSongs"
          :key="song.id"
          :items="getMenuItems(song)"
          @open="loadSongCommentCount(song.id)"
          @select="handleMenuSelect"
        >
          <button
            type="button"
            class="song-item"
            :aria-label="`播放 ${song.name}`"
            @click="handleSongClick(song, page * pageSize + index)"
          >
            <div class="song-content">
              <span class="song-number">{{
                String(page * pageSize + index + 1).padStart(2, '0')
              }}</span>
              <div class="song-cover-wrapper">
                <v-img :src="song.al?.picUrl || ''" cover class="song-cover" />
              </div>

              <div class="song-info">
                <div class="song-name" :class="{ 'is-playing': isPlaying(song) }">
                  {{ song.name }}
                </div>
                <div class="song-artist">
                  {{ song.ar?.map((artist) => artist.name).join(' / ') }}
                </div>
              </div>
            </div>
          </button>
        </ContextMenu>
      </template>

      <!-- Empty State -->
      <div v-else class="empty-state text-center py-8">
        <v-icon icon="mdi-music-off" size="64" color="grey" />
        <div class="text-body-1 text-medium-emphasis mt-4">暂无推荐歌曲</div>
      </div>
    </div>
  </div>

  <!-- 收藏到歌单对话框 -->
  <CollectionDialog
    v-model="collectionDialogVisible"
    :playlist="menuList"
    :loading="collectionLoading"
    @confirm="handleCollectionConfirm"
  />
</template>

<style lang="less" scoped>
.songs-section {
  min-width: 0;
}
.section-header {
  min-height: 40px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.section-heading {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  h2 {
    font-size: 21px;
    font-weight: 650;
    letter-spacing: 0.02em;
    color: var(--discovery-text);
  }
}
.section-caption,
.page-label {
  font-size: 12px;
  color: var(--discovery-muted);
}
.page-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.page-label {
  margin-right: 4px;
  font-variant-numeric: tabular-nums;
}
.song-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
  :deep(.context-menu-wrapper) {
    height: auto;
    min-width: 0;
  }
}
.song-item {
  display: block;
  width: 100%;
  padding: 10px;
  text-align: left;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--discovery-text);
  cursor: pointer;
  transition: background 0.18s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.065);
  }
  &:focus-visible {
    outline: 2px solid var(--discovery-accent);
    outline-offset: 2px;
  }
}
.song-content {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.song-number {
  width: 18px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--discovery-muted);
  font-variant-numeric: tabular-nums;
}
.song-cover-wrapper {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 7px;
  overflow: hidden;
}
.song-cover {
  width: 100%;
  height: 100%;
}
.song-info {
  min-width: 0;
  flex: 1;
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
  &.is-playing {
    color: var(--discovery-accent);
  }
}
.song-artist {
  font-size: 12px;
  line-height: 1.6;
  margin-top: 3px;
  color: var(--discovery-muted);
}
.empty-state {
  grid-column: 1 / -1;
}
@container (max-width: 540px) {
  .song-list {
    grid-template-columns: minmax(0, 1fr);
  }
  .section-caption {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .song-item {
    transition: none;
  }
}
</style>
