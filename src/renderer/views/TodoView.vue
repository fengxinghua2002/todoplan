<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TaskCollection from '../components/TaskCollection.vue'
import TaskEditor from '../components/TaskEditor.vue'
import { useTaskStore } from '../stores/taskStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useTaskEditor } from '../composables/useTaskEditor'

const store = useTaskStore()
const categories = useCategoryStore()
const editor = useTaskEditor()
const route = useRoute()
const search = ref('')
const category = ref('')
const priority = ref('')
watch(() => route.query.category, (value) => { category.value = typeof value === 'string' ? value : '' }, { immediate: true })
const filtered = computed(() => store.todoTasks.filter((task) => !task.parentId)
  .filter((task) => !search.value || task.title.toLowerCase().includes(search.value.toLowerCase()))
  .filter((task) => !category.value || task.categoryId === category.value)
  .filter((task) => !priority.value || task.priority === priority.value))
onMounted(async () => { await Promise.all([store.load(), categories.load()]) })
</script>

<template>
  <section class="page">
    <header class="page-header"><div><p class="eyebrow">任务清单</p><h1>Todo</h1><p>管理所有尚未完成的计划。</p></div><button class="btn primary" @click="editor.openCreate()">＋ 新建任务</button></header>
    <div class="filter-bar"><input v-model="search" class="search-input" placeholder="搜索任务标题…" /><select v-model="category"><option value="">全部分类</option><option v-for="item in categories.categories" :key="item.id" :value="item.id">{{ item.name }}</option></select><select v-model="priority"><option value="">全部优先级</option><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select><span class="result-count">{{ filtered.length }} 项</span></div>
    <TaskCollection :tasks="filtered" empty-title="没有符合条件的任务" empty-text="调整筛选条件，或者创建一个新任务。" @edit="editor.openEdit" @add-subtask="(task) => editor.openCreate(task.id)" />
    <TaskEditor :open="editor.editorOpen.value" :task="editor.editingTask.value" :parent-id="editor.parentId.value" @close="editor.close" />
  </section>
</template>
