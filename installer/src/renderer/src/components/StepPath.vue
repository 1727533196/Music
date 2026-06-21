<script setup lang="ts">
defineProps<{
  installPath: string
  diskAvailableGB: string
  diskLabel: string
  diskRequiredMB: string
  diskUsedPct: number
  diskNewPct: number
}>()

const emit = defineEmits<{
  'update:installPath': [value: string]
  browse: []
}>()
</script>

<template>
  <div class="step-panel step-panel--path">
    <div class="panel-header">
      <h2 class="panel-title">安装位置</h2>
      <p class="panel-sub">选择应用程序的安装目录。</p>
    </div>
    <div class="content-card content-card--flex">
      <div class="path-section">
        <div class="path-row">
          <svg viewBox="0 0 24 24" class="path-icon">
            <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
          </svg>
          <input
            class="path-input"
            :value="installPath"
            type="text"
            @input="emit('update:installPath', ($event.target as HTMLInputElement).value)"
            @blur="emit('update:installPath', installPath)"
          />
          <button class="browse-btn" @click="emit('browse')">浏览…</button>
        </div>

        <div class="disk-block">
          <div class="disk-top">
            <span>{{ diskLabel }}</span>
            <span>{{ diskAvailableGB }} 可用</span>
          </div>
          <div class="disk-bar">
            <div class="disk-used" />
            <div class="disk-new" />
          </div>
          <div class="disk-legend">
            <span><i class="dot used" />已使用</span>
            <span><i class="dot new" />本次安装</span>
            <span><i class="dot free" />可用</span>
          </div>
        </div>

        <div class="space-cards">
          <div class="space-card">
            <span class="sc-label">需要空间</span>
            <span class="sc-val">{{ diskRequiredMB }}</span>
          </div>
          <div class="space-card">
            <span class="sc-label">可用空间</span>
            <span class="sc-val ok">{{ diskAvailableGB }}</span>
          </div>
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
.step-panel--path {
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
.content-card--flex {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.path-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.path-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  flex-shrink: 0;
  .path-icon {
    width: 17px;
    height: 17px;
    fill: rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }
  .path-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12.5px;
    font-family: 'SF Mono', monospace;
  }
  .browse-btn {
    padding: 5px 13px;
    border-radius: 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.6);
    font-size: 11.5px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.9);
    }
  }
}
.disk-block {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 0;
  border-radius: 0;
  border: none;
  background: transparent;
  .disk-top {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 14px;
  }
  .disk-bar {
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
    display: flex;
    margin-bottom: 10px;
    .disk-used {
      flex: 0 0 v-bind('diskUsedPct + "%"');
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 4px 0 0 4px;
    }
    .disk-new {
      flex: 0 0 v-bind('diskNewPct + "%"');
      height: 100%;
      background: rgba(74, 222, 128, 0.7);
    }
  }
  .disk-legend {
    display: flex;
    gap: 14px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    .dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    }
    .dot.used { background: #8b5cf6; }
    .dot.new { background: rgba(74, 222, 128, 0.7); }
    .dot.free {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  }
}
.space-cards {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  .space-card {
    flex: 1;
    padding: 16px 0;
    border-radius: 0;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 5px;
    .sc-label {
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.35);
      font-weight: 500;
    }
    .sc-val {
      font-size: 22px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
      font-family: 'SF Mono', monospace;
      letter-spacing: -0.5px;
    }
    .sc-val.ok {
      color: #4ade80;
    }
  }
}
</style>
