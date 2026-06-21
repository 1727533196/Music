<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  options: Record<string, boolean>
  optionDefs: Record<string, { label: string; desc: string; icon: string }>
  showServerWarning: boolean
}>()

const emit = defineEmits<{
  'update:options': [opts: Record<string, boolean>]
}>()

const serverWarningEl = ref<HTMLElement | null>(null)

defineExpose({ serverWarningEl })
</script>

<template>
  <div class="step-panel">
    <div class="panel-header">
      <h2 class="panel-title">安装选项</h2>
      <p class="panel-sub">根据需要自定义安装选项。</p>
    </div>
    <div class="content-card">
      <div class="options-list">
        <div
          v-for="(item, key) in optionDefs"
          :key="key"
          class="option-row"
          :class="{ 'option-row--highlight': key === 'installServer' }"
          @click="emit('update:options', { ...JSON.parse(JSON.stringify(options)), [key]: !options[key] })"
        >
          <div class="option-left">
            <svg viewBox="0 0 24 24" class="opt-icon"><path :d="item.icon" /></svg>
            <div>
              <div class="opt-title">
                {{ item.label }}
                <span v-if="key === 'installServer'" class="opt-badge">推荐</span>
              </div>
              <div class="opt-desc">{{ item.desc }}</div>
            </div>
          </div>
          <div class="toggle" :class="{ on: options[key] }">
            <div class="toggle-thumb" />
          </div>
        </div>
      </div>

      <!-- 服务器未安装的警告提示 -->
      <div v-if="showServerWarning" ref="serverWarningEl" class="server-warning">
        <svg viewBox="0 0 24 24" class="warning-icon">
          <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
        </svg>
        <div class="warning-text">
          <strong>注意：</strong>未安装本地服务器将无法使用在线功能（播放、搜索、歌单等）。如需使用，请手动启动
          NeteaseCloudMusicApi 服务。
        </div>
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
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px 22px;
}
.options-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  border-radius: 11px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .option-left {
    display: flex;
    align-items: center;
    gap: 13px;
  }
  .opt-icon {
    width: 19px;
    height: 19px;
    fill: rgba(129, 140, 248, 0.7);
    flex-shrink: 0;
  }
  .opt-title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.78);
    margin-bottom: 2px;
  }
  .opt-desc {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.32);
    line-height: 1.5;
  }
}
.option-row--highlight {
  background: transparent;
  border-color: transparent !important;
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: transparent !important;
  }
  .opt-icon {
    fill: #818cf8;
  }
}
.opt-badge {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.35);
  vertical-align: middle;
}
.toggle {
  width: 42px;
  height: 23px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
  &.on {
    background: #6366f1;
    border-color: #6366f1;
  }
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  &.on .toggle-thumb {
    left: 21px;
    background: #fff;
  }
}
.server-warning {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.25);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  animation: warningFadeIn 0.3s ease;
  .warning-icon {
    width: 20px;
    height: 20px;
    fill: #fbbf24;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .warning-text {
    font-size: 12px;
    color: rgba(251, 191, 36, 0.9);
    line-height: 1.6;
    strong {
      font-weight: 600;
      color: #fbbf24;
    }
  }
}
@keyframes warningFadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
