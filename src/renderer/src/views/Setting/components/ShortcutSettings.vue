<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  globalShortcutDefaults,
  shortcutAccelerator,
  type ShortcutId
} from '../../../../../shared/shortcuts'
import {
  readGlobalShortcuts,
  setShortcutRecording,
  syncGlobalShortcuts,
  shortcutStatus
} from '@/utils/shortcutKey'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const emit = defineEmits<{
  (e: 'shortcut-change', shortcutId: string, keys: string[]): void
  (e: 'shortcut-reset', shortcutId: string, keys: string[]): void
}>()

const defaults: Record<string, string[]> = globalShortcutDefaults
const shortcuts = ref<
  { available: boolean; id: ShortcutId; name: string; description: string; keys: string[] }[]
>([
  {
    available: true,
    id: 'play_pause',
    name: '播放 / 暂停',
    description: '控制当前歌曲的播放状态',
    keys: [...defaults.play_pause]
  },
  {
    available: true,
    id: 'prev_track',
    name: '上一首',
    description: '切换到播放队列中的上一首',
    keys: [...defaults.prev_track]
  },
  {
    available: true,
    id: 'next_track',
    name: '下一首',
    description: '切换到播放队列中的下一首',
    keys: [...defaults.next_track]
  },
  {
    available: true,
    id: 'toggle_lyrics',
    name: '展开 / 收起歌词',
    description: '切换歌曲详情页',
    keys: [...defaults.toggle_lyrics]
  }
])
const availableShortcuts = computed(() => shortcuts.value.filter((shortcut) => shortcut.available))
const editingId = ref<ShortcutId | null>(null)
const manualId = ref<ShortcutId | null>(null)
const manualModifiers = ref<string[]>([])
const manualKey = ref('Space')
const savingId = ref<ShortcutId | null>(null)
const modifierKeys = ['Control', 'Alt', 'Shift']
const keyGroups = [
  { label: '常用按键', keys: ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+'] },
  { label: '功能键', keys: Array.from({ length: 24 }, (_, index) => 'F' + (index + 1)) },
  { label: '字母', keys: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { label: '数字', keys: '0123456789'.split('') }
]
let recordingTimer: ReturnType<typeof setTimeout> | undefined
const feedback = ref('')
const keyLabels: Record<string, string> = {
  Control: /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl',
  Shift: 'Shift',
  Alt: 'Alt',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Space: '空格'
}
const keyLabel = (key: string) => keyLabels[key] || (key.length === 1 ? key.toUpperCase() : key)
const normalizeKeys = (keys: string[]) =>
  keys
    .map((key) => key.toLowerCase())
    .sort()
    .join('+')
let recordingEpoch = 0
const stopRecording = async () => {
  recordingEpoch++
  clearTimeout(recordingTimer)
  editingId.value = null
  try {
    await setShortcutRecording(false)
    return true
  } catch {
    return false
  }
}
const startRecording = async (id: ShortcutId) => {
  if (savingId.value) return
  manualId.value = null
  clearTimeout(recordingTimer)
  if (!shortcuts.value.find((entry) => entry.id === id)?.available) return
  const epoch = ++recordingEpoch
  feedback.value = ''
  try {
    await syncGlobalShortcuts()
    await setShortcutRecording(true)
    if (epoch === recordingEpoch && props.active && document.hasFocus()) {
      editingId.value = id
      recordingTimer = setTimeout(() => {
        if (epoch === recordingEpoch && editingId.value === id && !feedback.value)
          feedback.value = '按键没有反应时，可用“手动设置”选择组合。按键可能被系统或其他程序拦截。'
      }, 4000)
    } else await setShortcutRecording(false)
  } catch {
    await stopRecording()
    feedback.value = '全局快捷键服务不可用，请重启应用后重试'
  }
}

const recordKey = async (event: KeyboardEvent) => {
  if (!editingId.value || !props.active || savingId.value) return
  if (event.key === 'Tab') {
    stopRecording()
    return
  }
  event.preventDefault()
  event.stopImmediatePropagation()
  if (event.key === 'Escape') {
    stopRecording()
    return
  }
  if (event.repeat || ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return
  const keys: string[] = []
  if (event.ctrlKey || event.metaKey) keys.push('Control')
  if (event.shiftKey) keys.push('Shift')
  if (event.altKey) keys.push('Alt')
  keys.push(event.key === ' ' ? 'Space' : event.key)
  await saveShortcut(editingId.value, keys)
}

function startManual(id: ShortcutId) {
  if (savingId.value) return
  void stopRecording()
  const shortcut = shortcuts.value.find((entry) => entry.id === id)!
  manualModifiers.value = shortcut.keys.filter((key) => modifierKeys.includes(key))
  const main = shortcut.keys.find((key) => !modifierKeys.includes(key)) || 'Space'
  manualKey.value = main.length === 1 && /^[a-z]$/i.test(main) ? main.toUpperCase() : main
  manualId.value = id
  feedback.value = ''
}
function saveManual() {
  if (!manualId.value) return
  void saveShortcut(manualId.value, [
    ...modifierKeys.filter((key) => manualModifiers.value.includes(key)),
    manualKey.value
  ])
}
function registrationFeedback(id: ShortcutId, reset = false) {
  const name = shortcuts.value.find((entry) => entry.id === id)!.name
  const status = shortcutStatus.value?.[id]
  feedback.value = status?.registered
    ? (reset ? '已恢复默认组合并启用：' : '已保存并启用：') + name
    : '已保存' +
      name +
      '的组合，但尚未全局启用。' +
      (status?.message || '全局快捷键服务暂不可用，请重试。')
}
async function saveShortcut(id: ShortcutId, keys: string[], reset = false) {
  if (savingId.value) return
  if (
    shortcuts.value.some(
      (entry) => entry.id !== id && normalizeKeys(entry.keys) === normalizeKeys(keys)
    )
  ) {
    feedback.value = '这个组合已被其他操作使用，请换一个快捷键。'
    return
  }
  if (!shortcutAccelerator(keys)) {
    feedback.value = '请选择 Ctrl / Command 或 Alt，再搭配主按键；支持 F1～F24。'
    return
  }
  savingId.value = id
  let saved = false
  try {
    localStorage.setItem('global_shortcut_' + id, JSON.stringify(keys))
    shortcuts.value.find((entry) => entry.id === id)!.keys = [...keys]
    saved = true
    if (reset) emit('shortcut-reset', id, keys)
    else emit('shortcut-change', id, keys)
    await syncGlobalShortcuts()
    if (!(await stopRecording())) throw new Error('Could not resume shortcuts')
    manualId.value = null
    registrationFeedback(id, reset)
  } catch {
    await stopRecording()
    if (saved && shortcutStatus.value)
      shortcutStatus.value = {
        ...shortcutStatus.value,
        [id]: { registered: false, message: '注册状态未确认，请点击重试。' }
      }
    feedback.value = saved ? '组合已保存，但注册状态未确认，请点击重试。' : '组合保存失败，请重试。'
  } finally {
    savingId.value = null
  }
}
async function retryRegistration(id: ShortcutId) {
  if (savingId.value) return
  savingId.value = id
  try {
    if (!(await stopRecording())) throw new Error('Could not resume shortcuts')
    await syncGlobalShortcuts()
    registrationFeedback(id)
  } catch {
    feedback.value = '全局快捷键服务暂不可用，请重试。'
  } finally {
    savingId.value = null
  }
}
const resetShortcut = async (id: ShortcutId) => {
  await saveShortcut(id, [...defaults[id]], true)
}
watch(
  () => props.active,
  (active) => {
    if (!active) {
      manualId.value = null
      void stopRecording()
    }
  }
)
onMounted(() => {
  const saved = readGlobalShortcuts()
  shortcuts.value.forEach((shortcut) => {
    shortcut.keys = [...saved[shortcut.id]]
  })
  window.addEventListener('keydown', recordKey, true)
  window.addEventListener('blur', stopRecording)
})
onUnmounted(() => {
  window.removeEventListener('keydown', recordKey, true)
  window.removeEventListener('blur', stopRecording)
  void stopRecording()
})
</script>

<template>
  <section class="settings-section shortcut-section" aria-labelledby="shortcut-title">
    <h2 id="shortcut-title" class="section-title">播放快捷键</h2>
    <p class="section-description">
      点击组合后按键录入，或用“手动设置”选择组合。全局注册成功后可在其他窗口使用。
      窗口内仍支持空格播放 / 暂停、L 切换歌词。
    </p>
    <div class="shortcuts-list">
      <div v-for="shortcut in availableShortcuts" :key="shortcut.id" class="shortcut-row">
        <div class="shortcut-info">
          <div class="shortcut-name">{{ shortcut.name }}</div>
          <div class="shortcut-description">{{ shortcut.description }}</div>
          <p
            v-if="!editingId"
            class="shortcut-state"
            :class="{
              'shortcut-error':
                savingId !== shortcut.id && shortcutStatus?.[shortcut.id]?.registered === false
            }"
            role="status"
          >
            <span v-if="savingId === shortcut.id">正在注册…</span>
            <span v-else-if="shortcutStatus?.[shortcut.id]?.registered">已启用全局快捷键</span>
            <span v-else-if="shortcutStatus?.[shortcut.id]"
              >已保存，未启用{{
                shortcutStatus?.[shortcut.id]?.message
                  ? '：' + shortcutStatus[shortcut.id].message
                  : ''
              }}</span
            >
            <span v-else>注册状态待确认</span>
            <button
              v-if="!shortcutStatus?.[shortcut.id]?.registered"
              type="button"
              class="registration-retry"
              :disabled="!!savingId"
              :aria-label="`重试注册${shortcut.name}快捷键`"
              @click="retryRegistration(shortcut.id)"
            >
              重试注册
            </button>
          </p>
        </div>
        <div class="shortcut-actions">
          <button
            type="button"
            class="shortcut-display"
            :class="{ recording: editingId === shortcut.id }"
            :aria-label="`修改${shortcut.name}快捷键，当前 ${shortcut.keys.map(keyLabel).join(' + ')}`"
            :aria-pressed="editingId === shortcut.id"
            :disabled="!shortcut.available || !!savingId"
            @click="startRecording(shortcut.id)"
            @blur="stopRecording"
          >
            <span v-if="editingId === shortcut.id" class="recording-hint">请按下组合键…</span>
            <template v-else>
              <kbd v-for="(key, index) in shortcut.keys" :key="index">{{ keyLabel(key) }}</kbd>
              <v-icon
                v-if="shortcut.available"
                icon="mdi-pencil-outline"
                size="14"
                class="edit-icon"
              />
            </template>
          </button>
          <button
            type="button"
            class="shortcut-reset manual-button"
            :disabled="!!savingId"
            :aria-label="`手动设置${shortcut.name}快捷键`"
            @click="startManual(shortcut.id)"
          >
            手动设置
          </button>
          <button
            v-if="editingId === shortcut.id"
            type="button"
            class="shortcut-reset"
            :disabled="!!savingId"
            @click="stopRecording"
          >
            取消
          </button>
          <button
            v-else-if="shortcut.available"
            type="button"
            class="shortcut-reset"
            :disabled="!!savingId"
            :aria-label="`恢复${shortcut.name}默认快捷键`"
            @click="resetShortcut(shortcut.id)"
          >
            重置
          </button>
        </div>
        <form
          v-if="manualId === shortcut.id"
          class="manual-shortcut"
          :aria-label="`手动选择${shortcut.name}组合`"
          @submit.prevent="saveManual"
          @keydown.esc.stop.prevent="manualId = null"
        >
          <fieldset :disabled="!!savingId">
            <legend>修饰键</legend>
            <label v-for="modifier in modifierKeys" :key="modifier"
              ><input v-model="manualModifiers" type="checkbox" :value="modifier" />{{
                keyLabel(modifier)
              }}</label
            >
          </fieldset>
          <label class="main-key"
            >主按键<select v-model="manualKey" :disabled="!!savingId">
              <optgroup v-for="group in keyGroups" :key="group.label" :label="group.label">
                <option v-for="key in group.keys" :key="key" :value="key">
                  {{ keyLabel(key) }}
                </option>
              </optgroup>
            </select></label
          >
          <div class="manual-actions">
            <button type="button" :disabled="!!savingId" @click="manualId = null">取消</button
            ><button type="submit" :disabled="!!savingId">
              {{ savingId ? '保存中…' : '保存组合' }}
            </button>
          </div>
          <p>至少选择 Ctrl / Command 或 Alt。组合被占用时仍可保存，释放占用后点击“重试注册”。</p>
        </form>
      </div>
    </div>
    <p class="shortcut-feedback" role="status">
      {{ feedback || '按键录入后自动保存，手动设置需点击保存组合。macOS 的 Ctrl 对应 Command。' }}
    </p>
  </section>
</template>

<style lang="less" scoped>
@import '../index.less';
.section-description {
  margin: 0 0 10px;
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.6;
}
.shortcut-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 64px;
  padding: 12px 0;
  border-bottom: 1px solid var(--app-border);
}
.shortcut-row:last-child {
  border-bottom: 0;
}
.shortcut-info {
  min-width: 0;
}
.shortcut-name {
  font-size: 14px;
  color: var(--app-text);
  font-weight: 550;
  line-height: 1.5;
}
.shortcut-description {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-muted);
  line-height: 1.5;
}
.shortcut-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 40px;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.shortcut-display {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 36px;
  min-width: 0;
  padding: 4px 9px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
}
.shortcut-display:disabled {
  cursor: default;
  color: var(--app-muted);
  opacity: 0.65;
}
.shortcut-display:hover:not(:disabled) {
  border-color: var(--app-border);
  background: var(--app-surface);
}
.shortcut-display.recording {
  border-color: var(--app-accent);
  background: var(--app-accent-soft);
}
kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--app-border);
  border-radius: 5px;
  background: var(--app-surface);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);
  white-space: nowrap;
  font:
    12px ui-monospace,
    'SFMono-Regular',
    monospace;
}
.edit-icon {
  flex-shrink: 0;
  margin-left: 3px;
  color: var(--app-muted);
  opacity: 0.6;
}
.shortcut-display:hover .edit-icon,
.shortcut-display:focus-visible .edit-icon {
  opacity: 1;
}
.recording-hint {
  font-size: 12px;
  color: var(--app-accent);
}
.shortcut-reset {
  border: 0;
  min-height: 36px;
  padding: 6px 4px;
  border-radius: 6px;
  background: transparent;
  color: var(--app-muted);
  font-size: 12px;
  cursor: pointer;
}
.shortcut-reset:hover {
  color: var(--app-text);
  background: var(--app-surface);
}
button:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
.shortcut-feedback {
  min-height: 20px;
  margin: 12px 0 0;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.6;
}
.shortcut-error {
  color: var(--app-danger-text);
  font-size: 12px;
  margin-top: 5px;
}
.shortcut-state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 10px;
  margin-top: 5px;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.6;
}
.registration-retry {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-accent);
  font: inherit;
  cursor: pointer;
}
.shortcut-state.shortcut-error {
  color: var(--app-danger-text);
}
.manual-shortcut {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 14px 22px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 12px;
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 14px;
  }
  legend {
    margin-bottom: 10px;
    color: var(--app-muted);
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  input {
    accent-color: var(--app-accent);
  }
  .main-key {
    flex-direction: column;
    align-items: flex-start;
    color: var(--app-muted);
  }
  select {
    min-width: 120px;
    min-height: 34px;
    padding: 4px 8px;
    border: 1px solid var(--app-border);
    border-radius: 6px;
    color: var(--app-text);
    background: var(--app-bg);
    font: inherit;
  }
  .manual-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }
  button {
    min-height: 34px;
    padding: 4px 12px;
    border: 1px solid var(--app-border);
    border-radius: 6px;
    background: transparent;
    color: var(--app-text);
    font: inherit;
    cursor: pointer;
  }
  p {
    width: 100%;
    margin: 0;
    color: var(--app-muted);
    line-height: 1.7;
  }
}
button:disabled {
  cursor: default;
  opacity: 0.5;
}
select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .shortcut-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
  .shortcut-actions {
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) 64px 36px;
  }
}
@media (max-width: 480px) {
  .shortcut-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .shortcut-actions {
    width: 100%;
    justify-self: end;
  }
}
</style>
