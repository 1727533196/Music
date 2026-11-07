import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import {
  shortcutIds,
  shortcutAccelerator,
  type ShortcutConfig,
  type ShortcutStatus
} from '../shared/shortcuts'

export function setupGlobalShortcuts(): void {
  let owner: BrowserWindow | null = null
  let config: ShortcutConfig | null = null
  let recording = false
  let lastStatus = {} as ShortcutStatus
  const owned = new Set<string>()
  const clear = () => {
    for (const key of owned) globalShortcut.unregister(key)
    owned.clear()
  }
  const register = (): ShortcutStatus => {
    clear()
    const status = {} as ShortcutStatus
    for (const id of shortcutIds) {
      const accelerator = shortcutAccelerator(config?.[id])
      let registered = false
      if (accelerator && !recording && owner && !owner.isDestroyed() && !owned.has(accelerator)) {
        try {
          registered = globalShortcut.register(accelerator, () => {
            if (!owner || owner.isDestroyed() || owner.webContents.isDestroyed()) return
            if (id === 'toggle_lyrics') {
              if (owner.isMinimized()) owner.restore()
              owner.show()
              owner.focus()
            }
            owner.webContents.send('shortcuts:action', id)
          })
          if (registered) owned.add(accelerator)
        } catch {
          /* Registration failures are reported in settings. */
        }
      }
      status[id] = {
        registered,
        message: recording
          ? ''
          : !accelerator
            ? '请使用 Ctrl / Command 或 Alt 加字母、数字、方向键等组合'
            : registered
              ? ''
              : '全局注册失败，组合可能已被其他程序占用，请更换'
      }
    }
    lastStatus = status
    return status
  }
  ipcMain.handle('shortcuts:configure', (event, value: ShortcutConfig) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('快捷键窗口不可用')
    if (!value || shortcutIds.some((id) => !shortcutAccelerator(value[id])))
      throw new Error('快捷键配置无效')
    if (owner !== window) {
      owner = window
      window.on('blur', () => {
        if (owner === window && recording) {
          recording = false
          register()
        }
      })
      window.on('closed', () => {
        if (owner === window) {
          clear()
          owner = null
          config = null
        }
      })
      window.webContents.on('render-process-gone', () => {
        if (owner === window) clear()
      })
    }
    config = Object.fromEntries(shortcutIds.map((id) => [id, [...value[id]]])) as ShortcutConfig
    return register()
  })
  ipcMain.handle('shortcuts:recording', (event, value: boolean) => {
    if (!owner || event.sender !== owner.webContents) throw new Error('快捷键窗口不可用')
    const next = value === true && owner.isFocused()
    if (recording === next) return lastStatus
    recording = next
    return register()
  })
  app.on('will-quit', clear)
}
