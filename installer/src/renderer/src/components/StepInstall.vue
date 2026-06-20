<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  installing: boolean
  installFailed: boolean
  installError: string
  installProgress: number
  installLog: string[]
  progressStroke: string
}>()

const emit = defineEmits<{ feedback: [errorMsg: string, errorLog: string[]] }>()

const logEl = ref<HTMLElement | null>(null)

defineExpose({ logEl })
</script>

<template>
  <div class="step-panel step-panel--install">
    <div class="panel-header">
      <h2 class="panel-title" :class="{ 'title-failed': installFailed }">
        {{ installing ? '正在安装...' : installFailed ? '安装失败' : '安装完成' }}
      </h2>
      <p class="panel-sub">
        {{ installing ? '请稍候，安装程序正在处理必要文件。' : installFailed ? '请检查错误日志并重试。' : '所有文件已成功写入。' }}
      </p>
    </div>
    <div class="content-card content-card--flex">
      <div class="install-body">
        <!-- 左侧：进度环 -->
        <div class="install-left">
          <div class="ring-wrap">
            <svg class="ring-svg" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" class="ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="52"
                class="ring-fill"
                :style="{
                  strokeDashoffset: 326.7 * (1 - installProgress / 100),
                  stroke: progressStroke
                }"
              />
            </svg>
            <div class="ring-center">
              <span class="ring-pct">{{ installProgress }}<small>%</small></span>
            </div>
          </div>
        </div>
        <!-- 右侧：日志区 -->
        <div class="install-log-wrap">
          <div class="log-title">
            <svg viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
            安装日志
          </div>
          <div class="install-log" ref="logEl">
            <TransitionGroup name="log-item" tag="div">
              <div
                v-for="(line, i) in installLog"
                :key="i"
                class="log-line"
                :class="{
                  last: i === installLog.length - 1,
                  failed: installFailed && i === installLog.length - 1
                }"
              >
                <svg viewBox="0 0 24 24" class="log-dot">
                  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z" />
                </svg>
                {{ line }}
              </div>
            </TransitionGroup>
          </div>
        </div>
      </div>

      <!-- 安装失败时：反馈问题按钮（在日志区下方，更显眼） -->
      <div v-if="installFailed" class="fail-actions">
        <button class="btn-feedback-inline" @click="emit('feedback', installError, installLog)">
          <svg viewBox="0 0 24 24">
            <path d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z" />
          </svg>
          反馈问题
          <small>→ GitHub Issues</small>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-panel {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  display: flex;
  flex-direction: column;
}
.step-panel--install {
  display: flex;
  flex-direction: column;
}
.panel-header {
  margin-bottom: 24px;
  .panel-title {
    font-size: 21px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 5px;
    letter-spacing: -0.3px;
  }
  .panel-sub {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.38);
    margin: 0;
    line-height: 1.6;
  }
}
.title-failed {
  color: #f87171 !important;
}
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px 22px;
}
.content-card--flex {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.install-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 20px;
}
.install-left {
  flex: 0 0 156px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding-top: 8px;
}
.ring-wrap {
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
  .ring-svg {
    width: 140px;
    height: 140px;
    transform: rotate(-90deg);
  }
  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.07);
    stroke-width: 8;
  }
  .ring-fill {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    stroke-dasharray: 326.7;
    stroke-dashoffset: 326.7;
    transition: stroke-dashoffset 0.4s ease, stroke 0.5s ease;
  }
  .ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    .ring-pct {
      font-size: 28px;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.9);
      font-family: 'SF Mono', monospace;
      small {
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.38);
        margin-left: 1px;
      }
    }
  }
}
.install-log-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow: hidden;
}
.log-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  svg {
    width: 13px;
    height: 13px;
    fill: rgba(255, 255, 255, 0.22);
    flex-shrink: 0;
  }
}
.install-log {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
  }
  .log-line {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    padding: 5px 9px;
    border-radius: 7px;
    transition: all 0.25s;
    line-height: 1.5;
    width: 100%;
    box-sizing: border-box;
    word-break: break-all;
    &.last {
      color: rgba(255, 255, 255, 0.82);
      background: rgba(255, 255, 255, 0.05);
    }
    &.failed {
      color: #f87171;
      background: rgba(248, 113, 113, 0.08);
    }
    .log-dot {
      width: 6px;
      height: 6px;
      flex-shrink: 0;
      fill: rgba(255, 255, 255, 0.18);
      margin-top: 4px;
    }
    &.last .log-dot { fill: #4ade80; }
    &.failed .log-dot { fill: #f87171; }
  }
}
.log-item-enter-active { transition: all 0.22s ease; }
.log-item-enter-from { opacity: 0; transform: translateY(5px); }
.fail-actions {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.btn-feedback-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: #fbbf24;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  svg { width: 18px; height: 18px; fill: #fbbf24; }
  small { font-size: 11px; opacity: 0.6; font-weight: 400; }
  &:hover {
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.5);
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
    transform: translateY(-1px);
  }
}
</style>
