<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCategoryStore } from './stores/categoryStore'
import { useSettingsStore } from './stores/settingsStore'

const categories = useCategoryStore()
const settings = useSettingsStore()
const route = useRoute()
const hasCustomTitlebar = navigator.userAgent.includes('Windows')

onMounted(async () => { await Promise.all([categories.load(), settings.load()]) })
</script>

<template>
  <div class="app-shell" :class="{ 'has-custom-titlebar': hasCustomTitlebar }">
    <header v-if="hasCustomTitlebar" class="window-titlebar">
      <span class="window-titlebar-mark">✓</span>
      <span>TodoPlan</span>
    </header>
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">T</span><span class="brand-label">TodoPlan</span></div>
      <nav class="nav-list">
        <RouterLink to="/today" title="今天"><span class="nav-icon">☀</span><span class="nav-label">今天</span></RouterLink>
        <RouterLink to="/calendar" title="日历"><span class="nav-icon">▦</span><span class="nav-label">日历</span></RouterLink>
        <RouterLink
          to="/todo"
          title="Todo"
          active-class="nav-route-match"
          :class="{ 'router-link-active': route.path === '/todo' && !route.query.category }"
        ><span class="nav-icon">✓</span><span class="nav-label">Todo</span></RouterLink>
        <RouterLink to="/completed" title="已完成"><span class="nav-icon">◉</span><span class="nav-label">已完成</span></RouterLink>
        <RouterLink to="/focus" title="专注"><span class="nav-icon">◷</span><span class="nav-label">专注</span></RouterLink>
      </nav>
      <div class="nav-section">
        <div class="nav-caption">统计</div>
        <RouterLink to="/statistics/week" title="本周"><span class="nav-icon compact-text">周</span><span class="nav-label">本周</span></RouterLink>
        <RouterLink to="/statistics/month" title="本月"><span class="nav-icon compact-text">月</span><span class="nav-label">本月</span></RouterLink>
        <RouterLink to="/statistics/year" title="今年"><span class="nav-icon compact-text">年</span><span class="nav-label">今年</span></RouterLink>
      </div>
      <div class="nav-section category-nav">
        <div class="nav-caption">分类</div>
        <RouterLink
          v-for="item in categories.categories"
          :key="item.id"
          :title="item.name"
          :to="{ path: '/todo', query: { category: item.id } }"
          active-class="nav-route-match"
          :class="{ 'router-link-active': route.path === '/todo' && route.query.category === item.id }"
        >
          <i :style="{ backgroundColor: item.color }" /><span class="nav-label">{{ item.name }}</span>
        </RouterLink>
      </div>
      <RouterLink class="settings-link" to="/settings" title="设置"><span class="nav-icon">⚙</span><span class="nav-label">设置</span></RouterLink>
    </aside>
    <main class="main-content"><RouterView /></main>
  </div>
</template>
