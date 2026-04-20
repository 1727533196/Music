//  快捷键配置文件
import { useFlags } from '@/store/flags'
import { useMusicAction } from '@/store/music'

// 默认快捷键配置
const defaultShortcuts: Record<string, string[]> = {
  'play_pause': ['Space'],
  'prev_track': ['Control', 'ArrowLeft'],
  'next_track': ['Control', 'ArrowRight'],
  'volume_up': ['Control', 'ArrowUp'],
  'volume_down': ['Control', 'ArrowDown'],
  'toggle_lyrics': ['L'],
  'search': ['Control', 'K']
}

// 获取用户配置的快捷键（从 localStorage）
const getUserShortcuts = (): Record<string, string[]> => {
  const shortcuts: Record<string, string[]> = {}

  Object.keys(defaultShortcuts).forEach(id => {
    const saved = localStorage.getItem(`shortcut_${id}`)
    if (saved) {
      try {
        shortcuts[id] = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse shortcut:', e)
        shortcuts[id] = defaultShortcuts[id]
      }
    } else {
      shortcuts[id] = defaultShortcuts[id]
    }
  })

  return shortcuts
}

// 检查按键组合是否匹配
const isKeysMatch = (pressedKeys: string[], shortcutKeys: string[]): boolean => {
  if (pressedKeys.length !== shortcutKeys.length) return false

  const sorted1 = [...pressedKeys].sort()
  const sorted2 = [...shortcutKeys].sort()

  return sorted1.every((key, index) => key === sorted2[index])
}

const keydownHandler = (event: KeyboardEvent) => {
  const flags = useFlags()
  const music = useMusicAction()

  // 如果在输入框等元素中，不触发快捷键
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }

  // 构建当前按下的键组合
  const pressedKeys: string[] = []
  if (event.ctrlKey || event.metaKey) pressedKeys.push('Control')
  if (event.shiftKey) pressedKeys.push('Shift')
  if (event.altKey) pressedKeys.push('Alt')

  let mainKey = event.key
  if (mainKey === ' ') mainKey = 'Space'
  if (!['Control', 'Shift', 'Alt', 'Meta'].includes(mainKey)) {
    pressedKeys.push(mainKey)
  }

  // 获取用户配置的快捷键
  const userShortcuts = getUserShortcuts()

  // 查找匹配的快捷键并执行对应操作
  for (const [id, keys] of Object.entries(userShortcuts)) {
    if (isKeysMatch(pressedKeys, keys)) {
      event.preventDefault()
      event.stopPropagation()

      // 根据快捷键 ID 执行对应操作
      switch (id) {
        case 'play_pause':
          if ($audio.isPlay) {
            $audio.pause()
          } else {
            $audio.play()
          }
          break
        case 'prev_track':
          music.cutSongHandler(false)
          break
        case 'next_track':
          music.cutSongHandler(true)
          break
        case 'volume_up':
          // $audio.volume = Math.min(1, $audio.volume + 0.1)
          break
        case 'volume_down':
          // $audio.volume = Math.max(0, $audio.volume - 0.1)
          break
        case 'toggle_lyrics':
          flags.isOpenDetail = !flags.isOpenDetail
          break
        case 'search':
          // 触发搜索，可以通过事件总线或其他方式
          window.dispatchEvent(new CustomEvent('open-search'))
          break
      }

      break // 只执行第一个匹配的快捷键
    }
  }
}

// 按键配置
document.onkeydown = keydownHandler

export {}
