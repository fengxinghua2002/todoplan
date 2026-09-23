import { dialog, ipcMain, Notification } from 'electron'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { CategoryInput, CleanupCompletedRequest, FocusMode, FocusPreferencesUpdate, FocusStartRequest, ReportRequest, SaveReportRequest, Settings, StatisticsRequest, TaskInput, TaskUpdate } from '../../shared/types'
import type { StorageAdapter } from '../storage/StorageAdapter'
import type { TaskService } from '../services/TaskService'
import type { CategoryService } from '../services/CategoryService'
import type { StatisticsService } from '../services/StatisticsService'
import type { ReportService } from '../services/ReportService'
import type { DataMaintenanceService } from '../services/DataMaintenanceService'
import type { FocusService } from '../services/FocusService'
import type { SceneryService } from '../services/SceneryService'
import { applyApplicationTheme } from '../windowTheme'

interface Services {
  storage: StorageAdapter
  tasks: TaskService
  categories: CategoryService
  statistics: StatisticsService
  reports: ReportService
  maintenance: DataMaintenanceService
  focus: FocusService
  scenery: SceneryService
}

export function registerIpc(services: Services): void {
  ipcMain.handle(IPC_CHANNELS.tasks.getAll, () => services.tasks.getAll())
  ipcMain.handle(IPC_CHANNELS.tasks.create, (_event, input: TaskInput) => services.tasks.create(input))
  ipcMain.handle(IPC_CHANNELS.tasks.update, (_event, id: string, input: TaskUpdate) => services.tasks.update(id, input))
  ipcMain.handle(IPC_CHANNELS.tasks.delete, (_event, id: string) => services.tasks.delete(id))
  ipcMain.handle(IPC_CHANNELS.tasks.complete, (_event, id: string, note?: string) => services.tasks.complete(id, note))
  ipcMain.handle(IPC_CHANNELS.tasks.uncomplete, (_event, id: string) => services.tasks.uncomplete(id))

  ipcMain.handle(IPC_CHANNELS.categories.getAll, () => services.categories.getAll())
  ipcMain.handle(IPC_CHANNELS.categories.create, (_event, input: CategoryInput) => services.categories.create(input))
  ipcMain.handle(IPC_CHANNELS.categories.update, (_event, id: string, input: Partial<CategoryInput>) => services.categories.update(id, input))
  ipcMain.handle(IPC_CHANNELS.categories.delete, (_event, id: string) => services.categories.delete(id))
  ipcMain.handle(IPC_CHANNELS.categories.reorder, (_event, ids: string[]) => services.categories.reorder(ids))

  ipcMain.handle(IPC_CHANNELS.statistics.get, (_event, input: StatisticsRequest) => services.statistics.get(input))
  ipcMain.handle(IPC_CHANNELS.reports.generate, (_event, input: ReportRequest) => services.reports.generate(input))
  ipcMain.handle(IPC_CHANNELS.reports.save, async (_event, input: SaveReportRequest) => {
    const result = await dialog.showSaveDialog({ title: '保存 Markdown 报告', defaultPath: path.join(input.suggestedFileName), filters: [{ name: 'Markdown', extensions: ['md'] }] })
    if (result.canceled || !result.filePath) return { canceled: true }
    await writeFile(result.filePath, input.markdown, 'utf8')
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle(IPC_CHANNELS.settings.get, () => services.storage.loadSettings())
  ipcMain.handle(IPC_CHANNELS.settings.update, async (_event, input: Partial<Settings>) => {
    const current = await services.storage.loadSettings()
    const updated = { ...current, ...input, weekStartsOn: 1 as const }
    await services.storage.saveSettings(updated)
    applyApplicationTheme(updated.theme)
    return updated
  })

  ipcMain.handle(IPC_CHANNELS.scenery.selectDirectory, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择风景图片文件夹',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }
    const directory = result.filePaths[0]
    const imageCount = await services.scenery.countImages(directory)
    return { canceled: false, directory, imageCount }
  })
  ipcMain.handle(IPC_CHANNELS.scenery.getDaily, (_event, date: string, offset?: number) => services.scenery.getDailyImage(date, offset))

  ipcMain.handle(IPC_CHANNELS.data.exportArchive, async () => {
    const date = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog({
      title: '导出 TodoPlan 数据压缩包',
      defaultPath: `TodoPlan-data-${date}.zip`,
      filters: [{ name: 'TodoPlan 数据压缩包', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }
    await services.maintenance.exportArchive(result.filePath)
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle(IPC_CHANNELS.data.importArchive, async () => {
    const result = await dialog.showOpenDialog({
      title: '导入 TodoPlan 数据压缩包',
      properties: ['openFile'],
      filters: [{ name: 'TodoPlan 数据压缩包', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }
    const imported = await services.maintenance.importArchive(result.filePaths[0])
    return { canceled: false, ...imported }
  })

  ipcMain.handle(IPC_CHANNELS.data.cleanup, (_event, input: CleanupCompletedRequest) => services.maintenance.cleanupCompleted(input))

  ipcMain.handle(IPC_CHANNELS.focus.get, () => services.focus.get())
  ipcMain.handle(IPC_CHANNELS.focus.start, (_event, input: FocusStartRequest) => services.focus.start(input))
  ipcMain.handle(IPC_CHANNELS.focus.pause, () => services.focus.pause())
  ipcMain.handle(IPC_CHANNELS.focus.resume, () => services.focus.resume())
  ipcMain.handle(IPC_CHANNELS.focus.reset, () => services.focus.reset())
  ipcMain.handle(IPC_CHANNELS.focus.skip, () => services.focus.skip())
  ipcMain.handle(IPC_CHANNELS.focus.selectMode, (_event, mode: FocusMode) => services.focus.selectMode(mode))
  ipcMain.handle(IPC_CHANNELS.focus.updatePreferences, (_event, input: FocusPreferencesUpdate) => services.focus.updatePreferences(input))
  ipcMain.handle(IPC_CHANNELS.focus.complete, async () => {
    const before = await services.focus.get()
    const result = await services.focus.complete()
    if (Notification.isSupported() && before.state.startedAt) {
      const finishedFocus = before.state.mode === 'focus'
      new Notification({
        title: finishedFocus ? '专注完成' : '休息结束',
        body: finishedFocus ? '做得很好，起来活动一下吧。' : '休息好了，开始下一轮专注吧。',
      }).show()
    }
    return result
  })
}
