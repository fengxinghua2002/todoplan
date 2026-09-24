<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CleanupAge } from '../../shared/types'
import { useCategoryStore } from '../stores/categoryStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'

const categories = useCategoryStore()
const settings = useSettingsStore()
const tasks = useTaskStore()
const name = ref('')
const color = ref('#007aff')
const cleanupAge = ref<CleanupAge>(90)
const busy = ref(false)
const notice = ref<{ type: 'success' | 'error'; text: string }>()
const cleanupLabel = computed(() => cleanupAge.value === 'all' ? '全部已完成记录' : `${cleanupAge.value} 天以前的已完成记录`)
async function add(): Promise<void> { if (!name.value.trim()) return; await categories.create({ name: name.value, color: color.value }); name.value = '' }
async function rename(id: string, current: string): Promise<void> { const value = window.prompt('新的分类名称', current)?.trim(); if (value && value !== current) await categories.update(id, { name: value }) }
async function remove(id: string, current: string): Promise<void> { if (window.confirm(`删除分类“${current}”？相关任务会变为未分类。`)) await categories.remove(id) }

async function chooseSceneryDirectory(): Promise<void> {
  await run(async () => {
    const result = await window.todoApi.selectSceneryDirectory()
    if (result.canceled || !result.directory) return
    if (!result.imageCount) {
      notice.value = { type: 'error', text: '所选目录中没有可用图片，请选择包含 JPG、PNG、WebP 或 BMP 图片的目录。' }
      return
    }
    await settings.update({ sceneryDirectory: result.directory })
    notice.value = { type: 'success', text: `已启用自定义风景，共发现 ${result.imageCount} 张图片。` }
  })
}

async function clearSceneryDirectory(): Promise<void> {
  await run(async () => {
    await settings.update({ sceneryDirectory: undefined })
    notice.value = { type: 'success', text: '已恢复使用 TodoPlan 内置风景。' }
  })
}

async function exportData(): Promise<void> {
  await run(async () => {
    const result = await window.todoApi.exportDataArchive()
    if (!result.canceled) notice.value = { type: 'success', text: `数据压缩包已保存到：${result.filePath}` }
  })
}

async function importData(): Promise<void> {
  if (!window.confirm('导入会替换当前的任务、分类和设置。系统会先自动创建快照，确定继续吗？')) return
  await run(async () => {
    const result = await window.todoApi.importDataArchive()
    if (!result.canceled) {
      await Promise.all([tasks.load(), categories.load(), settings.load()])
      notice.value = { type: 'success', text: `导入完成：${result.taskCount} 项任务，${result.categoryCount} 个分类。` }
    }
  })
}

async function cleanup(): Promise<void> {
  if (!window.confirm(`确定清理${cleanupLabel.value}吗？清理前会自动创建快照，此操作不会删除待办任务。`)) return
  await run(async () => {
    const result = await window.todoApi.cleanupCompletedTasks({ age: cleanupAge.value })
    await tasks.load()
    notice.value = result.deletedCount
      ? { type: 'success', text: `已清理 ${result.deletedCount} 条完成记录，并创建了清理前快照。` }
      : { type: 'success', text: '没有符合当前条件的完成记录。' }
  })
}

async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  notice.value = undefined
  try { await action() } catch (cause) {
    notice.value = { type: 'error', text: cause instanceof Error ? cause.message : String(cause) }
  } finally { busy.value = false }
}
</script>

<template>
  <section class="page narrow"><header class="page-header"><div><p class="eyebrow">偏好与数据</p><h1>设置</h1><p>管理分类和本地数据策略。</p></div></header>
    <div v-if="notice" class="data-notice" :class="notice.type">{{ notice.text }}</div>
    <section class="settings-card"><div class="section-title"><div><h2>分类管理</h2><p>分类不是固定的，可以随时调整。</p></div></div><div class="category-editor"><div v-for="item in categories.categories" :key="item.id" class="category-row"><input type="color" :value="item.color" @input="categories.update(item.id, { color: ($event.target as HTMLInputElement).value })" /><strong>{{ item.name }}</strong><span /><button class="text-btn" @click="rename(item.id, item.name)">重命名</button><button class="text-btn danger" @click="remove(item.id, item.name)">删除</button></div><form class="add-category" @submit.prevent="add"><input v-model="color" type="color" /><input v-model="name" placeholder="新分类名称" /><button class="btn primary">添加分类</button></form></div></section>
    <section class="settings-card"><div class="section-title"><div><h2>数据迁移</h2><p>将任务、分类和设置压缩为一个 ZIP 文件，可在另一台电脑导入。</p></div></div><div class="data-tool-row"><div><strong>导出数据压缩包</strong><p>只包含本地 JSON 数据，不包含程序文件。</p></div><button class="btn ghost" :disabled="busy" @click="exportData">导出 ZIP</button></div><div class="data-tool-row"><div><strong>从压缩包恢复</strong><p>导入前会自动备份当前数据，导入成功后立即刷新。</p></div><button class="btn ghost" :disabled="busy" @click="importData">导入 ZIP</button></div></section>
    <section class="settings-card"><div class="section-title"><div><h2>首页风景</h2><p>从本地图片目录中每天自动更换一张背景。</p></div></div><div class="data-tool-row scenery-directory-row"><div><strong>自定义图片目录</strong><p class="directory-path">{{ settings.settings.sceneryDirectory || '当前使用 TodoPlan 内置风景' }}</p></div><div class="setting-actions"><button v-if="settings.settings.sceneryDirectory" class="btn ghost" :disabled="busy" @click="clearSceneryDirectory">恢复内置</button><button class="btn ghost" :disabled="busy" @click="chooseSceneryDirectory">选择目录</button></div></div></section>
    <section class="settings-card danger-zone"><div class="section-title"><div><h2>清理完成记录</h2><p>仅清理已完成任务；待办任务和分类不会删除。</p></div></div><div class="cleanup-controls"><select v-model="cleanupAge"><option :value="30">30 天以前</option><option :value="90">90 天以前</option><option :value="365">365 天以前</option><option value="all">全部已完成</option></select><button class="btn danger-btn" :disabled="busy" @click="cleanup">清理记录</button></div></section>
    <section class="settings-card"><div class="section-title"><div><h2>数据与外观</h2><p>任务、完成记录与专注数据默认仅保存在当前设备。</p></div></div><label class="setting-row"><div><strong>备份保留天数</strong><p>每天第一次修改时创建备份，范围 7–30 天。</p></div><input :value="settings.settings.backupRetentionDays" type="number" min="7" max="30" @change="settings.update({ backupRetentionDays: Number(($event.target as HTMLInputElement).value) })" /></label><label class="setting-row"><div><strong>界面主题</strong><p>跟随系统主题或指定亮色、暗色。</p></div><select :value="settings.settings.theme" @change="settings.update({ theme: ($event.target as HTMLSelectElement).value as 'light' | 'dark' | 'system' })"><option value="light">亮色</option><option value="dark">暗色</option><option value="system">跟随系统</option></select></label></section>
    <footer class="privacy-note">所有记录只保存在这台电脑。<RouterLink to="/privacy">《TodoPlan 隐私政策》</RouterLink></footer>
  </section>
</template>
