import path from 'node:path'
import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'

export function getApplicationIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(process.cwd(), 'build', 'icon.png')
}

export function createTray(getWindow: () => BrowserWindow | null, quit: () => void): Tray {
  const icon = nativeImage.createFromPath(getApplicationIconPath()).resize({ width: 20, height: 20 })
  const tray = new Tray(icon)

  const showWindow = (): void => {
    const window = getWindow()
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }

  tray.setToolTip('TodoPlan')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开 TodoPlan', click: showWindow },
    { type: 'separator' },
    { label: '退出', click: quit },
  ]))
  tray.on('click', showWindow)

  return tray
}
