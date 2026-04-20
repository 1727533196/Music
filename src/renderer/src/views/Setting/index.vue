<script setup lang="ts">
import { isElectron } from '@/utils'
import Versions from '@/components/Versions.vue'
import AppearanceSettings from './components/AppearanceSettings.vue'
import NetworkSettings from './components/NetworkSettings.vue'
import FontSettings from './components/FontSettings.vue'
import SystemSettings from './components/SystemSettings.vue'
import ShortcutSettings from './components/ShortcutSettings.vue'
import {useMusicAction} from "@/store/music";

const music = useMusicAction()

const handleShortcutTrigger = (value) => {
  console.log('value', value)
  switch (value) {
    case 'prev_track':
      console.log('上一首')
      // music.cutSongHandler(false)
      break
    case 'next_track':
      // music.cutSongHandler(true)
      break
    case 'volume_up':
      console.log('音量增加')
      break
    case 'play_pause':
      console.log('播放/暂停')
      break
    case 'toggle_lyrics':
      console.log('显示/隐藏歌词')
      break
    default:
  }

}
</script>

<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1 class="settings-title">设置</h1>
      <p class="settings-subtitle">个性化你的音乐体验</p>
    </div>

    <!-- 外观与显示设置 -->
    <AppearanceSettings />

    <!-- 网络设置 -->
    <NetworkSettings />

    <!-- 字体设置 -->
    <FontSettings />

    <!-- 快捷键设置 -->
    <ShortcutSettings @shortcut-trigger="handleShortcutTrigger"/>

    <!-- 系统设置 -->
    <SystemSettings />

    <!-- 版本信息 -->
    <div class="version-section" v-if="isElectron()">
      <Versions />
    </div>
  </div>
</template>

<style lang="less" scoped>
.settings-container {
  width: 100%;
  max-width: 1100px;
  margin: 0;
  padding: 40px 40px 40px 60px;

  .settings-header {
    margin-bottom: 40px;

    .settings-title {
      font-size: 32px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.95);
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }

    .settings-subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      font-weight: 400;
    }
  }

  .version-section {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}

// 响应式设计
@media (max-width: 900px) {
  .settings-container {
    padding: 32px 24px;

    .settings-header {
      .settings-title {
        font-size: 26px;
      }
    }

    :deep(.settings-section) {
      padding: 24px 24px;

      .setting-item {
        grid-template-columns: 1fr;
        gap: 16px;
        align-items: start;

        .item-label {
          padding-bottom: 8px;
        }

        .item-content {
          width: 100%;

          :deep(.v-text-field) {
            width: 100%;
          }
        }

        > .v-btn,
        > .v-switch,
        > .v-btn-toggle {
          width: 100%;
          justify-self: stretch;
        }
      }
    }
  }
}
</style>
