import AdmZip from 'adm-zip'
import dayjs from 'dayjs'
import type { Category, CleanupCompletedRequest, CleanupCompletedResult, FocusData, Settings, Task } from '../../shared/types'
import type { StorageAdapter } from '../storage/StorageAdapter'

interface ArchiveManifest {
  format: 'todoplan-data'
  version: 1 | 2
  exportedAt: string
}

export class DataMaintenanceService {
  constructor(private readonly storage: StorageAdapter) {}

  async exportArchive(filePath: string): Promise<void> {
    const [tasks, categories, settings, focus] = await Promise.all([
      this.storage.loadTasks(),
      this.storage.loadCategories(),
      this.storage.loadSettings(),
      this.storage.loadFocusData(),
    ])
    const manifest: ArchiveManifest = { format: 'todoplan-data', version: 2, exportedAt: new Date().toISOString() }
    const zip = new AdmZip()
    zip.addFile('manifest.json', this.jsonBuffer(manifest))
    zip.addFile('tasks.json', this.jsonBuffer(tasks))
    zip.addFile('categories.json', this.jsonBuffer(categories))
    zip.addFile('settings.json', this.jsonBuffer(settings))
    zip.addFile('focus.json', this.jsonBuffer(focus))
    zip.writeZip(filePath)
  }

  async importArchive(filePath: string): Promise<{ taskCount: number; categoryCount: number }> {
    let zip: AdmZip
    try { zip = new AdmZip(filePath) } catch (cause) { throw new Error(`无法打开数据压缩包：${this.message(cause)}`) }
    const manifest = this.readEntry<ArchiveManifest>(zip, 'manifest.json')
    const tasks = this.readEntry<unknown>(zip, 'tasks.json')
    const categories = this.readEntry<unknown>(zip, 'categories.json')
    const settings = this.readEntry<unknown>(zip, 'settings.json')
    const focus = manifest.version === 2 ? this.readEntry<unknown>(zip, 'focus.json') : undefined
    if (manifest.format !== 'todoplan-data' || ![1, 2].includes(manifest.version)) throw new Error('不是受支持的 TodoPlan 数据压缩包')
    if (!this.isTaskArray(tasks)) throw new Error('压缩包中的 tasks.json 格式无效')
    if (!this.isCategoryArray(categories)) throw new Error('压缩包中的 categories.json 格式无效')
    if (!this.isSettings(settings)) throw new Error('压缩包中的 settings.json 格式无效')
    if (focus !== undefined && !this.isFocusData(focus)) throw new Error('压缩包中的 focus.json 格式无效')

    const [oldTasks, oldCategories, oldSettings, oldFocus] = await Promise.all([
      this.storage.loadTasks(), this.storage.loadCategories(), this.storage.loadSettings(), this.storage.loadFocusData(),
    ])
    await this.storage.createSnapshot('before-import')
    try {
      await this.storage.saveTasks(tasks)
      await this.storage.saveCategories(categories)
      await this.storage.saveSettings(settings)
      if (focus) await this.storage.saveFocusData(focus)
    } catch (cause) {
      await Promise.all([
        this.storage.saveTasks(oldTasks),
        this.storage.saveCategories(oldCategories),
        this.storage.saveSettings(oldSettings),
        this.storage.saveFocusData(oldFocus),
      ])
      throw new Error(`导入失败，已恢复原数据：${this.message(cause)}`)
    }
    return { taskCount: tasks.length, categoryCount: categories.length }
  }

  async cleanupCompleted(input: CleanupCompletedRequest): Promise<CleanupCompletedResult> {
    if (![30, 90, 365, 'all'].includes(input.age)) throw new Error('无效的清理范围')
    const tasks = await this.storage.loadTasks()
    const cutoff = input.age === 'all' ? undefined : dayjs().subtract(input.age, 'day')
    const removedIds = new Set(tasks.filter((task) => {
      if (task.status !== 'completed' || !task.completedAt) return false
      return cutoff ? dayjs(task.completedAt).isBefore(cutoff) : true
    }).map((task) => task.id))
    if (!removedIds.size) return { deletedCount: 0, remainingCount: tasks.length, snapshotCreated: false }

    const now = new Date().toISOString()
    const remaining = tasks.filter((task) => !removedIds.has(task.id)).map((task) => (
      task.parentId && removedIds.has(task.parentId)
        ? { ...task, parentId: undefined, updatedAt: now }
        : task
    ))
    await this.storage.createSnapshot('before-cleanup')
    await this.storage.saveTasks(remaining)
    return { deletedCount: removedIds.size, remainingCount: remaining.length, snapshotCreated: true }
  }

  private readEntry<T>(zip: AdmZip, name: string): T {
    const entry = zip.getEntry(name)
    if (!entry || entry.isDirectory) throw new Error(`数据压缩包缺少 ${name}`)
    try { return JSON.parse(entry.getData().toString('utf8')) as T } catch { throw new Error(`数据压缩包中的 ${name} 无法解析`) }
  }

  private jsonBuffer(value: unknown): Buffer { return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8') }
  private message(cause: unknown): string { return cause instanceof Error ? cause.message : String(cause) }

  private isTaskArray(value: unknown): value is Task[] {
    return Array.isArray(value) && value.every((item) => this.isRecord(item)
      && typeof item.id === 'string' && typeof item.title === 'string'
      && (item.status === 'todo' || item.status === 'completed')
      && ['low', 'medium', 'high'].includes(String(item.priority))
      && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string'
      && typeof item.sortOrder === 'number')
  }

  private isCategoryArray(value: unknown): value is Category[] {
    return Array.isArray(value) && value.every((item) => this.isRecord(item)
      && typeof item.id === 'string' && typeof item.name === 'string'
      && typeof item.color === 'string' && typeof item.sortOrder === 'number'
      && typeof item.createdAt === 'string' && typeof item.updatedAt === 'string')
  }

  private isSettings(value: unknown): value is Settings {
    return this.isRecord(value) && value.weekStartsOn === 1
      && typeof value.backupRetentionDays === 'number'
      && ['light', 'dark', 'system'].includes(String(value.theme))
      && (value.sceneryDirectory === undefined || typeof value.sceneryDirectory === 'string')
  }

  private isFocusData(value: unknown): value is FocusData {
    if (!this.isRecord(value) || !this.isRecord(value.preferences) || !this.isRecord(value.state) || !Array.isArray(value.sessions)) return false
    return ['focus', 'shortBreak', 'longBreak'].includes(String(value.state.mode))
      && ['idle', 'running', 'paused'].includes(String(value.state.status))
      && typeof value.state.remainingSeconds === 'number'
      && typeof value.state.completedFocusRounds === 'number'
      && typeof value.preferences.focusMinutes === 'number'
      && typeof value.preferences.shortBreakMinutes === 'number'
      && typeof value.preferences.longBreakMinutes === 'number'
      && typeof value.preferences.roundsBeforeLongBreak === 'number'
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
