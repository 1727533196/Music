<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSettings } from '@/store/settings'
import { message } from '@/utils/message'
import SettingItem from './SettingItem.vue'

const settings = useSettings()
const font = ref(settings.state.font)
const changed = computed(() => font.value.trim() !== settings.state.font)
const setFont = () => {
  const value = font.value.trim()
  if (!value) return
  settings.setState({ font: value })
  document.getElementById('app')!.style.fontFamily = value
  font.value = value
  message.success('界面字体已更新')
}
watch(
  () => settings.state.font,
  (value) => (font.value = value)
)
</script>

<template>
  <section class="settings-section" aria-labelledby="font-settings-title">
    <h2 id="font-settings-title" class="section-title visually-hidden">界面字体</h2>
    <div class="setting-item font-setting">
      <SettingItem label="界面字体" description="输入此设备已安装的字体名称。" />
      <div class="font-editor">
        <form class="item-content" @submit.prevent="setFont">
          <input
            v-model="font"
            class="font-input settings-field-input"
            type="text"
            aria-label="界面字体名称"
            aria-describedby="font-preview-label"
            placeholder="例如：PingFang SC、Microsoft YaHei"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            class="apply-font settings-apply-button"
            type="submit"
            :disabled="!changed || !font.trim()"
          >
            应用
          </button>
        </form>
        <div class="font-preview">
          <span id="font-preview-label">{{ changed ? '预览 · 应用后生效' : '当前字体预览' }}</span>
          <div :style="{ fontFamily: font.trim() || 'inherit' }">
            <p>我喜欢的音乐</p>
            <small>Music for every moment · 0123456789</small>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '../index.less';
.settings-section .font-setting {
  align-items: start;
  > :first-child {
    padding-top: 7px;
  }
}
.font-editor {
  min-width: 0;
}
.font-preview {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--app-surface);
  overflow-wrap: anywhere;
  span {
    display: block;
    margin-bottom: 6px;
    color: var(--app-muted);
    font-size: 11px;
  }
  p {
    margin: 0 0 2px;
    color: var(--app-text);
    font-size: 17px;
    line-height: 1.5;
  }
  small {
    color: var(--app-muted);
    font-size: 12px;
  }
}
</style>
