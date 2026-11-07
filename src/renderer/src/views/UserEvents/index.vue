<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getUserEvents, getEventProgramSong, type UserEvent } from '@/api/events'
import { getMusicDetail, type CurrentItem, type GetMusicDetailData } from '@/api/musicList'
import { eventPresentation, type EventShare } from '@/utils/userEvents'
import { useMusicAction } from '@/store/music'
import { useFlags } from '@/store/flags'
import MediaPreview, { type PreviewVideo } from '@/components/MediaPreview/index.vue'
import AccessNotice from '@/components/AccessNotice/index.vue'
import { getAccessRestriction, type AccessRestriction } from '@/utils/accessRestriction'

const route = useRoute()
const router = useRouter()
const music = useMusicAction()
const flags = useFlags()
const userId = computed(() => {
  const id = typeof route.query.uid === 'string' ? Number(route.query.uid) : 0
  return Number.isSafeInteger(id) && id > 0 ? id : 0
})
const nickname = computed(() =>
  typeof route.query.nickname === 'string' ? route.query.nickname : '用户'
)
const preview = ref<{ images?: string[]; initialIndex?: number; video?: PreviewVideo } | null>(null)
const openingShare = ref('')
const shareError = ref<{ key: string; message: string } | null>(null)
let shareVersion = 0
let disposed = false

const shareKey = (share: EventShare) => `${share.kind}:${share.id}`
function queueSharedSong(song: GetMusicDetailData) {
  const existing = music.state.runtimeList
  if (existing && Array.isArray(existing.tracks)) {
    const tracks = [...existing.tracks]
    const index = tracks.findIndex((item) => item.id === song.id)
    if (index >= 0) tracks[index] = song
    else tracks.splice(Math.max(0, Math.min(music.state.index + 1, tracks.length)), 0, song)
    music.updateTracks(
      tracks,
      tracks.map((item) => item.id)
    )
  } else {
    const queue: CurrentItem = {
      id: -song.id,
      name: '动态分享',
      coverImgUrl: song.al?.picUrl || '',
      userId: userId.value,
      updateTime: 0,
      createTime: 0,
      specialType: 300,
      playCount: 0,
      trackCount: 1,
      tags: [],
      trackIds: [{ id: song.id, uid: userId.value }],
      tracks: [song],
      subscribed: false,
      ordered: false,
      subscribedCount: 0,
      creator: {
        userId: userId.value,
        nickname: nickname.value,
        avatarUrl: '',
        userType: 4,
        vipType: 11
      }
    }
    music.updateRuntimeList(queue, [song.id])
  }
}
async function openShare(share: EventShare) {
  const key = shareKey(share)
  if (openingShare.value === key) return
  const current = ++shareVersion
  openingShare.value = ''
  shareError.value = null
  if (share.kind === 'playlist' || share.kind === 'album') {
    void router.push({
      name: 'playList',
      query: { id: share.id, ...(share.kind === 'album' ? { type: 'album' } : {}) }
    })
    return
  }
  if (share.kind === 'mv' || share.kind === 'video') {
    preview.value = {
      video: { kind: share.kind, id: share.id, title: share.name, cover: share.cover }
    }
    return
  }
  openingShare.value = key
  const previousSelection = music.state.songs
  try {
    const songId = share.kind === 'program' ? await getEventProgramSong(share.id) : Number(share.id)
    if (disposed || current !== shareVersion) return
    if (!Number.isSafeInteger(songId) || songId <= 0) throw new Error('Missing song')
    if (music.state.songs.id === songId && music.state.musicUrl && window.$audio) {
      queueSharedSong(music.state.songs)
      if (window.$audio.el.paused) await window.$audio.play()
      if (!disposed && current === shareVersion && music.state.songs.id === songId)
        flags.isOpenDetail = true
      return
    }
    const { songs } = await getMusicDetail(String(songId))
    if (disposed || current !== shareVersion || music.state.songs !== previousSelection) return
    const song = songs?.[0]
    if (!song || (song.privilege?.st ?? 0) < 0) throw new Error('Song unavailable')
    queueSharedSong(song)
    const played = await music.getMusicUrlHandler(song)
    if (disposed || current !== shareVersion || music.state.songs.id !== song.id) return
    if (played && music.state.musicUrl) flags.isOpenDetail = true
    else throw new Error('Song unavailable')
  } catch {
    if (!disposed && current === shareVersion)
      shareError.value = { key, message: '暂时无法播放这项分享，请重试。' }
  } finally {
    if (!disposed && current === shareVersion) openingShare.value = ''
  }
}
const events = ref<UserEvent[]>([])
const items = computed(() =>
  events.value.map((event) => ({ ...event, presentation: eventPresentation(event) }))
)
const loading = ref(false)
const failed = ref(false)
const restriction = ref<AccessRestriction | null>(null)
const hasMore = ref(false)
const failedAvatars = ref(new Set<string | number>())
let lasttime = -1
let version = 0
let retryReset = true
async function load(reset = false) {
  if (!userId.value || loading.value) return
  const current = ++version
  const cursor = reset ? -1 : lasttime
  loading.value = true
  failed.value = false
  restriction.value = null
  retryReset = reset
  try {
    const result = await getUserEvents(userId.value, cursor)
    if (current !== version) return
    if (result.code !== 200 || !Array.isArray(result.events)) throw new Error('Invalid events')
    const previous = reset ? [] : events.value
    const seen = new Set(previous.map((event) => String(event.id)))
    const incoming = result.events.filter((event) => {
      if (!event?.id || seen.has(String(event.id))) return false
      seen.add(String(event.id))
      return true
    })
    events.value = [...previous, ...incoming]
    const next = Number(result.lasttime)
    hasMore.value =
      result.more &&
      result.events.length > 0 &&
      incoming.length > 0 &&
      Number.isFinite(next) &&
      next > 0 &&
      next !== cursor
    if (Number.isFinite(next) && next > 0) lasttime = next
  } catch (error) {
    if (current === version) {
      restriction.value = getAccessRestriction(error)
      failed.value = !restriction.value
      if (restriction.value) {
        events.value = []
        hasMore.value = false
      }
    }
  } finally {
    if (current === version) loading.value = false
  }
}
const displayTime = (event: UserEvent) => {
  const value = event.showTime || event.eventTime
  return value ? new Date(value).toLocaleString() : ''
}
watch(
  userId,
  () => {
    version++
    shareVersion++
    preview.value = null
    openingShare.value = ''
    shareError.value = null
    events.value = []
    restriction.value = null
    loading.value = failed.value = hasMore.value = false
    failedAvatars.value = new Set()
    lasttime = -1
    void load(true)
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  version++
  shareVersion++
  disposed = true
})
</script>

<template>
  <section class="events-page">
    <header v-if="userId" class="events-heading">
      <RouterLink :to="{ name: 'userDetail', query: { uid: userId } }" class="back-link"
        ><v-icon icon="mdi-arrow-left" size="16" />返回个人主页</RouterLink
      >
      <div>
        <h1>{{ nickname }}的动态</h1>
        <button type="button" :disabled="loading" @click="load(true)">
          <v-icon icon="mdi-refresh" size="16" />{{ loading ? '刷新中…' : '刷新' }}
        </button>
      </div>
    </header>
    <div v-if="!userId" class="page-state" role="status">无法打开动态，请从个人主页重新进入。</div>
    <template v-else>
      <AccessNotice
        v-if="restriction"
        :restriction="restriction"
        subject="该用户的动态"
        :user-id="userId"
      />
      <article v-for="event in items" :key="event.id" class="event-card">
        <div class="event-author">
          <RouterLink
            class="avatar"
            :to="{ name: 'userDetail', query: { uid: event.user?.userId || userId } }"
            :aria-label="`查看${event.user?.nickname || nickname}的主页`"
          >
            <v-icon icon="mdi-account-outline" size="24" />
            <img
              v-if="event.user?.avatarUrl && !failedAvatars.has(event.id)"
              :src="event.user.avatarUrl"
              alt=""
              loading="lazy"
              @error="failedAvatars.add(event.id)"
            />
          </RouterLink>
          <div>
            <RouterLink
              :to="{ name: 'userDetail', query: { uid: event.user?.userId || userId } }"
              >{{ event.user?.nickname || nickname }}</RouterLink
            ><time>{{ displayTime(event) }}</time>
          </div>
        </div>
        <p v-if="event.presentation.text" class="event-text">{{ event.presentation.text }}</p>
        <blockquote v-if="event.presentation.forwarded">
          <strong>转发 {{ event.presentation.forwarded.nickname }} 的动态</strong>
          <p>{{ event.presentation.forwarded.text }}</p>
        </blockquote>
        <button
          v-if="event.presentation.share"
          type="button"
          class="shared-resource"
          :disabled="openingShare === shareKey(event.presentation.share)"
          :aria-label="`打开分享${event.presentation.share.label}：${event.presentation.share.name}`"
          @click="openShare(event.presentation.share)"
        >
          <img
            v-if="event.presentation.share.cover"
            :src="event.presentation.share.cover"
            alt=""
            loading="lazy"
          />
          <v-icon v-else icon="mdi-music-note-outline" size="28" />
          <span
            ><small>{{
              openingShare === shareKey(event.presentation.share)
                ? '正在打开…'
                : `分享${event.presentation.share.label}`
            }}</small
            ><strong>{{ event.presentation.share.name }}</strong></span
          ><v-icon icon="mdi-chevron-right" size="18" />
        </button>
        <p
          v-if="event.presentation.share && shareError?.key === shareKey(event.presentation.share)"
          class="share-error"
          role="status"
        >
          {{ shareError.message }}
        </p>
        <div v-if="event.presentation.pictures.length" class="event-pictures">
          <button
            v-for="(picture, index) in event.presentation.pictures"
            :key="picture + index"
            type="button"
            @click="preview = { images: [...event.presentation.pictures], initialIndex: index }"
            :aria-label="`查看动态图片 ${index + 1}`"
          >
            <img :src="picture" alt="动态配图" loading="lazy" />
          </button>
        </div>
        <p
          v-if="
            !event.presentation.text &&
            !event.presentation.forwarded &&
            !event.presentation.share &&
            !event.presentation.pictures.length
          "
          class="event-text"
        >
          分享了一条动态
        </p>
        <footer>
          <RouterLink
            v-if="/^A_EV_2_\d+_\d+$/.test(event.info?.threadId || event.threadId || '')"
            :to="{
              name: 'comment',
              query: {
                type: 'event',
                threadId: event.info?.threadId || event.threadId,
                nickname: event.user?.nickname || nickname
              }
            }"
            ><v-icon icon="mdi-comment-outline" size="16" />评论<span
              v-if="event.info?.commentCount"
              >（{{ event.info.commentCount.toLocaleString() }}）</span
            ></RouterLink
          ><span v-if="event.info?.likedCount"
            ><v-icon icon="mdi-thumb-up-outline" size="15" />{{
              event.info.likedCount.toLocaleString()
            }}
            次赞</span
          >
        </footer>
      </article>
      <div v-if="failed" class="event-error" role="status">
        <span>{{
          events.length
            ? '动态加载失败，已保留当前内容。'
            : '暂时无法加载动态，请确认已登录并检查网络。'
        }}</span
        ><button type="button" @click="load(retryReset)">重试</button>
      </div>
      <p v-if="loading" class="page-state" role="status">正在加载动态…</p>
      <p v-else-if="!restriction && !failed && !events.length" class="page-state" role="status">
        暂无动态
      </p>
      <div v-else-if="hasMore && !failed" class="load-more">
        <button type="button" @click="load()">加载更多动态</button>
      </div>
      <p v-else-if="!failed && events.length" class="end-note">没有更多动态了</p>
    </template>
  </section>
  <MediaPreview v-if="preview" v-bind="preview" @close="preview = null" />
</template>

<style scoped lang="less">
.events-page {
  padding: 28px var(--app-gutter) 36px;
  max-width: 960px;
  margin-inline: auto;
  color: var(--app-text);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-muted);
  font-size: 12px;
  text-decoration: none;
}
.events-heading > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 18px 0 24px;
  h1 {
    font-size: var(--app-title-size);
    font-weight: 650;
    overflow-wrap: anywhere;
  }
}
button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 0 12px;
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
    opacity: 0.45;
    cursor: default;
  }
}
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.event-card {
  padding: 24px 0;
  border-top: 1px solid var(--app-border);
}
.event-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  > div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  a {
    color: var(--app-text);
    text-decoration: none;
    font-size: 14px;
    font-weight: 550;
  }
  time {
    color: var(--app-muted);
    font-size: 11px;
  }
}
.avatar {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--app-surface);
  color: var(--app-muted);
  overflow: hidden;
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.event-text,
blockquote p {
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
blockquote {
  margin: 14px 0;
  padding: 14px;
  border-left: 2px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-surface);
  strong {
    display: block;
    margin-bottom: 8px;
    color: var(--app-muted);
    font-size: 12px;
    font-weight: 500;
  }
}
.shared-resource {
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-text);
  text-decoration: none;
  > img {
    width: 54px;
    height: 54px;
    object-fit: cover;
    border-radius: 5px;
  }
  > span {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  small {
    font-size: 11px;
    color: var(--app-muted);
  }
  strong {
    font-size: 14px;
    font-weight: 550;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover {
    background: var(--app-surface);
  }
}
.event-pictures {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  max-width: 540px;
  margin-top: 16px;
  > button {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 8px;
    overflow: hidden;
  }
  img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 8px;
  }
}
.share-error {
  margin-top: 10px;
  color: var(--app-muted);
  font-size: 12px;
}
.event-card footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 18px;
  color: var(--app-muted);
  font-size: 12px;
  a,
  > span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: inherit;
    text-decoration: none;
  }
  a:hover {
    color: var(--app-accent);
  }
}
.page-state {
  padding: 54px 0;
  color: var(--app-muted);
  font-size: 13px;
  text-align: center;
}
.event-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-muted);
  font-size: 12px;
}
.load-more,
.end-note {
  padding: 24px 0;
  text-align: center;
  color: var(--app-muted);
  font-size: 12px;
}
@media (max-width: 650px) {
  .event-pictures {
    gap: 5px;
  }
  .events-heading > div {
    align-items: flex-start;
  }
}
</style>
