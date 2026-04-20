<script setup lang="ts">
import { useSettings } from '@/store/settings'
import SettingItem from './SettingItem.vue'

const settings = useSettings()

const updateBg = (value: any) => {
  settings.setState({
    lyricBg: value
  })
}

const updateBold = (value: boolean) => {
  settings.setState({
    bold: value
  })
  if (value) {
    document.body.classList.add('bold')
  } else {
    document.body.classList.remove('bold')
  }
}
</script>

<template>
  <div class="settings-section">
    <h2 class="section-title">
      <v-icon icon="mdi-palette" size="small" class="section-icon"></v-icon>
      外观与显示
    </h2>

    <div class="setting-item">
      <SettingItem
        label="歌词背景模式"
        description="选择你喜欢的歌词页背景风格"
      />
      <v-btn-toggle
        density="compact"
        @update:modelValue="updateBg"
        v-model="settings.state.lyricBg"
        class="theme-toggle"
      >
        <v-btn value="rhythm">模糊背景</v-btn>
        <v-btn value="rgb">纯色模式</v-btn>
      </v-btn-toggle>
    </div>

    <div class="setting-item">
      <SettingItem
        label="全局字体加粗"
        description="让文字更加清晰醒目"
      />
      <v-switch
        @update:modelValue="updateBold"
        v-model="settings.state.bold"
        color="primary"
        hide-details
      ></v-switch>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '../index.less';
</style>
