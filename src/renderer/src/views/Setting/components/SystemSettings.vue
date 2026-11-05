<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useUserInfo } from '@/store'
import { useSettings } from '@/store/settings'
import { message } from '@/utils/message'
import SettingItem from './SettingItem.vue'

const settings = useSettings()
const store = useUserInfo()
const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const section = ref<HTMLElement>()
const confirmation = ref<'reset' | 'logout' | null>(null)
let confirmationTrigger: HTMLElement | null = null

const openConfirmation = async (action: 'reset' | 'logout', event: MouseEvent) => {
  if (!props.active) return
  confirmationTrigger = event.currentTarget as HTMLElement
  confirmation.value = action
  await nextTick()
  if (props.active && confirmation.value === action) {
    section.value?.querySelector<HTMLButtonElement>('.confirmation-actions button')?.focus()
  }
}

const cancelConfirmation = async () => {
  if (!confirmation.value) return
  const trigger = confirmationTrigger
  confirmation.value = null
  confirmationTrigger = null
  await nextTick()
  if (props.active && trigger?.isConnected) trigger.focus()
}

watch(
  () => props.active,
  (active) => {
    if (!active) {
      confirmation.value = null
      confirmationTrigger = null
    }
  }
)

const recoverDefaultSettings = () => {
  settings.$reset()
  document.body.classList.toggle('bold', settings.state.bold)
  const app = document.querySelector<HTMLElement>('#app')
  if (app) app.style.fontFamily = settings.state.font
  void cancelConfirmation()
  message.success('已恢复默认设置')
}

const quitLogin = () => {
  const deviceSettings = localStorage.getItem('USER_SETTINGS')
  localStorage.clear()
  if (deviceSettings) localStorage.setItem('USER_SETTINGS', deviceSettings)
  location.reload()
}
</script>

<template>
  <section
    ref="section"
    class="settings-section"
    aria-labelledby="system-title"
    @keydown.esc.prevent.stop="cancelConfirmation"
  >
    <h2 id="system-title" class="section-title">常规</h2>
    <div class="setting-item setting-item-compact">
      <SettingItem label="恢复默认设置" description="恢复外观、字体与服务地址，保留登录状态" />
      <v-btn
        variant="outlined"
        class="secondary-action"
        :aria-expanded="confirmation === 'reset'"
        aria-controls="reset-confirmation"
        @click="openConfirmation('reset', $event)"
        >恢复默认</v-btn
      >
    </div>
    <div
      v-if="confirmation === 'reset'"
      id="reset-confirmation"
      class="confirmation-row"
      role="group"
      aria-label="确认恢复默认设置"
    >
      <p><strong>恢复默认设置？</strong>外观、字体与服务地址将被重置，登录状态会保留。</p>
      <div class="confirmation-actions">
        <v-btn variant="text" @click="cancelConfirmation">取消</v-btn>
        <v-btn variant="tonal" @click="recoverDefaultSettings">确认恢复</v-btn>
      </div>
    </div>
    <template v-if="store.isLogin">
      <div class="setting-item setting-item-compact">
        <SettingItem label="退出登录" description="清除本机登录信息与播放缓存，保留设备设置" />
        <v-btn
          variant="text"
          class="danger-action"
          :aria-expanded="confirmation === 'logout'"
          aria-controls="logout-confirmation"
          @click="openConfirmation('logout', $event)"
          >退出登录</v-btn
        >
      </div>
      <div
        v-if="confirmation === 'logout'"
        id="logout-confirmation"
        class="confirmation-row"
        role="group"
        aria-label="确认退出登录"
      >
        <p><strong>退出登录？</strong>本机登录信息与播放记录将被清除，设备设置会保留。</p>
        <div class="confirmation-actions">
          <v-btn variant="text" @click="cancelConfirmation">取消</v-btn>
          <v-btn variant="tonal" class="danger-action" @click="quitLogin">确认退出</v-btn>
        </div>
      </div>
    </template>
  </section>
</template>

<style lang="less" scoped>
@import '../index.less';
.confirmation-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 2px 0 12px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
}
.confirmation-row p {
  margin: 0;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.6;
  strong {
    display: block;
    margin-bottom: 3px;
    color: var(--app-text);
    font-size: 13px;
    font-weight: 550;
  }
}
.confirmation-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.danger-action {
  color: var(--app-danger-text);
}
.secondary-action {
  border-color: var(--app-border);
}
@media (max-width: 600px) {
  .confirmation-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .confirmation-actions {
    align-self: flex-end;
  }
}
</style>
