<script lang="ts" setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { loginQrCheck, loginQrCreate, loginQrKey } from '@/api/login'
import { message } from '@/utils/message'
import { getUserAccountFn } from '@/utils/userInfo'
import { sendCodePhone, codeLogin } from '@/utils/useLogin'

const dialogVisible = ref(false)
const mode = ref<'qr' | 'phone'>('qr')
const qrUrl = ref('')
const qrState = ref<'loading' | 'waiting' | 'scanned' | 'error'>('loading')
const qrError = ref('')
const phoneNumber = ref('')
const phoneTouched = ref(false)
const sendCodeLoading = ref(false)
const isSendCode = ref(false)
const otp = ref('')
const otpLoading = ref(false)
const phoneError = ref('')
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(phoneNumber.value))
let timer: ReturnType<typeof setTimeout> | undefined
let session = 0
let qrCycle = 0
let phoneRequest = 0
let opener: HTMLElement | null = null
const restoreFocus = () => {
  if (!dialogVisible.value && opener?.isConnected && !opener.closest('[inert]')) {
    opener.focus({ preventScroll: true })
  }
}

const stopQr = () => {
  qrCycle += 1
  clearTimeout(timer)
  timer = undefined
}

const isQrActive = (cycle: number) =>
  dialogVisible.value && mode.value === 'qr' && cycle === qrCycle

const initQr = async () => {
  stopQr()
  const cycle = qrCycle
  qrState.value = 'loading'
  qrUrl.value = ''
  qrError.value = ''

  try {
    const { data: keyData } = await loginQrKey()
    if (!isQrActive(cycle)) return
    const { data: qrData } = await loginQrCreate(keyData.unikey, true)
    if (!isQrActive(cycle)) return
    if (!qrData.qrimg) throw new Error('二维码为空')
    qrUrl.value = qrData.qrimg
    qrState.value = 'waiting'

    const poll = async () => {
      if (!isQrActive(cycle)) return
      try {
        const { code, cookie } = await loginQrCheck(keyData.unikey)
        if (!isQrActive(cycle)) return
        if (code === 800) {
          void initQr()
          return
        }
        if (code === 803) {
          stopQr()
          localStorage.setItem('MUSIC_U', cookie)
          message.success('授权登录成功')
          dialogVisible.value = false
          void getUserAccountFn().catch(() => {})
          return
        }
        if (code !== 801 && code !== 802) throw new Error('扫码状态获取失败')
        qrState.value = code === 802 ? 'scanned' : 'waiting'
        timer = setTimeout(poll, 3000)
      } catch {
        if (!isQrActive(cycle)) return
        qrState.value = 'error'
        qrError.value = '扫码状态获取失败，请刷新二维码'
      }
    }
    timer = setTimeout(poll, 3000)
  } catch {
    if (!isQrActive(cycle)) return
    qrState.value = 'error'
    qrError.value = '二维码加载失败，请重试'
  }
}

const close = () => {
  dialogVisible.value = false
}

const resetPhoneRequest = () => {
  phoneRequest += 1
  sendCodeLoading.value = false
  otpLoading.value = false
  phoneError.value = ''
}

watch(
  dialogVisible,
  (visible) => {
    if (visible) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
    session += 1
    resetPhoneRequest()
    stopQr()
    if (visible && mode.value === 'qr') void initQr()
  },
  { flush: 'sync' }
)

watch(
  mode,
  (value) => {
    resetPhoneRequest()
    stopQr()
    if (dialogVisible.value && value === 'qr') void initQr()
  },
  { flush: 'sync' }
)

onUnmounted(() => {
  session += 1
  phoneRequest += 1
  stopQr()
})

const show = () => {
  if (!dialogVisible.value) dialogVisible.value = true
}

const sendCode = async () => {
  if (!isPhoneValid.value || sendCodeLoading.value || otpLoading.value) return
  const currentSession = session
  const request = ++phoneRequest
  const active = () =>
    dialogVisible.value &&
    mode.value === 'phone' &&
    currentSession === session &&
    request === phoneRequest
  otp.value = ''
  phoneError.value = ''
  sendCodeLoading.value = true
  try {
    await sendCodePhone(phoneNumber.value)
    if (active()) isSendCode.value = true
  } catch {
    if (active()) phoneError.value = '验证码发送失败，请稍后重试'
  } finally {
    if (active()) sendCodeLoading.value = false
  }
}

const handleOtpFinish = async (value: string) => {
  if (otpLoading.value || sendCodeLoading.value || !/^\d{4}$/.test(value)) return
  const currentSession = session
  const request = ++phoneRequest
  const active = () =>
    dialogVisible.value &&
    mode.value === 'phone' &&
    currentSession === session &&
    request === phoneRequest
  phoneError.value = ''
  otpLoading.value = true
  try {
    await codeLogin(phoneNumber.value, value)
    if (active()) close()
  } catch {
    if (active()) phoneError.value = '登录失败，请检查验证码后重试'
  } finally {
    if (active()) otpLoading.value = false
  }
}

const editPhone = () => {
  resetPhoneRequest()
  isSendCode.value = false
  otp.value = ''
}

const handleQrImageError = () => {
  if (!dialogVisible.value || mode.value !== 'qr') return
  stopQr()
  qrState.value = 'error'
  qrError.value = '二维码加载失败，请重试'
}

defineExpose({ dialogVisible, show })
</script>

<template>
  <v-dialog
    v-model="dialogVisible"
    class="login-dialog"
    width="400"
    max-width="calc(100% - 32px)"
    scrim="#09090e"
    :opacity="0.72"
    :no-click-animation="true"
    persistent
    @keydown.esc="close"
    @after-leave="restoreFocus"
  >
    <section class="login-card" aria-labelledby="login-title">
      <header class="login-header">
        <div>
          <h2 id="login-title">登录账号</h2>
          <p>继续聆听你喜欢的音乐</p>
        </div>
        <button class="login-close" type="button" aria-label="关闭登录" @click="close">
          <v-icon icon="mdi-close" size="20" />
        </button>
      </header>

      <div class="login-modes" role="group" aria-label="登录方式">
        <button
          v-for="item in [
            { value: 'qr' as const, label: '扫码登录' },
            { value: 'phone' as const, label: '手机号登录' }
          ]"
          :key="item.value"
          type="button"
          class="login-mode-button"
          :data-mode="item.value"
          :aria-pressed="mode === item.value"
          :class="{ active: mode === item.value }"
          @click="mode = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="mode === 'qr'" class="login-qr-content" aria-label="扫码登录">
        <div
          class="qr-frame"
          :class="{ 'qr-frame-state': qrState !== 'waiting' }"
          :aria-busy="qrState === 'loading'"
        >
          <img
            v-if="qrState === 'waiting'"
            id="qr-img"
            :src="qrUrl"
            alt="网易云音乐登录二维码"
            @error="handleQrImageError"
          />
          <div v-else-if="qrState === 'loading'" class="qr-status" role="status">
            <v-progress-circular indeterminate size="28" width="2" />
            <span>正在加载二维码</span>
          </div>
          <div v-else-if="qrState === 'scanned'" class="qr-status qr-scanned" role="status">
            <v-icon icon="mdi-check-circle-outline" size="36" />
            <strong>扫码成功</strong>
            <span>请在手机上确认登录</span>
          </div>
          <div v-else class="qr-status qr-error" role="status">
            <v-icon icon="mdi-qrcode" size="32" />
            <span>{{ qrError }}</span>
            <button type="button" class="login-text-button" @click="initQr">重新加载</button>
          </div>
        </div>
        <p class="login-qr-hint">打开网易云音乐 App，扫描二维码</p>
        <p class="login-qr-note">扫码后请在手机上确认登录</p>
      </div>

      <div v-else class="login-phone-content" aria-label="手机号登录">
        <form v-if="!isSendCode" @submit.prevent="sendCode">
          <label for="login-phone" class="login-field-label">手机号</label>
          <div class="login-phone-field" :class="{ invalid: phoneTouched && !isPhoneValid }">
            <span>+86</span>
            <input
              id="login-phone"
              v-model="phoneNumber"
              type="tel"
              inputmode="numeric"
              autocomplete="tel-national"
              maxlength="11"
              placeholder="请输入手机号"
              :aria-invalid="phoneTouched && !isPhoneValid"
              aria-describedby="login-phone-hint"
              :disabled="sendCodeLoading"
              @blur="phoneTouched = true"
            />
          </div>
          <p
            id="login-phone-hint"
            class="login-field-hint"
            :class="{ invalid: phoneTouched && !isPhoneValid }"
          >
            {{
              phoneTouched && !isPhoneValid
                ? '请输入正确的 11 位手机号'
                : '我们会向此手机号发送验证码'
            }}
          </p>
          <button type="submit" class="login-primary" :disabled="!isPhoneValid || sendCodeLoading">
            <v-progress-circular v-if="sendCodeLoading" indeterminate size="16" width="2" />
            {{ sendCodeLoading ? '正在发送' : '获取验证码' }}
          </button>
        </form>

        <div v-else class="login-otp-content">
          <div class="login-otp-heading">
            <h3>输入验证码</h3>
            <button
              type="button"
              class="login-text-button"
              :disabled="otpLoading || sendCodeLoading"
              @click="editPhone"
            >
              更换手机号
            </button>
          </div>
          <p class="login-otp-hint">
            已发送至 <span>+86 {{ phoneNumber }}</span>
          </p>
          <v-otp-input
            v-model="otp"
            class="login-otp"
            divider=" "
            :length="4"
            :loading="otpLoading"
            :disabled="otpLoading || sendCodeLoading"
            @finish="handleOtpFinish"
          />
          <p class="login-resend">
            没有收到验证码？
            <button
              type="button"
              class="login-text-button"
              :disabled="sendCodeLoading || otpLoading"
              @click="sendCode"
            >
              {{ sendCodeLoading ? '正在发送' : '重新发送' }}
            </button>
          </p>
        </div>
        <p v-if="phoneError" class="login-error" role="alert">{{ phoneError }}</p>
      </div>
      <footer class="login-footer">
        <v-icon icon="mdi-music-note-outline" size="13" />登录后同步你的歌单与收藏
      </footer>
    </section>
  </v-dialog>
</template>

<style scoped lang="less">
.login-card {
  width: 100%;
  min-width: 0;
  padding: 26px;
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
}
.login-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
  h2 {
    font-size: 21px;
    line-height: 1.4;
    font-weight: 650;
    letter-spacing: -0.4px;
  }
  p {
    margin-top: 6px;
    color: var(--app-muted);
    font-size: 12px;
    line-height: 1.6;
  }
}
.login-close {
  display: grid;
  flex: 0 0 28px;
  place-items: center;
  width: 28px;
  height: 28px;
  margin: -3px -5px 0 0;
  border-radius: 50%;
  color: var(--app-muted);
  background: transparent;
  cursor: pointer;
  &:hover {
    color: var(--app-text);
    background: var(--app-surface);
  }
}
.login-modes {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
}
.login-mode-button {
  flex: 1;
  min-width: 0;
  height: 34px;
  border-radius: 7px;
  background: transparent;
  color: var(--app-muted);
  font-size: 13px;
  cursor: pointer;
  transition:
    color 0.15s,
    background-color 0.15s;
  &.active {
    background: var(--app-accent-soft);
    color: var(--app-accent);
    font-weight: 600;
  }
  &:hover {
    color: var(--app-text);
  }
}
.login-qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 26px;
}
.qr-frame {
  display: grid;
  place-items: center;
  width: 212px;
  max-width: 100%;
  aspect-ratio: 1;
  padding: 10px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: #fff;
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  &.qr-frame-state {
    background: var(--app-surface);
  }
}
.qr-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 8px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
  .v-progress-circular {
    color: var(--app-accent);
  }
  strong {
    color: var(--app-text);
    font-size: 16px;
    font-weight: 600;
  }
}
.qr-scanned {
  gap: 8px;
  .v-icon {
    margin-bottom: 4px;
    color: var(--app-accent);
  }
}
.qr-error {
  gap: 10px;
}
.login-qr-hint {
  margin-top: 19px;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}
.login-qr-note {
  margin-top: 4px;
  color: var(--app-muted);
  font-size: 12px;
}
.login-phone-content {
  min-height: 270px;
  padding-top: 28px;
}
.login-field-label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 550;
}
.login-phone-field {
  display: flex;
  align-items: center;
  gap: 13px;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  background: var(--app-surface);
  &:focus-within {
    border-color: var(--app-accent);
  }
  &.invalid {
    border-color: var(--app-danger);
  }
  > span {
    flex-shrink: 0;
    padding-right: 13px;
    border-right: 1px solid var(--app-border);
    color: var(--app-muted);
    font-size: 13px;
  }
  input {
    min-width: 0;
    width: 100%;
    outline: none;
    color: var(--app-text);
    font-size: 14px;
    background: transparent;
  }
  input::placeholder {
    color: var(--app-muted);
  }
}
.login-field-hint {
  min-height: 20px;
  margin: 9px 0 22px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.6;
  &.invalid {
    color: var(--app-danger-text);
  }
}
.login-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 42px;
  padding: 10px 16px;
  border-radius: 9px;
  background: var(--app-accent);
  color: var(--app-on-accent);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: var(--app-accent-hover);
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
.login-text-button {
  padding: 2px 0;
  background: transparent;
  color: var(--app-accent);
  font-size: 12px;
  cursor: pointer;
  &:hover:not(:disabled) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}
.login-otp-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  h3 {
    font-size: 16px;
    font-weight: 600;
  }
}
.login-otp-hint {
  margin-top: 9px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.7;
  span {
    color: var(--app-text);
    white-space: nowrap;
  }
}
.login-otp {
  margin: 22px auto 20px;
  padding: 0;
  :deep(.v-otp-input__content) {
    gap: 10px;
    padding: 0;
    max-width: 264px;
  }
  :deep(.v-field) {
    background: var(--app-surface);
    color: var(--app-text);
  }
  :deep(.v-field__outline) {
    color: var(--app-border);
  }
  :deep(.v-field--focused .v-field__outline) {
    color: var(--app-accent);
  }
  :deep(input) {
    font-size: 24px;
  }
}
.login-resend {
  color: var(--app-muted);
  text-align: center;
  font-size: 12px;
}
.login-error {
  margin-top: 14px;
  color: var(--app-danger-text);
  font-size: 12px;
  line-height: 1.7;
}
.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid var(--app-border);
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}
.login-card button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
@media (max-width: 420px) {
  .login-card {
    padding: 22px 20px;
    border-radius: 14px;
  }
  .login-header h2 {
    font-size: 19px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .login-mode-button {
    transition: none;
  }
}
</style>
