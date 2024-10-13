import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// 创建浏览器窗口的函数
function createWindow(): void {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    minHeight: 650,
    minWidth: 950,
    height: 750,
    width: 1150,
    show: false, // 初始时不显示窗口
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true, // 自动隐藏菜单栏
    ...(process.platform === 'linux' ? { icon } : {}), // 如果是 Linux 平台，则设置图标
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'), // 预加载脚本路径
      sandbox: false // 禁用沙盒模式
    },
    frame: false
  })

  // 当窗口准备好显示时，显示窗口
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 拦截新窗口的打开请求，并在默认浏览器中打开 URL
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' } // 拒绝在 Electron 窗口中打开新窗口
  })

  // 根据开发环境或生产环境加载不同的 URL
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']) // 开发环境下加载远程 URL
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')) // 生产环境下加载本地 HTML 文件
  }

  ipcWindowEvent()

  function ipcWindowEvent() {
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
      app.exit() //退出当前程序
      app.relaunch() //重新启动
    })
  }
}

// 当 Electron 初始化完成并准备好创建浏览器窗口时调用
app.whenReady().then(() => {
  // 设置应用程序的用户模型 ID（仅在 Windows 上有效）
  electronApp.setAppUserModelId('com.electron')

  // 在开发环境下默认打开或关闭开发者工具，并忽略 CmdOrCtrl + R 快捷键
  // 参考 https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC 测试：监听 'ping' 事件并打印 'pong'
  ipcMain.on('ping', () => console.log('pong'))

  // 创建浏览器窗口
  createWindow()

  // 当应用程序被激活时（例如在 macOS 上点击 Dock 图标），如果没有窗口打开，则重新创建一个窗口
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 当所有窗口关闭时退出应用程序，除了在 macOS 上
// 在 macOS 上，通常会保持应用程序和菜单栏活跃，直到用户显式退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在这个文件中，你可以包含应用程序主进程的其他代码
// 你也可以将它们放在单独的文件中并在这里引入
