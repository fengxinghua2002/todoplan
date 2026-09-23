import { randomUUID } from 'node:crypto'
import type { FocusData, FocusMode, FocusPreferences, FocusPreferencesUpdate, FocusStartRequest } from '../../shared/types'
import type { StorageAdapter } from '../storage/StorageAdapter'

export class FocusService {
  constructor(private readonly storage: StorageAdapter) {}

  async get(): Promise<FocusData> {
    const data = await this.storage.loadFocusData()
    return this.normalize(data)
  }

  async start(input: FocusStartRequest): Promise<FocusData> {
    const data = await this.get()
    if (data.state.status === 'running') return data
    const now = new Date()
    const remaining = data.state.status === 'paused'
      ? data.state.remainingSeconds
      : this.durationFor(data.state.mode, data.preferences)
    data.state = {
      ...data.state,
      status: 'running',
      taskId: input.taskId || data.state.taskId || undefined,
      startedAt: data.state.startedAt ?? now.toISOString(),
      endsAt: new Date(now.getTime() + remaining * 1000).toISOString(),
      remainingSeconds: remaining,
    }
    return this.save(data)
  }

  async pause(): Promise<FocusData> {
    const data = await this.get()
    if (data.state.status !== 'running' || !data.state.endsAt) return data
    data.state.status = 'paused'
    data.state.remainingSeconds = Math.max(0, Math.ceil((new Date(data.state.endsAt).getTime() - Date.now()) / 1000))
    data.state.endsAt = undefined
    return this.save(data)
  }

  async resume(): Promise<FocusData> {
    const data = await this.get()
    if (data.state.status !== 'paused') return data
    data.state.status = 'running'
    data.state.endsAt = new Date(Date.now() + data.state.remainingSeconds * 1000).toISOString()
    return this.save(data)
  }

  async reset(): Promise<FocusData> {
    const data = await this.get()
    data.state = {
      mode: data.state.mode,
      status: 'idle',
      taskId: data.state.taskId,
      remainingSeconds: this.durationFor(data.state.mode, data.preferences),
      completedFocusRounds: data.state.completedFocusRounds,
    }
    return this.save(data)
  }

  async skip(): Promise<FocusData> {
    const data = await this.get()
    this.moveToNextPeriod(data, false)
    return this.save(data)
  }

  async complete(): Promise<FocusData> {
    const data = await this.get()
    if (!data.state.startedAt) return data
    const completedAt = new Date().toISOString()
    data.sessions.unshift({
      id: randomUUID(),
      mode: data.state.mode,
      taskId: data.state.taskId,
      startedAt: data.state.startedAt,
      completedAt,
      durationSeconds: this.durationFor(data.state.mode, data.preferences),
    })
    data.sessions = data.sessions.slice(0, 10000)
    this.moveToNextPeriod(data, true)
    return this.save(data)
  }

  async selectMode(mode: FocusMode): Promise<FocusData> {
    const data = await this.get()
    data.state = {
      mode,
      status: 'idle',
      taskId: data.state.taskId,
      remainingSeconds: this.durationFor(mode, data.preferences),
      completedFocusRounds: data.state.completedFocusRounds,
    }
    return this.save(data)
  }

  async updatePreferences(input: FocusPreferencesUpdate): Promise<FocusData> {
    const data = await this.get()
    const preferences: FocusPreferences = {
      focusMinutes: this.clamp(input.focusMinutes ?? data.preferences.focusMinutes, 1, 120),
      shortBreakMinutes: this.clamp(input.shortBreakMinutes ?? data.preferences.shortBreakMinutes, 1, 60),
      longBreakMinutes: this.clamp(input.longBreakMinutes ?? data.preferences.longBreakMinutes, 1, 90),
      roundsBeforeLongBreak: this.clamp(input.roundsBeforeLongBreak ?? data.preferences.roundsBeforeLongBreak, 1, 12),
    }
    data.preferences = preferences
    if (data.state.status === 'idle') data.state.remainingSeconds = this.durationFor(data.state.mode, preferences)
    return this.save(data)
  }

  private moveToNextPeriod(data: FocusData, completed: boolean): void {
    let rounds = data.state.completedFocusRounds
    let nextMode: FocusMode
    if (data.state.mode === 'focus') {
      if (completed) rounds += 1
      nextMode = completed && rounds % data.preferences.roundsBeforeLongBreak === 0 ? 'longBreak' : 'shortBreak'
    } else {
      nextMode = 'focus'
    }
    data.state = {
      mode: nextMode,
      status: 'idle',
      taskId: nextMode === 'focus' ? data.state.taskId : undefined,
      remainingSeconds: this.durationFor(nextMode, data.preferences),
      completedFocusRounds: rounds,
    }
  }

  private normalize(data: FocusData): FocusData {
    const preferences: FocusPreferences = {
      focusMinutes: this.clamp(data.preferences?.focusMinutes ?? 25, 1, 120),
      shortBreakMinutes: this.clamp(data.preferences?.shortBreakMinutes ?? 5, 1, 60),
      longBreakMinutes: this.clamp(data.preferences?.longBreakMinutes ?? 15, 1, 90),
      roundsBeforeLongBreak: this.clamp(data.preferences?.roundsBeforeLongBreak ?? 4, 1, 12),
    }
    return {
      preferences,
      state: {
        mode: data.state?.mode ?? 'focus',
        status: data.state?.status ?? 'idle',
        taskId: data.state?.taskId,
        startedAt: data.state?.startedAt,
        endsAt: data.state?.endsAt,
        remainingSeconds: Math.max(0, data.state?.remainingSeconds ?? preferences.focusMinutes * 60),
        completedFocusRounds: Math.max(0, data.state?.completedFocusRounds ?? 0),
      },
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
    }
  }

  private durationFor(mode: FocusMode, preferences: FocusPreferences): number {
    if (mode === 'focus') return preferences.focusMinutes * 60
    if (mode === 'shortBreak') return preferences.shortBreakMinutes * 60
    return preferences.longBreakMinutes * 60
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min
    return Math.round(Math.min(max, Math.max(min, value)))
  }

  private async save(data: FocusData): Promise<FocusData> {
    await this.storage.saveFocusData(data)
    return data
  }
}
