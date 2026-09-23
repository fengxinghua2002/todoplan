<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import type { ReportResult, ReportType } from '../../shared/types'
import { buildTaskForest } from '../../shared/taskHierarchy'
import ReportDialog from '../components/ReportDialog.vue'
import TaskTreeItem from '../components/TaskTreeItem.vue'
import { useStatisticsStore } from '../stores/statisticsStore'
import { useCategoryStore } from '../stores/categoryStore'

const route = useRoute()
const store = useStatisticsStore()
const categories = useCategoryStore()
const anchor = ref(dayjs())
const report = ref<ReportResult>()
const type = computed(() => route.params.type as ReportType)
const unit = computed(() => type.value === 'week' ? 'week' : type.value === 'month' ? 'month' : 'year')
const periodLabel = computed(() => type.value === 'week' ? '周' : type.value === 'month' ? '月' : '年')
const maxBucket = computed(() => Math.max(1, ...(store.result?.timeBuckets.map((item) => item.count) ?? [1])))
const groupedTasks = computed(() => {
  const result = store.result
  if (!result) return []
  const allTasks = [...result.contextTasks, ...result.tasks]
  return result.categoryCounts.map((count) => ({
    ...count,
    trees: buildTaskForest(result.tasks, allTasks, count.categoryId),
  }))
})

async function load(): Promise<void> { await store.load({ type: type.value, anchorDate: anchor.value.format('YYYY-MM-DD') }) }
function move(amount: number): void { anchor.value = anchor.value.add(amount, unit.value); void load() }
async function createReport(): Promise<void> { if (!store.result) return; report.value = await store.report({ type: type.value, startDate: store.result.startDate, endDate: store.result.endDate }) }
watch(type, () => { anchor.value = dayjs(); void load() }, { immediate: true })
void categories.load()
</script>

<template>
  <section class="page">
    <header class="page-header"><div><p class="eyebrow">数据复盘</p><h1>{{ type === 'week' ? '本周' : type === 'month' ? '本月' : '今年' }}</h1><p>用完成记录，看见持续积累的力量。</p></div><button class="btn primary" :disabled="!store.result" @click="createReport">生成{{ periodLabel }}报</button></header>
    <div class="period-switcher"><button @click="move(-1)">‹ 上一{{ periodLabel }}</button><div><strong>{{ store.result?.title }}</strong><span v-if="store.result">{{ store.result.startDate }} — {{ store.result.endDate }}</span></div><button @click="move(1)">下一{{ periodLabel }} ›</button></div>
    <template v-if="store.result">
      <div class="stat-overview"><article class="stat-total"><span>完成任务</span><strong>{{ store.result.total }}</strong><small>项</small></article><article class="category-stats"><div v-for="item in store.result.categoryCounts" :key="item.categoryId ?? 'none'"><i :style="{ background: item.color }" /><span>{{ item.categoryName }}</span><strong>{{ item.count }}</strong></div><p v-if="!store.result.categoryCounts.length">暂无分类数据</p></article></div>
      <section class="chart-card"><div class="section-title"><h2>{{ type === 'year' ? '每月完成趋势' : type === 'month' ? '每周完成趋势' : '每日完成趋势' }}</h2></div><div class="bar-chart"><div v-for="item in store.result.timeBuckets" :key="item.key" class="bar-column"><span>{{ item.count || '' }}</span><div class="bar-track"><i :style="{ height: `${Math.max(item.count ? 8 : 0, item.count / maxBucket * 100)}%` }" /></div><small>{{ item.label }}</small></div></div></section>
      <section class="content-section"><div class="section-title"><h2>{{ periodLabel }}度完成事项</h2><span>{{ store.result.total }} 项</span></div><div v-if="groupedTasks.length" class="report-groups"><article v-for="group in groupedTasks" :key="group.categoryId ?? 'none'"><h3><i :style="{ background: group.color }" />{{ group.categoryName }}<span>{{ group.count }}</span></h3><TaskTreeItem v-for="node in group.trees" :key="node.task.id" :node="node" /></article></div><div v-else class="empty-state small"><h3>这个周期还没有完成记录</h3><p>完成任务后，统计会自动更新。</p></div></section>
    </template>
    <ReportDialog :report="report" @close="report = undefined" />
  </section>
</template>
