const { ipcMain, app } = require('electron')
const { spawn, execSync } = require('child_process')
const { dirname, join } = require('path')
const { existsSync } = require('fs')

// 服务器进程句柄
let serverProcess: ReturnType<typeof spawn> | null = null
// 服务器日志缓存（最多保留 200 行）
const serverLogs: string[] = []
const MAX_LOG_LINES = 200

/** 获取 ncm-server 可执行文件路径 */
function getServerBinPath(): string {
  if (app.isPackaged) {
    // 生产环境：安装器将 ncm-server 放在主应用同级 server/ 下
    const appDir = dirname(app.getPath('exe'))
    const bin = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
    return join(appDir, 'server', bin)
  } else {
    // 开发环境：__dirname = Music/out/main，上3级到 Music-catalog/
    const root = join(__dirname, '../../..')
    const bin = process.platform === 'win32' ? 'ncm-server.exe' : 'ncm-server'
    return join(root, 'NeteaseCloudMusicApi', 'bin', bin)
  }
}

/** 推送日志到渲染进程 */
function pushLog(mainWindow: any, line: string) {
  serverLogs.push(line)
  if (serverLogs.length > MAX_LOG_LINES) serverLogs.shift()
  mainWindow.webContents.send('server:log', line)
}

/** 启动服务器 */
function startServer(mainWindow: any): { success: boolean; message: string } {
  if (serverProcess) {
    return { success: false, message: '服务器已在运行中' }
  }
  const binPath = getServerBinPath()
  if (!existsSync(binPath)) {
    return { success: false, message: `找不到服务器程序：${binPath}` }
  }
  try {
    serverProcess = spawn(binPath, [], {
      env: { ...process.env },
      detached: false
    })

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) pushLog(mainWindow, `[INFO] ${line}`)
    })
    serverProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) pushLog(mainWindow, `[ERR]  ${line}`)
    })
    serverProcess.on('close', (code: number | null) => {
      const msg = `[SYS]  服务器进程已退出，退出码：${code}`
      pushLog(mainWindow, msg)
      serverProcess = null
      // 通知渲染进程状态变化
      mainWindow.webContents.send('server:status', getServerStatus())
    })
    serverProcess.on('error', (err: Error) => {
      pushLog(mainWindow, `[SYS]  启动失败：${err.message}`)
      serverProcess = null
      mainWindow.webContents.send('server:status', getServerStatus())
    })

    mainWindow.webContents.send('server:status', getServerStatus())
    return { success: true, message: '服务器启动成功' }
  } catch (e: any) {
    serverProcess = null
    return { success: false, message: `启动异常：${e.message}` }
  }
}

/** 停止服务器（自己 spawn 的或系统的都杀） */
function stopServer(): { success: boolean; message: string } {
  // 1. 先杀自己 spawn 的子进程
  if (serverProcess) {
    try {
      serverProcess.kill()
      serverProcess = null
    } catch (e: any) {
      return { success: false, message: `停止失败：${e.message}` }
    }
  }

  // 2. 兜底：杀系统里的 ncm-server 进程（安装器或手动启动的）
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM ncm-server.exe 2>nul & taskkill /F /IM ncm-server 2>nul', { windowsHide: true })
    } else {
      execSync('pkill -f ncm-server 2>/dev/null || true')
    }
  } catch { /* 进程不存在则忽略 */ }

  // 3. 再次确认
  const stillAlive = findServerOnSystem()
  if (stillAlive.running) {
    return { success: false, message: '服务器进程无法停止，请在任务管理器中手动结束' }
  }

  return { success: true, message: '服务器已停止' }
}

/** 检查系统中是否已有 ncm-server 进程在运行（安装器启动的也算） */
function findServerOnSystem(): { running: boolean; pid: number | null } {
  try {
    if (process.platform === 'win32') {
      // wmic 在 Win11 24H2 已移除，用 Get-Process；进程名不带 .exe
      const out = execSync(
        'powershell -NoProfile -Command "(Get-Process -Name ncm-server -ErrorAction SilentlyContinue).Id"',
        { timeout: 10000, windowsHide: true }
      ).toString().trim()
      const pid = parseInt(out, 10)
      if (!isNaN(pid) && pid > 0) return { running: true, pid }
    } else {
      const out = execSync('pgrep -f ncm-server', { timeout: 5000 }).toString().trim()
      if (out) return { running: true, pid: parseInt(out.split('\n')[0]) }
    }
  } catch {
    // 进程不存在或命令失败
  }
  return { running: false, pid: null }
}

/** 获取服务器当前状态（优先看自己 spawn 的，兜底看系统进程） */
function getServerStatus() {
  // 自己 spawn 的进程
  if (serverProcess !== null && !serverProcess.killed) {
    return {
      running: true,
      pid: serverProcess.pid ?? null
    }
  }
  // 安装器或手动启动的进程
  return findServerOnSystem()
}

function setupWindowEvents(mainWindow) {
  ipcMain.on('maximize', () => {
    mainWindow.maximize()
  })
  ipcMain.on('unmaximize', () => {
    mainWindow.unmaximize()
  })
  ipcMain.on('minimize', () => {
    mainWindow.minimize()
  })
  ipcMain.on('restore', () => {
    mainWindow.restore()
  })
  ipcMain.on('close', () => {
    mainWindow.close()
  })
  ipcMain.on('reset', () => {
    app.exit()
    app.relaunch()
  })

  // ---- 服务器控制 IPC ----

  /** 获取服务器状态 */
  ipcMain.handle('server:getStatus', () => {
    return { ...getServerStatus(), logs: [...serverLogs] }
  })

  /** 启动服务器 */
  ipcMain.handle('server:start', () => {
    return startServer(mainWindow)
  })

  /** 停止服务器 */
  ipcMain.handle('server:stop', () => {
    return stopServer()
  })

  // 应用退出时确保杀掉子进程
  app.on('before-quit', () => {
    if (serverProcess) {
      serverProcess.kill()
      serverProcess = null
    }
  })
}
export default setupWindowEvents
