<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import type { FocusMode } from '../../shared/types'
import { useFocusStore } from '../stores/focusStore'
import { useTaskStore } from '../stores/taskStore'
import { calculateFocusStatistics, formatFocusMinutes, type FocusStatsPeriod } from '../utils/focusStatistics'

const focus = useFocusStore()
const tasks = useTaskStore()
const remainingSeconds = ref(25 * 60)
const selectedTaskId = ref('')
const completing = ref(false)
const currentDate = ref(dayjs().format('YYYY-MM-DD'))
const statsPeriod = ref<FocusStatsPeriod>('week')
let ticker: ReturnType<typeof setInterval> | undefined

const modeLabels: Record<FocusMode, string> = { focus: '专注', shortBreak: '短休息', longBreak: '长休息' }
const modeHints: Record<FocusMode, string> = { focus: '一次只做一件事', shortBreak: '放松眼睛，活动一下', longBreak: '这一组完成了，好好休息' }
const periodLabels: Record<FocusStatsPeriod, string> = { day: '今天', week: '本周', month: '本月', year: '今年' }
const statsPeriods: FocusStatsPeriod[] = ['day', 'week', 'month', 'year']
const todoTasks = computed(() => tasks.todoTasks.filter((task) => !task.parentId))
const totalSeconds = computed(() => {
  const preferences = focus.preferences
  const mode = focus.state?.mode
  if (!preferences || !mode) return 1
  if (mode === 'focus') return preferences.focusMinutes * 60
  if (mode === 'shortBreak') return preferences.shortBreakMinutes * 60
  return preferences.longBreakMinutes * 60
})
const progress = computed(() => Math.min(1, Math.max(0, 1 - remainingSeconds.value / totalSeconds.value)))
const circumference = 2 * Math.PI * 112
const dashOffset = computed(() => circumference * (1 - progress.value))
const clock = computed(() => `${String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')}:${String(remainingSeconds.value % 60).padStart(2, '0')}`)
const focusStats = computed(() => calculateFocusStatistics(focus.sessions, currentDate.value, statsPeriod.value))
const todayStats = computed(() => calculateFocusStatistics(focus.sessions, currentDate.value, 'day'))
const maxBucketMinutes = computed(() => Math.max(1, ...focusStats.value.buckets.map((bucket) => bucket.minutes)))
const recentSessions = computed(() => focus.sessions.filter((session) => session.mode === 'focus').slice(0, 8))
const roundPosition = computed(() => {
  const count = focus.state?.completedFocusRounds ?? 0
  const total = focus.preferences?.roundsBeforeLongBreak ?? 4
  return count % total
})

function syncClock(): void {
  currentDate.value = dayjs().format('YYYY-MM-DD')
  const state = focus.state
  if (!state) return
  if (state.status === 'running' && state.endsAt) {
    remainingSeconds.value = Math.max(0, Math.ceil((new Date(state.endsAt).getTime() - Date.now()) / 1000))
    if (remainingSeconds.value === 0) void finishPeriod()
  } else {
    remainingSeconds.value = state.remainingSeconds
  }
}

async function finishPeriod(): Promise<void> {
  if (completing.value) return
  completing.value = true
  try { await focus.complete(); syncClock() } finally { completing.value = false }
}

async function primaryAction(): Promise<void> {
  if (focus.state?.status === 'running') await focus.pause()
  else if (focus.state?.status === 'paused') await focus.resume()
  else await focus.start(focus.state?.mode === 'focus' ? selectedTaskId.value || undefined : undefined)
  syncClock()
}

async function chooseMode(mode: FocusMode): Promise<void> { await focus.selectMode(mode); syncClock() }
async function choosePreset(minutes: 25 | 40): Promise<void> {
  await focus.updatePreferences({ focusMinutes: minutes })
  if (focus.state?.mode !== 'focus') await focus.selectMode('focus')
  syncClock()
}
async function reset(): Promise<void> { await focus.reset(); syncClock() }
async function skip(): Promise<void> { await focus.skip(); syncClock() }
function taskTitle(taskId?: string): string { return tasks.tasks.find((task) => task.id === taskId)?.title ?? '未绑定任务' }

watch(() => focus.state?.taskId, (value) => { selectedTaskId.value = value ?? '' })
watch(clock, (value) => { document.title = `${value} · ${focus.state ? modeLabels[focus.state.mode] : '专注'} · TodoPlan` })

onMounted(async () => {
  await Promise.all([focus.load(), tasks.load()])
  selectedTaskId.value = focus.state?.taskId ?? ''
  syncClock()
  ticker = setInterval(syncClock, 1000)
})
onBeforeUnmount(() => { if (ticker) clearInterval(ticker); document.title = 'TodoPlan' })
</script>

<template>
  <section class="page focus-page">
    <header class="page-header"><div><p class="eyebrow">番茄生物钟</p><h1>专注</h1><p>专注工作，按节奏休息，让持续投入变得轻松。</p></div></header>

    <div class="focus-periods" role="group" aria-label="专注统计周期">
      <button v-for="period in statsPeriods" :key="period" type="button" :class="{ active: statsPeriod === period }" :aria-pressed="statsPeriod === period" @click="statsPeriod = period">{{ periodLabels[period] }}</button>
    </div>
    <section class="focus-stats" aria-label="专注统计">
      <article><span>{{ periodLabels[statsPeriod] }}专注</span><strong>{{ formatFocusMinutes(focusStats.minutes) }}</strong><small>已完成的专注时长</small></article>
      <article><span>完成轮次</span><strong>{{ focusStats.rounds }} 轮</strong><small>{{ periodLabels[statsPeriod] }}累计</small></article>
      <article><span>专注天数</span><strong>{{ focusStats.activeDays }} 天</strong><small>{{ periodLabels[statsPeriod] }}有专注记录</small></article>
      <article><span>连续专注</span><strong>{{ focusStats.streakDays }} 天</strong><small>{{ focusStats.streakDays ? '保持你的节奏' : '完成一轮，开始积累' }}</small></article>
    </section>

    <div v-if="focus.state && focus.preferences" class="focus-layout">
      <section class="focus-clock-card" :class="`mode-${focus.state.mode}`">
        <div class="focus-modes">
          <button v-for="mode in (['focus', 'shortBreak', 'longBreak'] as FocusMode[])" :key="mode" :class="{ active: focus.state.mode === mode }" :disabled="focus.state.status !== 'idle'" @click="chooseMode(mode)">{{ modeLabels[mode] }}</button>
        </div>
        <div class="focus-ring-wrap">
          <svg class="focus-ring" viewBox="0 0 260 260" aria-hidden="true"><circle class="ring-track" cx="130" cy="130" r="112" /><circle class="ring-progress" cx="130" cy="130" r="112" :style="{ strokeDasharray: circumference, strokeDashoffset: dashOffset }" /></svg>
          <div class="focus-time"><span>{{ modeLabels[focus.state.mode] }}</span><strong>{{ clock }}</strong><small>{{ modeHints[focus.state.mode] }}</small></div>
        </div>

        <div v-if="focus.state.mode === 'focus'" class="focus-presets"><button :class="{ active: focus.preferences.focusMinutes === 25 }" :disabled="focus.state.status !== 'idle'" @click="choosePreset(25)">标准 25 分钟</button><button :class="{ active: focus.preferences.focusMinutes === 40 }" :disabled="focus.state.status !== 'idle'" @click="choosePreset(40)">长专注 40 分钟</button></div>

        <label v-if="focus.state.mode === 'focus'" class="focus-task-select"><span>本轮专注任务</span><select v-model="selectedTaskId" :disabled="focus.state.status !== 'idle'"><option value="">不绑定任务</option><option v-for="task in todoTasks" :key="task.id" :value="task.id">{{ task.title }}</option></select></label>

        <div class="focus-controls"><button class="focus-secondary" :disabled="focus.loading" @click="reset">↺</button><button class="focus-primary" :disabled="focus.loading" @click="primaryAction">{{ focus.state.status === 'running' ? '暂停' : focus.state.status === 'paused' ? '继续' : '开始' }}</button><button class="focus-secondary" :disabled="focus.loading" @click="skip">跳过</button></div>
        <div class="round-dots"><span v-for="index in focus.preferences.roundsBeforeLongBreak" :key="index" :class="{ done: index <= roundPosition }" /><small>{{ roundPosition }} / {{ focus.preferences.roundsBeforeLongBreak }} 轮</small></div>
      </section>

      <aside class="focus-side">
        <section class="focus-panel focus-trend"><div class="section-title"><h2>{{ periodLabels[statsPeriod] }}趋势</h2><span>专注分钟</span></div><div class="focus-trend-chart"><div v-for="bucket in focusStats.buckets" :key="bucket.key" class="focus-trend-day" :title="`${bucket.label}：${bucket.minutes} 分钟，${bucket.rounds} 轮`" :aria-label="`${bucket.label}：${bucket.minutes} 分钟，${bucket.rounds} 轮`"><span>{{ bucket.minutes || '' }}</span><div class="focus-trend-track"><i :style="{ height: `${bucket.minutes ? Math.max(8, bucket.minutes / maxBucketMinutes * 100) : 0}%` }" /></div><small>{{ bucket.label }}</small></div></div></section>
        <section class="focus-panel"><div class="section-title"><h2>节奏设置</h2></div><div class="focus-setting-grid"><label><span>专注</span><input :value="focus.preferences.focusMinutes" type="number" min="1" max="120" :disabled="focus.state.status !== 'idle'" @change="focus.updatePreferences({ focusMinutes: Number(($event.target as HTMLInputElement).value) }).then(syncClock)" /><small>分钟</small></label><label><span>短休息</span><input :value="focus.preferences.shortBreakMinutes" type="number" min="1" max="60" :disabled="focus.state.status !== 'idle'" @change="focus.updatePreferences({ shortBreakMinutes: Number(($event.target as HTMLInputElement).value) }).then(syncClock)" /><small>分钟</small></label><label><span>长休息</span><input :value="focus.preferences.longBreakMinutes" type="number" min="1" max="90" :disabled="focus.state.status !== 'idle'" @change="focus.updatePreferences({ longBreakMinutes: Number(($event.target as HTMLInputElement).value) }).then(syncClock)" /><small>分钟</small></label><label><span>长休息间隔</span><input :value="focus.preferences.roundsBeforeLongBreak" type="number" min="1" max="12" :disabled="focus.state.status !== 'idle'" @change="focus.updatePreferences({ roundsBeforeLongBreak: Number(($event.target as HTMLInputElement).value) })" /><small>轮</small></label></div></section>
        <section class="focus-panel focus-history"><div class="section-title"><h2>最近专注</h2><span>{{ todayStats.rounds }} 轮今天</span></div><div v-if="recentSessions.length" class="focus-session-list"><div v-for="session in recentSessions" :key="session.id"><i>✓</i><div><strong>{{ taskTitle(session.taskId) }}</strong><span>{{ dayjs(session.completedAt).format('M/D HH:mm') }}</span></div><b>{{ Math.round(session.durationSeconds / 60) }} 分钟</b></div></div><div v-else class="focus-empty">完成第一轮专注后，记录会出现在这里。</div></section>
      </aside>
    </div>
  </section>
</template>
