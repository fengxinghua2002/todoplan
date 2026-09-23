import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { FocusData, FocusMode, FocusPreferencesUpdate } from '../../shared/types'

export const useFocusStore = defineStore('focus', () => {
  const data = ref<FocusData>()
  const loading = ref(false)
  const state = computed(() => data.value?.state)
  const preferences = computed(() => data.value?.preferences)
  const sessions = computed(() => data.value?.sessions ?? [])

  async function run(action: () => Promise<FocusData>): Promise<void> {
    loading.value = true
    try { data.value = await action() } finally { loading.value = false }
  }

  async function load(): Promise<void> { await run(() => window.todoApi.getFocusData()) }
  async function start(taskId?: string): Promise<void> { await run(() => window.todoApi.startFocusTimer({ taskId })) }
  async function pause(): Promise<void> { await run(() => window.todoApi.pauseFocusTimer()) }
  async function resume(): Promise<void> { await run(() => window.todoApi.resumeFocusTimer()) }
  async function reset(): Promise<void> { await run(() => window.todoApi.resetFocusTimer()) }
  async function skip(): Promise<void> { await run(() => window.todoApi.skipFocusPeriod()) }
  async function complete(): Promise<void> { await run(() => window.todoApi.completeFocusPeriod()) }
  async function selectMode(mode: FocusMode): Promise<void> { await run(() => window.todoApi.selectFocusMode(mode)) }
  async function updatePreferences(input: FocusPreferencesUpdate): Promise<void> { await run(() => window.todoApi.updateFocusPreferences(input)) }

  return { data, loading, state, preferences, sessions, load, start, pause, resume, reset, skip, complete, selectMode, updatePreferences }
})
