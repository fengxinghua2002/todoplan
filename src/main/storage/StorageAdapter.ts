import type { Category, FocusData, Settings, Task } from '../../shared/types'

export interface StorageAdapter {
  initialize(): Promise<void>
  loadTasks(): Promise<Task[]>
  saveTasks(tasks: Task[]): Promise<void>
  loadCategories(): Promise<Category[]>
  saveCategories(categories: Category[]): Promise<void>
  loadSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
  loadFocusData(): Promise<FocusData>
  saveFocusData(data: FocusData): Promise<void>
  createSnapshot(reason: string): Promise<string>
}
