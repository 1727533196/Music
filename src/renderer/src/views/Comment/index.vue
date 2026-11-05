<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getCommentMusic, getMusicDetail } from '@/api/musicList'
import type { GetMusicDetailData } from '@/api/musicList'
import { useRoute, useRouter } from 'vue-router'
import { useFlags } from '@/store/flags'

interface CommentItem {
  commentId: number
  content: string
  timeStr: string
  likedCount: number
  user: { userId: number; nickname: string; avatarUrl: string }
}
interface CommentResponse {
  code: number
  data: { comments: CommentItem[]; totalCount: number; hasMore?: boolean }
}
const flags = useFlags()
const router = useRouter()
const route = useRoute()
const contentEl = ref<HTMLDivElement>()
const state = reactive({
  comments: [] as CommentItem[],
  song: null as GetMusicDetailData | null,
  total: 0,
  currentPage: 0,
  loading: false,
  hasMore: true
})
const songLoading = ref(false)
const songError = ref(false)
const commentError = ref(false)
const requestedPage = ref(1)
let songId = 0
let requestVersion = 0

const getCommentMusicFn = async (page = 1) => {
  if (state.loading || !songId) return
  const version = requestVersion
  const id = songId
  requestedPage.value = page
  state.loading = true
  commentError.value = false
  try {
    const response = (await getCommentMusic(id, 0, page, 20, 2)) as CommentResponse
    if (version !== requestVersion) return
    if (response.code !== 200 || !Array.isArray(response.data?.comments)) {
      throw new Error('Invalid comment response')
    }
    const incoming = response.data.comments
    if (page === 1) state.comments = incoming
    else {
      const existing = new Set(state.comments.map((item) => item.commentId))
      state.comments = [
        ...state.comments,
        ...incoming.filter((item) => !existing.has(item.commentId))
      ]
    }
    state.currentPage = page
    state.total = Math.max(0, Number(response.data.totalCount) || 0)
    state.hasMore =
      incoming.length > 0 && (response.data.hasMore ?? state.comments.length < state.total)
    if (page === 1) contentEl.value?.scrollTo({ top: 0 })
  } catch (error) {
    if (version === requestVersion) {
      commentError.value = true
      console.error('加载评论失败', error)
    }
  } finally {
    if (version === requestVersion) state.loading = false
  }
}
const getMusicDetailFn = async () => {
  if (!songId || songLoading.value) return
  const version = requestVersion
  songLoading.value = true
  songError.value = false
  try {
    const { songs } = await getMusicDetail(String(songId))
    if (version !== requestVersion) return
    if (!songs?.[0]) throw new Error('Song not found')
    state.song = songs[0]
  } catch (error) {
    if (version === requestVersion) {
      songError.value = true
      console.error('加载评论页歌曲信息失败', error)
    }
  } finally {
    if (version === requestVersion) songLoading.value = false
  }
}
const loadMore = () => {
  if (!state.hasMore || state.loading || commentError.value) return
  void getCommentMusicFn(state.currentPage + 1)
}
const handleScroll = (event: Event) => {
  const target = event.target as HTMLDivElement
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) loadMore()
}
watch(
  () => route.query.id,
  (value) => {
    requestVersion++
    songId = Number(value)
    if (!Number.isFinite(songId) || songId <= 0) songId = 0
    state.comments = []
    state.song = null
    state.total = 0
    state.currentPage = 0
    state.hasMore = true
    state.loading = false
    songLoading.value = false
    songError.value = false
    commentError.value = false
    requestedPage.value = 1
    contentEl.value?.scrollTo({ top: 0 })
    if (songId) {
      void getCommentMusicFn()
      void getMusicDetailFn()
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  requestVersion++
})
const gotoUserDetail = (uid: number) => {
  flags.isOpenDetail = false
  router.push({ path: '/detail', query: { uid } })
}
</script>

<template>
  <div class="comment-box">
    <div v-if="state.song" class="info-card">
      <div
        class="bg-img"
        :style="
          state.song.al?.picUrl
            ? { backgroundImage: `url(${state.song.al.picUrl}?param=200y200)` }
            : undefined
        "
      >
        <v-icon v-if="!state.song.al?.picUrl" icon="mdi-music-note-outline" size="32" />
      </div>
      <div class="song-info">
        <h1 class="song-name" :title="state.song.name">{{ state.song.name }}</h1>
        <div class="singers">
          <div class="singer-info">
            <v-icon icon="mdi-account-music" size="small" class="mr-1" />
            <span>{{ state.song.ar?.map((item) => item.name).join(' / ') || '未知歌手' }}</span>
          </div>
          <div v-if="state.song.al?.name" class="album">
            <v-icon icon="mdi-album" size="small" class="mr-1" />
            <span>{{ state.song.al.name }}</span>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else-if="songLoading"
      class="info-card info-skeleton"
      aria-label="正在加载歌曲信息"
      role="status"
    >
      <span class="bg-img" />
      <div class="song-info"><span /><span /></div>
    </div>
    <div v-else-if="songError" class="comment-notice song-error" role="status">
      <span>歌曲信息加载失败，仍可查看下方评论。</span>
      <button type="button" @click="getMusicDetailFn">重试</button>
    </div>

    <div v-if="!songId" class="empty-state invalid-song" role="status">
      <v-icon icon="mdi-music-note-off-outline" size="34" />
      <h2>找不到这首歌曲</h2>
      <p>请返回歌曲列表重新打开评论。</p>
      <button type="button" class="retry-button" @click="router.push('/home')">去推荐页</button>
    </div>
    <div v-else class="comment-content" :aria-busy="state.loading">
      <div class="comment-content-box">
        <div class="comment-toolbar">
          <h2 class="title">
            <v-icon icon="mdi-comment-text-multiple-outline" size="18" class="mr-2" />
            精彩评论
            <span v-if="state.currentPage" class="comment-count">{{
              state.total.toLocaleString()
            }}</span>
          </h2>
          <button
            type="button"
            class="refresh-button"
            aria-label="刷新评论"
            title="刷新评论"
            :disabled="state.loading"
            @click="getCommentMusicFn(1)"
          >
            <v-icon icon="mdi-refresh" size="19" />
          </button>
        </div>
        <div ref="contentEl" class="content" @wheel.stop @scroll.passive="handleScroll">
          <div v-for="item in state.comments" :key="item.commentId" class="content-line">
            <button
              type="button"
              :aria-label="`查看${item.user.nickname}的主页`"
              @click="gotoUserDetail(item.user.userId)"
              :style="{ backgroundImage: `url(${item.user.avatarUrl}?param=80y80)` }"
              class="photo"
            />
            <div class="right-box">
              <div class="comment-header">
                <button
                  type="button"
                  @click="gotoUserDetail(item.user.userId)"
                  class="name"
                  :title="item.user.nickname"
                >
                  {{ item.user.nickname }}
                </button>
                <div class="time">{{ item.timeStr }}</div>
              </div>
              <div class="text">{{ item.content }}</div>
              <div class="handle-box">
                <span class="comment-appreciation" :aria-label="`${item.likedCount || 0} 次赞`">
                  <v-icon icon="mdi-star-outline" size="15" />
                  <span>{{ (item.likedCount || 0).toLocaleString() }}</span>
                </span>
              </div>
            </div>
          </div>
          <div
            v-if="commentError"
            :class="state.comments.length ? 'comment-notice' : 'empty-state comment-load-error'"
            role="status"
          >
            <v-icon v-if="!state.comments.length" icon="mdi-comment-alert-outline" size="34" />
            <span>{{
              state.comments.length
                ? requestedPage === 1
                  ? '刷新失败，当前保留已加载的评论。'
                  : '更多评论加载失败，请重试。'
                : '评论加载失败，请检查网络后重试。'
            }}</span>
            <button type="button" class="retry-button" @click="getCommentMusicFn(requestedPage)">
              重新加载
            </button>
          </div>
          <div
            v-else-if="!state.comments.length && !state.loading"
            class="empty-state"
            role="status"
          >
            <v-icon icon="mdi-comment-off-outline" size="34" />
            <div class="empty-text">暂无评论</div>
          </div>
          <div v-if="state.loading" class="loading-more" role="status">
            <v-progress-circular indeterminate size="24" width="2" color="var(--app-accent)" />
            <span>{{ state.comments.length ? '正在加载评论…' : '正在加载精彩评论…' }}</span>
          </div>
          <div
            v-else-if="state.hasMore && state.comments.length && !commentError"
            class="load-more"
          >
            <button type="button" class="retry-button" @click="loadMore">加载更多评论</button>
          </div>
          <div v-if="!state.hasMore && state.comments.length" class="no-more">
            <span>没有更多评论了</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.comment-box {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-width: 1120px;
  margin-inline: auto;
  padding: 26px var(--app-gutter, 32px) 24px;
  color: var(--app-text);
}
.info-card {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-shrink: 0;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--app-border);
}
.bg-img {
  display: grid;
  place-items: center;
  color: var(--app-muted);
  flex: 0 0 96px;
  height: 96px;
  border-radius: 10px;
  background: var(--app-surface) center / cover no-repeat;
}
.song-info {
  min-width: 0;
  flex: 1;
}
.song-name {
  margin: 0 0 12px;
  color: var(--app-text);
  font-size: var(--app-title-size, 28px);
  font-weight: 650;
  line-height: 1.35;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.singers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.5;
  .singer-info,
  .album {
    display: flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .singer-info span,
  .album span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .v-icon {
    flex-shrink: 0;
    opacity: 0.75;
  }
}
.comment-content,
.comment-content-box {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.title {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  margin: 0;
  color: var(--app-text);
  font-size: 17px;
  line-height: 1.5;
  font-weight: 600;
  .v-icon {
    color: var(--app-muted);
  }
}
.comment-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 14px;
  margin-bottom: 12px;
}
.refresh-button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  color: var(--app-muted);
  background: transparent;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: var(--app-text);
    background: var(--app-surface);
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
.refresh-button:focus-visible,
.comment-notice button:focus-visible,
.retry-button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.comment-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 16px 0;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-muted);
  background: var(--app-surface);
  font-size: 12px;
  line-height: 1.7;
  button {
    flex-shrink: 0;
  }
}
.song-error {
  flex-shrink: 0;
  margin: 0;
}
.retry-button,
.comment-notice button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--app-accent-border);
  border-radius: 8px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  &:hover {
    background: var(--app-accent-soft);
  }
}
.load-more {
  padding: 20px 0;
  text-align: center;
}
.comment-load-error {
  font-size: 13px;
  line-height: 1.7;
}
.invalid-song {
  flex: 1;
  h2 {
    font-size: 18px;
    color: var(--app-text);
    font-weight: 600;
  }
  p {
    font-size: 13px;
  }
}
.info-skeleton .song-info span {
  display: block;
  width: min(65%, 300px);
  height: 20px;
  border-radius: 5px;
  background: var(--app-surface);
  & + span {
    width: min(45%, 200px);
    height: 12px;
    margin-top: 15px;
  }
}
.comment-appreciation {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--app-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.comment-count {
  margin-left: 6px;
  color: var(--app-muted);
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 12px;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--app-border) transparent;
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--app-border);
    border-radius: 4px;
    &:hover {
      background: var(--app-muted);
    }
  }
}
.content-line {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 0;
  border-bottom: 1px solid var(--app-border);
  &:last-child {
    border-bottom: 0;
  }
}
.photo {
  flex: 0 0 42px;
  height: 42px;
  border-radius: 50%;
  border: 0;
  padding: 0;
  background: var(--app-surface) center / cover no-repeat;
  cursor: pointer;
  transition: opacity 160ms ease;
  &:hover {
    opacity: 0.8;
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
}
.right-box {
  min-width: 0;
  flex: 1;
}
.comment-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 7px;
}
.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  color: var(--app-text);
  cursor: pointer;
  transition: color 160ms ease;
  &:hover {
    color: var(--app-accent);
  }
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
    border-radius: 3px;
  }
}
.time {
  flex-shrink: 0;
  color: var(--app-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.text {
  color: var(--app-secondary);
  font-size: 14px;
  line-height: 1.85;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.handle-box {
  margin-top: 10px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 220px;
  padding: 40px 20px;
  color: var(--app-muted);
  .v-icon {
    opacity: 0.55;
  }
}
.empty-text {
  font-size: 13px;
}
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 0;
  color: var(--app-muted);
  font-size: 12px;
}
.no-more {
  padding: 24px 0;
  color: var(--app-muted);
  text-align: center;
  font-size: 12px;
}
@media (max-height: 720px) {
  .comment-box {
    gap: 20px;
    padding-top: 18px;
  }
  .info-card {
    padding-bottom: 20px;
  }
  .bg-img {
    flex-basis: 80px;
    height: 80px;
  }
}
@media (max-width: 700px) {
  .comment-box {
    gap: 20px;
  }
  .info-card {
    gap: 16px;
    padding-bottom: 20px;
  }
  .bg-img {
    flex-basis: 76px;
    height: 76px;
  }
  .song-name {
    font-size: 22px;
    margin-bottom: 8px;
  }
  .content {
    padding-right: 8px;
  }
  .content-line {
    gap: 12px;
  }
  .photo {
    flex-basis: 36px;
    height: 36px;
  }
  .comment-header {
    flex-wrap: wrap;
    gap: 3px 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .photo,
  .name,
  .action-btn {
    transition: none;
  }
}
</style>
