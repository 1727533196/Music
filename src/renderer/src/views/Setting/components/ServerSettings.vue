<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import SettingItem from './SettingItem.vue'

interface ServerStatus {
  running: boolean
  pid: number | null
  logs?: string[]
}

const status = ref<ServerStatus>({ running: false, pid: null })
const logs = ref<string[]>([])
const toggling = ref(false)
const showLogs = ref(false)
const logContainer = ref<HTMLElement | null>(null)

/** 初始化：拉取当前服务器状态 */
async function fetchStatus() {
  try {
    const res: ServerStatus = await window.electron.ipcRenderer.invoke('server:getStatus')
    status.value = { running: res.running, pid: res.pid }
    if (res.logs) logs.value = res.logs
  } catch (e) {
    console.error('获取服务器状态失败', e)
  }
}

/** 切换服务器开关 */
async function toggleServer(val: boolean) {
  toggling.value = true
  try {
    const channel = val ? 'server:start' : 'server:stop'
    const res: { success: boolean; message: string } =
      await window.electron.ipcRenderer.invoke(channel)
    if (res.success) {
      ElMessage.success(res.message)
    } else {
      ElMessage.warning(res.message)
      // 回滚开关到实际状态
      await fetchStatus()
    }
  } catch (e: any) {
    ElMessage.error(`操作失败：${e?.message || e}`)
    await fetchStatus()
  } finally {
    toggling.value = false
  }
}

/** 监听主进程推送的状态变化 */
function onStatusPush(_evt: any, s: ServerStatus) {
  status.value = { running: s.running, pid: s.pid }
}

/** 监听主进程推送的日志 */
function onLogPush(_evt: any, line: string) {
  logs.value.push(line)
  if (logs.value.length > 200) logs.value.shift()
  // 自动滚动到底部
  if (showLogs.value) {
    requestAnimationFrame(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  }
}

onMounted(() => {
  fetchStatus()
  window.electron.ipcRenderer.on('server:status', onStatusPush)
  window.electron.ipcRenderer.on('server:log', onLogPush)
})

onBeforeUnmount(() => {
  window.electron.ipcRenderer.removeListener('server:status', onStatusPush)
  window.electron.ipcRenderer.removeListener('server:log', onLogPush)
})
</script>

<template>
  <div class="settings-section">
    <h2 class="section-title">
      <v-icon icon="mdi-server" size="small" class="section-icon" />
      本地服务器
    </h2>

    <!-- 服务器开关 -->
    <div class="setting-item">
      <SettingItem
        label="本地 API 服务器"
        description="启动 ncm-server，为本地离线模式提供 API 支持"
      />
      <div class="server-switch-wrap">
        <v-switch
          :model-value="status.running"
          :loading="toggling"
          :disabled="toggling"
          color="success"
          hide-details
          density="compact"
          @update:model-value="toggleServer"
        />
        <span class="status-badge" :class="status.running ? 'running' : 'stopped'">
          <span class="status-dot" />
          {{ status.running ? '运行中' : '已停止' }}
          <span v-if="status.running && status.pid" class="pid-text">PID {{ status.pid }}</span>
        </span>
      </div>
    </div>

    <!-- 日志展开/收起 -->
    <div class="setting-item log-row">
      <SettingItem
        label="服务器日志"
        description="查看最近 200 条服务器输出"
      />
      <v-btn
        variant="tonal"
        size="small"
        :color="showLogs ? 'primary' : 'default'"
        @click="showLogs = !showLogs"
      >
        <v-icon :icon="showLogs ? 'mdi-chevron-up' : 'mdi-chevron-down'" start />
        {{ showLogs ? '收起' : '展开' }}
      </v-btn>
    </div>

    <transition name="log-slide">
      <div v-if="showLogs" class="log-panel">
        <div ref="logContainer" class="log-content">
          <div v-if="logs.length === 0" class="log-empty">暂无日志</div>
          <div
            v-for="(line, idx) in logs"
            :key="idx"
            class="log-line"
            :class="{
              'log-err': line.startsWith('[ERR]'),
              'log-sys': line.startsWith('[SYS]'),
              'log-info': line.startsWith('[INFO]')
            }"
          >{{ line }}</div>
        </div>
        <div class="log-footer">
          <v-btn
            variant="text"
            size="x-small"
            color="error"
            @click="logs = []"
          >
            <v-icon icon="mdi-delete-sweep" start />
            清空
          </v-btn>
          <span class="log-count">共 {{ logs.length }} 条</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style lang="less" scoped>
@import '../index.less';

.server-switch-wrap {
  display: flex;
  align-items: center;
  gap: 12px;

  .status-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 20px;
    transition: all 0.3s ease;

    &.running {
      color: #4caf50;
      background: rgba(76, 175, 80, 0.12);
      border: 1px solid rgba(76, 175, 80, 0.25);
    }

    &.stopped {
      color: rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;

      .running & {
        animation: pulse 1.8s ease-in-out infinite;
      }
    }

    .pid-text {
      font-size: 11px;
      opacity: 0.7;
      font-weight: 400;
    }
  }
}

.log-row {
  border-bottom: none !important;
}

.log-panel {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-top: 4px;
  overflow: hidden;

  .log-content {
    max-height: 220px;
    overflow-y: auto;
    padding: 12px 14px;
    font-family: 'Menlo', 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.7;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }

    .log-empty {
      color: rgba(255, 255, 255, 0.3);
      text-align: center;
      padding: 20px 0;
      font-size: 13px;
    }

    .log-line {
      white-space: pre-wrap;
      word-break: break-all;
      color: rgba(255, 255, 255, 0.6);

      &.log-err  { color: #ff6b6b; }
      &.log-sys  { color: rgba(255, 255, 255, 0.35); font-style: italic; }
      &.log-info { color: rgba(255, 255, 255, 0.75); }
    }
  }

  .log-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);

    .log-count {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.3);
    }
  }
}

/* 展开/收起动画 */
.log-slide-enter-active,
.log-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.log-slide-enter-from,
.log-slide-leave-to {
  opacity: 0;
  max-height: 0;
}
.log-slide-enter-to,
.log-slide-leave-from {
  opacity: 1;
  max-height: 400px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.75); }
}
</style>

