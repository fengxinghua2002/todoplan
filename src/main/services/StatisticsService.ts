import dayjs, { type Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Category, ReportType, StatisticsRequest, StatisticsResult, Task, TimeBucket } from '../../shared/types'
import { collectAncestorTasks, createTaskLookup, resolveTaskCategoryId } from '../../shared/taskHierarchy'
import type { StorageAdapter } from '../storage/StorageAdapter'

dayjs.extend(isoWeek)

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export class StatisticsService {
  constructor(private readonly storage: StorageAdapter) {}

  async get(input: StatisticsRequest): Promise<StatisticsResult> {
    const anchor = dayjs(input.anchorDate)
    if (!anchor.isValid()) throw new Error('统计日期无效')
    const { start, end, title } = this.period(input.type, anchor)
    const [allTasks, categories] = await Promise.all([this.storage.loadTasks(), this.storage.loadCategories()])
    const tasks = allTasks.filter((task) => this.inRange(task, start, end)).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    return {
      type: input.type, startDate: start.format('YYYY-MM-DD'), endDate: end.format('YYYY-MM-DD'), title,
      total: tasks.length, categoryCounts: this.categoryCounts(tasks, allTasks, categories),
      timeBuckets: this.timeBuckets(input.type, start, tasks), tasks,
      contextTasks: collectAncestorTasks(tasks, allTasks),
    }
  }

  private period(type: ReportType, anchor: Dayjs): { start: Dayjs; end: Dayjs; title: string } {
    if (type === 'week') {
      const start = anchor.startOf('isoWeek')
      return { start, end: anchor.endOf('isoWeek'), title: `${start.year()} 年第 ${start.isoWeek()} 周` }
    }
    if (type === 'month') return { start: anchor.startOf('month'), end: anchor.endOf('month'), title: anchor.format('YYYY 年 M 月') }
    return { start: anchor.startOf('year'), end: anchor.endOf('year'), title: anchor.format('YYYY 年') }
  }

  private inRange(task: Task, start: Dayjs, end: Dayjs): boolean {
    if (task.status !== 'completed' || !task.completedAt) return false
    const completed = dayjs(task.completedAt)
    return !completed.isBefore(start.startOf('day')) && !completed.isAfter(end.endOf('day'))
  }

  private categoryCounts(tasks: Task[], allTasks: Task[], categories: Category[]) {
    const map = new Map(categories.map((category) => [category.id, category]))
    const taskLookup = createTaskLookup(allTasks)
    const counts = new Map<string, number>()
    tasks.forEach((task) => {
      const categoryId = resolveTaskCategoryId(task, taskLookup) ?? ''
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
    })
    return [...counts.entries()].map(([id, count]) => ({
      categoryId: id || undefined, categoryName: map.get(id)?.name ?? '未分类', color: map.get(id)?.color ?? '#9aa0ad', count,
    })).sort((a, b) => b.count - a.count)
  }

  private timeBuckets(type: ReportType, start: Dayjs, tasks: Task[]): TimeBucket[] {
    const countOn = (key: string, unit: 'day' | 'month') => tasks.filter((task) => dayjs(task.completedAt).isSame(key, unit)).length
    if (type === 'week') return Array.from({ length: 7 }, (_, index) => {
      const date = start.add(index, 'day')
      return { key: date.format('YYYY-MM-DD'), label: WEEKDAYS[index], count: countOn(date.format('YYYY-MM-DD'), 'day') }
    })
    if (type === 'month') {
      const weeks = Math.ceil((start.daysInMonth() + ((start.day() + 6) % 7)) / 7)
      return Array.from({ length: weeks }, (_, index) => {
        const weekStart = start.startOf('isoWeek').add(index, 'week')
        const weekEnd = weekStart.endOf('isoWeek')
        const count = tasks.filter((task) => {
          const value = dayjs(task.completedAt)
          return !value.isBefore(weekStart) && !value.isAfter(weekEnd)
        }).length
        return { key: weekStart.format('YYYY-MM-DD'), label: `第 ${index + 1} 周`, count }
      })
    }
    return Array.from({ length: 12 }, (_, index) => {
      const month = start.month(index)
      return { key: month.format('YYYY-MM'), label: `${index + 1} 月`, count: countOn(month.format('YYYY-MM'), 'month') }
    })
  }
}
