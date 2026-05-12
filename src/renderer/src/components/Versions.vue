<script setup lang="ts">
import { reactive, computed } from 'vue'
import SettingItem from '@/views/Setting/components/SettingItem.vue'
import logoPng from '@/assets/logo.png'

const versions = reactive({ ...window.electron.process.versions })

// 版本信息配置
const versionItems = computed(() => [
  {
    key: 'app',
    label: 'Music Player',
    description: '音乐播放器应用版本',
    iconType: 'image',
    iconSrc: logoPng,
    color: '#ff1168',
    value: 'v1.0',
    minVersionWidth: '50px',
    isGradient: true
  },
  {
    key: 'electron',
    label: 'Electron',
    description: '应用框架版本',
    icon: 'mdi-electron-framework',
    color: '#3498db',
    value: `v${versions.electron}`,
    minVersionWidth: '65px'
  },
  {
    key: 'chrome',
    label: 'Chromium',
    description: '浏览器内核版本',
    icon: 'mdi-google-chrome',
    color: '#e74c3c',
    value: `v${versions.chrome}`,
    minVersionWidth: '90px'
  },
  {
    key: 'node',
    label: 'Node.js',
    description: 'JavaScript 运行时版本',
    icon: 'mdi-nodejs',
    color: '#2ecc71',
    value: `v${versions.node}`,
    minVersionWidth: '65px'
  },
])
</script>

<template>
  <div class="version-section">
    <h2 class="section-title">
      <img src="@/assets/logo.png" alt="Music Logo" class="section-logo" />
      版本信息
    </h2>

    <div class="version-row">
      <div
        v-for="item in versionItems"
        :key="item.key"
        class="version-card"
        :class="item.key"
        :style="{ '--theme-color': item.color }"
      >
        <!-- Vuetify 图标 -->
        <v-icon
          v-if="!item.iconType || item.iconType === 'icon'"
          :icon="item.icon"
          size="28"
          class="version-icon"
        ></v-icon>

        <!-- 图片图标 -->
        <img
          v-else-if="item.iconType === 'image'"
          :src="item.iconSrc"
          :alt="item.label"
          class="version-icon-img"
        />

        <SettingItem
          :label="item.label"
          :description="item.description"
        />

        <span
          class="version-value"
          :class="{ 'gradient-bg': item.isGradient }"
          :style="{ minWidth: item.minVersionWidth }"
        >
          {{ item.value }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.version-section {
  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 24px 0;
    display: flex;
    align-items: center;
    gap: 10px;

    .section-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
      opacity: 0.9;
    }
  }

  .version-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .version-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    min-height: 100px;
    height: 100%;
    box-sizing: border-box;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: currentColor;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

      &::before {
        opacity: 1;
      }

      .version-icon,
      .version-icon-img {
        transform: scale(1.1);
      }

      .version-value {
        transform: scale(1.05);
      }
    }

    &.electron {
      --theme-color: #3498db;
      color: var(--theme-color);

      &:hover {
        box-shadow: 0 8px 24px rgba(52, 152, 219, 0.2);
      }

      .version-value {
        background: rgba(52, 152, 219, 0.15);
        color: var(--theme-color);
        border: 1px solid rgba(52, 152, 219, 0.3);
        font-size: 11px;
        padding: 3px 8px;

        &:hover {
          background: rgba(52, 152, 219, 0.25);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }
      }
    }

    &.chrome {
      --theme-color: #e74c3c;
      color: var(--theme-color);

      &:hover {
        box-shadow: 0 8px 24px rgba(231, 76, 60, 0.2);
      }

      .version-value {
        background: rgba(231, 76, 60, 0.15);
        color: var(--theme-color);
        border: 1px solid rgba(231, 76, 60, 0.3);
        font-size: 11px;
        padding: 3px 8px;

        &:hover {
          background: rgba(231, 76, 60, 0.25);
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }
      }
    }

    &.node {
      --theme-color: #2ecc71;
      color: var(--theme-color);

      &:hover {
        box-shadow: 0 8px 24px rgba(46, 204, 113, 0.2);
      }

      .version-value {
        background: rgba(46, 204, 113, 0.15);
        color: var(--theme-color);
        border: 1px solid rgba(46, 204, 113, 0.3);
        font-size: 11px;
        padding: 3px 8px;

        &:hover {
          background: rgba(46, 204, 113, 0.25);
          box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
        }
      }
    }

    &.app {
      --theme-color: #ff1168;
      color: var(--theme-color);

      &:hover {
        box-shadow: 0 8px 24px rgba(255, 17, 104, 0.2);
      }

      .version-value {
        background: linear-gradient(135deg, rgba(255, 17, 104, 0.2), rgba(252, 61, 73, 0.15));
        color: var(--theme-color);
        font-weight: 700;
        font-size: 11px;
        border: 1px solid rgba(255, 17, 104, 0.4);
        padding: 3px 8px;

        &:hover {
          background: linear-gradient(135deg, rgba(255, 17, 104, 0.3), rgba(252, 61, 73, 0.25));
          box-shadow: 0 4px 12px rgba(255, 17, 104, 0.3);
        }
      }
    }
  }

  .version-icon {
    transition: transform 0.3s ease;
    opacity: 0.9;
    width: 18px !important;
    height: 18px !important;
  }

  .version-icon-img {
    width: 18px;
    height: 18px;
    object-fit: contain;
    opacity: 0.9;
    transition: transform 0.3s ease;
  }

  :deep(.item-label) {
    justify-content: center;
    align-items: center;
    min-height: 36px;
    height: 36px;

    .label-text {
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
    }

    .item-desc {
      font-size: 9px;
      line-height: 1.2;
    }
  }

  .version-value {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-align: center;
    min-width: 65px;
    transition: all 0.3s ease;
    margin-top: auto;
  }
}

// 响应式设计 - 始终保持一行四列
@media (max-width: 1200px) {
  .version-section {
    .version-row {
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .version-card {
      padding: 16px 12px;
    }

    .version-value {
      min-width: 80px;
      font-size: 13px;
      padding: 5px 10px;
    }

    :deep(.item-label) {
      .label-text {
        font-size: 13px;
      }

      .item-desc {
        font-size: 11px;
      }
    }
  }
}

@media (max-width: 900px) {
  .version-section {
    .version-row {
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .version-card {
      padding: 14px 10px;
      gap: 10px;
    }

    .version-icon,
    .version-icon-img {
      width: 24px;
      height: 24px;
    }

    .version-value {
      min-width: 70px;
      font-size: 12px;
      padding: 4px 8px;
    }

    :deep(.item-label) {
      .label-text {
        font-size: 12px;
      }

      .item-desc {
        font-size: 10px;
      }
    }
  }
}

@media (max-width: 600px) {
  .version-section {
    .version-row {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .version-card {
      padding: 12px 8px;
      gap: 8px;
    }

    .version-icon,
    .version-icon-img {
      width: 20px;
      height: 20px;
    }

    .version-value {
      min-width: 60px;
      font-size: 11px;
      padding: 3px 6px;
    }

    :deep(.item-label) {
      .label-text {
        font-size: 11px;
      }

      .item-desc {
        display: none;
      }
    }
  }
}
</style>
