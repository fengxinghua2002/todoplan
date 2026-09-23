import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Settings } from '../../shared/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({ weekStartsOn: 1, backupRetentionDays: 14, theme: 'light' })
  async function load(): Promise<void> { settings.value = await window.todoApi.getSettings(); applyTheme() }
  async function update(input: Partial<Settings>): Promise<void> { settings.value = await window.todoApi.updateSettings(input); applyTheme() }
  function applyTheme(): void { document.documentElement.dataset.theme = settings.value.theme }
  return { settings, load, update }
})
