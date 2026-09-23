export type TaskStatus = 'todo' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ReportType = 'week' | 'month' | 'year'
export type FocusMode = 'focus' | 'shortBreak' | 'longBreak'
export type FocusTimerStatus = 'idle' | 'running' | 'paused'

export interface Task {
  id: string
  title: string
  description?: string
  categoryId?: string
  parentId?: string
  status: TaskStatus
  priority: TaskPriority
  planDate?: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  completionNote?: string
  sortOrder: number
}

export interface TaskInput {
  title: string
  description?: string
  categoryId?: string
  parentId?: string
  priority: TaskPriority
  planDate?: string
  dueDate?: string
  sortOrder?: number
}

export type TaskUpdate = Partial<Omit<TaskInput, 'parentId'>> & { parentId?: string | null }

export interface Category {
  id: string
  name: string
  color: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CategoryInput {
  name: string
  color: string
  sortOrder?: number
}

export interface Settings {
  weekStartsOn: 1
  backupRetentionDays: number
  theme: 'light' | 'dark' | 'system'
  sceneryDirectory?: string
}

export interface SceneryImageResult {
  available: boolean
  url?: string
  name?: string
  index?: number
  total?: number
}

export interface SelectSceneryDirectoryResult {
  canceled: boolean
  directory?: string
  imageCount?: number
}

export interface FocusPreferences {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  roundsBeforeLongBreak: number
}

export interface FocusTimerState {
  mode: FocusMode
  status: FocusTimerStatus
  taskId?: string
  startedAt?: string
  endsAt?: string
  remainingSeconds: number
  completedFocusRounds: number
}

export interface FocusSession {
  id: string
  mode: FocusMode
  taskId?: string
  startedAt: string
  completedAt: string
  durationSeconds: number
}

export interface FocusData {
  preferences: FocusPreferences
  state: FocusTimerState
  sessions: FocusSession[]
}

export interface FocusStartRequest { taskId?: string }
export type FocusPreferencesUpdate = Partial<FocusPreferences>

export interface CategoryCount {
  categoryId?: string
  categoryName: string
  color: string
  count: number
}

export interface TimeBucket {
  key: string
  label: string
  count: number
}

export interface StatisticsResult {
  type: ReportType
  startDate: string
  endDate: string
  title: string
  total: number
  categoryCounts: CategoryCount[]
  timeBuckets: TimeBucket[]
  tasks: Task[]
  contextTasks: Task[]
}

export interface StatisticsRequest {
  type: ReportType
  anchorDate: string
}

export interface ReportRequest {
  type: ReportType
  startDate: string
  endDate: string
}

export interface ReportResult {
  title: string
  markdown: string
  suggestedFileName: string
}

export interface SaveReportRequest extends ReportResult {}

export interface SaveReportResult {
  canceled: boolean
  filePath?: string
}

export type CleanupAge = 30 | 90 | 365 | 'all'

export interface CleanupCompletedRequest {
  age: CleanupAge
}

export interface CleanupCompletedResult {
  deletedCount: number
  remainingCount: number
  snapshotCreated: boolean
}

export interface ExportDataResult {
  canceled: boolean
  filePath?: string
}

export interface ImportDataResult {
  canceled: boolean
  taskCount?: number
  categoryCount?: number
}

export interface TodoApi {
  getTasks(): Promise<Task[]>
  createTask(input: TaskInput): Promise<Task>
  updateTask(id: string, input: TaskUpdate): Promise<Task>
  deleteTask(id: string): Promise<void>
  completeTask(id: string, completionNote?: string): Promise<Task>
  uncompleteTask(id: string): Promise<Task>
  getCategories(): Promise<Category[]>
  createCategory(input: CategoryInput): Promise<Category>
  updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category>
  deleteCategory(id: string): Promise<void>
  reorderCategories(ids: string[]): Promise<Category[]>
  getStatistics(input: StatisticsRequest): Promise<StatisticsResult>
  generateReport(input: ReportRequest): Promise<ReportResult>
  saveReport(input: SaveReportRequest): Promise<SaveReportResult>
  getSettings(): Promise<Settings>
  updateSettings(input: Partial<Settings>): Promise<Settings>
  selectSceneryDirectory(): Promise<SelectSceneryDirectoryResult>
  getDailyScenery(date: string, offset?: number): Promise<SceneryImageResult>
  exportDataArchive(): Promise<ExportDataResult>
  importDataArchive(): Promise<ImportDataResult>
  cleanupCompletedTasks(input: CleanupCompletedRequest): Promise<CleanupCompletedResult>
  getFocusData(): Promise<FocusData>
  startFocusTimer(input: FocusStartRequest): Promise<FocusData>
  pauseFocusTimer(): Promise<FocusData>
  resumeFocusTimer(): Promise<FocusData>
  resetFocusTimer(): Promise<FocusData>
  skipFocusPeriod(): Promise<FocusData>
  completeFocusPeriod(): Promise<FocusData>
  selectFocusMode(mode: FocusMode): Promise<FocusData>
  updateFocusPreferences(input: FocusPreferencesUpdate): Promise<FocusData>
}
