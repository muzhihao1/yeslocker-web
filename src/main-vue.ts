import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App-vue.vue'
import routes from './router/routes'

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 创建Pinia实例
const pinia = createPinia()

// 创建Vue应用实例
const app = createApp(App)

// 安装插件
app.use(router)
app.use(pinia)

// 路由守卫 - 认证检查
router.beforeEach(async (to, from, next) => {
  console.log('Navigate from', from.path, 'to', to.path)
  
  // 导入认证store（动态导入避免循环依赖）
  const { useAuthStore } = await import('@/stores/auth-vue')
  const authStore = useAuthStore()
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    // 如果没有token，重定向到登录页
    if (!authStore.checkAuthStatus()) {
      next('/auth/login')
      return
    }
    
    // 如果有token但没有用户信息，尝试刷新用户信息
    if (!authStore.user) {
      try {
        await authStore.loadStoredAuth()
        if (!authStore.isLoggedIn) {
          next('/auth/login')
          return
        }
      } catch (error) {
        console.error('刷新用户信息失败:', error)
        next('/auth/login')
        return
      }
    }
  }
  
  // 如果已经登录且要访问登录页，重定向到首页
  if (to.path === '/auth/login' && authStore.isLoggedIn) {
    next('/')
    return
  }
  
  next()
})

// 挂载应用
app.mount('#app')