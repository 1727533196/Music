<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useSettings } from '@/store/settings'
import { checkUrlValidity } from '@/utils'
import { ElMessage } from 'element-plus'
import SettingItem from './SettingItem.vue'

const settings = useSettings()
const snackbar = ref(false)
const urlVerify = ref({
  message: '',
  isValid: true
})

const form = reactive({
  url: settings.state.baseUrl
})

const validateUrl = (value: string) => {
  let result = {
    message: '',
    isValid: true
  }
  if (value === '') {
    result = {
      message: '地址不能为空',
      isValid: false
    }
  } else {
    result = checkUrlValidity(value)
  }
  urlVerify.value = result
  return result.isValid || result.message
}

const setBaseUrl = () => {
  snackbar.value = true
  settings.setState({
    baseUrl: form.url
  })
  ElMessage.success({
    message: '修改网络域成功'
  })
}
</script>

<template>
  <div class="settings-section">
    <h2 class="section-title">
      <v-icon icon="mdi-wifi" size="small" class="section-icon"></v-icon>
      网络设置
    </h2>

    <div class="setting-item">
      <SettingItem
        label="API 服务器地址"
        description="设置网易云音乐 API 服务器地址"
      />
      <div class="item-content">
        <v-text-field
          v-model="form.url"
          density="compact"
          :persistent-clear="!urlVerify.isValid"
          clearable
          hide-details="auto"
          single-line
          variant="outlined"
          prepend-inner-icon="mdi-network-pos"
          :rules="[validateUrl]"
          :placeholder="settings.state.baseUrl"
          class="url-input"
        >
          <template #append-inner>
            <v-btn
              :disabled="!urlVerify.isValid"
              @click="setBaseUrl"
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
