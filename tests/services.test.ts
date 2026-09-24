import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import dayjs from 'dayjs'
import { JsonStorageAdapter } from '../src/main/storage/JsonStorageAdapter'
import { TaskService } from '../src/main/services/TaskService'
import { StatisticsService } from '../src/main/services/StatisticsService'
import { ReportService } from '../src/main/services/ReportService'
import { DataMaintenanceService } from '../src/main/services/DataMaintenanceService'
import { FocusService } from '../src/main/services/FocusService'
import { SceneryService } from '../src/main/services/SceneryService'
import { buildTaskForest } from '../src/shared/taskHierarchy'

const tempDirs: string[] = []

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'todoplan-test-'))
  tempDirs.push(dir)
  const storage = new JsonStorageAdapter(dir)
  await storage.initialize()
  return {
    dir,
    storage,
    tasks: new TaskService(storage),
    statistics: new StatisticsService(storage),
    reports: new ReportService(storage),
    maintenance: new DataMaintenanceService(storage),
    focus: new FocusService(storage),
    scenery: new SceneryService(storage),
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('local-first business flow', () => {
  it('initializes valid JSON files and default categories', async () => {
    const { dir, storage } = await fixture()
    expect(await storage.loadTasks()).toEqual([])
    expect((await storage.loadCategories()).map((item) => item.name)).toEqual(['工作', '学习', '生活'])
    expect(JSON.parse(await readFile(path.join(dir, 'settings.json'), 'utf8'))).toMatchObject({ weekStartsOn: 1 })
  })

  it('records completedAt and completion note, then uses them in statistics and reports', async () => {
    const { storage, tasks, statistics, reports } = await fixture()
    const [category] = await storage.loadCategories()
    const task = await tasks.create({ title: '完成统计模块', priority: 'high', categoryId: category.id, planDate: dayjs().format('YYYY-MM-DD') })
    const completed = await tasks.complete(task.id, '周、月、年统计均已验证')
    expect(completed.completedAt).toBeTruthy()
    expect(completed.completionNote).toBe('周、月、年统计均已验证')

    const result = await statistics.get({ type: 'week', anchorDate: dayjs().format('YYYY-MM-DD') })
    expect(result.total).toBe(1)
    expect(result.categoryCounts[0]).toMatchObject({ categoryName: '工作', count: 1 })

    const report = await reports.generate({ type: 'week', startDate: result.startDate, endDate: result.endDate })
    expect(report.markdown).toContain('完成统计模块')
    expect(report.markdown).toContain('周、月、年统计均已验证')
  })

  it('uses the actual completion time when recording or correcting a completed task', async () => {
    const { tasks, statistics, reports } = await fixture()
    const yesterday = dayjs().subtract(1, 'day').hour(12).minute(30).second(0).millisecond(0)
    const task = await tasks.create({ title: '补记昨天完成的任务', priority: 'medium' })
    const completed = await tasks.complete(task.id, '昨天实际完成', yesterday.toISOString())
    expect(completed.completedAt).toBe(yesterday.toISOString())
    expect(dayjs(completed.updatedAt).isSame(dayjs(), 'day')).toBe(true)

    const corrected = yesterday.subtract(1, 'hour')
    const edited = await tasks.update(task.id, { completedAt: corrected.toISOString(), completionNote: '修正完成时间' })
    expect(edited.completedAt).toBe(corrected.toISOString())
    expect(edited.completionNote).toBe('修正完成时间')

    const result = await statistics.get({ type: 'week', anchorDate: yesterday.format('YYYY-MM-DD') })
    expect(result.tasks.some((item) => item.id === task.id)).toBe(true)
    const report = await reports.generate({ type: 'week', startDate: yesterday.format('YYYY-MM-DD'), endDate: yesterday.format('YYYY-MM-DD') })
    expect(report.markdown).toContain(task.title)

    await expect(tasks.update(task.id, { completedAt: dayjs().add(1, 'day').toISOString() })).rejects.toThrow('完成时间不能晚于现在')
  })

  it('keeps parent completion independent from child completion', async () => {
    const { tasks } = await fixture()
    const parent = await tasks.create({ title: '实现统计模块', priority: 'medium' })
    const child = await tasks.create({ title: '完成周统计', priority: 'medium', parentId: parent.id })
    await tasks.complete(child.id)
    const all = await tasks.getAll()
    expect(all.find((item) => item.id === parent.id)?.status).toBe('todo')
    expect(all.find((item) => item.id === child.id)?.status).toBe('completed')
  })

  it('keeps completed subtasks nested under their parent in statistics and reports', async () => {
    const { storage, tasks, statistics, reports } = await fixture()
    const [work] = await storage.loadCategories()
    const parent = await tasks.create({ title: '实现统计模块', priority: 'high', categoryId: work.id })
    const child = await tasks.create({ title: '完成周统计', priority: 'medium', parentId: parent.id })
    await tasks.complete(child.id, '完成按周聚合')

    const result = await statistics.get({ type: 'week', anchorDate: dayjs().format('YYYY-MM-DD') })
    expect(result.total).toBe(1)
    expect(result.categoryCounts).toContainEqual(expect.objectContaining({ categoryName: '工作', count: 1 }))
    expect(result.contextTasks.map((task) => task.id)).toContain(parent.id)

    const trees = buildTaskForest(result.tasks, [...result.contextTasks, ...result.tasks], work.id)
    expect(trees).toHaveLength(1)
    expect(trees[0].contextOnly).toBe(true)
    expect(trees[0].children[0].task.id).toBe(child.id)

    const report = await reports.generate({ type: 'week', startDate: result.startDate, endDate: result.endDate })
    expect(report.markdown).toContain('- **实现统计模块**\n  - 完成周统计\n    - 完成备注：完成按周聚合')
  })

  it('exports and restores a migration archive with a safety snapshot', async () => {
    const { dir, storage, tasks, maintenance } = await fixture()
    const created = await tasks.create({ title: '迁移测试任务', priority: 'medium' })
    const archivePath = path.join(dir, 'migration.zip')
    await maintenance.exportArchive(archivePath)
    await tasks.delete(created.id)
    expect(await storage.loadTasks()).toEqual([])

    const result = await maintenance.importArchive(archivePath)
    expect(result.taskCount).toBe(1)
    expect((await storage.loadTasks())[0].title).toBe('迁移测试任务')
    expect((await readdir(path.join(dir, 'backups'))).some((name) => name.includes('before-import'))).toBe(true)
  })

  it('cleans only matching completed tasks and detaches surviving children', async () => {
    const { dir, storage, tasks, maintenance } = await fixture()
    const parent = await tasks.create({ title: '旧完成任务', priority: 'low' })
    const child = await tasks.create({ title: '仍需处理', priority: 'medium', parentId: parent.id })
    await tasks.complete(parent.id)
    const stored = await storage.loadTasks()
    const oldParent = stored.find((task) => task.id === parent.id)
    if (!oldParent) throw new Error('test fixture parent missing')
    oldParent.completedAt = dayjs().subtract(100, 'day').toISOString()
    await storage.saveTasks(stored)

    const result = await maintenance.cleanupCompleted({ age: 30 })
    const remaining = await storage.loadTasks()
    expect(result).toMatchObject({ deletedCount: 1, remainingCount: 1, snapshotCreated: true })
    expect(remaining[0]).toMatchObject({ id: child.id, status: 'todo' })
    expect(remaining[0].parentId).toBeUndefined()
    expect((await readdir(path.join(dir, 'backups'))).some((name) => name.includes('before-cleanup'))).toBe(true)
  })

  it('persists a focus timer and supports the 40 minute preset', async () => {
    const { focus } = await fixture()
    await focus.updatePreferences({ focusMinutes: 40 })
    const running = await focus.start({ taskId: 'task-for-focus' })
    expect(running.state).toMatchObject({ mode: 'focus', status: 'running', taskId: 'task-for-focus', remainingSeconds: 2400 })
    expect(running.state.endsAt).toBeTruthy()

    const paused = await focus.pause()
    expect(paused.state.status).toBe('paused')
    expect(paused.state.endsAt).toBeUndefined()

    const resumed = await focus.resume()
    expect(resumed.state.status).toBe('running')
    expect(resumed.state.endsAt).toBeTruthy()
  })

  it('records focus sessions and enters a long break after the configured rounds', async () => {
    const { focus } = await fixture()
    await focus.updatePreferences({ focusMinutes: 40, roundsBeforeLongBreak: 2 })
    await focus.start({})
    let data = await focus.complete()
    expect(data.state).toMatchObject({ mode: 'shortBreak', completedFocusRounds: 1 })
    expect(data.sessions[0]).toMatchObject({ mode: 'focus', durationSeconds: 2400 })

    await focus.selectMode('focus')
    await focus.start({})
    data = await focus.complete()
    expect(data.state).toMatchObject({ mode: 'longBreak', completedFocusRounds: 2 })
    expect(data.sessions).toHaveLength(2)
  })

  it('rotates custom scenery by date and ignores unsupported files', async () => {
    const { dir, storage, scenery } = await fixture()
    const sceneryDir = path.join(dir, 'scenery')
    await mkdir(sceneryDir)
    await Promise.all([
      writeFile(path.join(sceneryDir, '01-mountain.jpg'), Buffer.from('mountain')),
      writeFile(path.join(sceneryDir, '02-lake.png'), Buffer.from('lake')),
      writeFile(path.join(sceneryDir, 'notes.txt'), 'not an image'),
    ])
    const settings = await storage.loadSettings()
    await storage.saveSettings({ ...settings, sceneryDirectory: sceneryDir })

    expect(await scenery.countImages(sceneryDir)).toBe(2)
    const first = await scenery.getDailyImage('2026-09-22')
    const sameDay = await scenery.getDailyImage('2026-09-22')
    const nextDay = await scenery.getDailyImage('2026-09-23')
    expect(first).toMatchObject({ available: true, total: 2 })
    expect(sameDay.name).toBe(first.name)
    expect(nextDay.name).not.toBe(first.name)
    expect(first.url).toMatch(/^data:image\/(jpeg|png);base64,/)
  })
})
