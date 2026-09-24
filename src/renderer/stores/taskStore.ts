import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import type { Task, TaskInput, TaskUpdate } from '../../shared/types'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref('')

  const todayTasks = computed(() => tasks.value.filter((task) => task.planDate === dayjs().format('YYYY-MM-DD')))
  const todoTasks = computed(() => tasks.value.filter((task) => task.status === 'todo'))
  const completedTasks = computed(() => tasks.value.filter((task) => task.status === 'completed' && task.completedAt))

  async function load(): Promise<void> {
    loading.value = true; error.value = ''
    try { tasks.value = await window.todoApi.getTasks() } catch (cause) { error.value = message(cause) } finally { loading.value = false }
  }
  async function create(input: TaskInput): Promise<void> { await window.todoApi.createTask(input); await load() }
  async function update(id: string, input: TaskUpdate): Promise<void> { await window.todoApi.updateTask(id, input); await load() }
  async function remove(id: string): Promise<void> { await window.todoApi.deleteTask(id); await load() }
  async function complete(id: string, note?: string, completedAt?: string): Promise<void> { await window.todoApi.completeTask(id, note, completedAt); await load() }
  async function uncomplete(id: string): Promise<void> { await window.todoApi.uncompleteTask(id); await load() }
  function childrenOf(parentId: string): Task[] { return tasks.value.filter((task) => task.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder) }

  return { tasks, loading, error, todayTasks, todoTasks, completedTasks, load, create, update, remove, complete, uncomplete, childrenOf }
})

function message(cause: unknown): string { return cause instanceof Error ? cause.message : String(cause) }
