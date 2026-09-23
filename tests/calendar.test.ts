import { describe, expect, it } from 'vitest'
import type { Task } from '../src/shared/types'
import { buildCalendarMonth } from '../src/renderer/utils/calendar'

function task(input: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: input.id,
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-09-01T08:00:00+08:00',
    updatedAt: '2026-09-01T08:00:00+08:00',
    sortOrder: 0,
    ...input,
  }
}

describe('buildCalendarMonth', () => {
  it('builds a six-week grid starting on Monday', () => {
    const days = buildCalendarMonth('2026-09-15', [])

    expect(days).toHaveLength(42)
    expect(days[0]).toMatchObject({ date: '2026-08-31', inCurrentMonth: false })
    expect(days[1]).toMatchObject({ date: '2026-09-01', inCurrentMonth: true })
    expect(days[41].date).toBe('2026-10-11')
  })

  it('counts root plans and completion dates without double-counting subtasks', () => {
    const tasks = [
      task({ id: 'plan', planDate: '2026-09-08', categoryId: 'work' }),
      task({ id: 'done', status: 'completed', planDate: '2026-09-08', categoryId: 'life', completedAt: '2026-09-08T19:30:00+08:00' }),
      task({ id: 'subtask', parentId: 'plan', planDate: '2026-09-08', categoryId: 'work', status: 'completed', completedAt: '2026-09-08T20:00:00+08:00' }),
      task({ id: 'late', status: 'completed', planDate: '2026-09-07', completedAt: '2026-09-08T21:00:00+08:00' }),
    ]

    const day = buildCalendarMonth('2026-09-15', tasks).find((item) => item.date === '2026-09-08')

    expect(day).toMatchObject({ plannedCount: 2, completedCount: 2 })
    expect(day?.categoryIds).toEqual(['work', 'life'])
  })
})
