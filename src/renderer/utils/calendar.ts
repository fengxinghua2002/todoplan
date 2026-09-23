import dayjs from 'dayjs'
import type { Task } from '../../shared/types'

export interface CalendarDay {
  date: string
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
  plannedCount: number
  completedCount: number
  categoryIds: string[]
}

export function buildCalendarMonth(anchorDate: string, tasks: Task[]): CalendarDay[] {
  const monthStart = dayjs(anchorDate).startOf('month')
  const mondayOffset = (monthStart.day() + 6) % 7
  const gridStart = monthStart.subtract(mondayOffset, 'day')
  const today = dayjs().format('YYYY-MM-DD')
  const rootTasks = tasks.filter((task) => !task.parentId)

  return Array.from({ length: 42 }, (_, index) => {
    const day = gridStart.add(index, 'day')
    const date = day.format('YYYY-MM-DD')
    const plannedTasks = rootTasks.filter((task) => task.planDate === date)
    const completedCount = rootTasks.filter(
      (task) => task.status === 'completed' && task.completedAt && dayjs(task.completedAt).format('YYYY-MM-DD') === date,
    ).length

    return {
      date,
      dayNumber: day.date(),
      inCurrentMonth: day.month() === monthStart.month() && day.year() === monthStart.year(),
      isToday: date === today,
      plannedCount: plannedTasks.length,
      completedCount,
      categoryIds: [...new Set(plannedTasks.flatMap((task) => task.categoryId ? [task.categoryId] : []))].slice(0, 4),
    }
  })
}
