<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '../../shared/types'
import TaskItem from './TaskItem.vue'
import CompletionDialog from './CompletionDialog.vue'
import { useTaskStore } from '../stores/taskStore'

defineProps<{ tasks: Task[]; emptyTitle?: string; emptyText?: string; compact?: boolean }>()
const emit = defineEmits<{ edit: [task: Task]; addSubtask: [task: Task] }>()
const store = useTaskStore()
const completing = ref<Task>()

function toggle(task: Task): void { if (task.status === 'completed') void store.uncomplete(task.id); else completing.value = task }
async function complete(note?: string): Promise<void> { if (!completing.value) return; await store.complete(completing.value.id, note); completing.value = undefined }
async function remove(task: Task): Promise<void> { if (window.confirm(`确定删除“${task.title}”吗？其直接子任务也会被删除。`)) await store.remove(task.id) }
</script>

<template>
  <div v-if="tasks.length" class="task-collection">
    <TaskItem v-for="task in tasks" :key="task.id" :task="task" :children="store.childrenOf(task.id)" :compact="compact" @toggle="toggle" @edit="emit('edit', $event)" @remove="remove" @add-subtask="emit('addSubtask', $event)" />
  </div>
  <div v-else class="empty-state"><div class="empty-mark">✓</div><h3>{{ emptyTitle ?? '这里很清爽' }}</h3><p>{{ emptyText ?? '暂时没有任务。' }}</p></div>
  <CompletionDialog :task="completing" @close="completing = undefined" @complete="complete" />
</template>
