<script setup lang="ts">
defineProps<{
  installedAppPath: string
  installPath: string
}>()
</script>

<template>
  <div class="step-panel step-panel--finish">
    <div class="content-card">
      <div class="finish-layout">
        <div class="finish-icon-wrap">
          <svg viewBox="0 0 24 24" class="finish-icon">
            <path d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8L10,17Z" />
          </svg>
          <div class="sparkle s1" />
          <div class="sparkle s2" />
          <div class="sparkle s3" />
          <div class="sparkle s4" />
        </div>
        <div class="finish-text">
          <h1 class="finish-title">安装成功！</h1>
          <p class="finish-desc">音乐已成功安装到你的电脑，立即开始探索音乐世界吧。</p>
          <div class="finish-path">
            <svg viewBox="0 0 24 24">
              <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
            </svg>
            <code>{{ installedAppPath || installPath }}</code>
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
.step-panel--finish {
  justify-content: center;
}
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px 22px;
}
.finish-layout {
  display: flex;
  align-items: center;
  gap: 40px;
  width: 100%;
}
.finish-icon-wrap {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  .finish-icon {
    position: absolute;
    inset: 9px;
    fill: #4ade80;
    filter: drop-shadow(0 0 16px rgba(74, 222, 128, 0.55));
    animation: successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .sparkle {
    position: absolute;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4ade80;
    animation: sparkleOut 0.8s ease-out both;
  }
  .s1 { top: 3px; left: 50%; animation-delay: 0.1s; }
  .s2 { top: 50%; right: 3px; animation-delay: 0.2s; }
  .s3 { bottom: 3px; left: 50%; animation-delay: 0.15s; }
  .s4 { top: 50%; left: 3px; animation-delay: 0.25s; }
}
.finish-text {
  flex: 1;
  .finish-title {
    font-size: 28px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 10px;
    letter-spacing: -0.5px;
  }
  .finish-desc {
    font-size: 13.5px;
    color: rgba(255, 255, 255, 0.42);
    line-height: 1.7;
    margin: 0 0 18px;
  }
  .finish-path {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 9px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    svg {
      width: 13px;
      height: 13px;
      fill: rgba(255, 255, 255, 0.3);
      flex-shrink: 0;
    }
    code {
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
    }
  }
}
@keyframes successPop {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes sparkleOut {
  0% { transform: scale(1) translate(0, 0); opacity: 1; }
  100% { transform: scale(0) translate(var(--tx, 18px), var(--ty, -18px)); opacity: 0; }
}
</style>
