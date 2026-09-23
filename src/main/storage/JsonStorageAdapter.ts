import { randomUUID } from 'node:crypto'
import { access, copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import dayjs from 'dayjs'
import type { Category, FocusData, Settings, Task } from '../../shared/types'
import type { StorageAdapter } from './StorageAdapter'

type DataKey = 'tasks' | 'categories' | 'settings' | 'focus'

const DEFAULT_SETTINGS: Settings = { weekStartsOn: 1, backupRetentionDays: 14, theme: 'light' }
const DEFAULT_FOCUS_DATA: FocusData = {
  preferences: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, roundsBeforeLongBreak: 4 },
  state: { mode: 'focus', status: 'idle', remainingSeconds: 25 * 60, completedFocusRounds: 0 },
  sessions: [],
}

export class JsonStorageAdapter implements StorageAdapter {
  private readonly backupDir: string

  constructor(private readonly dataDir: string) {
    this.backupDir = path.join(dataDir, 'backups')
  }

  async initialize(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true })
    await mkdir(this.backupDir, { recursive: true })
    await this.ensureFile('tasks', [])
    await this.ensureFile('categories', this.createDefaultCategories())
    await this.ensureFile('settings', DEFAULT_SETTINGS)
    await this.ensureFile('focus', DEFAULT_FOCUS_DATA)
  }

  loadTasks(): Promise<Task[]> { return this.readJson<Task[]>('tasks') }
  saveTasks(tasks: Task[]): Promise<void> { return this.writeJson('tasks', tasks) }
  loadCategories(): Promise<Category[]> { return this.readJson<Category[]>('categories') }
  saveCategories(categories: Category[]): Promise<void> { return this.writeJson('categories', categories) }
  loadSettings(): Promise<Settings> { return this.readJson<Settings>('settings') }
  saveSettings(settings: Settings): Promise<void> { return this.writeJson('settings', settings) }
  loadFocusData(): Promise<FocusData> { return this.readJson<FocusData>('focus') }
  saveFocusData(data: FocusData): Promise<void> { return this.writeJson('focus', data) }

  async createSnapshot(reason: string): Promise<string> {
    const safeReason = reason.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'manual'
    const snapshotDir = path.join(this.backupDir, `snapshot-${dayjs().format('YYYYMMDD-HHmmss-SSS')}-${safeReason}-${randomUUID().slice(0, 8)}`)
    await mkdir(snapshotDir, { recursive: false })
    try {
      await Promise.all((['tasks', 'categories', 'settings', 'focus'] as DataKey[]).map((key) => copyFile(this.filePath(key), path.join(snapshotDir, `${key}.json`))))
      return snapshotDir
    } catch (error) {
      await rm(snapshotDir, { recursive: true, force: true })
      throw error
    }
  }

  private filePath(key: DataKey): string { return path.join(this.dataDir, `${key}.json`) }

  private async ensureFile<T>(key: DataKey, fallback: T): Promise<void> {
    try { await access(this.filePath(key)) } catch { await this.atomicWrite(this.filePath(key), fallback) }
  }

  private async readJson<T>(key: DataKey): Promise<T> {
    try {
      return JSON.parse(await readFile(this.filePath(key), 'utf8')) as T
    } catch (cause) {
      const recovered = await this.recoverLatest<T>(key)
      if (recovered !== undefined) {
        await this.atomicWrite(this.filePath(key), recovered)
        return recovered
      }
      const detail = cause instanceof Error ? cause.message : String(cause)
      throw new Error(`无法读取 ${key}.json，且没有可用备份：${detail}`)
    }
  }

  private async writeJson<T>(key: DataKey, value: T): Promise<void> {
    try {
      await this.backupOncePerDay(key)
      await this.atomicWrite(this.filePath(key), value)
      const settings = key === 'settings' ? value as Settings : await this.safeLoadSettings()
      await this.pruneBackups(settings.backupRetentionDays)
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      throw new Error(`保存 ${key}.json 失败：${detail}`)
    }
  }

  private async atomicWrite<T>(target: string, value: T): Promise<void> {
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`
    const previous = `${target}.previous`
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    let hadPrevious = false
    try {
      try {
        await rename(target, previous)
        hadPrevious = true
      } catch (error) {
        if (!this.isMissing(error)) throw error
      }
      await rename(temp, target)
      if (hadPrevious) await rm(previous, { force: true })
    } catch (error) {
      await rm(temp, { force: true })
      if (hadPrevious) {
        await rm(target, { force: true })
        await rename(previous, target)
      }
      throw error
    }
  }

  private async backupOncePerDay(key: DataKey): Promise<void> {
    const backup = path.join(this.backupDir, `${key}-${dayjs().format('YYYY-MM-DD')}.json`)
    try { await access(backup); return } catch { /* create today's backup */ }
    try { await copyFile(this.filePath(key), backup) } catch (error) {
      if (!this.isMissing(error)) throw error
    }
  }

  private async recoverLatest<T>(key: DataKey): Promise<T | undefined> {
    const names = (await readdir(this.backupDir))
      .filter((name) => name.startsWith(`${key}-`) && name.endsWith('.json'))
      .sort().reverse()
    for (const name of names) {
      try { return JSON.parse(await readFile(path.join(this.backupDir, name), 'utf8')) as T } catch { /* try older */ }
    }
    return undefined
  }

  private async safeLoadSettings(): Promise<Settings> {
    try { return await this.loadSettings() } catch { return DEFAULT_SETTINGS }
  }

  private async pruneBackups(retentionDays: number): Promise<void> {
    const cutoff = dayjs().subtract(Math.max(7, Math.min(retentionDays, 30)), 'day').startOf('day')
    for (const entry of await readdir(this.backupDir, { withFileTypes: true })) {
      const dailyMatch = entry.name.match(/-(\d{4}-\d{2}-\d{2})\.json$/)
      const snapshotMatch = entry.name.match(/^snapshot-(\d{4})(\d{2})(\d{2})-/)
      const backupDate = dailyMatch?.[1] ?? (snapshotMatch ? `${snapshotMatch[1]}-${snapshotMatch[2]}-${snapshotMatch[3]}` : undefined)
      if (backupDate && dayjs(backupDate).isBefore(cutoff)) {
        await rm(path.join(this.backupDir, entry.name), { recursive: entry.isDirectory(), force: true })
      }
    }
  }

  private createDefaultCategories(): Category[] {
    const now = new Date().toISOString()
    return [
      { id: randomUUID(), name: '工作', color: '#5b6cf9', sortOrder: 0, createdAt: now, updatedAt: now },
      { id: randomUUID(), name: '学习', color: '#14a38b', sortOrder: 1, createdAt: now, updatedAt: now },
      { id: randomUUID(), name: '生活', color: '#f08a5d', sortOrder: 2, createdAt: now, updatedAt: now },
    ]
  }

  private isMissing(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
  }
}
