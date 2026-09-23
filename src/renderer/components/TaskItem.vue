<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { Task } from '../../shared/types'
import { useCategoryStore } from '../stores/categoryStore'

const props = withDefaults(defineProps<{ task: Task; children?: Task[]; compact?: boolean }>(), { children: () => [], compact: false })
const emit = defineEmits<{ toggle: [task: Task]; edit: [task: Task]; remove: [task: Task]; addSubtask: [task: Task] }>()
const categories = useCategoryStore()
const category = computed(() => categories.byId(props.task.categoryId))
const priorityLabel = { low: '低', medium: '中', high: '高' }
</script>

<template>
  <div class="task-card" :class="{ completed: task.status === 'completed', compact }">
    <button class="check-btn" :aria-label="task.status === 'completed' ? '取消完成' : '完成任务'" @click="emit('toggle', task)"><span>✓</span></button>
    <div class="task-body">
      <div class="task-title-row"><h3 :title="task.title">{{ task.title }}</h3><span v-if="task.priority === 'high'" class="priority high">高</span></div>
      <p v-if="task.description && !compact" class="task-description">{{ task.description }}</p>
      <div class="task-meta">
        <span v-if="category" class="category-pill"><i :style="{ backgroundColor: category.color }" />{{ category.name }}</span>
        <span v-if="task.dueDate">截止 {{ dayjs(task.dueDate).format('M月D日') }}</span>
        <span v-if="task.completedAt" class="complete-time">{{ dayjs(task.completedAt).format('HH:mm') }} 完成</span>
      </div>
      <p v-if="task.completionNote" class="completion-note">“{{ task.completionNote }}”</p>
      <div v-if="children.length" class="subtask-list">
        <div v-for="child in children" :key="child.id" class="subtask-row">
          <button class="mini-check" :class="{ checked: child.status === 'completed' }" @click="emit('toggle', child)">✓</button>
          <span :class="{ strike: child.status === 'completed' }">{{ child.title }}</span>
          <span class="subtask-spacer" /><button class="text-btn" @click="emit('edit', child)">编辑</button>
        </div>
      </div>
    </div>
    <div class="task-actions"><button v-if="!compact" title="添加子任务" @click="emit('addSubtask', task)">＋</button><button title="编辑" @click="emit('edit', task)">✎</button><button v-if="!compact" title="删除" @click="emit('remove', task)">×</button></div>
  </div>
</template>
