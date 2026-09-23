<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Task } from '../../shared/types'

const props = defineProps<{ task?: Task }>()
const emit = defineEmits<{ close: []; complete: [note?: string] }>()
const note = ref('')
watch(() => props.task, () => { note.value = '' })
</script>

<template>
  <Teleport to="body">
    <div v-if="task" class="modal-backdrop" @mousedown.self="emit('close')">
      <form class="modal completion-modal" @submit.prevent="emit('complete', note || undefined)">
        <div class="success-icon">✓</div><p class="eyebrow">完成任务</p><h2>{{ task.title }}</h2>
        <label class="field"><span>完成备注（可选）</span><textarea v-model="note" autofocus rows="4" placeholder="记录结果、收获或关键细节……" /></label>
        <div class="modal-actions"><button type="button" class="btn ghost" @click="emit('complete')">跳过</button><button class="btn primary">记录完成</button></div>
      </form>
    </div>
  </Teleport>
</template>
