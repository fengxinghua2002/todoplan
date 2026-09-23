<script setup lang="ts">
import { computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import TaskCollection from '../components/TaskCollection.vue'
import TaskEditor from '../components/TaskEditor.vue'
import { useTaskStore } from '../stores/taskStore'
import { useTaskEditor } from '../composables/useTaskEditor'

const store = useTaskStore()
const editor = useTaskEditor()
const groups = computed(() => {
  const map = new Map<string, typeof store.tasks>()
  store.completedTasks.filter((task) => !task.parentId).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).forEach((task) => {
    const key = dayjs(task.completedAt).format('YYYY-MM-DD')
    map.set(key, [...(map.get(key) ?? []), task])
  })
  return [...map.entries()]
})
function label(date: string): string { if (dayjs(date).isSame(dayjs(), 'day')) return '今天'; if (dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')) return '昨天'; return dayjs(date).format('M 月 D 日') }
onMounted(store.load)
</script>

<template>
  <section class="page"><header class="page-header"><div><p class="eyebrow">完成记录</p><h1>已完成</h1><p>每一次完成，都值得被认真记录。</p></div><div class="total-badge">累计 {{ store.completedTasks.length }} 项</div></header>
    <div v-if="groups.length" class="history-groups"><section v-for="[date, tasks] in groups" :key="date" class="history-group"><div class="section-title"><h2>{{ label(date) }}</h2><span>{{ tasks.length }} 项</span></div><TaskCollection :tasks="tasks" compact @edit="editor.openEdit" /></section></div>
    <div v-else class="empty-state"><div class="empty-mark">◉</div><h3>还没有完成记录</h3><p>完成第一个任务后，它会出现在这里。</p></div>
    <TaskEditor :open="editor.editorOpen.value" :task="editor.editingTask.value" :parent-id="editor.parentId.value" @close="editor.close" />
  </section>
</template>
