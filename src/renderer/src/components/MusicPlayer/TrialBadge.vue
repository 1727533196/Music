<script setup lang="ts">
defineProps<{ trial: boolean; light?: boolean }>()
</script>

<template>
  <span
    v-if="trial"
    class="trial-badge"
    :class="{ light }"
    role="note"
    aria-label="当前播放为试听片段"
    title="当前播放的是试听片段，完整播放取决于歌曲资源与账号权限。"
    >试听</span
  >
</template>

<style scoped>
.trial-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  vertical-align: middle;
  padding: 2px 5px;
  border: 1px solid var(--app-warning-border, #d5b89740);
  border-radius: 4px;
  color: var(--app-warning-text, #d5b897);
  background: var(--app-surface, #ffffff09);
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 1.2;
  white-space: nowrap;
}
.trial-badge.light {
  color: #ffffffe6;
  border-color: #ffffff59;
  background: #ffffff14;
}
</style>
