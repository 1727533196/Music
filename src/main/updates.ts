import { app, BrowserWindow, ipcMain } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { execFile, spawn } from 'node:child_process'
import type { UpdateRelease, UpdateState } from '../shared/update'
import { downloadInstaller, fetchUpdate, httpsUrl, manifestSources } from './update-network'

const DEFAULT_FEED = 'https://github.com/1727533196/Music/releases/latest/download/version.json'
const MAX_INSTALLER_SIZE = 2 * 1024 ** 3
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

function newerVersion(candidate: string, current: string): boolean {
  if (!stableVersion.test(candidate) || !stableVersion.test(current)) {
    throw new Error('更新版本号必须采用 x.y.z 格式')
  }
  const a = candidate.split('.').map(Number)
  const b = current.split('.').map(Number)
  if (![...a, ...b].every(Number.isSafeInteger)) throw new Error('更新版本号无效')
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return false
}

function parseRelease(value: unknown): UpdateRelease {
  const data = value as Partial<UpdateRelease> | null
  if (
    !data ||
    typeof data.version !== 'string' ||
    !stableVersion.test(data.version) ||
    data.platform !== 'win32' ||
    data.arch !== 'x64' ||
    typeof data.url !== 'string' ||
    typeof data.sha256 !== 'string' ||
    !/^[a-f\d]{64}$/i.test(data.sha256) ||
    !Number.isSafeInteger(data.size) ||
    data.size! <= 0 ||
    data.size! > MAX_INSTALLER_SIZE ||
    (data.notes !== undefined && typeof data.notes !== 'string') ||
    (data.mirrors !== undefined &&
      (!Array.isArray(data.mirrors) ||
        data.mirrors.length > 8 ||
        data.mirrors.some((url) => typeof url !== 'string')))
  ) {
    throw new Error('更新信息格式不正确')
  }
  return {
    version: data.version,
    platform: 'win32',
    arch: 'x64',
    url: httpsUrl(data.url),
    sha256: data.sha256.toLowerCase(),
    size: data.size!,
    notes: (data.notes || '').slice(0, 20000),
    mirrors: data.mirrors ? [...new Set(data.mirrors.map(httpsUrl))] : undefined
  }
}

async function readRelease(url: string, signal: AbortSignal): Promise<UpdateRelease | null> {
  const response = await fetchUpdate(url, signal)
  if (response.status === 404) {
    await response.body?.cancel()
    return null
  }
  if (!response.ok || !response.body) throw new Error(`检查更新失败（HTTP ${response.status}）`)
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 1024 * 1024) throw new Error('更新信息过大')
      chunks.push(Buffer.from(value))
    }
    return parseRelease(JSON.parse(Buffer.concat(chunks).toString('utf8')))
  } finally {
    await reader.cancel().catch(() => {})
  }
}

async function fileMatches(file: string, release: UpdateRelease): Promise<boolean> {
  try {
    if ((await stat(file)).size !== release.size) return false
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(file)) hash.update(chunk)
    return hash.digest('hex') === release.sha256
  } catch {
    return false
  }
}

async function installedServerRunning(directory: string): Promise<boolean> {
  const server = join(directory, 'server', 'ncm-server.exe').replace(/'/g, "''")
  const script =
    `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); ` +
    `$items = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq '${server}' }); Write-Output ($items.Count -gt 0)`
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')
      ],
      { windowsHide: true, timeout: 15000, encoding: 'utf8' },
      (error, stdout) => {
        if (error) reject(new Error('无法读取本地服务状态，当前应用未退出，请重试'))
        else resolve(stdout.trim() === 'True')
      }
    )
  })
}

export function setupUpdates(): void {
  const state: UpdateState = {
    status: 'idle',
    currentVersion: app.getVersion(),
    supported: process.platform === 'win32' && process.arch === 'x64',
    canInstall: app.isPackaged && process.platform === 'win32' && process.arch === 'x64',
    release: null,
    progress: 0,
    bytesPerSecond: 0,
    downloadSource: '',
    message: ''
  }
  let operation: AbortController | null = null
  let cancelled = false
  const cacheDir = join(app.getPath('temp'), 'music-updates')
  const installerPath = (release: UpdateRelease) =>
    join(cacheDir, release.version, 'Music-Update.exe')
  const publish = (patch: Partial<UpdateState> = {}) => {
    Object.assign(state, patch)
    for (const window of BrowserWindow.getAllWindows()) {
      try {
        if (!window.isDestroyed() && !window.webContents.isDestroyed())
          window.webContents.send('updates:state', { ...state })
      } catch {
        /* A closing window must not interrupt downloads. */
      }
    }
    return { ...state }
  }
  const busy = () => ['checking', 'downloading', 'installing'].includes(state.status)

  const check = async () => {
    if (busy() || !state.supported) return { ...state }
    const previous = { ...state }
    publish({ status: 'checking', message: '', progress: 0, bytesPerSecond: 0, downloadSource: '' })
    const controller = new AbortController()
    operation = controller
    try {
      let lastError: unknown
      const feeds = manifestSources(DEFAULT_FEED)
      if (!feeds.length) throw new Error('未配置更新清单地址')
      for (const url of feeds) {
        controller.signal.throwIfAborted()
        const attempt = new AbortController()
        const abort = () => attempt.abort(controller.signal.reason)
        controller.signal.addEventListener('abort', abort, { once: true })
        const timeout = setTimeout(() => attempt.abort(new Error('检查更新连接超时')), 12000)
        try {
          const release = await readRelease(url, attempt.signal)
          if (!release) continue
          if (!newerVersion(release.version, state.currentVersion)) {
            return publish({ status: 'idle', release: null, message: '当前已是最新版本' })
          }
          const ready = await fileMatches(installerPath(release), release)
          return publish({
            status: ready ? 'ready' : 'available',
            release,
            progress: ready ? 100 : 0
          })
        } catch (error) {
          controller.signal.throwIfAborted()
          lastError = attempt.signal.aborted ? attempt.signal.reason : error
        } finally {
          clearTimeout(timeout)
          controller.signal.removeEventListener('abort', abort)
          attempt.abort()
        }
      }
      if (lastError) throw lastError
      return publish({ status: 'idle', release: null, message: '暂未发布可用更新' })
    } catch (error) {
      return publish({
        status: previous.status === 'ready' ? 'ready' : 'error',
        release: previous.status === 'ready' ? previous.release : null,
        progress: previous.status === 'ready' ? 100 : 0,
        message: error instanceof Error ? error.message : '无法连接更新服务'
      })
    } finally {
      controller.abort()
      operation = null
    }
  }

  const download = async () => {
    if (busy() || !state.release || !state.canInstall) return { ...state }
    const release = state.release
    const file = installerPath(release)
    cancelled = false
    const controller = new AbortController()
    operation = controller
    publish({
      status: 'downloading',
      progress: 0,
      bytesPerSecond: 0,
      downloadSource: '',
      message: ''
    })
    try {
      await downloadInstaller(release, file, controller.signal, (progress) => publish(progress))
      controller.signal.throwIfAborted()
      return publish({ status: 'ready', progress: 100, bytesPerSecond: 0, message: '' })
    } catch (error) {
      controller.abort()
      return publish({
        status: cancelled ? 'available' : 'error',
        progress: 0,
        bytesPerSecond: 0,
        message: cancelled
          ? '下载已取消'
          : error instanceof Error
            ? error.message
            : '下载失败，请重试'
      })
    } finally {
      controller.abort()
      operation = null
    }
  }

  const install = async () => {
    if (busy() || state.status !== 'ready' || !state.release || !state.canInstall)
      return { ...state }
    const release = state.release
    const file = installerPath(release)
    let requestFile = ''
    let id = ''
    publish({ status: 'installing', message: '正在启动更新程序，请在系统提示中允许继续' })
    try {
      if (!(await fileMatches(file, release))) {
        publish({ status: 'error', message: '安装包已损坏，请重新下载', progress: 0 })
        return { ...state }
      }
      id = randomUUID()
      requestFile = join(dirname(file), `request-${id}.json`)
      const installDir = dirname(app.getPath('exe'))
      const restartServer = await installedServerRunning(installDir)
      await writeFile(
        requestFile,
        JSON.stringify({
          id,
          installDir,
          parentPid: process.pid,
          version: release.version,
          restartServer
        }),
        { flag: 'wx' }
      )
      const quote = (value: string) => `'${value.replace(/'/g, "''")}'`
      const argument = `"--music-update=${requestFile}"`
      const script = `$ErrorActionPreference = 'Stop'; try { Start-Process -FilePath ${quote(file)} -ArgumentList ${quote(argument)} -Verb RunAs } catch { exit 1 }`
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-EncodedCommand',
            Buffer.from(script, 'utf16le').toString('base64')
          ],
          { windowsHide: true, stdio: 'ignore' }
        )
        child.once('error', reject)
        child.once('exit', (code) =>
          code === 0 ? resolve() : reject(new Error('更新程序未获允许运行，已保留当前播放'))
        )
      })
      // Only quit after the new installer has validated the request and signalled readiness.
      const deadline = Date.now() + 90000
      while (Date.now() < deadline) {
        const ready = await readFile(`${requestFile}.ready`, 'utf8').catch(() => '')
        if (ready === id) {
          setTimeout(() => app.quit(), 200)
          return { ...state }
        }
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      throw new Error('更新程序启动超时，当前应用未退出，请重试')
    } catch (error) {
      if (requestFile) await writeFile(`${requestFile}.cancelled`, id).catch(() => {})
      return publish({
        status: 'ready',
        message: error instanceof Error ? error.message : '无法启动更新程序，请重试'
      })
    }
  }

  ipcMain.handle('updates:get-state', () => ({ ...state }))
  ipcMain.handle('updates:check', check)
  ipcMain.handle('updates:download', download)
  ipcMain.handle('updates:install', install)
  ipcMain.handle('updates:cancel', () => {
    if (state.status === 'downloading') {
      cancelled = true
      operation?.abort()
    }
  })
  const startupTimer =
    app.isPackaged && state.supported ? setTimeout(() => void check(), 15000) : null
  app.once('before-quit', () => {
    if (startupTimer) clearTimeout(startupTimer)
    operation?.abort()
  })
}
