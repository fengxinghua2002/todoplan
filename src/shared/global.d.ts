import type { TodoApi } from './types'

declare global {
  interface Window { todoApi: TodoApi }
}

export {}
