import { BrowserWindow, nativeTheme } from 'electron'
import type { Settings } from '../shared/types'

const TITLE_BAR_HEIGHT = 40

export function getWindowBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#181817' : '#f7f7f4'
}

export function getTitleBarOverlay(): { color: string; symbolColor: string; height: number } {
  return {
    color: nativeTheme.shouldUseDarkColors ? '#242422' : '#fffefa',
    symbolColor: nativeTheme.shouldUseDarkColors ? '#f0eee8' : '#363431',
    height: TITLE_BAR_HEIGHT,
  }
}

export function updateWindowTitleBars(): void {
  if (process.platform !== 'win32') return
  for (const window of BrowserWindow.getAllWindows()) window.setTitleBarOverlay(getTitleBarOverlay())
}

export function applyApplicationTheme(theme: Settings['theme']): void {
  nativeTheme.themeSource = theme
  updateWindowTitleBars()
}

nativeTheme.on('updated', updateWindowTitleBars)
