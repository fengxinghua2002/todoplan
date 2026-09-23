import dayjs from 'dayjs'
import type { FocusSession } from '../../shared/types'

export type FocusStatsPeriod = 'day' | 'week' | 'month' | 'year'

export interface FocusBucket {
  key: string
  label: string
  minutes: number
  rounds: number
}

export interface FocusStatistics {
  minutes: number
  rounds: number
  activeDays: number
  streakDays: number
  buckets: FocusBucket[]
}

export function calculateFocusStatistics(sessions: FocusSession[], todayDate: string, period: FocusStatsPeriod): FocusStatistics {
  const today = dayjs(todayDate).startOf('day')
  const periodStart = period === 'week'
    ? today.subtract((today.day() + 6) % 7, 'day')
    : today.startOf(period)
  const periodEnd = periodStart.add(1, period === 'week' ? 'week' : period)
  const bucketLabels = period === 'day'
    ? ['0–4', '4–8', '8–12', '12–16', '16–20', '20–24']
    : period === 'week'
      ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      : period === 'month'
        ? Array.from({ length: Math.ceil(today.daysInMonth() / 7) }, (_, index) => `${index * 7 + 1}–${Math.min((index + 1) * 7, today.daysInMonth())}`)
        : Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
  const secondsByBucket = bucketLabels.map(() => 0)
  const roundsByBucket = bucketLabels.map(() => 0)
  const allActiveDates = new Set<string>()
  const periodActiveDates = new Set<string>()
  let seconds = 0
  let rounds = 0

  for (const session of sessions) {
    if (session.mode !== 'focus' || !Number.isFinite(session.durationSeconds) || session.durationSeconds <= 0) continue
    const completedAt = dayjs(session.completedAt)
    if (!completedAt.isValid()) continue
    const date = completedAt.format('YYYY-MM-DD')
    allActiveDates.add(date)
    if (completedAt.isBefore(periodStart) || !completedAt.isBefore(periodEnd)) continue

    const index = period === 'day'
      ? Math.floor(completedAt.hour() / 4)
      : period === 'week'
        ? (completedAt.day() + 6) % 7
        : period === 'month'
          ? Math.floor((completedAt.date() - 1) / 7)
          : completedAt.month()
    secondsByBucket[index] += session.durationSeconds
    roundsByBucket[index] += 1
    periodActiveDates.add(date)
    seconds += session.durationSeconds
    rounds += 1
  }

  let streakDate = allActiveDates.has(todayDate) ? today : today.subtract(1, 'day')
  let streakDays = 0
  while (allActiveDates.has(streakDate.format('YYYY-MM-DD'))) {
    streakDays += 1
    streakDate = streakDate.subtract(1, 'day')
  }

  return {
    minutes: Math.round(seconds / 60),
    rounds,
    activeDays: periodActiveDates.size,
    streakDays,
    buckets: bucketLabels.map((label, index) => ({
      key: `${period}-${index}`,
      label,
      minutes: Math.round(secondsByBucket[index] / 60),
      rounds: roundsByBucket[index],
    })),
  }
}

export function formatFocusMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours} 小时 ${remaining} 分钟` : `${hours} 小时`
}
