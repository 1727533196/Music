<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  getCommentReplies,
  setCommentLike,
  replyToComment,
  type CommentItem,
  type CommentResource
} from '@/api/comment'
import { useUserInfo } from '@/store'
import { message } from '@/utils/message'
import AccessNotice from '@/components/AccessNotice/index.vue'
import { getAccessRestriction, type AccessRestriction } from '@/utils/accessRestriction'

defineOptions({ name: 'CommentEntry' })

const props = withDefaults(
  defineProps<{
    comment: CommentItem
    resource: CommentResource
    isReply?: boolean
  }>(),
  { isReply: false }
)
const emit = defineEmits<{
  update: [patch: Partial<CommentItem>]
  'reply-sent': []
}>()
const store = useUserInfo()
const liking = ref(false)
const likeError = ref(false)
const replying = ref(false)
const draft = ref('')
const sending = ref(false)
const sendError = ref(false)
const input = ref<HTMLTextAreaElement>()
const avatarFailed = ref(false)
const expanded = ref(false)
const replies = ref<CommentItem[]>([])
const repliesLoading = ref(false)
const repliesError = ref(false)
const repliesRestriction = ref<AccessRestriction | null>(null)
const moreReplies = ref(false)
const totalReplies = ref<number | null>(null)
let cursor = -1
let repliesVersion = 0
let alive = true
const replyCount = computed(
  () =>
    totalReplies.value ??
    props.comment.replyCount ??
    props.comment.showFloorComment?.replyCount ??
    0
)
const timeLabel = computed(
  () =>
    props.comment.timeStr ||
    (props.comment.time ? new Date(props.comment.time).toLocaleString() : '')
)
function requireLogin() {
  if (store.isLogin) return true
  window.$login?.show()
  return false
}
async function toggleLike() {
  if (liking.value || !requireLogin()) return
  const liked = !props.comment.liked
  const likedCount = props.comment.likedCount || 0
  liking.value = true
  likeError.value = false
  try {
    const result = await setCommentLike(props.resource, props.comment.commentId, liked)
    if (result.code !== 200) throw new Error('Like failed')
    if (alive)
      emit('update', {
        liked,
        likedCount: Math.max(0, likedCount + (liked ? 1 : -1))
      })
  } catch {
    if (alive) likeError.value = true
  } finally {
    if (alive) liking.value = false
  }
}
async function openReply() {
  if (!requireLogin() || sending.value) return
  replying.value = !replying.value
  if (replying.value) {
    await nextTick()
    input.value?.focus()
  }
}
async function loadReplies(reset = false) {
  if (repliesLoading.value || props.isReply) return
  const version = ++repliesVersion
  const requestedCursor = reset ? -1 : cursor
  repliesLoading.value = true
  repliesError.value = false
  repliesRestriction.value = null
  try {
    const result = await getCommentReplies(props.resource, props.comment.commentId, requestedCursor)
    if (!alive || version !== repliesVersion) return
    if (result.code !== 200 || !Array.isArray(result.data?.comments))
      throw new Error('Invalid replies')
    const incoming = result.data.comments.filter(
      (item) => item.commentId !== props.comment.commentId
    )
    const previous = reset ? [] : replies.value
    const seen = new Set(previous.map((item) => item.commentId))
    replies.value = [
      ...previous,
      ...incoming.filter((item) => {
        if (seen.has(item.commentId)) return false
        seen.add(item.commentId)
        return true
      })
    ]
    totalReplies.value = Math.max(0, Number(result.data.totalCount) || 0)
    const next = Number(result.data.time ?? incoming.at(-1)?.time)
    moreReplies.value =
      incoming.length > 0 &&
      Number.isFinite(next) &&
      next > 0 &&
      next !== requestedCursor &&
      (result.data.hasMore ?? replies.value.length < totalReplies.value)
    if (Number.isFinite(next) && next > 0) cursor = next
  } catch (error) {
    if (alive && version === repliesVersion) {
      repliesRestriction.value = getAccessRestriction(error)
      repliesError.value = !repliesRestriction.value
      if (repliesRestriction.value) {
        replies.value = []
        moreReplies.value = false
      }
    }
  } finally {
    if (alive && version === repliesVersion) repliesLoading.value = false
  }
}
function toggleReplies() {
  expanded.value = !expanded.value
  if (expanded.value && !replies.value.length) void loadReplies(true)
}
async function afterReply() {
  totalReplies.value = replyCount.value + 1
  emit('update', { replyCount: totalReplies.value })
  expanded.value = true
  // 已在加载时先使旧请求失效，再刷新，避免发送成功后的列表被旧响应覆盖。
  repliesVersion++
  repliesLoading.value = false
  await loadReplies(true)
}
async function sendReply() {
  const content = draft.value.trim()
  if (!content || content.length > 140 || sending.value || !requireLogin()) return
  sending.value = true
  sendError.value = false
  try {
    const result = await replyToComment(props.resource, props.comment.commentId, content)
    if (result.code !== 200) throw new Error('Reply failed')
    if (!alive) return
    draft.value = ''
    replying.value = false
    message.success('回复已发送')
    if (props.isReply) emit('reply-sent')
    else await afterReply()
  } catch {
    if (alive) sendError.value = true
  } finally {
    if (alive) sending.value = false
  }
}
function onInputKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) {
    event.preventDefault()
    void sendReply()
  }
}
onBeforeUnmount(() => {
  alive = false
  repliesVersion++
})
</script>

<template>
  <article class="comment-entry" :class="{ 'is-reply': isReply }">
    <RouterLink
      class="avatar"
      :to="{ name: 'userDetail', query: { uid: comment.user.userId } }"
      :aria-label="`查看${comment.user.nickname}的主页`"
    >
      <v-icon icon="mdi-account-outline" size="22" />
      <img
        v-if="comment.user.avatarUrl && !avatarFailed"
        :src="comment.user.avatarUrl"
        alt=""
        loading="lazy"
        @error="avatarFailed = true"
      />
    </RouterLink>
    <div class="comment-body">
      <div class="entry-heading">
        <RouterLink
          class="author"
          :to="{ name: 'userDetail', query: { uid: comment.user.userId } }"
          >{{ comment.user.nickname || '音乐听众' }}</RouterLink
        >
        <time>{{ timeLabel }}</time>
      </div>
      <p class="entry-content">{{ comment.content }}</p>
      <blockquote v-if="comment.beReplied?.length">
        <p v-for="(original, index) in comment.beReplied" :key="index">
          <span v-if="original.user">{{ original.user.nickname }}：</span
          >{{ original.content || '原评论已删除' }}
        </p>
      </blockquote>
      <div class="entry-actions">
        <button
          type="button"
          class="like-button"
          :class="{ liked: comment.liked }"
          :aria-pressed="!!comment.liked"
          :aria-label="comment.liked ? '取消点赞' : '点赞'"
          :disabled="liking"
          @click="toggleLike"
        >
          <v-icon :icon="comment.liked ? 'mdi-thumb-up' : 'mdi-thumb-up-outline'" size="15" />{{
            (comment.likedCount || 0).toLocaleString()
          }}
        </button>
        <button type="button" :aria-expanded="replying" :disabled="sending" @click="openReply">
          回复
        </button>
        <button
          v-if="!isReply"
          type="button"
          class="replies-toggle"
          :aria-expanded="expanded"
          @click="toggleReplies"
        >
          {{ expanded ? '收起回复' : '查看回复'
          }}<span v-if="replyCount">（{{ replyCount.toLocaleString() }}）</span>
        </button>
        <span v-if="likeError" class="action-error" role="status">点赞失败，请重试</span>
      </div>
      <form v-if="replying" class="reply-form" @submit.prevent="sendReply">
        <textarea
          ref="input"
          v-model="draft"
          :aria-label="`回复${comment.user.nickname}`"
          :placeholder="`回复 ${comment.user.nickname}…`"
          maxlength="140"
          rows="3"
          :disabled="sending"
          @keydown="onInputKey"
        />
        <div class="composer-footer">
          <span>{{ draft.length }}/140</span>
          <div>
            <button type="button" :disabled="sending" @click="replying = false">取消</button>
            <button class="send-button" type="submit" :disabled="sending || !draft.trim()">
              {{ sending ? '发送中…' : '发送回复' }}
            </button>
          </div>
        </div>
        <p v-if="sendError" class="action-error" role="status">
          回复发送失败，内容已保留，请重试。
        </p>
      </form>
      <section
        v-if="expanded && !isReply"
        class="replies-panel"
        aria-label="评论回复"
        :aria-busy="repliesLoading"
      >
        <CommentEntry
          v-for="item in replies"
          :key="item.commentId"
          :comment="item"
          :resource="resource"
          is-reply
          @update="Object.assign(item, $event)"
          @reply-sent="afterReply"
        />
        <AccessNotice
          v-if="repliesRestriction"
          :restriction="repliesRestriction"
          subject="这条评论的回复"
          compact
        />
        <div v-else-if="repliesError" class="replies-state" role="status">
          回复加载失败。<button type="button" @click="loadReplies(!replies.length)">重试</button>
        </div>
        <p v-else-if="repliesLoading" class="replies-state" role="status">正在加载回复…</p>
        <p v-else-if="!replies.length" class="replies-state" role="status">暂无回复</p>
        <button v-else-if="moreReplies" type="button" class="more-replies" @click="loadReplies()">
          加载更多回复
        </button>
      </section>
    </div>
  </article>
</template>

<style scoped lang="less">
.comment-entry {
  display: flex;
  gap: 14px;
  padding: 20px 0;
  border-bottom: 1px solid var(--app-border);
  &:last-child {
    border-bottom: 0;
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
.comment-body {
  flex: 1;
  min-width: 0;
}
.entry-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 7px;
  time {
    flex-shrink: 0;
    color: var(--app-muted);
    font-size: 11px;
  }
}
.author {
  color: var(--app-text);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  overflow-wrap: anywhere;
  &:hover {
    color: var(--app-accent);
  }
}
.entry-content {
  color: var(--app-secondary);
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
blockquote {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 2px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--app-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: var(--app-accent);
    background: var(--app-surface);
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}
button:focus-visible,
a:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.entry-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 12px;
  margin: 8px 0 0 -6px;
  .liked {
    color: var(--app-accent);
  }
}
.action-error {
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.7;
}
.reply-form {
  margin-top: 12px;
  textarea {
    display: block;
    width: 100%;
    min-height: 80px;
    padding: 10px 12px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: var(--app-surface);
    color: var(--app-text);
    font: inherit;
    font-size: 13px;
    line-height: 1.7;
    resize: vertical;
  }
}
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  color: var(--app-muted);
  font-size: 11px;
  > div {
    display: flex;
    gap: 8px;
  }
  .send-button {
    padding-inline: 12px;
    background: var(--app-accent-soft);
    color: var(--app-accent);
  }
}
.replies-panel {
  margin-top: 14px;
  padding: 0 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
}
.is-reply {
  gap: 10px;
  padding-block: 14px;
  .avatar {
    flex-basis: 30px;
    height: 30px;
  }
  .entry-content {
    font-size: 13px;
  }
}
.replies-state {
  padding: 16px 0;
  color: var(--app-muted);
  font-size: 12px;
}
.more-replies {
  margin: 8px 0 12px;
  color: var(--app-accent);
}
@media (max-width: 700px) {
  .comment-entry {
    gap: 10px;
  }
  .avatar {
    flex-basis: 34px;
    height: 34px;
  }
  .entry-heading {
    flex-wrap: wrap;
    gap: 4px 10px;
  }
  .replies-panel {
    padding-inline: 10px;
  }
}
</style>
