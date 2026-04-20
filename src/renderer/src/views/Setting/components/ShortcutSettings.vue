<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Shortcut {
  id: string
  name: string
  description: string
  keys: string[]
}

const emit = defineEmits<{
  (e: 'shortcut-change', shortcutId: string, keys: string[]): void
  (e: 'shortcut-reset', shortcutId: string, keys: string[]): void
  (e: 'shortcut-trigger', shortcutId: string): void
}>()

const shortcuts = ref<Shortcut[]>([
  {
    id: 'prev_track',
    name: '上一首',
    description: '切换到上一首歌曲',
    keys: ['Control', 'ArrowLeft']
  },
  {
    id: 'next_track',
    name: '下一首',
    description: '切换到下一首歌曲',
    keys: ['Control', 'ArrowRight']
  },
  {
    id: 'volume_up',
    name: '音量增加',
    description: '提高音量',
    keys: ['Control', 'ArrowUp']
  },
  {
    id: 'volume_down',
    name: '音量减少',
    description: '降低音量',
    keys: ['Control', 'ArrowDown']
  },
  {
    id: 'play_pause',
    name: '播放/暂停',
    description: '控制音乐播放或暂停',
    keys: ['Space']
  },
  {
    id: 'toggle_lyrics',
    name: '显示/隐藏歌词',
    description: '切换歌词显示状态',
    keys: ['L']
  },
  {
    id: 'search',
    name: '搜索',
    description: '快速打开搜索框',
    keys: ['Control', 'K']
  }
])

const editingId = ref<string | null>(null)
const recordingKeys = ref<string[]>([])
const isRecording = ref(false)

const formatKeys = (keys: string[]): string => {
  return keys.map(key => {
    // 统一按键显示名称
    const keyMap: Record<string, string> = {
      'Control': 'Ctrl',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      ' ': 'Space'
    }
    return keyMap[key] || key
  }).join(' + ')
}

const startRecording = (id: string) => {
  editingId.value = id
  recordingKeys.value = []
  isRecording.value = true
}

const stopRecording = () => {
  editingId.value = null
  recordingKeys.value = []
  isRecording.value = false
}

const handleKeyDown = (event: KeyboardEvent, shortcut: Shortcut) => {
  if (!isRecording.value || editingId.value !== shortcut.id) return

  event.preventDefault()
  event.stopPropagation()

  let key = event.key

  // 标准化按键名称
  if (key === ' ') key = 'Space'

  // 忽略单独的修饰键（但需要记录）
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    if (!recordingKeys.value.includes(key)) {
      recordingKeys.value.push(key)
    }
    return
  }

  // 添加普通键
  if (!recordingKeys.value.includes(key)) {
    recordingKeys.value.push(key)
  }

  // 自动保存逻辑：
  // 1. 有修饰键 + 普通键（至少2个键）
  // 2. 单个功能键（Escape, Enter, Space, Tab, F1-F12等）
  // 3. 单个字母或数字键
  const hasModifier = ['Control', 'Shift', 'Alt', 'Meta'].some(k => recordingKeys.value.includes(k))
  const isFunctionKey = ['Escape', 'Enter', 'Space', 'Tab', 'Delete', 'Backspace', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)
  const isFKey = /^F\d+$/.test(key) // F1-F12 等功能键
  const isSingleKey = (key.length === 1 || isFKey) && !hasModifier // 单个字符键或F键

  if ((hasModifier && recordingKeys.value.length >= 2) || isFunctionKey || isSingleKey) {
    saveShortcut(shortcut.id, [...recordingKeys.value])
    stopRecording()
  }
}

const saveShortcut = (id: string, keys: string[]) => {
  const shortcut = shortcuts.value.find(s => s.id === id)
  if (shortcut) {
    shortcut.keys = keys
    // 保存到 localStorage
    localStorage.setItem(`shortcut_${id}`, JSON.stringify(keys))
    // 触发事件通知父组件
    emit('shortcut-change', id, keys)
  }
}

const defaultShortcuts: Record<string, string[]> = {
  'play_pause': ['Space'],
  'prev_track': ['Control', 'ArrowLeft'],
  'next_track': ['Control', 'ArrowRight'],
  'volume_up': ['Control', 'ArrowUp'],
  'volume_down': ['Control', 'ArrowDown'],
  'toggle_lyrics': ['L'],
  'search': ['Control', 'K']
}

const resetShortcut = (id: string) => {
  const shortcut = shortcuts.value.find(s => s.id === id)
  if (shortcut && defaultShortcuts[id]) {
    shortcut.keys = defaultShortcuts[id]
    localStorage.removeItem(`shortcut_${id}`)
    // 触发事件通知父组件
    emit('shortcut-reset', id, defaultShortcuts[id])
  }
}

const cancelEditing = () => {
  stopRecording()
}

// 加载保存的快捷键
onMounted(() => {
  shortcuts.value.forEach(shortcut => {
    const saved = localStorage.getItem(`shortcut_${shortcut.id}`)
    if (saved) {
      try {
        shortcut.keys = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse shortcut:', e)
      }
    }
  })

  // 录制时的键盘监听
  const handleRecordingKeyDown = (e: KeyboardEvent) => {
    if (!isRecording.value || !editingId.value) return
    
    const currentShortcut = shortcuts.value.find(s => s.id === editingId.value)
    if (currentShortcut) {
      handleKeyDown(e, currentShortcut)
    }
  }

  window.addEventListener('keydown', handleRecordingKeyDown)
  
  // 保存引用以便卸载时移除
  ;(window as any).__recordingHandler = handleRecordingKeyDown
})

onUnmounted(() => {
  // 只移除录制监听，不影响全局快捷键
  const handler = (window as any).__recordingHandler
  if (handler) {
    window.removeEventListener('keydown', handler)
    delete (window as any).__recordingHandler
  }
})
</script>

<template>
  <div class="shortcut-settings-container">
    <div class="section-header">
      <h2 class="section-title">
        <v-icon icon="mdi-keyboard" size="small" class="section-icon"></v-icon>
        快捷键设置
      </h2>
      <span class="section-subtitle">点击快捷键组合即可重新录制</span>
    </div>

    <div class="shortcuts-list">
      <div
        v-for="shortcut in shortcuts"
        :key="shortcut.id"
        class="shortcut-item"
        :class="{ 'is-editing': editingId === shortcut.id }"
      >
        <div class="shortcut-info">
          <div class="shortcut-name">{{ shortcut.name }}</div>
          <div class="shortcut-desc">{{ shortcut.description }}</div>
        </div>

        <div class="shortcut-actions">
          <div
            v-if="editingId === shortcut.id"
            class="recording-box"
            @click.stop
          >
            <span v-if="recordingKeys.length > 0" class="recording-keys">
              {{ formatKeys(recordingKeys) }}
            </span>
            <span v-else class="recording-placeholder">
              <v-icon icon="mdi-hand-back-right" size="small"></v-icon>
              请按下快捷键...
            </span>
          </div>

          <div
            v-else
            class="shortcut-display"
            @click="startRecording(shortcut.id)"
          >
            <kbd v-for="(key, index) in shortcut.keys" :key="index" class="key-badge">
              {{ formatKeys([key]) }}
            </kbd>
            <v-icon icon="mdi-pencil-outline" size="x-small" class="edit-icon"></v-icon>
          </div>

          <div class="action-buttons">
            <v-btn
              v-if="editingId === shortcut.id"
              size="small"
              variant="text"
              color="error"
              @click="cancelEditing"
              class="action-btn"
            >
              <v-icon icon="mdi-close" size="small"></v-icon>
            </v-btn>

            <v-btn
              v-else
              size="small"
              variant="text"
              @click="resetShortcut(shortcut.id)"
              class="action-btn"
              title="恢复默认"
            >
              <v-icon icon="mdi-refresh" size="small"></v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <div class="tips-section">
      <v-icon icon="mdi-information-outline" size="small"></v-icon>
      <span>支持组合键，如 <kbd class="inline-kbd">Ctrl</kbd> + <kbd class="inline-kbd">K</kbd></span>
    </div>
  </div>
</template>

<style lang="less" scoped>
.shortcut-settings-container {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 20px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.settings-section {
  padding: 8px 0;
}

.section-header {
  margin-bottom: 24px;

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 6px 0;

    .section-icon {
    }
  }

  .section-subtitle {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
    padding-left: 28px;
  }
}

.shortcuts-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.shortcut-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
  min-height: 120px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  &.is-editing {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

.shortcut-info {
  .shortcut-name {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 3px;
  }

  .shortcut-desc {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.4;
  }
}

.shortcut-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
}

.recording-box {
  background: rgba(255, 255, 255, 0.08);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1.5s ease-in-out infinite;

  .recording-keys {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  }

  .recording-placeholder {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);

    .v-icon {
      animation: wave 1s ease-in-out infinite;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }
  50% {
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.12);
  }
}

@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.shortcut-display {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 12px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);

    .edit-icon {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .key-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    padding: 0 7px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 5px;
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
  }

  .edit-icon {
    opacity: 0;
    color: rgba(255, 255, 255, 0.5);
    transform: translateX(-4px);
    transition: all 0.2s ease;
  }
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  opacity: 0;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1 !important;
  }
}

.shortcut-item:hover .action-btn {
  opacity: 0.6;
}

.tips-section {
  margin-top: 20px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);

  .v-icon {
  }

  .inline-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 22px;
    padding: 0 6px;
    margin: 0 2px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.85);
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  }
}
</style>
