<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { message } from '@/utils/message'
import SettingItem from './SettingItem.vue'

interface ServerStatus {
  running: boolean
  pid: number | null
  logs?: string[]
}
const status = ref<ServerStatus>({ running: false, pid: null })
const logs = ref<string[]>([])
const toggling = ref(false)
const fetching = ref(true)
const statusKnown = ref(false)
const statusError = ref(false)
const showLogs = ref(false)
const logContainer = ref<HTMLElement | null>(null)
const statusText = computed(() =>
  fetching.value && !statusKnown.value
    ? '正在获取状态…'
    : statusError.value
      ? '状态获取失败'
      : status.value.running
        ? '运行中'
        : '已停止'
)
let active = true
let statusVersion = 0
const disposeListeners: Array<() => void> = []

async function fetchStatus() {
  const version = statusVersion
  fetching.value = true
  try {
    const ipc = window.electron?.ipcRenderer
    if (!ipc) throw new Error('IPC unavailable')
    const result: ServerStatus = await ipc.invoke('server:getStatus')
    if (!active || version !== statusVersion) return
    if (!result || typeof result.running !== 'boolean') throw new Error('Invalid server status')
    status.value = { running: result.running, pid: result.pid ?? null }
    statusKnown.value = true
    statusError.value = false
    if (Array.isArray(result.logs))
      logs.value = result.logs.filter((line) => typeof line === 'string').slice(-200)
  } catch (error) {
    if (active && version === statusVersion) statusError.value = true
    console.error('获取服务器状态失败', error)
  } finally {
    if (active) fetching.value = false
  }
}

async function toggleServer(value: boolean | null) {
  if (
    toggling.value ||
    fetching.value ||
    !statusKnown.value ||
    statusError.value ||
    typeof value !== 'boolean'
  )
    return
  toggling.value = true
  try {
    const result: { success: boolean; message: string } = await window.electron.ipcRenderer.invoke(
      value ? 'server:start' : 'server:stop'
    )
    if (!active) return
    if (result.success) message.success(result.message)
    else message.warning(result.message || '服务器状态未更改')
  } catch (error) {
    if (active)
      message.error(`操作失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    if (active) {
      await fetchStatus()
      toggling.value = false
    }
  }
}

function onStatusPush(_event: unknown, value: ServerStatus) {
  if (!active || !value || typeof value.running !== 'boolean') return
  statusVersion++
  status.value = { running: value.running, pid: value.pid ?? null }
  statusKnown.value = true
  statusError.value = false
}
function onLogPush(_event: unknown, line: string) {
  if (!active || typeof line !== 'string') return
  const element = logContainer.value
  const nearBottom =
    !element || element.scrollHeight - element.scrollTop - element.clientHeight < 32
  logs.value = [...logs.value, line].slice(-200)
  if (showLogs.value && nearBottom) void scrollLogs()
}
async function scrollLogs() {
  await nextTick()
  if (active && logContainer.value) logContainer.value.scrollTop = logContainer.value.scrollHeight
}
function toggleLogs() {
  showLogs.value = !showLogs.value
  if (showLogs.value) void scrollLogs()
}

onMounted(() => {
  const ipc = window.electron?.ipcRenderer
  if (ipc) {
    disposeListeners.push(ipc.on('server:status', onStatusPush), ipc.on('server:log', onLogPush))
  }
  void fetchStatus()
})
onBeforeUnmount(() => {
  active = false
  disposeListeners.forEach((dispose) => dispose())
})
</script>

<template>
  <section class="settings-section" aria-labelledby="server-settings-title">
    <h2 id="server-settings-title" class="section-title">本地服务</h2>
    <div class="setting-item setting-item-compact">
      <SettingItem
        label="本地 API 服务器"
        description="在本机运行音乐 API 服务，启动后可连接本地服务器地址。"
      />
      <div class="item-content server-controls">
        <span
          class="server-status"
          :class="{ running: statusKnown && !statusError && status.running }"
          role="status"
          >{{ statusText }}</span
        >
        <button
          v-if="statusError"
          type="button"
          class="text-action"
          :disabled="fetching"
          @click="fetchStatus"
        >
          重试
        </button>
        <v-switch
          :model-value="status.running"
          :loading="toggling || fetching"
          :disabled="toggling || fetching || !statusKnown || statusError"
          aria-label="本地 API 服务器开关"
          color="var(--app-accent)"
          hide-details
          density="compact"
          @update:model-value="toggleServer"
        />
      </div>
    </div>
    <div class="setting-item setting-item-compact">
      <SettingItem label="服务器日志" description="查看最近 200 条输出，便于检查连接和运行情况。" />
      <div class="item-content">
        <button
          type="button"
          class="log-toggle"
          :aria-expanded="showLogs"
          aria-controls="server-log-panel"
          @click="toggleLogs"
        >
          {{ showLogs ? '收起日志' : '查看日志'
          }}<v-icon :icon="showLogs ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="17" />
        </button>
      </div>
    </div>
    <div v-if="showLogs" id="server-log-panel" class="log-panel">
      <div class="log-header">
        <span>{{ status.running && status.pid ? `PID ${status.pid}` : '服务器输出' }}</span
        ><span>{{ logs.length }} 条</span>
      </div>
      <div
        ref="logContainer"
        class="log-content"
        role="region"
        aria-label="服务器日志"
        tabindex="0"
      >
        <div v-if="!logs.length" class="log-empty">
          <p>暂无日志</p>
          <span>{{
            status.running ? '服务产生的新输出会显示在这里。' : '服务启动后的输出会显示在这里。'
          }}</span>
        </div>
        <div
          v-for="(line, index) in logs"
          :key="index"
          class="log-line"
          :class="{ 'log-error': line.startsWith('[ERR]') }"
        >
          {{ line }}
        </div>
      </div>
      <div class="log-footer">
        <button type="button" class="text-action" :disabled="!logs.length" @click="logs = []">
          清空显示
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
@import '../index.less';
.settings-section .setting-item .item-content {
  align-items: center;
  justify-content: flex-end;
}
.server-controls {
  gap: 14px;
  :deep(.v-switch) {
    flex: 0 0 auto;
  }
}
.server-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--app-muted);
  font-size: 13px;
  white-space: nowrap;
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.65;
  }
  &.running {
    color: var(--app-accent);
  }
}
.text-action,
.log-toggle {
  color: var(--app-text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
.text-action {
  background: transparent;
  border: 0;
  color: var(--app-accent);
  padding: 4px 0;
}
.log-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: var(--app-control-height, 36px);
  padding: 0 13px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-control-radius, 10px);
  background: var(--app-surface);
  &:hover {
    background: var(--app-surface-strong);
  }
}
.log-panel {
  margin-top: 4px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-control-radius, 10px);
  overflow: hidden;
  background: var(--app-surface);
}
.log-header,
.log-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--app-muted);
}
.log-header {
  border-bottom: 1px solid var(--app-border);
}
.log-footer {
  border-top: 1px solid var(--app-border);
}
.log-content {
  min-width: 0;
  max-height: 220px;
  overflow: auto;
  padding: 12px 14px;
  color: var(--app-muted);
  font:
    12px/1.8 Menlo,
    Consolas,
    monospace;
  &:focus-visible {
    outline: 1px solid var(--app-accent);
    outline-offset: -2px;
  }
}
.log-line {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  &.log-error {
    color: var(--app-danger-text);
  }
}
.log-empty {
  margin: 0;
  padding: 18px 0;
  text-align: center;
  font-family: inherit;
  p {
    margin: 0 0 4px;
    color: var(--app-text);
    font-size: 13px;
  }
  span {
    font-size: 12px;
  }
}
@media (max-width: 760px) {
  .settings-section .setting-item .item-content {
    justify-content: flex-start;
  }
  .server-controls {
    flex-wrap: wrap;
    gap: 10px;
  }
  .log-header,
  .log-footer {
    padding-inline: 12px;
  }
  .log-content {
    padding-inline: 12px;
  }
}
</style>
