import path from 'node:path'
import { app, BrowserWindow, shell, type Tray } from 'electron'
import { JsonStorageAdapter } from './storage/JsonStorageAdapter'
import { TaskService } from './services/TaskService'
import { CategoryService } from './services/CategoryService'
import { StatisticsService } from './services/StatisticsService'
import { ReportService } from './services/ReportService'
import { DataMaintenanceService } from './services/DataMaintenanceService'
import { FocusService } from './services/FocusService'
import { SceneryService } from './services/SceneryService'
import { registerIpc } from './ipc/registerIpc'
import { installApplicationMenu } from './menu'
import { createTray, getApplicationIconPath } from './tray'
import { applyApplicationTheme, getTitleBarOverlay, getWindowBackgroundColor } from './windowTheme'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

async function bootstrap(): Promise<void> {
  const storage = new JsonStorageAdapter(app.getPath('userData'))
  await storage.initialize()
  const settings = await storage.loadSettings()
  applyApplicationTheme(settings.theme)
  registerIpc({
    storage,
    tasks: new TaskService(storage),
    categories: new CategoryService(storage),
    statistics: new StatisticsService(storage),
    reports: new ReportService(storage),
    maintenance: new DataMaintenanceService(storage),
    focus: new FocusService(storage),
    scenery: new SceneryService(storage),
  })

  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 760, minHeight: 560,
    backgroundColor: getWindowBackgroundColor(), show: true, autoHideMenuBar: process.platform !== 'darwin',
    icon: getApplicationIconPath(),
    ...(process.platform === 'win32' ? { titleBarStyle: 'hidden' as const, titleBarOverlay: getTitleBarOverlay() } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (process.platform !== 'darwin') mainWindow.setMenuBarVisibility(false)
  mainWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
  })
  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => { void shell.openExternal(url); return { action: 'deny' } })
  if (process.env.VITE_DEV_SERVER_URL) await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  else await mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'))
}

app.whenReady().then(async () => {
  installApplicationMenu()
  await bootstrap()
  tray = createTray(
    () => mainWindow,
    () => { isQuitting = true; app.quit() },
  )
}).catch((error) => { console.error(error); app.quit() })
app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => { /* The tray keeps TodoPlan available. */ })
app.on('activate', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus() }
  else void bootstrap()
})
app.on('quit', () => { tray?.destroy(); tray = null })
