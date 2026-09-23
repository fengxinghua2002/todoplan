<script setup lang="ts">
import { computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import TaskCollection from '../components/TaskCollection.vue'
import TaskEditor from '../components/TaskEditor.vue'
import SceneryBanner from '../components/SceneryBanner.vue'
import { useTaskStore } from '../stores/taskStore'
import { useTaskEditor } from '../composables/useTaskEditor'

dayjs.locale('zh-cn')
const store = useTaskStore()
const editor = useTaskEditor()
const roots = computed(() => store.todayTasks.filter((task) => !task.parentId))
const completed = computed(() => roots.value.filter((task) => task.status === 'completed'))
const pending = computed(() => roots.value.filter((task) => task.status === 'todo'))
const rate = computed(() => roots.value.length ? Math.round(completed.value.length / roots.value.length * 100) : 0)
onMounted(store.load)
</script>

<template>
  <section class="page today-page">
    <header class="page-header"><div><p class="eyebrow">{{ dayjs().format('M 月 D 日 · dddd') }}</p><h1>今天</h1><p>把注意力放在今天真正重要的事情上。</p></div><button class="btn primary" @click="editor.openCreate()">＋ 新建任务</button></header>
    <SceneryBanner />
    <div class="summary-grid">
      <article><span>今日任务</span><strong>{{ roots.length }}</strong></article><article><span>已完成</span><strong>{{ completed.length }}</strong></article><article><span>未完成</span><strong>{{ pending.length }}</strong></article>
      <article class="rate-card"><span>完成率</span><strong>{{ rate }}%</strong><div class="progress"><i :style="{ width: `${rate}%` }" /></div></article>
    </div>
    <div v-if="store.error" class="error-banner">{{ store.error }}</div>
    <section class="content-section"><div class="section-title"><h2>待完成</h2><span>{{ pending.length }} 项</span></div><TaskCollection :tasks="pending" empty-title="今天暂时没有待办" empty-text="可以休息一下，或者添加一个新任务。" @edit="editor.openEdit" @add-subtask="(task) => editor.openCreate(task.id)" /></section>
    <section v-if="completed.length" class="content-section"><div class="section-title"><h2>已完成</h2><span>{{ completed.length }} 项</span></div><TaskCollection :tasks="completed" @edit="editor.openEdit" @add-subtask="(task) => editor.openCreate(task.id)" /></section>
    <TaskEditor :open="editor.editorOpen.value" :task="editor.editingTask.value" :parent-id="editor.parentId.value" :default-plan-date="dayjs().format('YYYY-MM-DD')" @close="editor.close" />
  </section>
</template>
