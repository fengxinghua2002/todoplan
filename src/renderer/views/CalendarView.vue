<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import type { Task } from '../../shared/types'
import TaskCollection from '../components/TaskCollection.vue'
import TaskEditor from '../components/TaskEditor.vue'
import { useTaskEditor } from '../composables/useTaskEditor'
import { useCategoryStore } from '../stores/categoryStore'
import { useTaskStore } from '../stores/taskStore'
import { buildCalendarMonth } from '../utils/calendar'

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const taskStore = useTaskStore()
const categoryStore = useCategoryStore()
const editor = useTaskEditor()
const anchorDate = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))

const days = computed(() => buildCalendarMonth(anchorDate.value, taskStore.tasks))
const monthTitle = computed(() => dayjs(anchorDate.value).format('YYYY年 M月'))
const selectedTitle = computed(() => {
  const date = dayjs(selectedDate.value)
  return `${date.format('M月D日')} ${weekdayNames[date.day()]}`
})
const selectedPlannedTasks = computed(() => rootTasks((task) => task.planDate === selectedDate.value))
const selectedCompletedTasks = computed(() => rootTasks(
  (task) => task.status === 'completed' && Boolean(task.completedAt) && dayjs(task.completedAt).format('YYYY-MM-DD') === selectedDate.value,
).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')))
const monthlyPlannedCount = computed(() => days.value
  .filter((day) => day.inCurrentMonth)
  .reduce((total, day) => total + day.plannedCount, 0))
const monthlyCompletedCount = computed(() => days.value
  .filter((day) => day.inCurrentMonth)
  .reduce((total, day) => total + day.completedCount, 0))

onMounted(() => taskStore.load())

function rootTasks(predicate: (task: Task) => boolean): Task[] {
  return taskStore.tasks.filter((task) => !task.parentId && predicate(task)).sort((a, b) => a.sortOrder - b.sortOrder)
}

function moveMonth(offset: number): void {
  anchorDate.value = dayjs(anchorDate.value).add(offset, 'month').startOf('month').format('YYYY-MM-DD')
}

function goToday(): void {
  const today = dayjs()
  anchorDate.value = today.startOf('month').format('YYYY-MM-DD')
  selectedDate.value = today.format('YYYY-MM-DD')
}

function selectDate(date: string, inCurrentMonth: boolean): void {
  selectedDate.value = date
  if (!inCurrentMonth) anchorDate.value = dayjs(date).startOf('month').format('YYYY-MM-DD')
}

function categoryColor(categoryId: string): string {
  return categoryStore.byId(categoryId)?.color ?? '#a8adba'
}
</script>

<template>
  <section class="page calendar-page">
    <header class="page-header">
      <div><p class="eyebrow">安排与回顾</p><h1>日历</h1><p>在一个月里看清计划、完成记录和每天的节奏。</p></div>
      <button class="btn primary" @click="editor.openCreate()">＋ 为选中日期新建任务</button>
    </header>

    <div v-if="taskStore.error" class="error-banner">{{ taskStore.error }}</div>

    <div class="calendar-layout">
      <article class="calendar-card">
        <div class="calendar-toolbar">
          <div class="calendar-nav">
            <button class="icon-btn" title="上个月" @click="moveMonth(-1)">‹</button>
            <h2>{{ monthTitle }}</h2>
            <button class="icon-btn" title="下个月" @click="moveMonth(1)">›</button>
            <button class="btn ghost calendar-today-btn" @click="goToday">今天</button>
          </div>
          <div class="calendar-summary">
            <span><i class="summary-plan" />{{ monthlyPlannedCount }} 项计划</span>
            <span><i class="summary-done" />{{ monthlyCompletedCount }} 项完成</span>
          </div>
        </div>

        <div class="calendar-weekdays">
          <span v-for="weekday in weekdays" :key="weekday">周{{ weekday }}</span>
        </div>
        <div class="calendar-grid">
          <button
            v-for="day in days"
            :key="day.date"
            class="calendar-day"
            :class="{ outside: !day.inCurrentMonth, today: day.isToday, selected: day.date === selectedDate }"
            :aria-label="`${day.date}，${day.plannedCount}项计划，${day.completedCount}项完成`"
            @click="selectDate(day.date, day.inCurrentMonth)"
          >
            <span class="calendar-day-number">{{ day.dayNumber }}</span>
            <span class="calendar-day-counts">
              <small v-if="day.plannedCount" class="calendar-count planned">{{ day.plannedCount }} 计划</small>
              <small v-if="day.completedCount" class="calendar-count completed">{{ day.completedCount }} 完成</small>
            </span>
            <span v-if="day.categoryIds.length" class="calendar-dots">
              <i v-for="categoryId in day.categoryIds" :key="categoryId" class="calendar-dot" :style="{ backgroundColor: categoryColor(categoryId) }" />
            </span>
          </button>
        </div>
      </article>

      <aside class="calendar-detail">
        <div class="calendar-detail-head">
          <div><p class="eyebrow">选中日期</p><h2>{{ selectedTitle }}</h2></div>
          <button class="btn ghost" @click="editor.openCreate()">＋ 新建</button>
        </div>
        <div class="calendar-detail-stats">
          <span><strong>{{ selectedPlannedTasks.length }}</strong>计划任务</span>
          <span><strong>{{ selectedCompletedTasks.length }}</strong>当天完成</span>
        </div>

        <section class="calendar-detail-section">
          <h3>计划任务 <span>{{ selectedPlannedTasks.length }}</span></h3>
          <TaskCollection
            :tasks="selectedPlannedTasks"
            empty-title="这天还没有计划"
            empty-text="点击新建，把任务安排到这一天。"
            @edit="editor.openEdit"
            @add-subtask="(task) => editor.openCreate(task.id)"
          />
        </section>

        <section class="calendar-detail-section">
          <h3>当天完成 <span>{{ selectedCompletedTasks.length }}</span></h3>
          <TaskCollection
            :tasks="selectedCompletedTasks"
            empty-title="这天没有完成记录"
            empty-text="完成任务后，记录会显示在这里。"
            compact
            @edit="editor.openEdit"
            @add-subtask="(task) => editor.openCreate(task.id)"
          />
        </section>
      </aside>
    </div>

    <TaskEditor
      :open="editor.editorOpen.value"
      :task="editor.editingTask.value"
      :parent-id="editor.parentId.value"
      :default-plan-date="selectedDate"
      @close="editor.close"
    />
  </section>
</template>
