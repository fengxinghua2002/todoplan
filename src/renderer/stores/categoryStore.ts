import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Category, CategoryInput } from '../../shared/types'

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  async function load(): Promise<void> { categories.value = await window.todoApi.getCategories() }
  async function create(input: CategoryInput): Promise<void> { await window.todoApi.createCategory(input); await load() }
  async function update(id: string, input: Partial<CategoryInput>): Promise<void> { await window.todoApi.updateCategory(id, input); await load() }
  async function remove(id: string): Promise<void> { await window.todoApi.deleteCategory(id); await load() }
  async function reorder(ids: string[]): Promise<void> { categories.value = await window.todoApi.reorderCategories(ids) }
  function byId(id?: string): Category | undefined { return categories.value.find((category) => category.id === id) }
  return { categories, load, create, update, remove, reorder, byId }
})
