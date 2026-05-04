<script setup lang="ts">
import { reactive } from 'vue'

const versions = reactive({ ...window.electron.process.versions })
</script>

<template>
  <div class="versions-container">
    <h3 class="title">版本信息</h3>
    <ul class="versions">
      <li class="version-item electron-version">
        <span class="label">Electron</span>
        <span class="value">v{{ versions.electron }}</span>
      </li>
      <li class="version-item chrome-version">
        <span class="label">Chromium</span>
        <span class="value">v{{ versions.chrome }}</span>
      </li>
      <li class="version-item node-version">
        <span class="label">Node.js</span>
        <span class="value">v{{ versions.node }}</span>
      </li>
      <li class="version-item app-version">
        <span class="label">Music Player</span>
        <span class="value">v1.0</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.versions-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  max-width: 400px;
  margin: 20px 0;
}

.title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  text-align: left;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.versions {
  list-style: none;
  padding: 0;
  margin: 0;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.version-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.version-item:last-child {
  margin-bottom: 0;
}

.label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: 14px;
}

.value {
  color: white;
  font-weight: 600;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  min-width: 80px;
  text-align: center;
}

/* 特定版本的样式 */
.electron-version .value {
  background: rgba(52, 152, 219, 0.3);
}

.chrome-version .value {
  background: rgba(231, 76, 60, 0.3);
}

.node-version .value {
  background: rgba(46, 204, 113, 0.3);
}

.app-version .value {
  background: rgba(155, 89, 182, 0.3);
}
</style>
