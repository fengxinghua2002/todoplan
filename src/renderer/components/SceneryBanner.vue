<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import type { SceneryImageResult } from '../../shared/types'
import { sceneryItems } from '../utils/scenery'

const storageKey = 'todoplan.scenery'
const today = dayjs().format('YYYY-MM-DD')
const dailyIndex = Math.floor(dayjs().startOf('day').diff(dayjs().startOf('year'), 'day')) % sceneryItems.length
const currentIndex = ref(loadIndex())
const customOffset = ref(0)
const customImage = ref<SceneryImageResult>()
const usingCustom = computed(() => customImage.value?.available && customImage.value.url)
const currentUrl = computed(() => usingCustom.value ? customImage.value!.url! : sceneryItems[currentIndex.value].url)

function loadIndex(): number {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as { date?: string; index?: number }
    if (saved.date === today && Number.isInteger(saved.index) && saved.index! >= 0 && saved.index! < sceneryItems.length) return saved.index!
  } catch {
    // Invalid browser preference falls back to today's deterministic image.
  }
  return dailyIndex
}

async function move(offset: number): Promise<void> {
  if (usingCustom.value) {
    customOffset.value += offset
    await loadCustomImage()
    return
  }
  currentIndex.value = (currentIndex.value + offset + sceneryItems.length) % sceneryItems.length
  localStorage.setItem(storageKey, JSON.stringify({ date: today, index: currentIndex.value }))
}

async function loadCustomImage(): Promise<void> {
  const result = await window.todoApi.getDailyScenery(today, customOffset.value)
  customImage.value = result.available ? result : undefined
}

onMounted(loadCustomImage)
</script>

<template>
  <article class="scenery-banner" :style="{ backgroundImage: `url(${currentUrl})` }">
    <button class="scenery-arrow previous" type="button" aria-label="上一张风景" title="上一张" @click="move(-1)">‹</button>
    <button class="scenery-arrow next" type="button" aria-label="下一张风景" title="下一张" @click="move(1)">›</button>
  </article>
</template>
