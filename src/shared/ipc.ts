export const IPC_CHANNELS = {
  tasks: {
    getAll: 'tasks:get-all', create: 'tasks:create', update: 'tasks:update',
    delete: 'tasks:delete', complete: 'tasks:complete', uncomplete: 'tasks:uncomplete',
  },
  categories: {
    getAll: 'categories:get-all', create: 'categories:create', update: 'categories:update',
    delete: 'categories:delete', reorder: 'categories:reorder',
  },
  statistics: { get: 'statistics:get' },
  reports: { generate: 'reports:generate', save: 'reports:save' },
  settings: { get: 'settings:get', update: 'settings:update' },
  scenery: { selectDirectory: 'scenery:select-directory', getDaily: 'scenery:get-daily' },
  data: { exportArchive: 'data:export-archive', importArchive: 'data:import-archive', cleanup: 'data:cleanup-completed' },
  focus: {
    get: 'focus:get', start: 'focus:start', pause: 'focus:pause', resume: 'focus:resume',
    reset: 'focus:reset', skip: 'focus:skip', complete: 'focus:complete',
    selectMode: 'focus:select-mode', updatePreferences: 'focus:update-preferences',
  },
} as const
