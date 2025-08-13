import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// 导入页面组件
import Dashboard from './pages/dashboard/index.vue'
import Login from './pages/login/index.vue'
import Applications from './pages/applications/index.vue'
import Users from './pages/users/index.vue'
import Lockers from './pages/lockers/index.vue'
import LockerDetail from './pages/lockers/detail.vue'
import Records from './pages/records/index.vue'
import Statistics from './pages/statistics/index.vue'
import Settings from './pages/settings/index.vue'

// 路由配置
const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: Login },
  { path: '/dashboard', component: Dashboard },
  { path: '/applications', component: Applications },
  { path: '/users', component: Users },
  { path: '/lockers', component: Lockers },
  { path: '/lockers/detail', component: LockerDetail },
  { path: '/records', component: Records },
  { path: '/statistics', component: Statistics },
  { path: '/settings', component: Settings },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')