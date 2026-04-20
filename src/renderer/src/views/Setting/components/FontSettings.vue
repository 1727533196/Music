<script setup lang="ts">
import { reactive } from 'vue'
import { useSettings } from '@/store/settings'
import { ElMessage } from 'element-plus'
import SettingItem from './SettingItem.vue'

const settings = useSettings()

const form = reactive({
  font: settings.state.font
})

const setFont = () => {
  settings.setState({
    font: form.font
  })
  const appEl = document.querySelector('#app') as HTMLDivElement
  if (appEl) {
    appEl.style.fontFamily = form.font
    ElMessage.success({
      message: '字体设置成功'
    })
  }
}
</script>

<template>
  <div class="settings-section">
    <h2 class="section-title">
      <v-icon icon="mdi-monitor" size="small" class="section-icon"></v-icon>
      字体设置
    </h2>

    <div class="setting-item">
      <SettingItem
        label="自定义字体"
        description="输入系统已安装的字体名称"
      />
      <div class="item-content">
        <v-text-field
          v-model="form.font"
          density="compact"
          clearable
          hide-details="auto"
          single-line
          variant="outlined"
          prepend-inner-icon="mdi-format-font"
          placeholder="例如：Microsoft YaHei"
          class="font-input"
        >
          <template #append-inner>
            <v-btn
              @click="setFont"
              color="success"
              size="small"
              variant="tonal"
            >
              应用
            </v-btn>
          </template>
        </v-text-field>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '../index.less';

.item-content {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-width: 0;

  :deep(.v-text-field) {
    width: 100%;
    max-width: 320px;
    
    .v-field {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      &.v-field--focused {
        background: rgba(255, 255, 255, 0.1);
      }
    }

    .v-field__field input {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    }

    .v-field__outline {
      --v-field-border-color: rgba(255, 255, 255, 0.15);
    }
  }
}
</style>
