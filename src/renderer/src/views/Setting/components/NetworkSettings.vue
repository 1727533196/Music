<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSettings } from '@/store/settings'
import { message } from '@/utils/message'
import SettingItem from './SettingItem.vue'

const settings = useSettings()
const url = ref(settings.state.baseUrl || '')
const validationMessage = ref('')
const changed = computed(() => url.value.trim() !== (settings.state.baseUrl || '').trim())
const localAddress = 'http://localhost:3000'
const defaultAddress = String(import.meta.env.VITE_URL || '').trim()
const addressStatus = computed(() =>
  changed.value ? '未应用 · 点击应用后切换连接地址' : '已应用 · 当前连接地址'
)

function fillAddress(value: string) {
  url.value = value
  validationMessage.value = ''
}

function validateAddress() {
  const value = url.value.trim()
  if (!value) {
    validationMessage.value = '请输入 API 服务器地址'
    return false
  }
  try {
    const address = new URL(value)
    if (
      !/^https?:\/\//i.test(value) ||
      !['http:', 'https:'].includes(address.protocol) ||
      !address.hostname
    )
      throw new Error()
  } catch {
    validationMessage.value = '请输入完整的 HTTP 或 HTTPS 地址，例如 http://localhost:3000'
    return false
  }
  validationMessage.value = ''
  return true
}

function applyAddress() {
  if (!validateAddress()) return
  try {
    const value = url.value.trim()
    settings.setState({ baseUrl: value })
    url.value = value
  } catch {
    message.error('保存失败，请重试')
  }
}

watch(url, () => {
  if (validationMessage.value) validateAddress()
})
watch(
  () => settings.state.baseUrl,
  (value) => {
    url.value = value || ''
    validationMessage.value = ''
  }
)
</script>

<template>
  <section class="settings-section" aria-labelledby="network-settings-title">
    <h2 id="network-settings-title" class="section-title">API 连接</h2>
    <div class="setting-item network-setting">
      <SettingItem
        label="API 服务器地址"
        description="音乐数据和账号请求使用此地址，应用后立即生效。"
      />
      <div class="item-content network-content">
        <form class="network-form" novalidate @submit.prevent="applyAddress">
          <div class="address-controls">
            <input
              id="api-server-address"
              v-model="url"
              class="address-input settings-field-input"
              type="url"
              inputmode="url"
              aria-label="API 服务器地址"
              :aria-invalid="!!validationMessage"
              :aria-describedby="validationMessage ? 'api-address-error' : 'api-address-status'"
              placeholder="http://localhost:3000"
              autocomplete="off"
              spellcheck="false"
              @blur="changed && validateAddress()"
            />
            <button class="apply-address settings-apply-button" type="submit" :disabled="!changed">
              应用
            </button>
          </div>
          <p v-if="validationMessage" id="api-address-error" class="address-error" role="alert">
            {{ validationMessage }}
          </p>
          <p
            v-else
            id="api-address-status"
            class="address-status settings-field-note"
            :class="{ pending: changed }"
            role="status"
          >
            {{ addressStatus }}
          </p>
          <div class="address-shortcuts settings-field-tools" aria-label="快捷填入服务器地址">
            <button class="settings-text-action" type="button" @click="fillAddress(localAddress)">
              使用本地地址
            </button>
            <button
              v-if="defaultAddress"
              class="settings-text-action"
              type="button"
              @click="fillAddress(defaultAddress)"
            >
              恢复默认地址
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
@import '../index.less';
.settings-section .network-setting {
  align-items: start;
  > :first-child {
    padding-top: 7px;
  }
}
.network-content,
.network-form {
  width: 100%;
  min-width: 0;
}
.address-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.address-input[aria-invalid='true'] {
  border-color: var(--app-danger-text);
}
.address-error {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--app-danger-text);
}
.address-status.pending {
  color: var(--app-accent);
}
</style>
