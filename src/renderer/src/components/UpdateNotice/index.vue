<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUpdates } from '@/store/updates'

const updates = useUpdates()
const router = useRouter()
const visible = computed(
  () =>
    updates.state?.canInstall &&
    updates.state.release &&
    ['available', 'ready'].includes(updates.state.status) &&
    updates.dismissedVersion !== `${updates.state.release.version}:${updates.state.status}`
)
function dismiss() {
  updates.dismissedVersion = `${updates.state?.release?.version}:${updates.state?.status}`
}
function show() {
  dismiss()
  void router.push({ path: '/setting', query: { tab: 'general' } })
}
</script>

<template>
  <aside v-if="visible" class="update-notice no-drag" role="status" aria-label="应用更新通知">
    <div>
      <strong>{{ updates.state?.status === 'ready' ? '更新已准备好' : '发现新版本' }}</strong>
      <p>
        音乐 {{ updates.state?.release?.version
        }}{{
          updates.state?.status === 'ready'
            ? ' 已下载，可随时重启更新。'
            : ' 已发布，可前往设置下载。'
        }}
      </p>
    </div>
    <div class="notice-actions">
      <button type="button" @click="dismiss">稍后</button>
      <button type="button" @click="show">查看更新</button>
    </div>
  </aside>
</template>

<style scoped>
.update-notice {
  position: fixed;
  z-index: 2100;
  right: 24px;
  bottom: 110px;
  max-width: min(360px, calc(100vw - 48px));
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: 0 8px 32px #0003;
}
strong {
  font-size: 14px;
}
p {
  margin: 8px 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-muted);
}
.notice-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
button {
  padding: 6px 10px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-surface);
  color: var(--app-text);
  cursor: pointer;
}
button:hover {
  background: var(--app-hover);
}
</style>
