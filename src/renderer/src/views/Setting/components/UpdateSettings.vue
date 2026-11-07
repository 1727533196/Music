<script setup lang="ts">
import { computed } from 'vue'
import { useUpdates } from '@/store/updates'

const updates = useUpdates()
const state = computed(() => updates.state)
const busy = computed(() =>
  ['checking', 'downloading', 'installing'].includes(state.value?.status || '')
)
const speedLabel = computed(() => {
  const speed = state.value?.bytesPerSecond || 0
  if (speed <= 0) return '正在连接…'
  return speed >= 1024 * 1024
    ? `${(speed / 1024 / 1024).toFixed(1)} MB/s`
    : `${(speed / 1024).toFixed(0)} KB/s`
})
</script>

<template>
  <section v-if="state" class="settings-section" aria-labelledby="update-title">
    <h2 id="update-title" class="section-title">应用更新</h2>
    <div class="update-heading">
      <div>
        <p>当前版本 {{ state.currentVersion }}</p>
        <p v-if="!state.supported" class="muted">当前平台暂不支持应用内更新。</p>
        <p v-else-if="!state.canInstall" class="muted">
          开发模式可检查版本，安装更新需使用已安装的应用。
        </p>
      </div>
      <v-btn
        variant="outlined"
        :disabled="busy || !state.supported"
        @click="updates.action('check')"
      >
        {{ state.status === 'checking' ? '正在检查…' : '检查更新' }}
      </v-btn>
    </div>
    <div v-if="state.release" class="release-card">
      <strong>新版本 {{ state.release.version }}</strong>
      <p class="muted">
        安装包 {{ (state.release.size / 1024 / 1024).toFixed(1) }} MB · 更新将保留登录信息和设置
      </p>
      <p v-if="state.release.notes" class="release-notes">{{ state.release.notes }}</p>
      <template v-if="state.status === 'downloading'">
        <progress :value="state.progress" max="100" aria-label="更新下载进度" />
        <div class="update-actions">
          <span class="download-status"
            >正在下载 {{ state.progress }}% · {{ speedLabel
            }}<small v-if="state.downloadSource">{{ state.downloadSource }}</small></span
          >
          <v-btn variant="text" @click="updates.action('cancel')">取消下载</v-btn>
        </div>
      </template>
      <div v-else class="update-actions">
        <v-btn v-if="state.status === 'ready'" variant="tonal" @click="updates.action('install')"
          >重启更新</v-btn
        >
        <v-btn
          v-else-if="state.status !== 'installing'"
          variant="tonal"
          :disabled="busy || !state.canInstall"
          @click="updates.action('download')"
        >
          {{ state.status === 'error' ? '重新下载' : '下载更新' }}
        </v-btn>
        <span v-if="state.status === 'ready'" class="muted"
          >安装包已校验，点击后将停止播放并重启。</span
        >
      </div>
    </div>
    <p
      v-if="state.message"
      class="update-message"
      :class="{ error: state.status === 'error' }"
      role="status"
    >
      {{ state.message }}
    </p>
  </section>
</template>

<style scoped lang="less">
@import '../index.less';
.update-heading,
.update-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
p {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.6;
}
.muted {
  color: var(--app-muted);
  font-size: 12px;
}
.release-card {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-panel);
}
.release-notes {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 240px;
  overflow-y: auto;
}
.update-actions {
  margin-top: 12px;
  justify-content: flex-start;
  flex-wrap: wrap;
}
progress {
  width: 100%;
  height: 8px;
  accent-color: var(--app-accent);
}
.update-message {
  color: var(--app-muted);
}
.download-status {
  font-variant-numeric: tabular-nums;
}
.download-status small {
  display: block;
  margin-top: 4px;
  color: var(--app-muted);
}
.error {
  color: var(--app-danger-text);
}
</style>
