const { ipcMain } = require('electron')

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
    const { app } = require('electron')
    app.exit()
    app.relaunch()
  })
}
export default setupWindowEvents
