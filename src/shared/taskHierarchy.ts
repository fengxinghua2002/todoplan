import type { Task } from './types'

export interface TaskHierarchyNode {
  task: Task
  children: TaskHierarchyNode[]
  contextOnly: boolean
}

export function createTaskLookup(tasks: Task[]): Map<string, Task> {
  return new Map(tasks.map((task) => [task.id, task]))
}

export function resolveTaskCategoryId(task: Task, lookup: ReadonlyMap<string, Task>): string | undefined {
  let current: Task | undefined = task
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    if (current.categoryId) return current.categoryId
    current = current.parentId ? lookup.get(current.parentId) : undefined
  }
  return undefined
}

export function collectAncestorTasks(completedTasks: Task[], allTasks: Task[]): Task[] {
  const lookup = createTaskLookup(allTasks)
  const completedIds = new Set(completedTasks.map((task) => task.id))
  const ancestors = new Map<string, Task>()
  for (const task of completedTasks) {
    const visited = new Set<string>([task.id])
    let parent = task.parentId ? lookup.get(task.parentId) : undefined
    while (parent && !visited.has(parent.id)) {
      visited.add(parent.id)
      if (!completedIds.has(parent.id)) ancestors.set(parent.id, parent)
      parent = parent.parentId ? lookup.get(parent.parentId) : undefined
    }
  }
  return [...ancestors.values()].sort(compareTasks)
}

export function buildTaskForest(completedTasks: Task[], allTasks: Task[], categoryId?: string): TaskHierarchyNode[] {
  const lookup = createTaskLookup(allTasks)
  const selected = completedTasks.filter((task) => resolveTaskCategoryId(task, lookup) === categoryId)
  const selectedIds = new Set(selected.map((task) => task.id))
  const included = new Map<string, Task>()

  for (const task of selected) {
    included.set(task.id, task)
    const visited = new Set<string>([task.id])
    let parent = task.parentId ? lookup.get(task.parentId) : undefined
    while (parent && !visited.has(parent.id)) {
      visited.add(parent.id)
      included.set(parent.id, parent)
      parent = parent.parentId ? lookup.get(parent.parentId) : undefined
    }
  }

  const nodes = new Map<string, TaskHierarchyNode>()
  for (const task of included.values()) {
    nodes.set(task.id, { task, children: [], contextOnly: !selectedIds.has(task.id) })
  }

  const roots: TaskHierarchyNode[] = []
  for (const node of nodes.values()) {
    const parent = node.task.parentId ? nodes.get(node.task.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  sortNodes(roots)
  return roots
}

function sortNodes(nodes: TaskHierarchyNode[]): void {
  nodes.sort((a, b) => compareTasks(a.task, b.task))
  nodes.forEach((node) => sortNodes(node.children))
}

function compareTasks(a: Task, b: Task): number {
  return a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)
}
