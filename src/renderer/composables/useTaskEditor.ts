import { ref } from 'vue'
import type { Task } from '../../shared/types'

export function useTaskEditor() {
  const editorOpen = ref(false)
  const editingTask = ref<Task>()
  const parentId = ref<string>()
  function openCreate(parent?: string): void { editingTask.value = undefined; parentId.value = parent; editorOpen.value = true }
  function openEdit(task: Task): void { editingTask.value = task; parentId.value = task.parentId; editorOpen.value = true }
  function close(): void { editorOpen.value = false }
  return { editorOpen, editingTask, parentId, openCreate, openEdit, close }
}
