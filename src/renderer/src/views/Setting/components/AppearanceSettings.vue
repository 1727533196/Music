<script setup lang="ts">
import { useSettings } from '@/store/settings'
import { accentColors, themeModes } from '@/theme'
import SettingItem from './SettingItem.vue'

const settings = useSettings()
const backgrounds = [
  { value: 'rhythm' as const, name: '模糊', description: '封面色彩，柔和呈现', sample: 'blur' },
  { value: 'shader' as const, name: '流体', description: '色彩流动，随音乐呼吸', sample: 'fluid' },
  { value: 'rgb' as const, name: '纯色', description: '简洁背景，专注歌词', sample: 'solid' }
]
const updateBold = (value: boolean | null) => {
  if (typeof value !== 'boolean') return
  settings.setState({ bold: value })
  document.body.classList.toggle('bold', value)
}
</script>

<template>
  <section class="settings-section appearance-section" aria-labelledby="appearance-settings-title">
    <h2 id="appearance-settings-title" class="section-title visually-hidden">外观</h2>
    <div class="setting-item theme-setting">
      <SettingItem label="界面主题" description="选择适合当前光线的外观，切换后立即生效。" />
      <div class="theme-options" role="radiogroup" aria-label="界面主题">
        <label
          v-for="option in themeModes"
          :key="option.value"
          class="theme-option"
          :class="{ selected: settings.state.themeMode === option.value }"
          :data-theme-option="option.value"
        >
          <input
            type="radio"
            name="interface-theme"
            :value="option.value"
            :checked="settings.state.themeMode === option.value"
            @change="settings.setState({ themeMode: option.value })"
          />
          <span
            class="theme-preview"
            :class="{ split: option.value === 'system' }"
            aria-hidden="true"
          >
            <span
              v-for="scheme in option.value === 'system' ? ['light', 'dark'] : [option.value]"
              :key="scheme"
              class="theme-sample"
              :class="scheme"
            >
              <span class="preview-navigation"><i /><i /><i /><b /></span>
              <span class="preview-content">
                <span class="preview-album"><v-icon icon="mdi-music-note" size="16" /></span>
                <span class="preview-list"><i /><i /><i /></span>
              </span>
              <span class="preview-player"><i /><span /><v-icon icon="mdi-play" size="10" /></span>
            </span>
          </span>
          <span class="theme-caption">
            <span
              ><strong>{{ option.label }}</strong
              ><small>{{ option.description }}</small></span
            >
            <span class="option-check" aria-hidden="true">
              <v-icon v-if="settings.state.themeMode === option.value" icon="mdi-check" size="13" />
            </span>
          </span>
        </label>
      </div>
    </div>
    <div class="setting-item accent-setting">
      <SettingItem label="主题色" description="用于选中状态、按钮和界面中的重点信息。" />
      <div class="accent-options" role="radiogroup" aria-label="主题色">
        <label
          v-for="option in accentColors"
          :key="option.value"
          class="accent-option"
          :class="{ selected: settings.state.accentColor === option.value }"
          :data-accent-option="option.value"
          :style="{ '--swatch-light': option.light, '--swatch-dark': option.dark }"
        >
          <input
            type="radio"
            name="interface-accent"
            :value="option.value"
            :checked="settings.state.accentColor === option.value"
            @change="settings.setState({ accentColor: option.value })"
          />
          <span class="accent-swatch" aria-hidden="true">
            <v-icon v-if="settings.state.accentColor === option.value" icon="mdi-check" size="16" />
          </span>
          <span>{{ option.label }}</span>
        </label>
      </div>
    </div>
    <div class="setting-item background-setting">
      <SettingItem label="歌词背景" description="在歌曲详情页中使用，选择后立即生效。" />
      <div class="background-options" role="radiogroup" aria-label="歌词背景风格">
        <label
          v-for="option in backgrounds"
          :key="option.value"
          class="background-option"
          :class="{ selected: settings.state.lyricBg === option.value }"
        >
          <input
            type="radio"
            name="lyric-background"
            :value="option.value"
            :checked="settings.state.lyricBg === option.value"
            @change="settings.setState({ lyricBg: option.value })"
          />
          <span class="background-sample" :class="option.sample" aria-hidden="true">
            <span class="sample-cover"><v-icon icon="mdi-music-note" size="18" /></span>
            <span class="sample-lines"><i /><i /><i /></span>
          </span>
          <span class="background-caption">
            <span
              ><strong>{{ option.name }}</strong
              ><small>{{ option.description }}</small></span
            >
            <span class="option-check" aria-hidden="true">
              <v-icon v-if="settings.state.lyricBg === option.value" icon="mdi-check" size="13" />
            </span>
          </span>
        </label>
      </div>
    </div>
    <div class="setting-item setting-item-compact">
      <SettingItem label="加粗文字" description="提高界面文字的辨识度。" />
      <v-switch
        :model-value="settings.state.bold"
        aria-label="加粗文字"
        density="compact"
        color="var(--app-accent)"
        hide-details
        @update:model-value="updateBold"
      />
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '../index.less';
.appearance-section {
  margin-bottom: 8px;
}
.settings-section .theme-setting,
.settings-section .background-setting {
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding-bottom: 20px;
}
.settings-section .theme-setting {
  padding-top: 0;
}
.theme-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.theme-option,
.background-option {
  position: relative;
  min-width: 0;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background-color 140ms ease;
  &.selected {
    border-color: var(--app-accent-border);
    background: var(--app-accent-soft);
  }
  &:hover {
    border-color: var(--app-accent-border);
  }
  &:has(input:focus-visible) {
    outline: 2px solid var(--app-accent);
    outline-offset: 3px;
  }
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
}
.theme-option {
  display: block;
  padding: 7px 7px 0;
}
.theme-preview {
  display: flex;
  height: 91px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 7px;
}
.theme-sample {
  --preview-bg: #16181a;
  --preview-panel: #25282c;
  --preview-line: #8f959e;
  --preview-border: #ffffff0f;
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  background: var(--preview-bg);
  &.light {
    --preview-bg: #f5f6f7;
    --preview-panel: #ffffff;
    --preview-line: #737b86;
    --preview-border: #10121614;
  }
  + .theme-sample {
    border-left: 1px solid var(--preview-border);
  }
}
.preview-navigation {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 20px;
  padding: 0 8px;
  border-bottom: 1px solid var(--preview-border);
  i {
    width: 14px;
    height: 3px;
    border-radius: 2px;
    background: var(--preview-line);
    opacity: 0.3;
    &:first-child {
      opacity: 0.9;
    }
  }
  b {
    width: 7px;
    height: 7px;
    margin-left: auto;
    border-radius: 50%;
    background: var(--preview-line);
    opacity: 0.3;
  }
}
.preview-content {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 9px;
  padding: 8px;
}
.preview-album {
  display: grid;
  flex: 0 0 28px;
  place-items: center;
  height: 28px;
  border: 1px solid var(--preview-border);
  border-radius: 5px;
  background: var(--preview-panel);
  color: var(--preview-line);
}
.preview-list {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  i {
    width: 86%;
    height: 3px;
    border-radius: 2px;
    background: var(--preview-line);
    opacity: 0.45;
    &:nth-child(2) {
      width: 65%;
      opacity: 0.25;
    }
    &:last-child {
      width: 76%;
      opacity: 0.25;
    }
  }
}
.preview-player {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 19px;
  padding: 0 8px;
  border-top: 1px solid var(--preview-border);
  background: var(--preview-panel);
  color: var(--preview-line);
  i {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: var(--preview-line);
    opacity: 0.25;
  }
  > span {
    width: 34%;
    height: 2px;
    margin-right: auto;
    background: var(--preview-line);
    opacity: 0.35;
  }
}
.theme-preview.split {
  .preview-navigation {
    gap: 3px;
    padding-inline: 5px;
    i {
      width: 9px;
      &:nth-child(3) {
        display: none;
      }
    }
  }
  .preview-content {
    gap: 5px;
    padding-inline: 5px;
  }
  .preview-album {
    flex-basis: 21px;
    height: 25px;
  }
  .preview-player {
    gap: 4px;
    padding-inline: 5px;
  }
}
.theme-caption {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  min-height: 59px;
  padding: 11px 3px 12px;
  strong,
  small {
    display: block;
  }
  strong {
    color: var(--app-text);
    font-size: 13px;
    font-weight: 550;
    line-height: 17px;
  }
  small {
    margin-top: 4px;
    color: var(--app-muted);
    font-size: 11px;
    line-height: 1.5;
  }
}
.settings-section .accent-setting {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  padding-block: 18px;
}
.accent-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.accent-option {
  position: relative;
  display: flex;
  min-width: 47px;
  align-items: center;
  flex-direction: column;
  gap: 8px;
  padding: 5px 3px;
  border-radius: 7px;
  color: var(--app-muted);
  font-size: 10px;
  line-height: 1.4;
  cursor: pointer;
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  &:has(input:focus-visible) {
    outline: 2px solid var(--app-accent);
    outline-offset: 2px;
  }
  &:hover,
  &.selected {
    color: var(--app-text);
  }
}
.accent-swatch {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--swatch-dark);
  color: #101216;
  box-shadow: 0 0 0 3px var(--app-background);
  .selected & {
    outline: 1px solid var(--app-accent-border);
    outline-offset: 4px;
  }
}
:global(html[data-theme='light'] .appearance-section .accent-swatch) {
  background: var(--swatch-light);
  color: #ffffff;
}
.background-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.background-option {
  display: block;
  overflow: hidden;
}
.background-sample {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 76px;
  &.blur {
    background: radial-gradient(ellipse at 15% 80%, #7b6779, transparent 75%),
      linear-gradient(135deg, #4b5b67, #777078);
  }
  &.fluid {
    background: radial-gradient(ellipse at 65% 0%, #b78980, transparent 65%),
      radial-gradient(ellipse at 0% 75%, #747d9c, transparent 70%),
      radial-gradient(ellipse at 100% 90%, #6b5877, #4e4a61);
  }
  &.solid {
    background: #32313a;
  }
}
.sample-cover {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.78);
  background: linear-gradient(145deg, #ae929d, #4e485f);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
}
.sample-lines {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 40%;
  i {
    display: block;
    width: 78%;
    height: 4px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.25);
    &:nth-child(2) {
      width: 100%;
      height: 5px;
      background: rgba(255, 255, 255, 0.88);
    }
    &:last-child {
      width: 63%;
    }
  }
}
.background-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  strong,
  small {
    display: block;
    font-weight: 400;
  }
  strong {
    color: var(--app-text);
    font-size: 13px;
    font-weight: 550;
  }
  small {
    margin-top: 4px;
    color: var(--app-muted);
    font-size: 11px;
  }
}
.option-check {
  display: grid;
  place-items: center;
  flex: 0 0 17px;
  height: 17px;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  .selected & {
    border-color: var(--app-accent);
    color: var(--app-on-accent);
    background: var(--app-accent);
  }
}
@media (max-width: 600px) {
  .theme-options {
    gap: 8px;
  }
  .theme-option {
    padding: 5px 5px 0;
  }
  .theme-preview {
    height: 78px;
  }
  .theme-caption {
    min-height: 0;
    padding: 10px 1px 11px;
    strong {
      font-size: 12px;
    }
    small {
      display: none;
    }
  }
  .settings-section .accent-setting {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .accent-options {
    gap: 10px;
  }
  .background-options {
    gap: 8px;
  }
  .background-sample {
    height: 76px;
    gap: 10px;
  }
  .sample-cover {
    width: 32px;
    height: 32px;
  }
  .background-caption {
    padding: 10px;
    small {
      display: none;
    }
  }
}
@media (max-width: 420px) {
  .theme-caption {
    gap: 3px;
    .option-check {
      flex-basis: 15px;
      height: 15px;
    }
  }
  .preview-navigation {
    gap: 4px;
    padding-inline: 6px;
    i {
      width: 10px;
    }
  }
  .preview-content {
    padding-inline: 6px;
    gap: 6px;
  }
  .preview-album {
    flex-basis: 23px;
    height: 25px;
  }
  .theme-preview.split {
    .preview-album {
      display: none;
    }
    .preview-list {
      min-width: 20px;
    }
    .preview-navigation b {
      display: none;
    }
  }
  .sample-cover {
    display: none;
  }
  .sample-lines {
    width: 65%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .background-option,
  .theme-option {
    transition: none;
  }
}
</style>
