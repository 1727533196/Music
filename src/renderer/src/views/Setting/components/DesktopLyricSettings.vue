<script setup lang="ts">
import { useDesktopLyrics } from '@/store/desktopLyrics'
import {
  parseDesktopLyricColor,
  desktopLyricRgba,
  type DesktopLyricSettings
} from '../../../../../shared/desktopLyrics'
const desktop = useDesktopLyrics()
function number(key: 'fontSize' | 'width' | 'opacity' | 'offsetMs', event: Event) {
  void desktop.configure({ [key]: Number((event.target as HTMLInputElement).value) })
}
function text(key: 'fontFamily' | 'color' | 'highlight', event: Event) {
  const value = (event.target as HTMLInputElement).value
  void desktop.configure({
    [key]:
      key === 'fontFamily'
        ? value
        : desktopLyricRgba(value, parseDesktopLyricColor(desktop.state[key])?.alpha ?? 1)
  } as Partial<DesktopLyricSettings>)
}
</script>
<template>
  <section class="settings-section desktop-lyric-settings">
    <h2 class="section-title">桌面歌词</h2>
    <p>在其他窗口上方显示当前句歌词，逐字歌词会跟随播放高亮。悬停歌词可显示操作面板。</p>
    <p v-if="!desktop.available">请在桌面应用中使用此功能。</p>
    <template v-else>
      <div class="desktop-actions">
        <button
          type="button"
          :aria-pressed="desktop.state.enabled"
          @click="desktop.configure({ enabled: !desktop.state.enabled })"
        >
          {{ desktop.state.enabled ? '关闭桌面歌词' : '开启桌面歌词' }}
        </button>
        <button
          type="button"
          :aria-pressed="desktop.state.locked"
          @click="desktop.configure({ locked: !desktop.state.locked })"
        >
          {{ desktop.state.locked ? '解锁歌词' : '锁定并穿透鼠标' }}
        </button>
        <button type="button" @click="desktop.resetPosition">重置窗口位置</button>
      </div>
      <div class="desktop-options">
        <label
          >字体<select :value="desktop.state.fontFamily" @change="text('fontFamily', $event)">
            <option value="system">系统字体</option>
            <option value="Microsoft YaHei">微软雅黑</option>
            <option value="SimHei">黑体</option>
            <option value="Arial">Arial</option>
          </select></label
        >
        <label
          >字号<span class="range-setting"
            ><input
              type="range"
              min="20"
              max="72"
              :value="desktop.state.fontSize"
              @change="number('fontSize', $event)"
            /><output>{{ desktop.state.fontSize }} px</output></span
          ></label
        >
        <label
          >窗口宽度<span class="range-setting"
            ><input
              type="range"
              min="320"
              max="1400"
              step="20"
              :value="desktop.state.width"
              @change="number('width', $event)"
            /><output>{{ desktop.state.width }} px</output></span
          ></label
        >
        <label
          >文字透明度<span class="range-setting"
            ><input
              type="range"
              min="0.4"
              max="1"
              step="0.05"
              :value="desktop.state.opacity"
              @change="number('opacity', $event)"
            /><output>{{ Math.round(desktop.state.opacity * 100) }}%</output></span
          ></label
        >
        <label
          >文字颜色<input
            type="color"
            :value="parseDesktopLyricColor(desktop.state.color)?.hex || '#ffffff'"
            @change="text('color', $event)"
        /></label>
        <label
          >高亮颜色<input
            type="color"
            :value="parseDesktopLyricColor(desktop.state.highlight)?.hex || '#ffffff'"
            @change="text('highlight', $event)"
        /></label>
        <label
          >歌词提前／延后<input
            type="number"
            min="-5000"
            max="5000"
            step="100"
            :value="desktop.state.offsetMs"
            @change="number('offsetMs', $event)"
            aria-label="歌词偏移，单位毫秒，正值提前"
        /></label>
      </div>
      <p>
        正偏移值让歌词提前，负值延后（单位毫秒）。拖动歌词或工具栏可调整位置；锁定后悬停歌词区域，点击右上角解锁按钮即可解锁，也可在此处或通过快捷键解锁。
      </p>
    </template>
    <p v-if="desktop.error" role="status">{{ desktop.error }}</p>
  </section>
</template>
<style scoped lang="less">
@import '../index.less';
.desktop-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 16px 0 22px;
}
button,
select,
input[type='number'] {
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid var(--app-border);
  border-radius: 7px;
  background: var(--app-surface);
  color: var(--app-text);
  font: inherit;
  font-size: 12px;
}
button,
select {
  cursor: pointer;
}
button[aria-pressed='true'] {
  background: var(--app-accent-soft);
  border-color: var(--app-accent-border);
}
.desktop-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px 32px;
}
label {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--app-text);
}
.range-setting {
  display: flex;
  align-items: center;
  gap: 10px;
}
input[type='range'] {
  width: 110px;
  accent-color: var(--app-accent);
}
output {
  min-width: 48px;
  text-align: right;
  color: var(--app-muted);
  font-size: 12px;
}
input[type='number'] {
  width: 100px;
}
input[type='color'] {
  width: 44px;
  height: 30px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
option {
  background: var(--app-panel);
  color: var(--app-text);
}
p {
  margin: 10px 0;
  font-size: 12px;
  line-height: 1.8;
  color: var(--app-muted);
}
button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
</style>
