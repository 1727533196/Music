<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true })
const emit = defineEmits<{
  (e: 'shortcut-change', shortcutId: string, keys: string[]): void
  (e: 'shortcut-reset', shortcutId: string, keys: string[]): void
}>()

const defaults: Record<string, string[]> = {
  play_pause: ['Space'],
  prev_track: ['Control', 'ArrowLeft'],
  next_track: ['Control', 'ArrowRight'],
  toggle_lyrics: ['L'],
  volume_up: ['Control', 'ArrowUp'],
  volume_down: ['Control', 'ArrowDown'],
  search: ['Control', 'K']
}
const shortcuts = ref([
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
  },
  {
    available: false,
    id: 'volume_up',
    name: '音量增加',
    description: '暂不可用，请使用播放器音量滑块',
    keys: [...defaults.volume_up]
  },
  {
    available: false,
    id: 'volume_down',
    name: '音量减少',
    description: '暂不可用，请使用播放器音量滑块',
    keys: [...defaults.volume_down]
  },
  {
    available: false,
    id: 'search',
    name: '快速搜索',
    description: '暂不可用，请使用顶部搜索框',
    keys: [...defaults.search]
  }
])
const availableShortcuts = computed(() => shortcuts.value.filter((shortcut) => shortcut.available))
const unavailableShortcuts = computed(() =>
  shortcuts.value.filter((shortcut) => !shortcut.available)
)
const editingId = ref<string | null>(null)
const feedback = ref('')
const keyLabels: Record<string, string> = {
  Control: /Mac/i.test(navigator.platform) ? '⌘ / Ctrl' : 'Ctrl',
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
const stopRecording = () => {
  editingId.value = null
}
const startRecording = (id: string) => {
  if (!shortcuts.value.find((entry) => entry.id === id)?.available) return
  feedback.value = ''
  editingId.value = id
}

const recordKey = (event: KeyboardEvent) => {
  if (!editingId.value || !props.active) return
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
  if (
    shortcuts.value.some(
      (shortcut) =>
        shortcut.id !== editingId.value && normalizeKeys(shortcut.keys) === normalizeKeys(keys)
    )
  ) {
    feedback.value = '这个组合已被其他操作使用，请换一个快捷键。'
    return
  }
  const shortcut = shortcuts.value.find((entry) => entry.id === editingId.value)
  if (!shortcut) return
  shortcut.keys = keys
  localStorage.setItem(`shortcut_${shortcut.id}`, JSON.stringify(keys))
  emit('shortcut-change', shortcut.id, keys)
  feedback.value = `已更新${shortcut.name}快捷键`
  stopRecording()
}

const resetShortcut = (id: string) => {
  stopRecording()
  const shortcut = shortcuts.value.find((entry) => entry.id === id)
  if (!shortcut) return
  if (
    shortcuts.value.some(
      (entry) => entry.id !== id && normalizeKeys(entry.keys) === normalizeKeys(defaults[id])
    )
  ) {
    feedback.value = '默认组合已被其他操作使用，请先修改占用它的快捷键。'
    return
  }
  shortcut.keys = [...defaults[id]]
  localStorage.removeItem(`shortcut_${id}`)
  emit('shortcut-reset', id, shortcut.keys)
  feedback.value = `已恢复${shortcut.name}的默认快捷键`
}
watch(
  () => props.active,
  (active) => {
    if (!active) stopRecording()
  }
)
onMounted(() => {
  shortcuts.value.forEach((shortcut) => {
    try {
      const saved = JSON.parse(localStorage.getItem(`shortcut_${shortcut.id}`) || 'null')
      if (Array.isArray(saved) && saved.length && saved.every((key) => typeof key === 'string'))
        shortcut.keys = saved
    } catch {
      /* 无效缓存继续使用默认组合。 */
    }
  })
  window.addEventListener('keydown', recordKey, true)
})
onUnmounted(() => window.removeEventListener('keydown', recordKey, true))
</script>

<template>
  <section class="settings-section shortcut-section" aria-labelledby="shortcut-title">
    <h2 id="shortcut-title" class="section-title">播放快捷键</h2>
    <p class="section-description">
      在应用窗口中使用。点击右侧组合修改，按 Esc 取消；在输入框中不会触发。
    </p>
    <div class="shortcuts-list">
      <div v-for="shortcut in availableShortcuts" :key="shortcut.id" class="shortcut-row">
        <div class="shortcut-info">
          <div class="shortcut-name">{{ shortcut.name }}</div>
          <div class="shortcut-description">{{ shortcut.description }}</div>
        </div>
        <div class="shortcut-actions">
          <button
            type="button"
            class="shortcut-display"
            :class="{ recording: editingId === shortcut.id }"
            :aria-label="`修改${shortcut.name}快捷键，当前 ${shortcut.keys.map(keyLabel).join(' + ')}`"
            :aria-pressed="editingId === shortcut.id"
            :disabled="!shortcut.available"
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
            v-if="editingId === shortcut.id"
            type="button"
            class="shortcut-reset"
            @click="stopRecording"
          >
            取消
          </button>
          <button
            v-else-if="shortcut.available"
            type="button"
            class="shortcut-reset"
            :aria-label="`恢复${shortcut.name}默认快捷键`"
            @click="resetShortcut(shortcut.id)"
          >
            重置
          </button>
        </div>
      </div>
    </div>
    <p class="shortcut-feedback" role="status">
      {{ feedback || '修改后自动保存。macOS 支持使用 Command 或 Control 作为组合键。' }}
    </p>
    <details class="unavailable-shortcuts">
      <summary>其他操作 · 暂不可用</summary>
      <div v-for="shortcut in unavailableShortcuts" :key="shortcut.id" class="shortcut-row">
        <div class="shortcut-info">
          <div class="shortcut-name">{{ shortcut.name }}</div>
          <div class="shortcut-description">{{ shortcut.description }}</div>
        </div>
        <div
          class="shortcut-display shortcut-readonly"
          :aria-label="`${shortcut.name}快捷键，暂不可用`"
        >
          <kbd v-for="(key, index) in shortcut.keys" :key="index">{{ keyLabel(key) }}</kbd>
        </div>
      </div>
    </details>
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
  grid-template-columns: minmax(0, 1fr) 240px;
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
  grid-template-columns: minmax(0, 1fr) 40px;
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
.unavailable-shortcuts {
  margin-top: 12px;
  border-top: 1px solid var(--app-border);
  summary {
    padding: 13px 0;
    color: var(--app-muted);
    font-size: 12px;
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 3px;
    }
  }
}
.shortcut-readonly {
  justify-self: end;
  width: 188px;
  cursor: default;
  color: var(--app-muted);
  opacity: 0.65;
}
.shortcut-readonly:hover {
  background: transparent;
  border-color: var(--app-border);
}
@media (max-width: 600px) {
  .shortcut-row {
    grid-template-columns: minmax(0, 1fr) 206px;
    gap: 14px;
  }
  .shortcut-actions {
    gap: 8px;
    grid-template-columns: minmax(0, 1fr) 36px;
  }
  .shortcut-readonly {
    width: 162px;
  }
}
@media (max-width: 480px) {
  .shortcut-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .shortcut-actions {
    width: min(100%, 240px);
    justify-self: end;
  }
  .shortcut-readonly {
    width: min(100%, 196px);
  }
}
</style>
