<script setup lang="ts">
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import type { Task, TaskInput } from '../../shared/types'
import { useTaskStore } from '../stores/taskStore'
import { useCategoryStore } from '../stores/categoryStore'

const props = defineProps<{ open: boolean; task?: Task; parentId?: string; defaultPlanDate?: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const taskStore = useTaskStore()
const categoryStore = useCategoryStore()
const form = reactive<TaskInput>({ title: '', description: '', categoryId: '', parentId: undefined, priority: 'medium', planDate: '', dueDate: '' })
let saving = false

watch(() => [props.open, props.task, props.parentId] as const, () => {
  if (!props.open) return
  const task = props.task
  Object.assign(form, task ? {
    title: task.title, description: task.description ?? '', categoryId: task.categoryId ?? '', parentId: task.parentId,
    priority: task.priority, planDate: task.planDate ?? '', dueDate: task.dueDate ?? '', sortOrder: task.sortOrder,
  } : { title: '', description: '', categoryId: '', parentId: props.parentId, priority: 'medium', planDate: props.defaultPlanDate ?? dayjs().format('YYYY-MM-DD'), dueDate: '' })
}, { immediate: true })

async function save(): Promise<void> {
  if (!form.title.trim() || saving) return
  saving = true
  try {
    if (props.task) await taskStore.update(props.task.id, { ...form })
    else await taskStore.create({ ...form })
    emit('saved'); emit('close')
  } finally { saving = false }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @mousedown.self="emit('close')">
      <form class="modal task-editor" @submit.prevent="save">
        <div class="modal-header"><div><p class="eyebrow">{{ task ? '编辑任务' : parentId ? '新建子任务' : '新建任务' }}</p><h2>{{ task ? task.title : '把想做的事记下来' }}</h2></div><button type="button" class="icon-btn" @click="emit('close')">×</button></div>
        <label class="field"><span>任务标题</span><input v-model="form.title" autofocus placeholder="例如：完成项目首页" /></label>
        <label class="field"><span>描述</span><textarea v-model="form.description" rows="3" placeholder="补充背景、目标或验收标准（可选）" /></label>
        <div class="form-grid">
          <label class="field"><span>分类</span><select v-model="form.categoryId"><option value="">未分类</option><option v-for="item in categoryStore.categories" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
          <label class="field"><span>优先级</span><select v-model="form.priority"><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label>
          <label class="field"><span>计划日期</span><input v-model="form.planDate" type="date" /></label>
          <label class="field"><span>截止日期</span><input v-model="form.dueDate" type="date" /></label>
        </div>
        <div class="modal-actions"><button type="button" class="btn ghost" @click="emit('close')">取消</button><button class="btn primary" :disabled="!form.title.trim()">{{ task ? '保存修改' : '创建任务' }}</button></div>
      </form>
    </div>
  </Teleport>
</template>
