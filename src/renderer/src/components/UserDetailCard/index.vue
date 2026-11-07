<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { Profile } from '@/api/user'

interface Props {
  userInfo: Profile
  identify: {
    actionUrl?: string
    imageDesc?: string
    imageUrl?: string
    level: number
  }
  location: string
}
const props = defineProps<Props>()
const followingCount = computed(() => props.userInfo.follows ?? props.userInfo.newFollows)
const connectionsRoute = (type: 'following' | 'followers') => ({
  name: 'follow',
  query: { uid: props.userInfo.userId, type, nickname: props.userInfo.nickname }
})
const failedAvatar = ref(false)
watch(
  () => props.userInfo.avatarUrl,
  () => {
    failedAvatar.value = false
  }
)
</script>

<template>
  <header class="user-heading">
    <div class="user-avatar">
      <v-icon icon="mdi-account-outline" size="54" aria-hidden="true" />
      <img
        v-if="userInfo.avatarUrl && !failedAvatar"
        :src="userInfo.avatarUrl"
        :alt="userInfo.nickname || '用户头像'"
        @error="failedAvatar = true"
      />
    </div>
    <div class="user-info">
      <p class="eyebrow">个人主页</p>
      <h1>{{ userInfo.nickname || '音乐听众' }}</h1>
      <div
        v-if="identify.level != null || identify.imageDesc || (location && location !== '未知')"
        class="user-meta"
      >
        <span v-if="identify.level != null" class="level">Lv.{{ identify.level }}</span>
        <span v-if="identify.imageDesc">{{ identify.imageDesc }}</span>
        <span v-if="location && location !== '未知'"
          ><v-icon icon="mdi-map-marker-outline" size="14" />{{ location }}</span
        >
      </div>
      <p v-if="userInfo.signature" class="signature" :title="userInfo.signature">
        {{ userInfo.signature }}
      </p>
      <div class="user-stats">
        <RouterLink
          v-if="userInfo.eventCount != null"
          :to="{ name: 'userEvents', query: { uid: userInfo.userId, nickname: userInfo.nickname } }"
        >
          <span class="stat-value">{{ userInfo.eventCount.toLocaleString() }}</span>
          <span class="stat-label">动态</span>
        </RouterLink>
        <RouterLink v-if="followingCount != null" :to="connectionsRoute('following')">
          <span class="stat-value">{{ followingCount.toLocaleString() }}</span>
          <span class="stat-label">关注</span>
        </RouterLink>
        <RouterLink v-if="userInfo.followeds != null" :to="connectionsRoute('followers')">
          <span class="stat-value">{{ userInfo.followeds.toLocaleString() }}</span>
          <span class="stat-label">粉丝</span>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style lang="less" scoped>
.user-heading {
  display: flex;
  align-items: center;
  gap: 28px;
  min-width: 0;
  padding: 28px var(--app-gutter) 30px;
}
.user-avatar {
  position: relative;
  display: grid;
  flex: 0 0 152px;
  place-items: center;
  width: 152px;
  aspect-ratio: 1;
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
.user-info {
  flex: 1;
  min-width: 0;
  h1 {
    margin: 0 0 10px;
    color: var(--app-text);
    font-size: var(--app-title-size);
    font-weight: 650;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
}
.eyebrow {
  margin-bottom: 7px;
  color: var(--app-muted);
  font-size: 11px;
  letter-spacing: 0.16em;
}
.user-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  color: var(--app-muted);
  font-size: 12px;
  > span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .level {
    padding: 2px 7px;
    border: 1px solid var(--app-border);
    border-radius: 5px;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
}
.signature {
  display: -webkit-box;
  max-width: 680px;
  margin: 12px 0 0;
  overflow: hidden;
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.user-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-top: 18px;
  > div,
  > a {
    display: flex;
    align-items: baseline;
    gap: 7px;
  }
  > a {
    border-radius: 4px;
    text-decoration: none;
    &:hover .stat-label,
    &:hover .stat-value {
      color: var(--app-accent);
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 5px;
    }
  }
  .stat-label {
    color: var(--app-muted);
    font-size: 12px;
  }
  .stat-value {
    margin: 0;
    color: var(--app-text);
    font-size: 16px;
    font-weight: 550;
    font-variant-numeric: tabular-nums;
  }
}
@media (max-width: 650px) {
  .user-heading {
    align-items: flex-start;
    gap: 18px;
    padding-top: 22px;
  }
  .user-avatar {
    flex-basis: 96px;
    width: 96px;
  }
  .user-stats {
    gap: 9px 16px;
    > div,
    > a {
      gap: 5px;
    }
  }
}
@media (max-width: 420px) {
  .user-heading {
    gap: 14px;
  }
  .user-avatar {
    flex-basis: 72px;
    width: 72px;
  }
  .user-stats {
    gap: 8px 12px;
    .stat-value {
      font-size: 14px;
    }
  }
}
</style>
