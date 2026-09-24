<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'dayjs'
import type { Task } from '../../shared/types'

const props = defineProps<{ task?: Task }>()
const emit = defineEmits<{ close: []; complete: [note: string | undefined, completedAt: string] }>()
const note = ref('')
const completedAtLocal = ref('')
const latestCompletion = ref('')
const error = ref('')

watch(() => props.task, () => {
  note.value = ''
  completedAtLocal.value = dayjs().format('YYYY-MM-DDTHH:mm')
  latestCompletion.value = completedAtLocal.value
  error.value = ''
})

function confirm(skipNote = false): void {
  const date = new Date(completedAtLocal.value)
  if (!completedAtLocal.value || Number.isNaN(date.getTime())) {
    error.value = '请选择有效的完成时间'
    return
  }
  if (date.getTime() > Date.now()) {
    error.value = '完成时间不能晚于现在'
    return
  }
  error.value = ''
  emit('complete', skipNote ? undefined : note.value.trim() || undefined, date.toISOString())
}
</script>

<template>
  <Teleport to="body">
    <div v-if="task" class="modal-backdrop" @mousedown.self="emit('close')">
      <form class="modal completion-modal" @submit.prevent="confirm()">
        <div class="success-icon">✓</div><p class="eyebrow">完成任务</p><h2>{{ task.title }}</h2>
        <label class="field"><span>实际完成时间</span><input v-model="completedAtLocal" type="datetime-local" :max="latestCompletion" required /></label>
        <label class="field"><span>完成备注（可选）</span><textarea v-model="note" autofocus rows="4" placeholder="记录结果、收获或关键细节……" /></label>
        <p v-if="error" class="error-banner">{{ error }}</p>
        <div class="modal-actions"><button type="button" class="btn ghost" @click="confirm(true)">不写备注</button><button class="btn primary">记录完成</button></div>
      </form>
    </div>
  </Teleport>
</template>
