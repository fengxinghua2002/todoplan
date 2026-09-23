<script setup lang="ts">
import dayjs from 'dayjs'
import type { TaskHierarchyNode } from '../../shared/taskHierarchy'

defineProps<{ node: TaskHierarchyNode }>()
</script>

<template>
  <div class="report-task-node">
    <div class="report-task" :class="{ context: node.contextOnly }">
      <span>{{ node.contextOnly ? '↳' : '✓' }}</span>
      <div>
        <strong>{{ node.task.title }}</strong>
        <em v-if="node.contextOnly" class="context-label">父任务</em>
        <p v-if="!node.contextOnly && node.task.completionNote">{{ node.task.completionNote }}</p>
      </div>
      <time v-if="!node.contextOnly && node.task.completedAt">{{ dayjs(node.task.completedAt).format('M/D HH:mm') }}</time>
    </div>
    <div v-if="node.children.length" class="report-task-children">
      <TaskTreeItem v-for="child in node.children" :key="child.task.id" :node="child" />
    </div>
  </div>
</template>
