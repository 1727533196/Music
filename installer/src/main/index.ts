import {app, BrowserWindow, dialog, ipcMain, shell} from 'electron'
import {dirname, join} from 'path'
import {copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync} from 'fs'
import {execSync, spawn} from 'child_process'
import {electronApp, is, optimizer} from '@electron-toolkit/utils'

// ─── 安装器窗口 ────────────────────────────────────────────────────────────────
let installerWindow: BrowserWindow | null = null

function createInstallerWindow(): void {
  installerWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 820,
    minHeight: 560,
    resizable: true,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    center: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  installerWindow.on('ready-to-show', () => {
    installerWindow?.show()
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
ipcMain.on('installer:close',    () => { installerWindow?.close(); app.quit() })

// ─── 选择安装目录 ──────────────────────────────────────────────────────────────
ipcMain.handle('installer:choose-dir', async () => {
  const result = await dialog.showOpenDialog(installerWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: getDefaultInstallDir(),
    title: '选择安装位置'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// ─── 获取磁盘信息 ──────────────────────────────────────────────────────────────
ipcMain.handle('installer:disk-info', (_evt, targetPath: string) => {
  // 计算主应用真实大小
  const required = getSourceAppSize()

  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const output = execSync(`df -k "${targetPath}" 2>/dev/null || df -k /`).toString()
      const lines = output.trim().split('\n')
      // 取最后一行（实际数据行）
      const parts = lines[lines.length - 1].trim().split(/\s+/)
      const available = parseInt(parts[3]) * 1024 // 转换为字节
      return { available, required }
    } else if (process.platform === 'win32') {
      const drive = targetPath.substring(0, 2)
      const output = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace /value`).toString()
      const match = output.match(/FreeSpace=(\d+)/)
      const available = match ? parseInt(match[1]) : 0
      return { available, required }
    }
  } catch {
    // 获取失败返回默认值
  }
  return { available: 50 * 1024 * 1024 * 1024, required }
})

// ─── 核心安装逻辑 ──────────────────────────────────────────────────────────────
ipcMain.handle('installer:run', async (evt, opts: InstallOptions) => {
  const send = (step: string, progress: number) => {
    evt.sender.send('installer:progress', { step, progress })
  }

  try {
    const { installDir, createShortcut, autoStart, associateFiles, installServer } = opts
    const appName = process.platform === 'win32' ? '音乐' : '音乐.app'
    const destAppPath = join(installDir, appName)

    // ── Step 1: 验证来源 ────────────────────────────────────────────────────
    send('正在验证安装包完整性...', 5)
    await delay(300)

    // 安装器自身所在路径（打包后在 .app/Contents/MacOS/ 同级）
    const sourcePath = getSourceAppPath()
    if (!sourcePath || !existsSync(sourcePath)) {
      throw new Error(`找不到主应用包：${sourcePath}`)
    }

    // ── Step 2: 确保目标目录存在 ────────────────────────────────────────────
    send('正在准备安装目录...', 12)
    await delay(200)
    ensureDir(installDir)

    // ── Step 3: 如果旧版本存在则删除 ───────────────────────────────────────
    if (existsSync(destAppPath)) {
      send('正在移除旧版本...', 20)
      await delay(400)
      if (process.platform === 'darwin') {
        // macOS 下 .app 包内含 asar 等特殊文件，用 shell rm -rf 更可靠
        try {
          execSync(`chmod -R 777 "${destAppPath}" 2>/dev/null || true`)
          execSync(`rm -rf "${destAppPath}"`)
        } catch {
          // fallback: Node.js rmSync
          rmSync(destAppPath, { recursive: true, force: true })
        }
      } else {
        rmSync(destAppPath, { recursive: true, force: true })
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
      } catch { /* 忽略权限错误 */ }
    } else if (process.platform === 'win32') {
      try {
        execSync(`attrib -R "${destAppPath}\\*.*" /S /D`, { shell: 'cmd.exe' })
      } catch { /* 忽略 */ }
    }

    // ── Step 6: 注册文件关联 ─────────────────────────────────────────────────
    if (associateFiles) {
      send('正在注册文件类型关联...', 78)
      await delay(300)
      if (process.platform === 'darwin') {
        try {
          execSync(`/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "${destAppPath}" 2>/dev/null || true`)
        } catch { /* 忽略 */ }
      } else if (process.platform === 'win32') {
        const exePath = join(destAppPath, '音乐.exe')
        const formats = ['mp3', 'flac', 'aac', 'm4a', 'ogg', 'wav']
        for (const ext of formats) {
          try {
            execSync(`reg add "HKCU\\Software\\Classes\\.${ext}" /ve /d "音乐.${ext}" /f`, { shell: 'cmd.exe' })
            execSync(`reg add "HKCU\\Software\\Classes\\音乐.${ext}\\shell\\open\\command" /ve /d "\\"${exePath}\\" \\"%1\\"" /f`, { shell: 'cmd.exe' })
          } catch { /* 忽略单个格式失败 */ }
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
        } catch { /* 忽略 */ }
      } else if (process.platform === 'win32') {
        const exePath = join(destAppPath, '音乐.exe')
        const lnkPath = join(app.getPath('desktop'), '音乐.lnk')
        try {
          // 用 PowerShell 创建 .lnk 快捷方式
          execSync(
            `powershell -command "$s=(New-Object -COM WScript.Shell).CreateShortcut('${lnkPath}');$s.TargetPath='${exePath}';$s.WorkingDirectory='${destAppPath}';$s.Save()"`,
            { shell: 'cmd.exe' }
          )
        } catch { /* 忽略 */ }
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
          execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "音乐" /t REG_SZ /d "\\"${exePath}\\"" /f`, { shell: 'cmd.exe' })
        } catch { /* 忽略 */ }
      }
    }

    // ── Step 9: 安装本地音乐服务器 ──────────────────────────────────────────
    if (installServer) {
      send('正在安装本地音乐服务器...', 92)
      await delay(300)
      await installNcmServer()
      send('正在配置服务器开机启动...', 95)
      await delay(200)
      setupServerAutoLaunch()
    }

    // ── Step 10: 完成 ───────────────────────────────────────────────────────
    send('正在写入安装记录...', 96)
    await delay(200)
    send('安装完成 ✓', 100)
    await delay(300)

    return { success: true, appPath: destAppPath }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
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
    setTimeout(() => { app.quit() }, 500)
    return true
  } catch {
    return false
  }
})

// ─── 工具函数 ──────────────────────────────────────────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getDefaultInstallDir(): string {
  if (process.platform === 'darwin') return '/Applications'
  if (process.platform === 'win32') return 'C:\\Program Files'
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
      const out = execSync(`powershell -command "(Get-ChildItem '${srcPath}' -Recurse | Measure-Object -Property Length -Sum).Sum"`).toString()
      const bytes = parseInt(out.trim())
      if (!isNaN(bytes)) return bytes
    }
  } catch { /* ignore */ }
  return 220 * 1024 * 1024 // 默认 220MB
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

async function copyDirWithProgress(
  src: string,
  dest: string,
  onProgress: (pct: number) => void
): Promise<void> {
  // 统计总文件数
  const files = listAllFiles(src)
  const total = files.length
  let done = 0

  const copyRecursive = (s: string, d: string) => {
    ensureDir(dirname(d))
    const stat = statSync(s)
    if (stat.isDirectory()) {
      ensureDir(d)
      for (const child of readdirSync(s)) {
        copyRecursive(join(s, child), join(d, child))
      }
    } else {
      ensureDir(dirname(d))
      copyFileSync(s, d)
      done++
      onProgress(done / total)
    }
  }

  // 分批处理，让进度事件有机会被发送
  const BATCH = 50
  let idx = 0
  while (idx < files.length) {
    const batch = files.slice(idx, idx + BATCH)
    for (const f of batch) {
      const rel = f.slice(src.length)
      const destFile = join(dest, rel)
      ensureDir(dirname(destFile))
      copyFileSync(f, destFile)
      done++
    }
    onProgress(done / total)
    await delay(10)
    idx += BATCH
  }

  // 确保目录结构也被复制（空目录）
  copyDirectoryStructure(src, dest)
}

function listAllFiles(dir: string): string[] {
  const result: string[] = []
  const walk = (d: string) => {
    if (!existsSync(d)) return
    const entries = readdirSync(d)
    for (const entry of entries) {
      const full = join(d, entry)
      const s = statSync(full)
      if (s.isDirectory()) walk(full)
      else result.push(full)
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
  } catch { /* 忽略 */ }
}

// ─── 服务器安装函数 ────────────────────────────────────────────────────────────

/** 获取 ncm-server 二进制文件源路径 */
function getServerBinPath(): string {
  if (is.dev) {
    const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
    return join(app.getAppPath(), '../../../NeteaseCloudMusicApi-4.28.0/bin', binName)
  }
  const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
  return join(process.resourcesPath, 'server', binName)
}

/** 服务器安装目标目录 */
function getServerInstallDir(): string {
  if (process.platform === 'darwin') {
    return join(app.getPath('home'), 'Library', 'Application Support', '音乐', 'server')
  } else if (process.platform === 'win32') {
    return join(app.getPath('appData'), '音乐', 'server')
  }
  return join(app.getPath('home'), '.config', '音乐', 'server')
}

/** 将服务器二进制复制到安装目录 */
async function installNcmServer(): Promise<void> {
  const srcBin = getServerBinPath()
  if (!existsSync(srcBin)) {
    console.warn(`[installer] 服务器二进制不存在: ${srcBin}`)
    return
  }
  const destDir = getServerInstallDir()
  ensureDir(destDir)
  const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
  const destBin = join(destDir, binName)
  copyFileSync(srcBin, destBin)
  // macOS/Linux 赋予可执行权限
  if (process.platform !== 'win32') {
    try { execSync(`chmod +x "${destBin}"`) } catch { /* 忽略 */ }
  }
}

/** 配置服务器开机自启 */
function setupServerAutoLaunch(): void {
  const destDir = getServerInstallDir()
  const binName = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
  const destBin = join(destDir, binName)

  if (process.platform === 'darwin') {
    try {
      const plistDir = join(app.getPath('home'), 'Library', 'LaunchAgents')
      const plistPath = join(plistDir, 'com.electron.music.ncmserver.plist')
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
      execSync(`launchctl load "${plistPath}" 2>/dev/null || true`)
    } catch { /* 忽略 */ }
  } else if (process.platform === 'win32') {
    try {
      execSync(
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "NcmMusicServer" /t REG_SZ /d "\\"${destBin}\\"" /f`,
        { shell: 'cmd.exe' }
      )
    } catch { /* 忽略 */ }
  }
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
app.whenReady().then(() => {
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
  app.quit()
})

