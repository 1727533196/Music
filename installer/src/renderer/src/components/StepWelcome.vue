<script setup lang="ts">
// Step 0: 欢迎页 — 纯展示组件
</script>

<template>
  <div class="step-panel step-panel--welcome">
    <div class="panel-header">
      <h2 class="panel-title">欢迎安装 <em class="panel-title-em">音乐</em></h2>
      <p class="panel-sub">一款优雅的桌面音乐播放器，支持网易云音乐账号登录。</p>
    </div>
    <div class="content-card">
      <div class="welcome-hero">
        <div class="hero-icon-wrap">
          <svg viewBox="0 0 24 24" class="hero-icon">
            <path
              d="M12,3V12.26C11.5,12.09 11,12 10.5,12C8,12 6,14 6,16.5C6,19 8,21 10.5,21C13,21 15,19 15,16.5V6H19V3H12Z"
            />
          </svg>
          <div class="hero-ring" />
          <div class="hero-ring ring2" />
        </div>
        <div class="welcome-hero-text">
          <p class="welcome-desc">全平台桌面音乐播放器，运行流畅、界面简洁</p>
          <div class="welcome-chips">
            <span class="chip">
              <svg viewBox="0 0 24 24">
                <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z" />
              </svg>
              高清音质
            </span>
            <span class="chip">
              <svg viewBox="0 0 24 24">
                <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z" />
              </svg>
              歌词同步
            </span>
            <span class="chip">
              <svg viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6Z" />
              </svg>
              开源免费
            </span>
          </div>
        </div>
      </div>
      <div class="welcome-divider" />
      <div class="welcome-grid">
        <div class="feature-item">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z" />
            </svg>
          </div>
          <div>
            <div class="feature-name">高清无损音质</div>
            <div class="feature-desc">支持 FLAC、APE、WAV 等无损格式</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z" />
            </svg>
          </div>
          <div>
            <div class="feature-name">歌词实时同步</div>
            <div class="feature-desc">逐字高亮显示，沉浸式听歌体验</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M8.46,14.45L6.35,16.56L5,15.21L7.1,13.1C6.4,11.84 6.4,10.3 7.1,9.03L5,6.93L6.35,5.57L8.46,7.68C9.73,6.97 11.27,6.97 12.54,7.68L14.65,5.57L16,6.93L13.9,9.03C14.6,10.3 14.6,11.84 13.9,13.1L16,15.21L14.65,16.56L12.54,14.45C11.27,15.16 9.73,15.16 8.46,14.45Z" />
            </svg>
          </div>
          <div>
            <div class="feature-name">个性化推荐</div>
            <div class="feature-desc">基于你的喜好，智能推送每日歌单</div>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M4,1H20A1,1 0 0,1 21,2V6A1,1 0 0,1 20,7H4A1,1 0 0,1 3,6V2A1,1 0 0,1 4,1M4,9H20A1,1 0 0,1 21,10V14A1,1 0 0,1 20,15H4A1,1 0 0,1 3,14V10A1,1 0 0,1 4,9M4,17H20A1,1 0 0,1 21,18V22A1,1 0 0,1 20,23H4A1,1 0 0,1 3,22V18A1,1 0 0,1 4,17M9,5H10V3H9V5M9,13H10V11H9V13M9,21H10V19H9V21M5,3V5H8V3H5M5,11V13H8V11H5M5,19V21H8V19H5Z" />
            </svg>
          </div>
          <div>
            <div class="feature-name">本地 API 服务器</div>
            <div class="feature-desc">内置网易云 API，后台运行稳定可靠</div>
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
.step-panel--welcome {
  justify-content: center;
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
.panel-title-em {
  font-style: normal;
  color: #a5b4fc;
}
.content-card {
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 20px 22px;
}
.welcome-hero {
  display: flex;
  align-items: center;
  gap: 18px;
}
.hero-icon-wrap {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  .hero-icon {
    position: absolute;
    inset: 11px;
    fill: #818cf8;
    filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6));
    animation: heroFloat 3s ease-in-out infinite;
  }
  .hero-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid rgba(99, 102, 241, 0.25);
    animation: ringPulse 2.5s ease-out infinite;
  }
  .ring2 {
    animation-delay: 1.2s;
  }
}
.welcome-hero-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.welcome-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.6;
  margin: 0;
}
.welcome-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  svg {
    width: 11px;
    height: 11px;
    fill: #818cf8;
    flex-shrink: 0;
  }
  transition: all 0.2s;
  &:hover {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.35);
    color: #a5b4fc;
  }
}
.welcome-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 16px 0;
}
.welcome-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  background: transparent;
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}
.feature-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.22);
  svg {
    width: 15px;
    height: 15px;
    fill: #818cf8;
  }
}
.feature-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 3px;
}
.feature-desc {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.32);
  line-height: 1.4;
}
@keyframes heroFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes ringPulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}
</style>
