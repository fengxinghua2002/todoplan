import { describe, expect, it } from 'vitest'
import type { FocusMode, FocusSession } from '../src/shared/types'
import { calculateFocusStatistics } from '../src/renderer/utils/focusStatistics'

function session(id: string, year: number, month: number, day: number, hour: number, minutes: number, mode: FocusMode = 'focus'): FocusSession {
  const completedAt = new Date(year, month - 1, day, hour).toISOString()
  return { id, mode, startedAt: completedAt, completedAt, durationSeconds: minutes * 60 }
}

describe('focus statistics', () => {
  it('counts completed focus sessions by local day and time of completion, excluding breaks', () => {
    const sessions = [
      session('morning', 2026, 9, 23, 8, 25),
      session('evening', 2026, 9, 23, 19, 40),
      session('break', 2026, 9, 23, 20, 15, 'shortBreak'),
    ]
    const result = calculateFocusStatistics(sessions, '2026-09-23', 'day')
    expect(result).toMatchObject({ minutes: 65, rounds: 2, activeDays: 1, streakDays: 1 })
    expect(result.buckets.map((bucket) => bucket.minutes)).toEqual([0, 0, 25, 0, 40, 0])
  })

  it('uses Monday for weekly totals and calendar boundaries for month and year', () => {
    const sessions = [
      session('last-week', 2026, 12, 27, 12, 25),
      session('monday', 2026, 12, 28, 12, 25),
      session('year-end', 2026, 12, 31, 12, 40),
      session('new-year', 2027, 1, 1, 12, 25),
    ]
    expect(calculateFocusStatistics(sessions, '2027-01-01', 'week')).toMatchObject({ minutes: 90, rounds: 3, activeDays: 3 })
    expect(calculateFocusStatistics(sessions, '2027-01-01', 'month')).toMatchObject({ minutes: 25, rounds: 1, activeDays: 1 })
    expect(calculateFocusStatistics(sessions, '2027-01-01', 'year')).toMatchObject({ minutes: 25, rounds: 1, activeDays: 1 })
  })

  it('keeps a streak through yesterday until today is completed, then extends it', () => {
    const previous = [session('monday', 2026, 9, 21, 10, 25), session('tuesday', 2026, 9, 22, 10, 25)]
    expect(calculateFocusStatistics(previous, '2026-09-23', 'week').streakDays).toBe(2)
    expect(calculateFocusStatistics([...previous, session('wednesday', 2026, 9, 23, 10, 25)], '2026-09-23', 'week').streakDays).toBe(3)
    expect(calculateFocusStatistics(previous, '2026-09-24', 'week').streakDays).toBe(0)
  })
})
