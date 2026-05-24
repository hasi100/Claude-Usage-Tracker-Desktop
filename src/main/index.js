const { app, BrowserWindow, ipcMain, nativeImage, screen, globalShortcut } = require('electron')
const path = require('path')
const Store = require('electron-store')
const { setupTray } = require('./tray')
const { detectCliCredentials, getStoredSessionKey, storeSessionKey, clearCredentials } = require('./auth')
const { registerIpcHandlers } = require('./ipc')

const store = new Store()
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null

const MINI_WIDTH = 210
const MINI_HEIGHT = 48
const EXPANDED_WIDTH = 300

function createWindow() {
  const savedBounds = store.get('windowBounds', null)
  const { width: screenW } = screen.getPrimaryDisplay().workAreaSize

  const defaultX = screenW - EXPANDED_WIDTH - 20
  const defaultY = 20

  const isWin = process.platform === 'win32'

  const winOptions = {
    width: EXPANDED_WIDTH,
    height: 260,           // initial — renderer will resize via IPC
    minHeight: MINI_HEIGHT,
    minWidth: MINI_WIDTH,
    x: savedBounds ? savedBounds.x : defaultX,
    y: savedBounds ? savedBounds.y : defaultY,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: false,
    // hasShadow:false on Win — OS shadow paints around the window rect (not
    // the rounded CSS shape) and produces grey corners on the mini pill.
    hasShadow: !isWin,
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
  }

  // Note: not setting backgroundMaterial on Windows — it conflicts with
  // transparent:true and paints a grey backdrop outside the pill's rounded
  // corners when minimized. CSS backdrop-filter handles the in-page blur.

  mainWindow = new BrowserWindow(winOptions)

  // macOS vibrancy
  if (process.platform === 'darwin') {
    mainWindow.setVibrancy('dark')
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('moved', () => {
    const bounds = mainWindow.getBounds()
    store.set('windowBounds', { x: bounds.x, y: bounds.y })
  })

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow.hide()
  })

  // NOTE: we deliberately do NOT add a will-resize guard.
  // Earlier versions blocked any width change ≠ EXPANDED_WIDTH, which also
  // killed our IPC-driven mini-pill resize (210×48). The frameless window
  // gives the user no resize handles anyway, so manual resize isn't possible.

  const savedOpacity = store.get('opacity', 0.92)
  mainWindow.setOpacity(savedOpacity)

  setupTray(mainWindow, store)
  registerIpcHandlers(ipcMain, mainWindow, store)
}

app.whenReady().then(() => {
  createWindow()
  const autoStart = store.get('autoStart', false)
  app.setLoginItemSettings({ openAtLogin: autoStart })

  // Global shortcut: Ctrl/Cmd+Shift+M toggles the mini pill.
  const accel = process.platform === 'darwin' ? 'Cmd+Shift+M' : 'Ctrl+Shift+M'
  globalShortcut.register(accel, () => {
    if (!mainWindow) return
    if (!mainWindow.isVisible()) mainWindow.show()
    const [w] = mainWindow.getSize()
    const goingMini = w !== MINI_WIDTH
    const [x, y] = mainWindow.getPosition()
    if (goingMini) mainWindow.setSize(MINI_WIDTH, MINI_HEIGHT)
    else            mainWindow.setSize(EXPANDED_WIDTH, 260)
    mainWindow.setPosition(x, y)
    mainWindow.webContents.send('window:mini-changed', goingMini)
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow) mainWindow.show()
})

module.exports = { getMainWindow: () => mainWindow }
