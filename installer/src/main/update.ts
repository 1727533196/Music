import { app } from 'electron'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { readFileSync as readVirtualFile } from 'node:fs'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'original-fs'
import { execFile } from 'node:child_process'

interface UpdateRequest {
  id: string
  installDir: string
  parentPid: number
  version: string
  restartServer: boolean
}
let request: UpdateRequest | null = null
let requestFile = ''
let active = false
let running = false
let completed = false
export const updateInProgress = () => active

function validateTarget(target: string): string {
  const directory = resolve(target)
  if (
    !isAbsolute(target) ||
    dirname(directory) === directory ||
    !existsSync(join(directory, '音乐.exe')) ||
    lstatSync(directory).isSymbolicLink()
  ) {
    throw new Error('原安装目录无效，请从已安装的音乐应用发起更新')
  }
  return realpathSync(directory)
}

export function getUpdateContext(source: string): { installDir: string; version: string } | null {
  const argument = process.argv.find((value) => value.startsWith('--music-update='))
  if (!argument) return null
  if (!app.isPackaged || process.platform !== 'win32') throw new Error('当前运行方式不支持安装更新')
  if (!request) {
    requestFile = argument.slice('--music-update='.length)
    if (!isAbsolute(requestFile) || lstatSync(requestFile).size > 16384)
      throw new Error('更新请求无效')
    const value = JSON.parse(readFileSync(requestFile, 'utf8')) as UpdateRequest
    if (
      !/^[a-f\d-]{36}$/i.test(value.id) ||
      !Number.isSafeInteger(value.parentPid) ||
      value.parentPid <= 0 ||
      typeof value.installDir !== 'string' ||
      typeof value.version !== 'string' ||
      typeof value.restartServer !== 'boolean'
    ) {
      throw new Error('更新请求格式无效')
    }
    value.installDir = validateTarget(value.installDir)
    if (existsSync(`${requestFile}.cancelled`)) throw new Error('本次更新已取消，请从应用中重试')
    const packageInfo = JSON.parse(
      readVirtualFile(join(source, 'resources', 'app.asar', 'package.json'), 'utf8')
    )
    if (packageInfo.version !== value.version)
      throw new Error('安装包版本与更新信息不一致，请重新下载')
    writeFileSync(`${requestFile}.ready`, value.id, 'utf8')
    request = value
    active = true
  }
  return { installDir: request.installDir, version: request.version }
}

async function waitForAppExit(value: UpdateRequest): Promise<void> {
  const deadline = Date.now() + 120000
  while (Date.now() < deadline) {
    if (existsSync(`${requestFile}.cancelled`)) throw new Error('本次更新已取消')
    try {
      process.kill(value.parentPid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return
      throw error
    }
    await new Promise((done) => setTimeout(done, 250))
  }
  throw new Error('音乐应用仍在运行，更新尚未替换任何文件，请关闭应用后重试')
}

async function stopInstalledProcesses(target: string): Promise<boolean> {
  const quote = (value: string) => `'${value.replace(/'/g, "''")}'`
  const exe = join(target, '音乐.exe')
  const server = join(target, 'server', 'ncm-server.exe')
  // Match full executable paths; another installation or development instance stays untouched.
  const script =
    `$ErrorActionPreference = 'Stop'; [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); ` +
    `$items = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq ${quote(exe)} -or $_.ExecutablePath -eq ${quote(server)} }); ` +
    `$serverRunning = @($items | Where-Object { $_.ExecutablePath -eq ${quote(server)} }).Count -gt 0; ` +
    `foreach ($item in $items) { Stop-Process -Id $item.ProcessId -Force -ErrorAction SilentlyContinue }; ` +
    `Start-Sleep -Milliseconds 500; ` +
    `if (@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq ${quote(exe)} -or $_.ExecutablePath -eq ${quote(server)} }).Count -gt 0) { throw '无法停止原安装目录下的进程' }; ` +
    `Write-Output $serverRunning`
  return new Promise((done, reject) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')
      ],
      { windowsHide: true, timeout: 30000, encoding: 'utf8' },
      (error, stdout) =>
        error
          ? reject(new Error('无法停止旧程序，请关闭音乐和本地服务后重试'))
          : done(stdout.trim() === 'True')
    )
  })
}

// Both the staged files and backup live beside the installation, on the same volume.
// data/, server configuration/logs and the existing uninstall entry survive the replacement.
export async function replaceApplication(
  source: string,
  target: string,
  serverSource: string,
  progress: (step: string, progress: number) => void
): Promise<void> {
  target = validateTarget(target)
  const sourceFromTarget = relative(target, realpathSync(source))
  if (!sourceFromTarget.startsWith('..') && !isAbsolute(sourceFromTarget))
    throw new Error('更新来源不能位于安装目录内')
  const preserved = new Set(['data', 'server', 'uninstall.bat'])
  const workspace = mkdtempSync(join(dirname(target), '.music-update-'))
  const stage = join(workspace, 'stage')
  const backup = join(workspace, 'backup')
  const moved: string[] = []
  const installed: string[] = []
  const serverTarget = join(target, 'server', 'ncm-server.exe')
  let serverBackedUp = false
  let serverInstalled = false
  let keepBackup = false
  try {
    mkdirSync(stage)
    mkdirSync(backup)
    const entries = readdirSync(source).filter((name) => !preserved.has(name.toLowerCase()))
    if (!entries.includes('音乐.exe') || !existsSync(join(source, 'resources', 'app.asar')))
      throw new Error('安装包缺少主程序文件')
    for (const [index, name] of entries.entries()) {
      cpSync(join(source, name), join(stage, name), {
        recursive: true,
        errorOnExist: true,
        force: false
      })
      progress(
        `正在准备更新文件（${index + 1}/${entries.length}）`,
        15 + Math.floor(((index + 1) / entries.length) * 35)
      )
      await new Promise((done) => setTimeout(done, 0))
    }
    const updateServer = existsSync(serverTarget)
    if (updateServer) {
      if (
        lstatSync(join(target, 'server')).isSymbolicLink() ||
        lstatSync(serverTarget).isSymbolicLink()
      ) {
        throw new Error('本地服务目录是链接，请使用完整安装包更新')
      }
      if (!existsSync(serverSource)) throw new Error('安装包缺少本地服务文件')
      cpSync(serverSource, join(workspace, 'new-server.exe'))
    }
    progress('正在备份旧版本，保留用户数据...', 55)
    for (const name of readdirSync(target)) {
      if (preserved.has(name.toLowerCase())) continue
      renameSync(join(target, name), join(backup, name))
      moved.push(name)
    }
    for (const name of entries) {
      renameSync(join(stage, name), join(target, name))
      installed.push(name)
    }
    if (updateServer) {
      renameSync(serverTarget, join(workspace, 'old-server.exe'))
      serverBackedUp = true
      renameSync(join(workspace, 'new-server.exe'), serverTarget)
      serverInstalled = true
    }
    progress('更新文件已替换，正在重新打开音乐...', 100)
  } catch (error) {
    progress('更新未完成，正在恢复旧版本...', 60)
    try {
      if (serverInstalled) rmSync(serverTarget)
      if (serverBackedUp) renameSync(join(workspace, 'old-server.exe'), serverTarget)
      for (const name of installed.reverse())
        rmSync(join(target, name), { recursive: true, force: true })
      for (const name of moved.reverse()) renameSync(join(backup, name), join(target, name))
    } catch {
      keepBackup = true
      throw new Error(`更新失败，旧文件保留在 ${workspace}，请勿删除该目录并重新运行完整安装包`)
    }
    throw new Error(
      `更新失败，原版本已保留：${error instanceof Error ? error.message : String(error)}`
    )
  } finally {
    // Only remove the directory created by mkdtemp above, never a request-supplied path.
    if (
      !keepBackup &&
      dirname(workspace) === dirname(target) &&
      basename(workspace).startsWith('.music-update-')
    ) {
      try {
        rmSync(workspace, { recursive: true, force: true })
      } catch {
        /* harmless leftover backup */
      }
    }
  }
}

export async function runUpdate(
  source: string,
  serverSource: string,
  progress: (step: string, progress: number) => void,
  launchServer: (directory: string) => void
): Promise<{ success: boolean; appPath?: string; error?: string }> {
  if (!request || running || completed) return { success: false, error: '当前没有可执行的更新请求' }
  running = true
  active = true
  let restartServer = request.restartServer
  let processesStopped = false
  try {
    progress('正在等待音乐退出...', 5)
    await waitForAppExit(request)
    restartServer = (await stopInstalledProcesses(request.installDir)) || restartServer
    processesStopped = true
    await replaceApplication(source, request.installDir, serverSource, progress)
    completed = true
    if (restartServer) launchServer(request.installDir)
    return { success: true, appPath: request.installDir }
  } catch (error) {
    if (processesStopped && restartServer) launchServer(request.installDir)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    running = false
    active = false
  }
}
