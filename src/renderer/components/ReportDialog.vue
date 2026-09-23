<script setup lang="ts">
import { ref } from 'vue'
import type { ReportResult } from '../../shared/types'

const props = defineProps<{ report?: ReportResult }>()
const emit = defineEmits<{ close: [] }>()
const copied = ref(false)
async function copy(): Promise<void> { if (!props.report) return; await navigator.clipboard.writeText(props.report.markdown); copied.value = true; setTimeout(() => { copied.value = false }, 1400) }
async function save(): Promise<void> { if (props.report) await window.todoApi.saveReport(props.report) }
</script>

<template>
  <Teleport to="body"><div v-if="report" class="modal-backdrop" @mousedown.self="emit('close')"><div class="modal report-modal">
    <div class="modal-header"><div><p class="eyebrow">Markdown 预览</p><h2>{{ report.title }}</h2></div><button class="icon-btn" @click="emit('close')">×</button></div>
    <pre>{{ report.markdown }}</pre>
    <div class="modal-actions"><button class="btn ghost" @click="copy">{{ copied ? '已复制' : '复制 Markdown' }}</button><button class="btn primary" @click="save">保存为 .md</button></div>
  </div></div></Teleport>
</template>
