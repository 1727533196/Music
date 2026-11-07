<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getUserFollows, getUserFollowers, type ConnectionUser } from '@/api/user'
import { useUserInfo } from '@/store'
import AccessNotice from '@/components/AccessNotice/index.vue'
import { getAccessRestriction, type AccessRestriction } from '@/utils/accessRestriction'

const route = useRoute()
const router = useRouter()
const store = useUserInfo()
const pageSize = 30
const tabs = [
  { value: 'following', label: '关注' },
  { value: 'followers', label: '粉丝' }
] as const
const userId = computed(() => {
  const value = route.query.uid === undefined ? store.profile.userId : route.query.uid
  const uid = typeof value === 'string' || typeof value === 'number' ? Number(value) : 0
  return Number.isSafeInteger(uid) && uid > 0 ? uid : 0
})
const type = computed(() => (route.query.type === 'followers' ? 'followers' : 'following'))
const label = computed(() => (type.value === 'followers' ? '粉丝' : '关注'))
const nickname = computed(() => {
  if (typeof route.query.nickname === 'string' && route.query.nickname.trim())
    return route.query.nickname
  return userId.value === store.profile.userId ? store.profile.nickname || '我' : '这位用户'
})
const page = computed(() => {
  const value = typeof route.query.page === 'string' ? Number(route.query.page) : 1
  return Number.isSafeInteger(value) && value > 0 && Number.isSafeInteger(value * pageSize)
    ? value
    : 1
})
const users = ref<ConnectionUser[]>([])
const loading = ref(false)
const failed = ref(false)
const restriction = ref<AccessRestriction | null>(null)
const hasMore = ref(false)
const failedAvatars = ref(new Set<number>())
let requestVersion = 0

async function load() {
  if (!userId.value || loading.value) return
  const version = ++requestVersion
  const uid = userId.value
  const offset = (page.value - 1) * pageSize
  loading.value = true
  failed.value = false
  restriction.value = null
  try {
    const result =
      type.value === 'followers'
        ? await getUserFollowers(uid, pageSize, offset)
        : await getUserFollows(uid, pageSize, offset)
    if (version !== requestVersion) return
    const entries = 'followeds' in result ? result.followeds : result.follow
    if (!Array.isArray(entries)) throw new Error('Missing user list')
    const seen = new Set<number>()
    users.value = entries.filter((user) => {
      if (!user || !Number.isSafeInteger(user.userId) || user.userId <= 0 || seen.has(user.userId))
        return false
      seen.add(user.userId)
      return true
    })
    hasMore.value =
      entries.length > 0 &&
      (typeof result.more === 'boolean' ? result.more : entries.length === pageSize)
    failedAvatars.value = new Set()
  } catch (error) {
    if (version === requestVersion) {
      restriction.value = getAccessRestriction(error)
      failed.value = !restriction.value
      if (restriction.value) {
        users.value = []
        hasMore.value = false
      }
    }
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function switchType(value: 'following' | 'followers') {
  if (type.value === value) return
  void router.replace({
    name: 'follow',
    query: { ...route.query, uid: userId.value, type: value, page: 1 }
  })
}
function changePage(value: number) {
  if (loading.value || value < 1 || (value > page.value && !hasMore.value)) return
  void router.push({
    name: 'follow',
    query: { ...route.query, uid: userId.value, type: type.value, page: value }
  })
}
watch(
  [userId, type, page],
  () => {
    requestVersion++
    users.value = []
    restriction.value = null
    hasMore.value = failed.value = loading.value = false
    failedAvatars.value = new Set()
    void load()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  requestVersion++
})
</script>

<template>
  <section class="connections-page">
    <template v-if="userId">
      <header class="connections-heading">
        <RouterLink class="back-link" :to="{ name: 'userDetail', query: { uid: userId } }">
          <v-icon icon="mdi-arrow-left" size="16" />返回个人主页
        </RouterLink>
        <h1>{{ nickname }}的{{ label }}</h1>
        <div class="connections-toolbar">
          <div class="connections-tabs" role="group" aria-label="用户列表类型">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              :aria-pressed="type === tab.value"
              @click="switchType(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
          <button type="button" class="refresh-button" :disabled="loading" @click="load">
            <v-icon icon="mdi-refresh" size="16" />{{ loading ? '刷新中…' : '刷新' }}
          </button>
        </div>
      </header>

      <AccessNotice
        v-if="restriction"
        :restriction="restriction"
        :subject="`${label}列表`"
        :user-id="userId"
      />
      <div v-if="failed" class="list-error" role="status">
        <div>
          <p>{{ users.length ? '刷新失败，已保留当前列表。' : `暂时无法加载${label}列表。` }}</p>
          <span>请确认已登录，并检查网络或该用户的访问权限。</span>
        </div>
        <button type="button" :disabled="loading" @click="load">重试</button>
      </div>
      <div v-if="loading && !users.length" class="list-state" role="status">
        <v-icon icon="mdi-account-multiple-outline" size="34" />
        <p>正在加载{{ label }}列表…</p>
      </div>
      <div v-else-if="!restriction && !failed && !users.length" class="list-state" role="status">
        <v-icon icon="mdi-account-multiple-outline" size="34" />
        <p>{{ page > 1 ? '这一页没有更多用户了' : `暂无${label}` }}</p>
      </div>

      <ul v-if="users.length" class="user-list" :aria-busy="loading" :aria-label="`${label}列表`">
        <li v-for="user in users" :key="user.userId">
          <RouterLink class="user-card" :to="{ name: 'userDetail', query: { uid: user.userId } }">
            <span class="user-avatar" aria-hidden="true">
              <v-icon icon="mdi-account-outline" size="26" />
              <img
                v-if="user.avatarUrl && !failedAvatars.has(user.userId)"
                :src="user.avatarUrl"
                alt=""
                loading="lazy"
                @error="failedAvatars.add(user.userId)"
              />
            </span>
            <span class="user-copy">
              <strong>{{ user.nickname || '音乐听众' }}</strong>
              <span :title="user.signature || ''">{{
                user.signature || '这个人还没有留下签名'
              }}</span>
            </span>
            <v-icon class="user-arrow" icon="mdi-chevron-right" size="18" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
      <nav
        v-if="!restriction && (users.length || page > 1)"
        class="pagination"
        aria-label="用户列表分页"
      >
        <span
          >第 {{ page }} 页<span v-if="users.length"> · 本页 {{ users.length }} 人</span></span
        >
        <div>
          <button type="button" :disabled="page <= 1 || loading" @click="changePage(page - 1)">
            上一页
          </button>
          <button type="button" :disabled="!hasMore || loading" @click="changePage(page + 1)">
            下一页
          </button>
        </div>
      </nav>
    </template>
    <div v-else class="list-state" role="status">
      <v-icon icon="mdi-account-question-outline" size="34" />
      <h1>无法打开用户列表</h1>
      <p>请从个人主页点击关注或粉丝重新进入。</p>
      <button type="button" @click="router.back()">返回上一页</button>
    </div>
  </section>
</template>

<style lang="less" scoped>
.connections-page {
  padding: 28px var(--app-gutter) 36px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-muted);
  font-size: 12px;
  text-decoration: none;
  &:hover {
    color: var(--app-text);
  }
}
.connections-heading h1 {
  margin: 18px 0 22px;
  color: var(--app-text);
  font-size: var(--app-title-size);
  font-weight: 650;
  overflow-wrap: anywhere;
}
.connections-toolbar,
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.connections-toolbar {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--app-border);
}
.connections-tabs,
.pagination > div {
  display: flex;
  gap: 8px;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  &:hover:not(:disabled),
  &[aria-pressed='true'] {
    background: var(--app-surface);
    color: var(--app-text);
  }
  &[aria-pressed='true'] {
    border-color: var(--app-accent);
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
.user-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
  padding: 18px 0;
  margin: 0;
  list-style: none;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 14px 12px;
  border-radius: 10px;
  color: var(--app-text);
  text-decoration: none;
  &:hover {
    background: var(--app-surface);
    .user-arrow {
      color: var(--app-text);
    }
  }
}
.user-avatar {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: var(--app-surface);
  color: var(--app-muted);
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.user-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  strong,
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  strong {
    font-size: 14px;
    font-weight: 550;
  }
  > span {
    color: var(--app-muted);
    font-size: 12px;
  }
}
.user-arrow {
  flex-shrink: 0;
  color: var(--app-muted);
}
.pagination {
  padding-top: 16px;
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 12px;
}
.list-state {
  display: flex;
  min-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--app-muted);
  text-align: center;
  font-size: 13px;
  h1 {
    color: var(--app-text);
    font-size: 20px;
  }
}
.list-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 20px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.8;
  span {
    font-size: 11px;
  }
  button {
    flex-shrink: 0;
    color: var(--app-accent);
  }
}
@media (max-width: 650px) {
  .user-list {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .pagination {
    flex-wrap: wrap;
  }
}
</style>
