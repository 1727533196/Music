<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { createPlay } from '../api/play'
import { getUserPlayListFn } from '../utils/userInfo'
import { message } from '@/utils/message'

const visible = defineModel({ default: false })
const loading = ref(false)
const desc = ref('')
const privacy = ref(false)
const nameError = ref('')
const requestError = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const fieldId = useId()
const name = computed(() => desc.value.trim())
let opener: HTMLElement | null = null

const dialogVisible = computed({
  get: () => visible.value,
  set: (value) => {
    if (!loading.value) visible.value = value
  }
})
const closeDialog = () => {
  dialogVisible.value = false
}
const focusName = async () => {
  await nextTick()
  nameInput.value?.focus()
}
const restoreFocus = () => {
  if (!visible.value && opener?.isConnected && !opener.closest('[inert]')) {
    opener.focus({ preventScroll: true })
  }
}
watch(
  visible,
  (value) => {
    if (!value) return
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    nameError.value = ''
    requestError.value = ''
  },
  { flush: 'sync' }
)
const clearError = () => {
  nameError.value = ''
  requestError.value = ''
}
const create = async () => {
  if (loading.value) return
  if (!name.value || name.value.length > 40) {
    nameError.value = name.value ? '歌单名称最多 40 个字' : '请输入歌单名称'
    await focusName()
    return
  }
  loading.value = true
  clearError()
  try {
    const isPrivacy = privacy.value ? '10' : ''
    await createPlay(name.value, isPrivacy)
    // 创建已经成功，列表刷新失败时不应让用户重复创建。
    void getUserPlayListFn().catch(() => {})
    visible.value = false
    desc.value = ''
    privacy.value = false
    message.success('歌单已创建')
  } catch (error) {
    const response = error as { message?: unknown; msg?: unknown } | null
    const message = response?.message || response?.msg
    requestError.value =
      typeof message === 'string' && message.trim() ? message : '歌单未创建，请检查网络后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="440"
    :persistent="loading"
    scrim="#09090e"
    :opacity="0.72"
    class="create-playlist-dialog"
    :aria-labelledby="`${fieldId}-title`"
    @after-enter="focusName"
    @after-leave="restoreFocus"
  >
    <form class="create-playlist-card" :aria-busy="loading" novalidate @submit.prevent="create">
      <header class="dialog-heading">
        <div class="heading-copy">
          <h2 :id="`${fieldId}-title`">新建歌单</h2>
          <p>把喜欢的歌曲收在一起</p>
        </div>
        <button
          type="button"
          class="close-button"
          aria-label="关闭新建歌单"
          :disabled="loading"
          @click="closeDialog"
        >
          <v-icon icon="mdi-close" size="20" />
        </button>
      </header>
      <div class="dialog-fields">
        <div class="name-label">
          <label :for="`${fieldId}-name`">歌单名称</label>
          <span aria-hidden="true">{{ desc.length }} / 40</span>
        </div>
        <input
          :id="`${fieldId}-name`"
          ref="nameInput"
          v-model="desc"
          class="name-input"
          type="text"
          placeholder="例如：留给夜晚的歌"
          maxlength="40"
          autocomplete="off"
          :disabled="loading"
          :aria-invalid="!!nameError"
          :aria-describedby="nameError ? `${fieldId}-name-error` : undefined"
          @input="clearError"
        />
        <p v-if="nameError" :id="`${fieldId}-name-error`" class="form-error" role="alert">
          {{ nameError }}
        </p>
        <label class="privacy-option" :class="{ disabled: loading }">
          <input v-model="privacy" type="checkbox" :disabled="loading" />
          <v-icon
            class="privacy-icon"
            :icon="privacy ? 'mdi-lock-outline' : 'mdi-earth'"
            size="20"
            aria-hidden="true"
          />
          <span class="privacy-copy">
            <strong>设为私密歌单</strong>
            <span>{{ privacy ? '仅自己可见' : '公开歌单，其他人也可以发现' }}</span>
          </span>
          <v-icon
            class="checkbox-mark"
            :icon="privacy ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'"
            size="21"
            aria-hidden="true"
          />
        </label>
        <p v-if="requestError" class="form-error request-error" role="alert">{{ requestError }}</p>
      </div>
      <footer class="dialog-footer">
        <button type="button" class="cancel-button" :disabled="loading" @click="closeDialog">
          取消
        </button>
        <button type="submit" class="create-button" :disabled="loading || !name">
          <v-icon v-if="loading" class="spinning" icon="mdi-loading" size="16" />
          {{ loading ? '创建中…' : '创建歌单' }}
        </button>
      </footer>
    </form>
  </v-dialog>
</template>

<style lang="less" scoped>
.create-playlist-card {
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-panel);
  color: var(--app-text);
  box-shadow: var(--app-shadow);
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
.dialog-heading {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 22px;
}
.heading-copy {
  flex: 1;
  min-width: 0;
  h2 {
    margin: 0 0 6px;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.4;
  }
  p {
    margin: 0;
    color: var(--app-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}
.close-button {
  display: grid;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  margin: -3px -6px 0 0;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-muted);
  &:hover:not(:disabled) {
    background: var(--app-surface);
    color: var(--app-text);
  }
}
.dialog-fields {
  padding: 0 24px 24px;
}
.name-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
  label {
    font-size: 13px;
    font-weight: 500;
  }
  > span {
    color: var(--app-muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
}
.name-input {
  width: 100%;
  height: 43px;
  min-width: 0;
  padding: 0 12px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  outline: none;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 14px !important;
  transition: border-color 0.16s;
  &::placeholder {
    color: var(--app-muted);
    opacity: 0.65;
  }
  &:focus {
    border-color: var(--app-accent);
  }
  &[aria-invalid='true'] {
    border-color: var(--app-danger-text);
  }
  &:disabled {
    opacity: 0.5;
  }
}
.privacy-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding: 2px 0;
  border-radius: 6px;
  cursor: pointer;
  > input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  &:has(input:focus-visible) {
    outline: 2px solid var(--app-accent);
    outline-offset: 5px;
  }
  &:has(input:checked) .checkbox-mark {
    color: var(--app-accent);
  }
  &.disabled {
    cursor: default;
    opacity: 0.5;
  }
}
.privacy-icon,
.checkbox-mark {
  flex-shrink: 0;
  color: var(--app-muted);
}
.privacy-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  strong {
    font-size: 13px;
    font-weight: 500;
  }
  > span {
    color: var(--app-muted);
    font-size: 11px;
    line-height: 1.6;
  }
}
.form-error {
  margin: 8px 0 0;
  color: var(--app-danger-text);
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.request-error {
  margin-top: 18px;
}
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding: 16px 24px;
  border-top: 1px solid var(--app-border);
  button {
    display: inline-flex;
    min-width: 74px;
    height: 36px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 15px;
    border: 0;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
  }
}
.cancel-button {
  background: var(--app-surface);
  color: var(--app-text);
  &:hover:not(:disabled) {
    background: var(--app-hover);
  }
}
.create-button {
  background: var(--app-accent);
  color: var(--app-on-accent);
  &:hover:not(:disabled) {
    background: var(--app-accent-hover);
  }
}
.spinning {
  animation: creator-spin 0.8s linear infinite;
}
@keyframes creator-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 480px) {
  .dialog-heading {
    padding: 20px 18px;
  }
  .dialog-fields {
    padding: 0 18px 22px;
  }
  .dialog-footer {
    padding: 14px 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .name-input {
    transition: none;
  }
  .spinning {
    animation: none;
  }
}
</style>
