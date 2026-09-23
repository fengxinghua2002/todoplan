import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { TodoApi } from '../shared/types'

const api: TodoApi = {
  getTasks: () => ipcRenderer.invoke(IPC_CHANNELS.tasks.getAll),
  createTask: (input) => ipcRenderer.invoke(IPC_CHANNELS.tasks.create, input),
  updateTask: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.tasks.update, id, input),
  deleteTask: (id) => ipcRenderer.invoke(IPC_CHANNELS.tasks.delete, id),
  completeTask: (id, note) => ipcRenderer.invoke(IPC_CHANNELS.tasks.complete, id, note),
  uncompleteTask: (id) => ipcRenderer.invoke(IPC_CHANNELS.tasks.uncomplete, id),
  getCategories: () => ipcRenderer.invoke(IPC_CHANNELS.categories.getAll),
  createCategory: (input) => ipcRenderer.invoke(IPC_CHANNELS.categories.create, input),
  updateCategory: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.categories.update, id, input),
  deleteCategory: (id) => ipcRenderer.invoke(IPC_CHANNELS.categories.delete, id),
  reorderCategories: (ids) => ipcRenderer.invoke(IPC_CHANNELS.categories.reorder, ids),
  getStatistics: (input) => ipcRenderer.invoke(IPC_CHANNELS.statistics.get, input),
  generateReport: (input) => ipcRenderer.invoke(IPC_CHANNELS.reports.generate, input),
  saveReport: (input) => ipcRenderer.invoke(IPC_CHANNELS.reports.save, input),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.settings.get),
  updateSettings: (input) => ipcRenderer.invoke(IPC_CHANNELS.settings.update, input),
  selectSceneryDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.scenery.selectDirectory),
  getDailyScenery: (date, offset) => ipcRenderer.invoke(IPC_CHANNELS.scenery.getDaily, date, offset),
  exportDataArchive: () => ipcRenderer.invoke(IPC_CHANNELS.data.exportArchive),
  importDataArchive: () => ipcRenderer.invoke(IPC_CHANNELS.data.importArchive),
  cleanupCompletedTasks: (input) => ipcRenderer.invoke(IPC_CHANNELS.data.cleanup, input),
  getFocusData: () => ipcRenderer.invoke(IPC_CHANNELS.focus.get),
  startFocusTimer: (input) => ipcRenderer.invoke(IPC_CHANNELS.focus.start, input),
  pauseFocusTimer: () => ipcRenderer.invoke(IPC_CHANNELS.focus.pause),
  resumeFocusTimer: () => ipcRenderer.invoke(IPC_CHANNELS.focus.resume),
  resetFocusTimer: () => ipcRenderer.invoke(IPC_CHANNELS.focus.reset),
  skipFocusPeriod: () => ipcRenderer.invoke(IPC_CHANNELS.focus.skip),
  completeFocusPeriod: () => ipcRenderer.invoke(IPC_CHANNELS.focus.complete),
  selectFocusMode: (mode) => ipcRenderer.invoke(IPC_CHANNELS.focus.selectMode, mode),
  updateFocusPreferences: (input) => ipcRenderer.invoke(IPC_CHANNELS.focus.updatePreferences, input),
}

contextBridge.exposeInMainWorld('todoApi', api)
