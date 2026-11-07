<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { AccessRestriction } from '@/utils/accessRestriction'

defineProps<{
  restriction: AccessRestriction
  subject: string
  userId?: number
  compact?: boolean
}>()
</script>

<template>
  <section class="access-notice" :class="{ compact }" role="status">
    <v-icon icon="mdi-lock-outline" :size="compact ? 24 : 36" aria-hidden="true" />
    <h2>{{ restriction === 'privacy' ? '内容受隐私设置保护' : '当前账号暂无查看权限' }}</h2>
    <p>
      {{ restriction === 'privacy' ? '对方已设置隐私权限，' : '' }}当前账号无法查看{{ subject }}。
    </p>
    <RouterLink v-if="userId" :to="{ name: 'userDetail', query: { uid: userId } }"
      >返回个人主页</RouterLink
    >
  </section>
</template>

<style scoped lang="less">
.access-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 280px;
  padding: 40px 20px;
  color: var(--app-muted);
  text-align: center;
  h2 {
    color: var(--app-text);
    font-size: 18px;
    font-weight: 600;
  }
  p {
    font-size: 13px;
    line-height: 1.8;
  }
  a {
    margin-top: 6px;
    padding: 7px 12px;
    border: 1px solid var(--app-border);
    border-radius: 7px;
    color: var(--app-text);
    font-size: 12px;
    text-decoration: none;
    &:hover {
      background: var(--app-surface);
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
  &.compact {
    min-height: 130px;
    padding: 20px 12px;
    gap: 8px;
    h2 {
      font-size: 14px;
    }
    p {
      font-size: 12px;
    }
  }
}
</style>
