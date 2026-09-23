import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ReportRequest, ReportResult, StatisticsRequest, StatisticsResult } from '../../shared/types'

export const useStatisticsStore = defineStore('statistics', () => {
  const result = ref<StatisticsResult>()
  const loading = ref(false)
  async function load(input: StatisticsRequest): Promise<void> {
    loading.value = true
    try { result.value = await window.todoApi.getStatistics(input) } finally { loading.value = false }
  }
  async function report(input: ReportRequest): Promise<ReportResult> { return window.todoApi.generateReport(input) }
  return { result, loading, load, report }
})
