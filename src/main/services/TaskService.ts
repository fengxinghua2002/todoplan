import { randomUUID } from 'node:crypto'
import type { Task, TaskInput, TaskUpdate } from '../../shared/types'
import type { StorageAdapter } from '../storage/StorageAdapter'

export class TaskService {
  constructor(private readonly storage: StorageAdapter) {}

  async getAll(): Promise<Task[]> {
    return (await this.storage.loadTasks()).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async create(input: TaskInput): Promise<Task> {
    const title = input.title.trim()
    if (!title) throw new Error('任务标题不能为空')
    const tasks = await this.storage.loadTasks()
    if (input.parentId && !tasks.some((task) => task.id === input.parentId)) throw new Error('父任务不存在')
    const now = new Date().toISOString()
    const task: Task = {
      id: randomUUID(), title, status: 'todo', priority: input.priority,
      createdAt: now, updatedAt: now, sortOrder: input.sortOrder ?? tasks.length,
      ...this.optionalFields(input),
    }
    tasks.push(task)
    await this.storage.saveTasks(tasks)
    return task
  }

  async update(id: string, input: TaskUpdate): Promise<Task> {
    const tasks = await this.storage.loadTasks()
    const index = tasks.findIndex((task) => task.id === id)
    if (index < 0) throw new Error('任务不存在')
    if (input.title !== undefined && !input.title.trim()) throw new Error('任务标题不能为空')
    if (input.parentId === id) throw new Error('任务不能成为自己的子任务')
    const { parentId, ...rest } = input
    const cleaned: Partial<Task> = { ...rest }
    if (input.title !== undefined) cleaned.title = input.title.trim()
    if ('parentId' in input) cleaned.parentId = parentId ?? undefined
    if (input.completedAt !== undefined) {
      if (tasks[index].status !== 'completed') throw new Error('只能修改已完成任务的完成时间')
      cleaned.completedAt = this.completionTimestamp(input.completedAt)
    }
    if (input.completionNote !== undefined) {
      if (tasks[index].status !== 'completed') throw new Error('只能修改已完成任务的完成备注')
      cleaned.completionNote = input.completionNote.trim() || undefined
    }
    tasks[index] = { ...tasks[index], ...cleaned, updatedAt: new Date().toISOString() }
    await this.storage.saveTasks(tasks)
    return tasks[index]
  }

  async delete(id: string): Promise<void> {
    const tasks = await this.storage.loadTasks()
    if (!tasks.some((task) => task.id === id)) throw new Error('任务不存在')
    await this.storage.saveTasks(tasks.filter((task) => task.id !== id && task.parentId !== id))
  }

  async complete(id: string, completionNote?: string, completedAt?: string): Promise<Task> {
    const tasks = await this.storage.loadTasks()
    const task = this.requireTask(tasks, id)
    task.status = 'completed'
    task.completedAt = this.completionTimestamp(completedAt ?? new Date().toISOString())
    task.completionNote = completionNote?.trim() || undefined
    task.updatedAt = new Date().toISOString()
    await this.storage.saveTasks(tasks)
    return task
  }

  async uncomplete(id: string): Promise<Task> {
    const tasks = await this.storage.loadTasks()
    const task = this.requireTask(tasks, id)
    task.status = 'todo'
    task.completedAt = undefined
    task.completionNote = undefined
    task.updatedAt = new Date().toISOString()
    await this.storage.saveTasks(tasks)
    return task
  }

  private requireTask(tasks: Task[], id: string): Task {
    const task = tasks.find((item) => item.id === id)
    if (!task) throw new Error('任务不存在')
    return task
  }

  private completionTimestamp(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) throw new Error('请选择有效的完成时间')
    if (date.getTime() > Date.now()) throw new Error('完成时间不能晚于现在')
    return date.toISOString()
  }

  private optionalFields(input: TaskInput): Partial<Task> {
    return {
      description: input.description?.trim() || undefined,
      categoryId: input.categoryId || undefined,
      parentId: input.parentId || undefined,
      planDate: input.planDate || undefined,
      dueDate: input.dueDate || undefined,
    }
  }
}
