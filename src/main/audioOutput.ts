import { app, ipcMain, type BrowserWindow } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import type { AudioOutputDevice } from '../shared/audioOutput'
import { windowsAudioOutputScript } from './audioOutputWindows'

let disposePrevious: (() => void) | undefined

/** Follows Chromium's Windows default output. Does not select sinks or alter system volume. */
export function setupAudioOutput(owner: BrowserWindow): () => void {
  disposePrevious?.()
  let disposed = false
  let current: AudioOutputDevice | null = null
  let child: ChildProcessWithoutNullStreams | undefined
  let startupTimer: ReturnType<typeof setTimeout> | undefined
  let restartTimer: ReturnType<typeof setTimeout> | undefined
  let killTimer: ReturnType<typeof setTimeout> | undefined
  let restarts = 0
  let warned = false
  let resolveReady: (() => void) | undefined
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  const ownerAlive = () => !disposed && !owner.isDestroyed() && !owner.webContents.isDestroyed()
  const finishReady = () => {
    clearTimeout(startupTimer)
    resolveReady?.()
    resolveReady = undefined
  }
  const publish = (device: AudioOutputDevice | null) => {
    const changed = JSON.stringify(current) !== JSON.stringify(device)
    current = device
    finishReady()
    if (changed && ownerAlive()) owner.webContents.send('audio-output:change', current)
  }
  const unavailable = () => {
    publish(null)
    if (!warned) {
      warned = true
      console.warn('无法识别系统默认音频输出，暂时沿用当前应用音量')
    }
  }
  const start = () => {
    if (disposed) return
    const launched = Date.now()
    const executable = join(
      process.env.SystemRoot || 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe'
    )
    const processChild = spawn(
      executable,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Mta',
        '-ExecutionPolicy',
        'Bypass',
        '-EncodedCommand',
        Buffer.from(windowsAudioOutputScript(), 'utf16le').toString('base64')
      ],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    child = processChild
    processChild.stdin.on('error', () => {})
    const decoder = new StringDecoder('utf8')
    let pending = ''
    let failed = false
    const fail = () => {
      if (failed) return
      failed = true
      unavailable()
      processChild.kill()
    }
    startupTimer = setTimeout(fail, 10000)
    startupTimer.unref()
    processChild.stdout.on('data', (chunk: Buffer) => {
      if (disposed || failed || child !== processChild) return
      pending += decoder.write(chunk)
      if (pending.length > 16384) {
        fail()
        return
      }
      let newline: number
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline).trim()
        pending = pending.slice(newline + 1)
        if (!line) continue
        try {
          const value = JSON.parse(line)
          if (value?.kind === 'device' && value.available === false) {
            publish(null)
            continue
          }
          if (
            value?.kind !== 'device' ||
            value.available !== true ||
            typeof value.id !== 'string' ||
            !value.id ||
            value.id.length > 2048 ||
            typeof value.label !== 'string' ||
            value.label.length > 512
          ) {
            fail()
            return
          }
          publish({
            id:
              'win-coreaudio:' + createHash('sha256').update(value.id.toLowerCase()).digest('hex'),
            label: value.label,
            available: true
          })
        } catch {
          fail()
          return
        }
      }
    })
    // Drain stderr without publishing endpoint IDs or Add-Type source to renderer/logs.
    processChild.stderr.on('data', () => {})
    processChild.on('error', unavailable)
    processChild.on('close', () => {
      clearTimeout(startupTimer)
      if (child === processChild) child = undefined
      if (disposed) {
        clearTimeout(killTimer)
        return
      }
      unavailable()
      if (Date.now() - launched > 60000) restarts = 0
      const delay = [1000, 5000, 15000][restarts++]
      if (delay !== undefined) {
        restartTimer = setTimeout(start, delay)
        restartTimer.unref()
      }
    })
  }
  ipcMain.handle('audio-output:get-current', async (event) => {
    if (
      !ownerAlive() ||
      event.sender !== owner.webContents ||
      event.senderFrame !== owner.webContents.mainFrame
    )
      throw new Error('音频输出窗口不可用')
    await ready
    return ownerAlive() ? current : null
  })
  const dispose = () => {
    if (disposed) return
    disposed = true
    finishReady()
    clearTimeout(restartTimer)
    ipcMain.removeHandler('audio-output:get-current')
    owner.removeListener('closed', dispose)
    app.removeListener('will-quit', dispose)
    const processChild = child
    if (processChild && processChild.exitCode === null) {
      processChild.stdin.end('stop\n')
      killTimer = setTimeout(() => processChild.kill(), 1000)
      killTimer.unref()
    }
    if (disposePrevious === dispose) disposePrevious = undefined
  }
  owner.once('closed', dispose)
  app.once('will-quit', dispose)
  disposePrevious = dispose
  if (process.platform === 'win32') start()
  else finishReady()
  return dispose
}
