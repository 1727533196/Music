import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type Rectangle
} from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import {
  desktopLyricDefaults,
  desktopLyricCommands,
  sanitizeDesktopLyricSettings,
  type DesktopLyricSettings,
  type DesktopLyricTrack,
  type DesktopLyricClock,
  type DesktopLyricCommand
} from '../shared/desktopLyrics'

export function setupDesktopLyrics(owner: BrowserWindow): void {
  const path = join(app.getPath('userData'), 'desktop-lyrics.json')
  let settings = { ...desktopLyricDefaults }
  let bounds: Rectangle | undefined
  try {
    const saved = JSON.parse(readFileSync(path, 'utf8'))
    settings = { ...settings, ...sanitizeDesktopLyricSettings(saved.settings || {}) }
    if (saved.colorVersion !== 1) {
      if (settings.color.toLowerCase() === '#ffffff') settings.color = desktopLyricDefaults.color
      if (settings.highlight.toLowerCase() === '#9fe8ff')
        settings.highlight = desktopLyricDefaults.highlight
    }
    // 旧版默认字号随单行布局缩小；已自定义的其他字号继续保留。
    if (saved.layoutVersion !== 2 && settings.fontSize === 36) settings.fontSize = 28
    if (
      saved.bounds &&
      ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(saved.bounds[k]))
    )
      bounds = saved.bounds
  } catch {
    /* 首次启动使用默认设置。 */
  }
  let overlay: BrowserWindow | null = null
  let track: DesktopLyricTrack | null = null
  let clock: DesktopLyricClock | null = null
  let connected = false
  let ready = false
  let disposed = false
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let dragOrigin: {
    x: number
    y: number
    cursorX: number
    cursorY: number
    width: number
    height: number
  } | null = null
  let unlockBounds: Rectangle | null = null
  let lyricBounds: Rectangle | null = null
  let lockHideAt = 0
  let lockHovered = false
  let ignored: boolean | undefined
  let lockTimer: ReturnType<typeof setInterval> | undefined
  const persist = () => {
    clearTimeout(saveTimer)
    try {
      mkdirSync(app.getPath('userData'), { recursive: true })
      writeFileSync(
        path + '.tmp',
        JSON.stringify({ layoutVersion: 2, colorVersion: 1, settings, bounds })
      )
      renameSync(path + '.tmp', path)
    } catch {
      /* 不让保存偏好失败打断播放。 */
    }
  }
  const saveSoon = () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 250)
  }
  const send = (window: BrowserWindow | null, channel: string, value: unknown) => {
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed())
      window.webContents.send(channel, value)
  }
  const broadcast = () => {
    send(owner, 'desktop-lyrics:state', settings)
    send(overlay, 'desktop-lyrics:state', settings)
  }
  const ignoreMouse = (value: boolean) => {
    if (!overlay || overlay.isDestroyed() || ignored === value) return
    overlay.setIgnoreMouseEvents(value)
    ignored = value
  }
  const updateLockHover = () => {
    if (!overlay || overlay.isDestroyed()) return
    const windowBounds = overlay.getBounds()
    const cursor = screen.getCursorScreenPoint()
    const x = cursor.x - windowBounds.x,
      y = cursor.y - windowBounds.y
    const contains = (rect: Rectangle | null) =>
      !!rect && x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height
    const inside =
      overlay.isVisible() && x >= 0 && y >= 0 && x < windowBounds.width && y < windowBounds.height
    const overUnlock = contains(unlockBounds)
    const now = Date.now()
    if (settings.locked && (contains(lyricBounds) || (lockHovered && overUnlock)))
      lockHideAt = now + 350
    const hovered = settings.locked && inside && now < lockHideAt
    if (hovered !== lockHovered) {
      lockHovered = hovered
      send(overlay, 'desktop-lyrics:lock-hover', hovered)
    }
    // 锁定时只让“解锁”按钮接收鼠标，其余区域仍然穿透。
    ignoreMouse(settings.locked && !(hovered && overUnlock))
  }
  const syncLockTracking = () => {
    clearInterval(lockTimer)
    lockTimer = undefined
    updateLockHover()
    if (settings.enabled && settings.locked && overlay) lockTimer = setInterval(updateLockHover, 80)
  }
  const correctedBounds = (): Rectangle => {
    const area = (bounds ? screen.getDisplayMatching(bounds) : screen.getPrimaryDisplay()).workArea
    const width = Math.min(Math.round(settings.width), area.width)
    const height = Math.min(Math.ceil(settings.fontSize * 1.5 + 88), area.height)
    return {
      width,
      height,
      x: Math.round(
        Math.max(
          area.x,
          Math.min(bounds?.x ?? area.x + (area.width - width) / 2, area.x + area.width - width)
        )
      ),
      y: Math.round(
        Math.max(
          area.y,
          Math.min(bounds?.y ?? area.y + area.height - height - 64, area.y + area.height - height)
        )
      )
    }
  }
  const applyWindow = () => {
    if (!overlay || overlay.isDestroyed()) return
    overlay.setFocusable(!settings.locked)
    // Electron 31 在 Windows 上设置可聚焦时会重新加入任务栏，必须在后面隐藏。
    overlay.setSkipTaskbar(true)
    const next = correctedBounds()
    overlay.setBounds(next)
    bounds = next
    syncLockTracking()
  }
  const ensureWindow = () => {
    if (disposed || !connected || !settings.enabled) return
    if (overlay && !overlay.isDestroyed()) {
      if (ready) overlay.showInactive()
      return
    }
    ready = false
    const window = new BrowserWindow({
      ...correctedBounds(),
      title: 'Tinglan 桌面歌词',
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      show: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      hasShadow: false,
      webPreferences: {
        preload: join(__dirname, '../preload/desktopLyrics.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })
    overlay = window
    unlockBounds = null
    lyricBounds = null
    lockHideAt = 0
    lockHovered = false
    ignored = undefined
    applyWindow()
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    if (process.platform === 'win32') {
      const hideTaskbarPreview = () => window.setSkipTaskbar(true)
      window.on('show', hideTaskbarPreview)
      window.on('focus', hideTaskbarPreview)
    }
    window.once('ready-to-show', () => {
      ready = true
      if (settings.enabled && !disposed) window.showInactive()
    })
    window.on('moved', () => {
      bounds = window.getBounds()
      saveSoon()
    })
    window.on('closed', () => {
      if (overlay !== window) return
      overlay = null
      clearInterval(lockTimer)
      ready = false
      if (!disposed) {
        settings.enabled = false
        broadcast()
        owner.webContents.setBackgroundThrottling(true)
        saveSoon()
      }
    })
    if (process.env.ELECTRON_RENDERER_URL && !app.isPackaged)
      void window.loadURL(
        new URL('desktop-lyrics.html', process.env.ELECTRON_RENDERER_URL + '/').href
      )
    else void window.loadFile(join(__dirname, '../renderer/desktop-lyrics.html'))
  }
  const configure = (value: Partial<DesktopLyricSettings>) => {
    dragOrigin = null
    settings = { ...settings, ...sanitizeDesktopLyricSettings(value || {}) }
    owner.webContents.setBackgroundThrottling(!settings.enabled)
    if (settings.enabled) {
      ensureWindow()
      applyWindow()
    } else if (overlay) {
      const old = overlay
      overlay = null
      ready = false
      old.destroy()
    }
    broadcast()
    syncLockTracking()
    saveSoon()
    return settings
  }
  const trusted = (event: IpcMainEvent | IpcMainInvokeEvent, publisher = false) => {
    if (event.sender !== owner.webContents && (publisher || event.sender !== overlay?.webContents))
      throw new Error('桌面歌词窗口不可用')
  }
  const handle = (channel: string, fn: (event: IpcMainInvokeEvent, value: any) => any) =>
    ipcMain.handle(channel, fn)
  handle('desktop-lyrics:snapshot', (event) => {
    trusted(event)
    return { settings, track, clock, lockHovered }
  })
  handle('desktop-lyrics:connect', (event) => {
    trusted(event, true)
    clearInterval(lockTimer)
    connected = true
    track = null
    clock = null
    owner.webContents.setBackgroundThrottling(!settings.enabled)
    if (overlay) {
      const old = overlay
      overlay = null
      old.destroy()
    }
    ensureWindow()
    broadcast()
    send(owner, 'desktop-lyrics:owner-visible', owner.isVisible() && !owner.isMinimized())
  })
  handle('desktop-lyrics:configure', (event, value) => {
    trusted(event)
    return configure(value)
  })
  handle('desktop-lyrics:reset-position', (event) => {
    trusted(event)
    bounds = undefined
    applyWindow()
    saveSoon()
  })
  handle('desktop-lyrics:unlock-bounds', (event, value: Rectangle) => {
    if (event.sender !== overlay?.webContents || !overlay || !value) return
    const size = overlay.getContentBounds()
    if (
      !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key])) ||
      value.width <= 0 ||
      value.height <= 0 ||
      value.width > 64 ||
      value.height > 64 ||
      value.x < 0 ||
      value.y < 0 ||
      value.x + value.width > size.width + 1 ||
      value.y + value.height > size.height + 1
    )
      return
    unlockBounds = value
    updateLockHover()
  })
  handle('desktop-lyrics:lyric-bounds', (event, value: Rectangle) => {
    if (event.sender !== overlay?.webContents || !overlay || !value) return
    const size = overlay.getContentBounds()
    if (
      !['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key])) ||
      value.width < 0 ||
      value.height < 0 ||
      value.x < 0 ||
      value.y < 0 ||
      value.x + value.width > size.width + 1 ||
      value.y + value.height > size.height + 1
    )
      return
    lyricBounds = value
    updateLockHover()
  })
  handle('desktop-lyrics:drag', (event, action) => {
    // 原生 drag 区域会吞掉歌词上的悬浮事件，改用指针捕获和系统光标位置移动。
    if (event.sender !== overlay?.webContents || settings.locked || !overlay) return
    if (action === 'end') {
      dragOrigin = null
      bounds = overlay.getBounds()
      applyWindow()
      saveSoon()
      return
    }
    const cursor = screen.getCursorScreenPoint()
    if (action === 'start') {
      const position = overlay.getBounds()
      const size = correctedBounds()
      dragOrigin = {
        x: position.x,
        y: position.y,
        cursorX: cursor.x,
        cursorY: cursor.y,
        width: size.width,
        height: size.height
      }
    } else if (action === 'move' && dragOrigin) {
      // Windows 高 DPI 下 setPosition 会反复换算当前尺寸并积累舍入误差。
      overlay.setBounds({
        x: Math.round(dragOrigin.x + cursor.x - dragOrigin.cursorX),
        y: Math.round(dragOrigin.y + cursor.y - dragOrigin.cursorY),
        width: dragOrigin.width,
        height: dragOrigin.height
      })
    }
  })
  handle('desktop-lyrics:command', (event, value: DesktopLyricCommand) => {
    trusted(event)
    if (!desktopLyricCommands.includes(value)) throw new Error('未知歌词操作')
    if (value === 'toggle') configure({ enabled: !settings.enabled })
    else if (value === 'close') configure({ enabled: false })
    else if (value === 'toggle-lock') configure({ locked: !settings.locked })
    else send(owner, 'desktop-lyrics:command', value)
  })
  const onTrack = (event: IpcMainEvent, value: DesktopLyricTrack) => {
    if (event.sender !== owner.webContents) return
    if (
      !value ||
      !Number.isSafeInteger(value.revision) ||
      !Array.isArray(value.lines) ||
      JSON.stringify(value).length > 2_000_000 ||
      (track && value.revision < track.revision)
    )
      return
    track = value
    clock = null
    send(overlay, 'desktop-lyrics:track', value)
  }
  const onClock = (event: IpcMainEvent, value: DesktopLyricClock) => {
    if (event.sender !== owner.webContents) return
    if (
      !value ||
      value.revision !== track?.revision ||
      !Number.isFinite(value.positionMs) ||
      !Number.isFinite(value.sampledAt) ||
      !Number.isFinite(value.rate) ||
      (clock && value.sequence <= clock.sequence)
    )
      return
    clock = value
    send(overlay, 'desktop-lyrics:clock', value)
  }
  ipcMain.on('desktop-lyrics:track', onTrack)
  ipcMain.on('desktop-lyrics:clock', onClock)
  const adjust = () => {
    applyWindow()
    saveSoon()
  }
  screen.on('display-removed', adjust)
  screen.on('display-metrics-changed', adjust)
  const visibility = () =>
    send(owner, 'desktop-lyrics:owner-visible', owner.isVisible() && !owner.isMinimized())
  owner.on('show', visibility)
  owner.on('hide', visibility)
  owner.on('minimize', visibility)
  owner.on('restore', visibility)
  owner.webContents.on('render-process-gone', () => {
    clearInterval(lockTimer)
    connected = false
    const old = overlay
    overlay = null
    old?.destroy()
  })
  const dispose = () => {
    if (disposed) return
    disposed = true
    clearInterval(lockTimer)
    persist()
    overlay?.destroy()
    overlay = null
    for (const name of [
      'snapshot',
      'connect',
      'configure',
      'reset-position',
      'command',
      'drag',
      'unlock-bounds',
      'lyric-bounds'
    ])
      ipcMain.removeHandler('desktop-lyrics:' + name)
    ipcMain.removeListener('desktop-lyrics:track', onTrack)
    ipcMain.removeListener('desktop-lyrics:clock', onClock)
    screen.removeListener('display-removed', adjust)
    screen.removeListener('display-metrics-changed', adjust)
    app.removeListener('before-quit', dispose)
  }
  owner.once('closed', dispose)
  app.once('before-quit', dispose)
}
