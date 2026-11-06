import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

import { dirname, join, relative } from 'path'
// 使用 original-fs 绕过 Electron 的 asar 虚拟化
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'original-fs'
import { exec, execSync, spawn } from 'child_process'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'

// 日志文件路径 — 用临时目录，避免在 AppData 产生 music-installer 文件夹
const LOG_DIR = join(app.getPath('temp'), 'music-installer-logs')
const LOG_FILE = join(LOG_DIR, 'installer-debug.log')

function log(...args: any[]) {
  const msg = args.map((a) => String(a)).join(' ')
  const line = `[${new Date().toISOString()}] ${msg}\n`

  // 写入日志文件
  try {
    appendFileSync(LOG_FILE, line, 'utf-8')
  } catch {
    // 忽略写入失败
  }

  // 发送到渲染进程显示在控制台
  if (installerWindow) {
    installerWindow.webContents.send('installer:log', msg)
  }
}

function logError(...args: any[]) {
  const msg = args.map((a) => String(a)).join(' ')
  const line = `[${new Date().toISOString()}] ERROR: ${msg}\n`

  // 写入日志文件
  try {
    appendFileSync(LOG_FILE, line, 'utf-8')
  } catch {
    // 忽略写入失败
  }

  // 发送到渲染进程显示在控制台
  if (installerWindow) {
    installerWindow.webContents.send('installer:log-error', msg)
  }
}

// ─── 临时目录清理（portable 模式自解压目录） ──────────────────────────────────
function scheduleCleanupOnExit(): void {
  const exeDir = dirname(process.execPath)
  // 只在临时目录下运行时才清理（portable 模式特征）
  if (!exeDir.includes('Temp') && !exeDir.includes('tmp')) return

  // 用 PowerShell 延迟 3 秒后删除临时解压目录（等待安装器进程完全退出）
  const psScript =
    `Start-Sleep -Seconds 3; Remove-Item -Path '${exeDir}' -Recurse -Force -ErrorAction SilentlyContinue`
  try {
    spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psScript], {
      detached: true,
      stdio: 'ignore'
    }).unref()
  } catch {
    // 清理失败不阻塞
  }
}

function initLogger() {
  // 确保日志目录存在
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true })
    }
    // 清空旧日志
    if (existsSync(LOG_FILE)) {
      rmSync(LOG_FILE)
    }
  } catch (err) {
    console.error('日志初始化失败:', err)
  }
  log('========== 安装器启动 ==========')
}

// ─── 安装器窗口 ────────────────────────────────────────────────────────────────
let installerWindow: BrowserWindow | null = null

function createInstallerWindow(): void {
  const isMac = process.platform === 'darwin'
  installerWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 820,
    minHeight: 560,
    resizable: true,
    show: false,
    frame: isMac, // macOS 使用系统原生标题栏
    autoHideMenuBar: true,
    center: true,
    titleBarStyle: isMac ? 'hiddenInset' : undefined, // macOS 隐藏原生按钮但仍保留拖动区
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
      // devTools: true // 确保控制台功能可用
    }
  })

  installerWindow.on('ready-to-show', () => {
    installerWindow?.show()
    // 始终打开开发者工具方便调试
    // installerWindow?.webContents.openDevTools()
  })

  installerWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    installerWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    installerWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─── 窗口控制 IPC ──────────────────────────────────────────────────────────────
ipcMain.on('installer:minimize', () => installerWindow?.minimize())
ipcMain.on('installer:maximize', () => installerWindow?.maximize())
ipcMain.on('installer:unmaximize', () => installerWindow?.unmaximize())
ipcMain.on('installer:close', () => {
  scheduleCleanupOnExit()
  installerWindow?.close()
  app.quit()
})

// ─── 获取默认安装目录 ──────────────────────────────────────────────────────────
ipcMain.handle('installer:default-dir', () => getDefaultInstallDir())

// ─── 选择安装目录 ──────────────────────────────────────────────────────────────
ipcMain.handle('installer:choose-dir', async () => {
  const result = await dialog.showOpenDialog(installerWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: getDefaultInstallDir(),
    title: '选择安装位置'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  let selected = result.filePaths[0]
  // 如果用户只选了盘符根目录（如 D:\），自动补上产品名
  const appName = '音乐'
  const lastPart = selected.split(/[\\/]/).pop() || ''
  if (lastPart !== appName) {
    selected = join(selected, appName)
  }
  return selected
})

// ─── 获取磁盘信息 ──────────────────────────────────────────────────────────────
ipcMain.handle('installer:disk-info', (_evt, targetPath: string) => {
  // 计算主应用真实大小
  const required = getSourceAppSize()

  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const output = execSync(`df -k "${targetPath}" 2>/dev/null || df -k /`).toString()
      const lines = output.trim().split('\n')
      // 取最后一行（实际数据行），df -k 列: Filesystem 1K-blocks Used Available Use% Mounted
      const parts = lines[lines.length - 1].trim().split(/\s+/)
      const total = parseInt(parts[1]) * 1024
      const available = parseInt(parts[3]) * 1024
      return { available, total, required }
    } else if (process.platform === 'win32') {
      const drive = targetPath.substring(0, 1) // D
      const output = execSync(
        `powershell -NoProfile -Command "Get-Volume -DriveLetter ${drive} | Select-Object SizeRemaining,Size | ConvertTo-Json"`,
        { timeout: 15000, windowsHide: true }
      ).toString()
      try {
        const json = JSON.parse(output.trim())
        const available: number = json.SizeRemaining ?? 0
        const total: number = json.Size ?? 0
        return { available, total, required }
      } catch {
        // 解析失败
      }
    }
  } catch {
    // 获取失败返回默认值
  }
  return { available: 0, total: 0, required }
})

// ─── 设置持久化（记住安装路径和选项） ────────────────────────────────────────
const SETTINGS_REG_KEY = 'HKCU:\\Software\\音乐'

/** 用 PowerShell 执行注册表操作（避免 reg.exe 的 GBK 编码乱码问题） */
function psRegistrySave(key: string, name: string, value: string): void {
  // -EncodedCommand 用 UTF-16LE 传参，完整保留 Unicode
  const script = `Set-ItemProperty -Path '${key}' -Name '${name}' -Value '${value.replace(/'/g, "''")}' -Type String -ErrorAction Stop`
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, { windowsHide: true })
}

function psRegistryLoad(key: string, name: string): string | null {
  const script = [
    `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`,
    `$val = Get-ItemProperty -Path '${key}' -Name '${name}' -ErrorAction SilentlyContinue`,
    `if ($val) { Write-Output $val.${name} }`
  ].join('; ')
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const out = execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, {
    windowsHide: true,
    encoding: 'utf8'  // 与脚本中显式指定的 UTF-8 输出保持一致
  }).trim()
  return out || null
}

ipcMain.handle('installer:save-settings', (_evt, settings: Record<string, unknown>) => {
  try {
    const json = JSON.stringify(settings)
    if (process.platform === 'win32') {
      // 确保注册表路径存在
      execSync(
        `powershell -NoProfile -NonInteractive -Command "New-Item -Path '${SETTINGS_REG_KEY}' -Force -ErrorAction SilentlyContinue | Out-Null"`,
        { windowsHide: true }
      )
      psRegistrySave(SETTINGS_REG_KEY, 'InstallerPrefs', json)
    } else {
      const { writeFileSync, mkdirSync } = require('fs')
      const dir = join(app.getPath('home'), '.config', 'music')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'installer-prefs.json'), json, 'utf-8')
    }
    return true
  } catch {
    return false
  }
})

ipcMain.handle('installer:load-settings', () => {
  try {
    if (process.platform === 'win32') {
      const raw = psRegistryLoad(SETTINGS_REG_KEY, 'InstallerPrefs')
      if (raw) return JSON.parse(raw)
    } else {
      const { readFileSync } = require('fs')
      const path = join(app.getPath('home'), '.config', 'music', 'installer-prefs.json')
      if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'))
    }
  } catch { /* 首次运行没有设置 */ }
  return null
})

// ─── 核心安装逻辑 ──────────────────────────────────────────────────────────────
ipcMain.handle('installer:run', async (evt, opts: InstallOptions) => {
  const send = (step: string, progress: number) => {
    evt.sender.send('installer:progress', { step, progress })
  }
  try {
    const { installDir, createShortcut, autoStart, associateFiles, installServer } = opts
    const appName = process.platform === 'win32' ? '音乐' : '音乐.app'
    // 如果安装目录已经以产品名结尾（安装器 UI 已补齐），不再重复拼接
    const destAppPath = installDir.endsWith(appName) ? installDir : join(installDir, appName)

    log('=== 安装开始 ===')
    log(`安装目录: ${installDir}`)
    log(`应用名称: ${appName}`)
    log(`目标路径: ${destAppPath}`)

    // ── Step 1: 验证来源 ────────────────────────────────────────────────────
    send('正在验证安装包完整性...', 5)
    await delay(300)

    // 安装器自身所在路径（打包后在 .app/Contents/MacOS/ 同级）
    const sourcePath = getSourceAppPath()
    log(`源路径: ${sourcePath}`)
    if (!sourcePath || !existsSync(sourcePath)) {
      logError(`找不到主应用包: ${sourcePath}`)
      throw new Error(`找不到主应用包：${sourcePath}`)
    }

    // ─ Step 2: 确保目标目录存在 ───────────────────────────────────────────
    send('正在准备安装目录...', 12)
    await delay(200)
    log(`确保目录存在: ${installDir}`)
    ensureDir(installDir)

    // ─ Step 3: 如果旧版本存在先杀服务器再删除（保留用户数据 data/）───
    if (existsSync(destAppPath)) {
      // 先杀掉可能正在运行的旧进程，避免文件被锁
      if (process.platform === 'win32') {
        try {
          // 进程名不带 .exe（Windows Get-Process 返回的是 ncm-server）
          execSync('taskkill /F /IM ncm-server.exe 2>nul & taskkill /F /IM ncm-server 2>nul', { shell: 'cmd.exe', windowsHide: true })
          log('[删除旧版本] 已尝试终止旧服务器进程')
        } catch { /* 进程不存在则忽略 */ }
        await delay(500)
        try {
          execSync('taskkill /F /IM 音乐.exe 2>nul', { shell: 'cmd.exe', windowsHide: true })
          log('[删除旧版本] 已尝试终止旧主应用进程')
        } catch { /* 进程不存在则忽略 */ }
        await delay(500)
      } else {
        try {
          execSync('pkill -f ncm-server 2>/dev/null || true')
          execSync('pkill -f 音乐 2>/dev/null || true')
        } catch { /* 进程不存在则忽略 */ }
        await delay(500)
      }

      log(`发现旧版本，准备删除: ${destAppPath}`)
      send('正在移除旧版本...', 20)
      await delay(400)

      // 先尝试修复权限
      log('[删除旧版本] 步骤1: 尝试修复文件权限...')
      if (process.platform === 'win32') {
        try {
          log('[删除旧版本] 执行 attrib 命令去除只读属性...')
          execSync(`attrib -R "${destAppPath}\\*.*" /S /D`, { shell: 'cmd.exe' })
          log('[删除旧版本] attrib 命令执行成功')
        } catch (err: unknown) {
          logError(`[删除旧版本] attrib 命令失败: ${err instanceof Error ? err.message : err}`)
        }

        try {
          log('[删除旧版本] 执行 takeown 命令获取文件所有权...')
          execSync(`takeown /F "${destAppPath}" /R /D Y`, { shell: 'cmd.exe', timeout: 30000 })
          log('[删除旧版本] takeown 命令执行成功')
        } catch (err: unknown) {
          logError(`[删除旧版本] takeown 命令失败: ${err instanceof Error ? err.message : err}`)
        }

        try {
          log('[删除旧版本] 执行 icacls 命令授予完全控制权...')
          execSync(`icacls "${destAppPath}" /grant Everyone:F /T`, {
            shell: 'cmd.exe',
            timeout: 30000
          })
          log('[删除旧版本] icacls 命令执行成功')
        } catch (err: unknown) {
          logError(`[删除旧版本] icacls 命令失败: ${err instanceof Error ? err.message : err}`)
        }
      }

      await delay(1000)

      // 步骤2: 逐个删除，跳过 data/（保留用户数据）
      log('[删除旧版本] 步骤2: 删除旧文件（保留 data/）...')
      try {
        const entries = readdirSync(destAppPath)
        for (const entry of entries) {
          if (entry === 'data') {
            log('[删除旧版本] 跳过 data/ 目录')
            continue
          }
          const fullPath = join(destAppPath, entry)
          try {
            rmSync(fullPath, { recursive: true, force: true })
          } catch (err: unknown) {
            logError(`[删除旧版本] 无法删除: ${entry} (${err instanceof Error ? err.message : err})`)
          }
        }
        log('[删除旧版本] ✓ 旧版本已删除，用户数据已保留')
      } catch (err: unknown) {
        logError(`[删除旧版本] 遍历目录失败: ${err instanceof Error ? err.message : err}`)
        throw new Error(`无法删除旧版本：${err instanceof Error ? err.message : err}`)
      }
    }

    // ── Step 4: 复制主应用 ──────────────────────────────────────────────────
    send('正在复制应用程序文件...', 30)
    await copyDirWithProgress(sourcePath, destAppPath, (pct) => {
      send('正在复制应用程序文件...', 30 + Math.round(pct * 0.4))
    })

    // ── Step 5: 修复可执行权限 ────────────────────────────────────────────────
    send('正在配置权限...', 72)
    await delay(200)
    if (process.platform === 'darwin') {
      try {
        execSync(`chmod -R 755 "${destAppPath}"`)
        execSync(`xattr -cr "${destAppPath}" 2>/dev/null || true`)
      } catch {
        /* 忽略权限错误 */
      }
    } else if (process.platform === 'win32') {
      try {
        execSync(`attrib -R "${destAppPath}\\*.*" /S /D`, { shell: 'cmd.exe' })
      } catch {
        /* 忽略 */
      }
    }

    // ── Step 6: 注册文件关联 ─────────────────────────────────────────────────
    if (associateFiles) {
      send('正在注册文件类型关联...', 78)
      await delay(300)
      if (process.platform === 'darwin') {
        try {
          execSync(
            `/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "${destAppPath}" 2>/dev/null || true`
          )
        } catch {
          /* 忽略 */
        }
      } else if (process.platform === 'win32') {
        const exePath = join(destAppPath, '音乐.exe')
        const formats = ['mp3', 'flac', 'aac', 'm4a', 'ogg', 'wav']
        for (const ext of formats) {
          try {
            execSync(`reg add "HKCU\\Software\\Classes\\.${ext}" /ve /d "音乐.${ext}" /f`, {
              shell: 'cmd.exe'
            })
            execSync(
              `reg add "HKCU\\Software\\Classes\\音乐.${ext}\\shell\\open\\command" /ve /d "\\"${exePath}\\" \\"%1\\"" /f`,
              { shell: 'cmd.exe' }
            )
          } catch {
            /* 忽略单个格式失败 */
          }
        }
      }
    }

    // ── Step 7: 创建桌面快捷方式 ───────────────────────────────────────────
    if (createShortcut) {
      send('正在创建快捷方式...', 84)
      await delay(300)
      if (process.platform === 'darwin') {
        const desktopPath = join(app.getPath('desktop'), appName)
        if (existsSync(desktopPath)) rmSync(desktopPath, { recursive: true, force: true })
        try {
          execSync(`ln -s "${destAppPath}" "${desktopPath}"`)
        } catch {
          /* 忽略 */
        }
      } else if (process.platform === 'win32') {
        const exePath = join(destAppPath, '音乐.exe')
        const lnkPath = join(app.getPath('desktop'), '音乐.lnk')
        try {
          // 用 PowerShell 创建 .lnk 快捷方式
          // 用 -EncodedCommand 避免路径含空格/中文/特殊字符时的引号问题
          const psScript = [
            `$s=(New-Object -COM WScript.Shell).CreateShortcut('${lnkPath.replace(/'/g, "''")}')`,
            `$s.TargetPath='${exePath.replace(/'/g, "''")}';$s.WorkingDirectory='${destAppPath.replace(/'/g, "''")}';$s.Save()`
          ].join(';')
          const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
          execSync(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`, {
            shell: 'cmd.exe'
          })
        } catch {
          /* 忽略 */
        }
      }
    }

    // ── Step 8: 开机自启 ──────────────────────────────────────────────────
    if (autoStart) {
      send('正在配置开机启动...', 90)
      await delay(300)
      if (process.platform === 'darwin') {
        setupAutoLaunch(destAppPath)
      } else if (process.platform === 'win32') {
        const exePath = join(destAppPath, '音乐.exe')
        try {
          execSync(
            `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "音乐" /t REG_SZ /d "\\"${exePath}\\"" /f`,
            { shell: 'cmd.exe' }
          )
        } catch {
          /* 忽略 */
        }
      }
    }

    // ── Step 9: 安装本地音乐服务器 ──────────────────────────────────────────
    if (installServer) {
      log('=== 开始安装服务器 ===')
      send('正在安装本地音乐服务器...', 92)
      await delay(300)

      log('[服务器] 步骤1: 复制服务器文件...')
      await installNcmServer(installDir)
      log('[服务器] 步骤1完成')

      send('正在配置服务器开机启动...', 95)
      await delay(200)

      log('[服务器] 步骤2: 配置开机启动...')
      setupServerAutoLaunch(installDir)
      log('[服务器] 步骤2完成')

      send('正在启动服务器...', 97)
      await delay(200)

      log('[服务器] 步骤3: 启动服务器进程...')
      launchNcmServer(installDir)
      log('[服务器] 步骤3完成')

      // 等待服务器启动
      send('等待服务器就绪...', 98)
      log('[服务器] 步骤4: 等待服务器启动 (2秒)...')
      await delay(2000)
      log('[服务器] 步骤4完成 - 服务器安装流程结束')
    }

    // ── Step 10: 完成 ───────────────────────────────────────────────────────
    send('正在写入安装记录...', 99)
    await delay(200)
    send('安装完成 ✓', 100)
    await delay(300)

    // ── 注册到 Windows 程序和功能 + 生成卸载脚本 ──────────────────────────
    if (process.platform === 'win32') {
      try {
        const exePath = join(destAppPath, '音乐.exe')
        const uninstallBat = join(destAppPath, 'uninstall.bat')
        // 生成卸载脚本
        const batContent = [
          '@echo off',
          'title 音乐 - 卸载程序',
          'echo 正在卸载 音乐...',
          '',
          'echo [1/5] 关闭正在运行的程序...',
          'taskkill /f /im 音乐.exe 2>nul',
          'taskkill /f /im ncm-server.exe 2>nul',
          'taskkill /f /im ncm-server 2>nul',
          'ping 127.0.0.1 -n 2 >nul',
          '',
          'echo [2/5] 删除应用程序文件...',
          `rmdir /s /q "${destAppPath}" 2>nul`,
          '',
          'echo [3/5] 删除桌面快捷方式...',
          `del /f /q "${app.getPath('desktop').replace(/\\/g, '\\\\')}\\\\音乐.lnk" 2>nul`,
          '',
          'echo [4/5] 清理文件关联...',
          'reg delete "HKCU\\Software\\Classes\\音乐.mp3" /f 2>nul',
          'reg delete "HKCU\\Software\\Classes\\音乐.flac" /f 2>nul',
          'reg delete "HKCU\\Software\\Classes\\音乐.aac" /f 2>nul',
          'reg delete "HKCU\\Software\\Classes\\音乐.m4a" /f 2>nul',
          'reg delete "HKCU\\Software\\Classes\\音乐.ogg" /f 2>nul',
          'reg delete "HKCU\\Software\\Classes\\音乐.wav" /f 2>nul',
          'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "音乐" /f 2>nul',
          'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "NcmMusicServer" /f 2>nul',
          '',
          'echo [5/5] 清理注册表...',
          'reg delete "HKCU\\Software\\音乐" /f 2>nul',
          'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /f 2>nul',
          '',
          'echo.',
          'echo 卸载完成！',
          'pause'
        ].join('\r\n')
        writeFileSync(uninstallBat, batContent, 'utf-8')

        // 注册到控制面板
        execSync(
          `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /v DisplayName /t REG_SZ /d "音乐" /f`,
          { windowsHide: true }
        )
        execSync(
          `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /v UninstallString /t REG_SZ /d "${uninstallBat}" /f`,
          { windowsHide: true }
        )
        execSync(
          `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /v InstallLocation /t REG_SZ /d "${destAppPath}" /f`,
          { windowsHide: true }
        )
        execSync(
          `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /v DisplayIcon /t REG_SZ /d "${exePath}" /f`,
          { windowsHide: true }
        )
        execSync(
          `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /v Publisher /t REG_SZ /d "YSH" /f`,
          { windowsHide: true }
        )
        execSync(
          `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /v NoModify /t REG_DWORD /d 1 /f`,
          { windowsHide: true }
        )
        execSync(
          `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\音乐" /v NoRepair /t REG_DWORD /d 1 /f`,
          { windowsHide: true }
        )
        log('[install] ✓ 已注册到 Windows 程序和功能')
      } catch (err: unknown) {
        logError(`[install] 注册卸载信息失败: ${err instanceof Error ? err.message : err}`)
      }
    }

    return { success: true, appPath: destAppPath }
  } catch (err: unknown) {
    let message = err instanceof Error ? translateError(err) : String(err)
    // 补充上下文，帮助用户判断原因
    if (message.includes('找不到主应用包') || message.includes('ENOENT')) {
      message = `安装包不完整，请重新下载安装程序。\n（${message}）`
    } else if (message.includes('EBUSY') || message.includes('被占用')) {
      message = `部分文件被占用，请关闭 音乐.exe 和 ncm-server.exe 后重试。\n（${message}）`
    } else if (message.includes('ENOSPC') || message.includes('空间不足')) {
      message = `目标磁盘空间不足，请更换磁盘或清理空间后重试。`
    } else if (message.includes('EACCES') || message.includes('EPERM') || message.includes('权限')) {
      message = `权限不足，请以管理员身份运行安装程序。\n（${message}）`
    }
    return { success: false, error: message }
  }
})

// ─── 打开外部链接 ──────────────────────────────────────────────────────────────
ipcMain.handle('installer:open-url', (_evt, url: string) => {
  shell.openExternal(url)
  return true
})

// ─── 安装完成后启动主应用 ──────────────────────────────────────────────────────
ipcMain.handle('installer:launch-app', (_evt, appPath: string) => {
  try {
    if (process.platform === 'darwin') {
      spawn('open', [appPath], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'win32') {
      const exePath = join(appPath, '音乐.exe')
      spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref()
    }
    scheduleCleanupOnExit()
    setTimeout(() => {
      app.quit()
    }, 500)
    return true
  } catch {
    return false
  }
})

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

/** 将系统/Node.js 英文错误信息翻译为中文 */
function translateError(err: Error): string {
  const msg = err.message
  // Node.js 系统错误码映射
  const codeMap: Record<string, string> = {
    EACCES: '权限不足，无法访问该路径',
    EPERM: '操作被拒绝，权限不足',
    ENOENT: '找不到指定的文件或目录',
    EEXIST: '文件或目录已存在',
    ENOSPC: '磁盘空间不足',
    EMFILE: '打开的文件数量过多',
    EBUSY: '文件正被占用，请关闭相关程序后重试',
    ENOTDIR: '路径中某个节点不是目录',
    EISDIR: '目标是一个目录，无法对其执行文件操作',
    ENOTEMPTY: '目录不为空，无法删除',
    ENOMEM: '内存不足',
    ETIMEDOUT: '操作超时',
    ECONNREFUSED: '连接被拒绝',
    UNKNOWN: '未知系统错误'
  }
  // 优先匹配错误码
  const nodeErr = err as NodeJS.ErrnoException
  if (nodeErr.code && codeMap[nodeErr.code]) {
    return `${codeMap[nodeErr.code]}（${nodeErr.code}）`
  }
  // 对常见英文关键词做模糊替换
  return msg
    .replace(/permission denied/gi, '权限不足')
    .replace(/operation not permitted/gi, '操作不被允许')
    .replace(/no such file or directory/gi, '找不到文件或目录')
    .replace(/file already exists/gi, '文件已存在')
    .replace(/no space left on device/gi, '磁盘空间不足')
    .replace(/resource busy or locked/gi, '文件正被占用')
    .replace(/file is busy/gi, '文件正被占用')
    .replace(/access is denied/gi, '访问被拒绝')
    .replace(/the process cannot access/gi, '文件正被其他程序占用')
    .replace(/being used by another process/gi, '文件正被其他程序占用')
    .replace(/timed? ?out/gi, '操作超时')
    .replace(/not found/gi, '未找到')
    .replace(/cannot find/gi, '找不到')
    .replace(/failed to/gi, '无法')
    .replace(/disk quota exceeded/gi, '磁盘配额已满')
    .replace(/insufficient privilege/gi, '权限不足')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getDefaultInstallDir(): string {
  if (process.platform === 'darwin') return '/Applications'
  if (process.platform === 'win32') {
    // 优先用环境变量（在管理员模式下也能正确指向当前用户目录）
    const localAppData = process.env['LOCALAPPDATA']
    if (localAppData) return join(localAppData, '音乐')
    // 兜底：Program Files
    return 'C:\\Program Files\\音乐'
  }
  return '/opt'
}

/**
 * 安装器打包后，主应用 .app 包就放在安装器 DMG 的同级资源目录下。
 * 开发阶段直接使用项目的 dist 目录。
 */
function getSourceAppPath(): string {
  if (is.dev) {
    if (process.platform === 'win32') {
      return join(app.getAppPath(), '../../dist/win-unpacked')
    }
    return join(app.getAppPath(), '../../dist/mac-arm64/音乐.app')
  }
  // 生产时：安装器包内 Resources/payload/ 下存放主应用
  const resourcesPath = process.resourcesPath
  if (process.platform === 'win32') {
    return join(resourcesPath, 'payload', '音乐')
  }
  return join(resourcesPath, 'payload', '音乐.app')
}

/** 递归统计目录/文件总字节大小，失败返回默认估算值 */
function getSourceAppSize(): number {
  try {
    const srcPath = getSourceAppPath()
    if (!existsSync(srcPath)) return 220 * 1024 * 1024
    if (process.platform === 'darwin' || process.platform === 'linux') {
      // du -sk 返回以 KB 为单位的大小
      const out = execSync(`du -sk "${srcPath}" 2>/dev/null`).toString()
      const kb = parseInt(out.split('\t')[0])
      if (!isNaN(kb)) return kb * 1024
    } else if (process.platform === 'win32') {
      const out = execSync(
        `powershell -command "(Get-ChildItem '${srcPath}' -Recurse | Measure-Object -Property Length -Sum).Sum"`
      ).toString()
      const bytes = parseInt(out.trim())
      if (!isNaN(bytes)) return bytes
    }
  } catch {
    /* ignore */
  }
  return 220 * 1024 * 1024 // 默认 220MB
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  } else {
    // Windows 上可能存在路径冲突：某个路径节点是文件而非目录
    // 需要检查并清理
    const stat = statSync(dir)
    if (!stat.isDirectory()) {
      // 这是一个文件，需要删除它
      rmSync(dir, { force: true })
      mkdirSync(dir, { recursive: true })
    }
  }
}

async function copyDirWithProgress(
  src: string,
  dest: string,
  onProgress: (pct: number) => void
): Promise<void> {
  log(`[copyDir] 开始复制`)
  log(`  源目录: ${src}`)
  log(`  目标目录: ${dest}`)

  // 统计总文件数
  const files = listAllFiles(src)
  const total = files.length
  log(`  总文件数: ${total}`)
  let done = 0

  // 分批处理，让进度事件有机会被发送
  const BATCH = 50
  let idx = 0
  while (idx < files.length) {
    const batch = files.slice(idx, idx + BATCH)
    for (const f of batch) {
      // 使用 relative() 计算相对路径，避免 Windows 上的路径问题
      const rel = relative(src, f)
      const destFile = join(dest, rel)

      // 每 10 个文件记录一次日志
      if ((done + 1) % 10 === 0 || done === 0) {
        log(`[copy] ${done + 1}/${total}: ${rel}`)
      }

      try {
        ensureDir(dirname(destFile))
        copyFileSync(f, destFile)
        done++
      } catch (err: unknown) {
        logError(`[copy] 复制失败！`)
        logError(`  源文件: ${f}`)
        logError(`  相对路径: ${rel}`)
        logError(`  目标文件: ${destFile}`)
        logError(`  错误信息: ${err instanceof Error ? err.message : err}`)

        // 检查路径是否存在冲突
        const parentDir = dirname(destFile)
        if (existsSync(parentDir)) {
          const parentStat = statSync(parentDir)
          logError(`  父目录存在: ${parentDir}`)
          logError(`  父目录是否为目录: ${parentStat.isDirectory()}`)

          // 检查父目录的父目录
          const grandParentDir = dirname(parentDir)
          if (existsSync(grandParentDir)) {
            const grandParentStat = statSync(grandParentDir)
            logError(`  祖父目录存在: ${grandParentDir}`)
            logError(`  祖父目录是否为目录: ${grandParentStat.isDirectory()}`)
          }
        } else {
          logError(`  父目录不存在: ${parentDir}`)
        }

        throw err
      }
    }
    onProgress(done / total)
    await delay(10)
    idx += BATCH
  }

  // 确保目录结构也被复制（空目录）
  log(`[copyDir] 复制目录结构...`)
  copyDirectoryStructure(src, dest)
  log(`[copyDir] 完成！共复制 ${done} 个文件`)
}

function listAllFiles(dir: string): string[] {
  const result: string[] = []
  const walk = (d: string) => {
    if (!existsSync(d)) return

    // 检查当前路径是否已经是 .asar 文件（防止对 .asar 调用 readdirSync）
    if (d.endsWith('.asar')) {
      const s = statSync(d)
      log(`[walk] 检测到 .asar 文件: ${d}, isFile=${s.isFile()}, isDirectory=${s.isDirectory()}`)
      if (s.isFile()) {
        result.push(d)
        return
      }
      // 如果 statSync 认为 .asar 是目录（被 Electron asar 虚拟化干扰），记录警告但仍跳过
      logError(`[walk] .asar 文件被误认为目录！这是 Electron asar 虚拟化导致的，将跳过: ${d}`)
      return
    }

    const entries = readdirSync(d)
    for (const entry of entries) {
      const full = join(d, entry)
      const s = statSync(full)

      // 对于 .asar 文件，直接加入结果，不要调用 readdirSync
      if (full.endsWith('.asar')) {
        if (s.isFile()) {
          result.push(full)
        } else {
          logError(`[walk] 异常：${full} 以 .asar 结尾但 statSync 认为不是文件`)
        }
        continue
      }

      if (s.isDirectory()) {
        walk(full)
      } else {
        result.push(full)
      }
    }
  }
  walk(dir)
  return result
}

function copyDirectoryStructure(src: string, dest: string): void {
  if (!existsSync(src)) return
  ensureDir(dest)
  const entries = readdirSync(src)
  for (const entry of entries) {
    const s = join(src, entry)
    const d = join(dest, entry)
    const stat = statSync(s)
    if (stat.isDirectory()) {
      copyDirectoryStructure(s, d)
    }
  }
}

function setupAutoLaunch(appPath: string): void {
  try {
    const plistDir = join(app.getPath('home'), 'Library/LaunchAgents')
    const plistPath = join(plistDir, 'com.electron.music.plist')
    ensureDir(plistDir)
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.electron.music</string>
  <key>ProgramArguments</key>
  <array>
    <string>open</string>
    <string>${appPath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>`
    require('fs').writeFileSync(plistPath, plistContent, 'utf-8')
    execSync(`launchctl load "${plistPath}" 2>/dev/null || true`)
  } catch {
    /* 忽略 */
  }
}

// ─── 服务器安装函数 ────────────────────────────────────────────────────────────

/** 获取 ncm-server 二进制文件源路径 */
function getServerBinPath(): string {
  if (is.dev) {
    const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
    return join(app.getAppPath(), '../../../NeteaseCloudMusicApi/bin', binName)
  }
  const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
  return join(process.resourcesPath, 'server', binName)
}

/** 服务器安装目标目录 */
function getServerInstallDir(installDir?: string): string {
  // 如果指定了安装目录，服务器放在主应用同级的 server/ 下
  if (installDir) {
    return join(installDir, 'server')
  }
  // 兜底：独立启动时用 AppData
  if (process.platform === 'darwin') {
    return join(app.getPath('home'), 'Library', 'Application Support', '音乐', 'server')
  } else if (process.platform === 'win32') {
    return join(app.getPath('appData'), '音乐', 'server')
  }
  return join(app.getPath('home'), '.config', '音乐', 'server')
}

/** 将服务器二进制复制到安装目录 */
async function installNcmServer(installDir: string): Promise<void> {
  const srcBin = getServerBinPath()
  log(`[server-install] 源文件路径: ${srcBin}`)

  if (!existsSync(srcBin)) {
    logError(`[server-install] ❌ 服务器二进制文件不存在: ${srcBin}`)
    throw new Error(`服务器文件不存在: ${srcBin}`)
  }

  log(`[server-install] ✓ 源文件存在`)

  const destDir = getServerInstallDir(installDir)
  log(`[server-install] 目标目录: ${destDir}`)

  ensureDir(destDir)
  log(`[server-install] ✓ 目标目录已创建/确认`)

  const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
  const destBin = join(destDir, binName)
  log(`[server-install] 目标文件: ${destBin}`)

  // Windows: 检查并停止正在运行的服务器进程
  if (process.platform === 'win32' && existsSync(destBin)) {
    log(`[server-install] 检测到旧版本服务器，尝试停止...`)
    try {
      // 使用 taskkill 强制终止进程
      execSync(`taskkill /F /IM ncm-server.exe 2>nul`, {
        shell: 'cmd.exe',
        windowsHide: true
      })
      log(`[server-install] ✓ 已停止旧服务器进程`)

      // 等待一下让文件解锁
      await delay(1000)
    } catch (err: unknown) {
      // 如果没有运行或已经停止，忽略错误
      log(`[server-install] 旧服务器未运行或已停止`)
    }
  }

  try {
    copyFileSync(srcBin, destBin)
    log(`[server-install] ✓ 文件复制成功`)
  } catch (err: unknown) {
    logError(`[server-install] ❌ 文件复制失败: ${err instanceof Error ? err.message : err}`)

    // 如果仍然失败，尝试再次强制删除
    if (process.platform === 'win32') {
      log(`[server-install] 尝试强制删除被锁定的文件...`)
      try {
        execSync(`taskkill /F /IM ncm-server.exe 2>nul`, {
          shell: 'cmd.exe',
          windowsHide: true
        })
        await delay(2000)
        rmSync(destBin, { force: true })
        copyFileSync(srcBin, destBin)
        log(`[server-install] ✓ 强制替换成功`)
      } catch (retryErr: unknown) {
        logError(
          `[server-install] ❌ 强制替换也失败: ${retryErr instanceof Error ? retryErr.message : retryErr}`
        )
        throw err
      }
    } else {
      throw err
    }
  }

  // macOS/Linux 赋予可执行权限
  if (process.platform !== 'win32') {
    try {
      log(`[server-install] 设置可执行权限...`)
      execSync(`chmod +x "${destBin}"`)
      log(`[server-install] ✓ 权限设置成功`)
    } catch (err: unknown) {
      logError(`[server-install] ⚠️ 权限设置失败: ${err instanceof Error ? err.message : err}`)
    }
  }

  // 验证复制后的文件
  if (existsSync(destBin)) {
    const stat = statSync(destBin)
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2)
    log(`[server-install] ✓ 验证成功 - 文件大小: ${sizeMB} MB`)
  } else {
    logError(`[server-install] ❌ 验证失败 - 目标文件不存在`)
    throw new Error('服务器文件复制后验证失败')
  }
}

/** 配置服务器开机自启 */
function setupServerAutoLaunch(installDir: string): void {
  log('[server-autolaunch] 开始配置开机启动...')

  const destDir = getServerInstallDir(installDir)
  const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
  const destBin = join(destDir, binName)

  log(`[server-autolaunch] 服务器路径: ${destBin}`)

  if (process.platform === 'darwin') {
    try {
      const plistDir = join(app.getPath('home'), 'Library', 'LaunchAgents')
      const plistPath = join(plistDir, 'com.electron.music.ncmserver.plist')
      log(`[server-autolaunch] macOS: plist路径: ${plistPath}`)

      ensureDir(plistDir)
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.electron.music.ncmserver</string>
  <key>ProgramArguments</key>
  <array>
    <string>${destBin}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${destDir}/ncm-server.log</string>
  <key>StandardErrorPath</key>
  <string>${destDir}/ncm-server.error.log</string>
</dict>
</plist>`
      require('fs').writeFileSync(plistPath, plistContent, 'utf-8')
      log(`[server-autolaunch] ✓ plist文件已创建`)

      execSync(`launchctl load "${plistPath}" 2>/dev/null || true`)
      log(`[server-autolaunch] ✓ launchctl load 已执行`)
    } catch (err: unknown) {
      logError(`[server-autolaunch] ⚠️ macOS配置失败: ${err instanceof Error ? err.message : err}`)
    }
  } else if (process.platform === 'win32') {
    try {
      log(`[server-autolaunch] Windows: 写入注册表...`)
      execSync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "NcmMusicServer" /t REG_SZ /d "\"${destBin}\"" /f`,
        { shell: 'cmd.exe' }
      )
      log(`[server-autolaunch] ✓ 注册表项已创建`)
    } catch (err: unknown) {
      logError(
        `[server-autolaunch] ⚠️ Windows注册表配置失败: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  log('[server-autolaunch] 开机启动配置完成')
}

/** 立即启动服务器(后台运行) */
function launchNcmServer(installDir: string): void {
  log('[server-launch] ========== 开始启动服务器 ==========')

  const destDir = getServerInstallDir(installDir)
  const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
  const destBin = join(destDir, binName)

  log(`[server-launch] 检查服务器文件: ${destBin}`)
  if (!existsSync(destBin)) {
    logError(`[server-launch] ❌ 服务器二进制不存在,无法启动: ${destBin}`)
    return
  }

  const stat = statSync(destBin)
  log(`[server-launch] ✓ 文件存在 - 大小: ${(stat.size / 1024 / 1024).toFixed(2)} MB`)
  log(`[server-launch] 工作目录: ${destDir}`)

  try {
    if (process.platform === 'win32') {
      // Windows: 使用 spawn 直接启动，比 start /B 更可靠
      log(`[server-launch] Windows: 使用 spawn 启动服务器...`)

      const stdoutLogPath = join(destDir, 'ncm-server-stdout.log')
      const stderrLogPath = join(destDir, 'ncm-server-stderr.log')

      log(`[server-launch] 标准输出日志: ${stdoutLogPath}`)
      log(`[server-launch] 错误输出日志: ${stderrLogPath}`)

      try {
        const { openSync, closeSync } = require('fs')
        const stdoutFd = openSync(stdoutLogPath, 'a')
        const stderrFd = openSync(stderrLogPath, 'a')

        const child = spawn(destBin, [], {
          cwd: destDir,
          detached: true,
          stdio: ['ignore', stdoutFd, stderrFd],
          windowsHide: true
        })

        child.on('error', (err: Error) => {
          logError(`[server-launch] ❌ spawn 失败: ${err.message}`)
          try { closeSync(stdoutFd); closeSync(stderrFd) } catch {}
        })

        child.on('close', (code: number | null) => {
          log(`[server-launch] 服务器进程已退出, 退出码: ${code}`)
          try { closeSync(stdoutFd); closeSync(stderrFd) } catch {}
        })

        child.unref()
        log(`[server-launch] ✓ 服务器进程已启动 (PID: ${child.pid})`)
        log(`[server-launch] 提示: 服务器将完全独立运行，关闭安装器不会影响服务器`)
      } catch (err: unknown) {
        logError(`[server-launch] ❌ 启动异常: ${err instanceof Error ? err.message : err}`)
      }
    } else {
      // macOS/Linux: 使用 nohup 启动
      log(`[server-launch] macOS/Linux: 使用 nohup 启动服务器...`)

      const stdoutLogPath = join(destDir, 'ncm-server-stdout.log')
      const stderrLogPath = join(destDir, 'ncm-server-stderr.log')

      // 异步执行 nohup
      const { spawn } = require('child_process')
      const child = spawn('nohup', [destBin], {
        cwd: destDir,
        detached: true,
        stdio: ['ignore', stdoutLogPath, stderrLogPath],
        windowsHide: true
      })

      child.unref()

      log(`[server-launch] ✓ 服务器已通过 nohup 启动`)
      log(`[server-launch] 标准输出日志: ${stdoutLogPath}`)
      log(`[server-launch] 错误输出日志: ${stderrLogPath}`)
    }

    // 异步检查服务器是否成功启动（不阻塞）
    setTimeout(() => {
      log(`[server-launch] 异步检查服务器状态...`)

      // 检查日志文件是否有内容
      const stdoutLogPath = join(destDir, 'ncm-server-stdout.log')
      const stderrLogPath = join(destDir, 'ncm-server-stderr.log')

      try {
        if (existsSync(stderrLogPath)) {
          const fs = require('fs')
          const stderrContent = fs.readFileSync(stderrLogPath, 'utf-8')
          if (stderrContent.trim()) {
            logError(`[server-launch] 服务器错误日志:\n${stderrContent.substring(0, 500)}`)
          }
        }

        if (existsSync(stdoutLogPath)) {
          const fs = require('fs')
          const stdoutContent = fs.readFileSync(stdoutLogPath, 'utf-8')
          if (stdoutContent.trim()) {
            log(`[server-launch] 服务器输出日志:\n${stdoutContent.substring(0, 500)}`)
          }
        }
      } catch (err) {
        log(`[server-launch] 无法读取日志: ${err instanceof Error ? err.message : err}`)
      }
    }, 2000)
  } catch (err: unknown) {
    logError(`[server-launch] ❌ 启动异常: ${err instanceof Error ? err.message : err}`)
    if (err instanceof Error && 'stack' in err) {
      logError(`[server-launch] 堆栈跟踪:\n${(err as Error).stack}`)
    }
  }

  log('[server-launch] ========== 启动流程结束 ==========')
}

// ─── 类型 ──────────────────────────────────────────────────────────────────────
interface InstallOptions {
  installDir: string
  createShortcut: boolean
  autoStart: boolean
  associateFiles: boolean
  installServer: boolean
}

// ─── App 生命周期 ──────────────────────────────────────────────────────────────
// 将 userData 重定向到临时目录，避免在 AppData 创建 music-installer
app.setPath('userData', join(app.getPath('temp'), 'music-installer-data'))

app.whenReady().then(() => {
  // 初始化日志
  initLogger()

  electronApp.setAppUserModelId('com.electron.installer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createInstallerWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createInstallerWindow()
  })
})

app.on('window-all-closed', () => {
  scheduleCleanupOnExit()
  app.quit()
})
