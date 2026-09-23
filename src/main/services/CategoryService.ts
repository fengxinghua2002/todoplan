import { randomUUID } from 'node:crypto'
import type { Category, CategoryInput } from '../../shared/types'
import type { StorageAdapter } from '../storage/StorageAdapter'

export class CategoryService {
  constructor(private readonly storage: StorageAdapter) {}

  async getAll(): Promise<Category[]> {
    return (await this.storage.loadCategories()).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async create(input: CategoryInput): Promise<Category> {
    const categories = await this.storage.loadCategories()
    const name = input.name.trim()
    if (!name) throw new Error('分类名称不能为空')
    if (categories.some((category) => category.name === name)) throw new Error('分类名称已存在')
    const now = new Date().toISOString()
    const category: Category = { id: randomUUID(), name, color: input.color, sortOrder: input.sortOrder ?? categories.length, createdAt: now, updatedAt: now }
    categories.push(category)
    await this.storage.saveCategories(categories)
    return category
  }

  async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
    const categories = await this.storage.loadCategories()
    const index = categories.findIndex((category) => category.id === id)
    if (index < 0) throw new Error('分类不存在')
    const name = input.name?.trim()
    if (input.name !== undefined && !name) throw new Error('分类名称不能为空')
    if (name && categories.some((category) => category.id !== id && category.name === name)) throw new Error('分类名称已存在')
    categories[index] = { ...categories[index], ...input, ...(name ? { name } : {}), updatedAt: new Date().toISOString() }
    await this.storage.saveCategories(categories)
    return categories[index]
  }

  async delete(id: string): Promise<void> {
    const categories = await this.storage.loadCategories()
    if (!categories.some((category) => category.id === id)) throw new Error('分类不存在')
    const tasks = await this.storage.loadTasks()
    await this.storage.saveCategories(categories.filter((category) => category.id !== id))
    await this.storage.saveTasks(tasks.map((task) => task.categoryId === id ? { ...task, categoryId: undefined, updatedAt: new Date().toISOString() } : task))
  }

  async reorder(ids: string[]): Promise<Category[]> {
    const categories = await this.storage.loadCategories()
    const order = new Map(ids.map((id, index) => [id, index]))
    const updated = categories.map((category) => ({ ...category, sortOrder: order.get(category.id) ?? category.sortOrder, updatedAt: new Date().toISOString() }))
    await this.storage.saveCategories(updated)
    return updated.sort((a, b) => a.sortOrder - b.sortOrder)
  }
}
