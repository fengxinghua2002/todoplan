import { createRouter, createWebHashHistory } from 'vue-router'
import TodayView from '../views/TodayView.vue'
import TodoView from '../views/TodoView.vue'
import CompletedView from '../views/CompletedView.vue'
import StatisticsView from '../views/StatisticsView.vue'
import SettingsView from '../views/SettingsView.vue'
import FocusView from '../views/FocusView.vue'
import CalendarView from '../views/CalendarView.vue'
import PrivacyPolicyView from '../views/PrivacyPolicyView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/today' },
    { path: '/today', component: TodayView },
    { path: '/calendar', component: CalendarView },
    { path: '/todo', component: TodoView },
    { path: '/completed', component: CompletedView },
    { path: '/focus', component: FocusView },
    { path: '/statistics/:type(week|month|year)', component: StatisticsView },
    { path: '/settings', component: SettingsView },
    { path: '/privacy', component: PrivacyPolicyView },
  ],
})
