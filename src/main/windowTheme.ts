import { BrowserWindow, nativeTheme } from 'electron'
import type { Settings } from '../shared/types'

const TITLE_BAR_HEIGHT = 34

export function getWindowBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? '#17181e' : '#f7f8fc'
}

export function getTitleBarOverlay(): { color: string; symbolColor: string; height: number } {
  return {
    color: getWindowBackgroundColor(),
    symbolColor: nativeTheme.shouldUseDarkColors ? '#f0f1f5' : '#202331',
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
