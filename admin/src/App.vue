<template>
  <div id="app">
    <!-- 全局加载指示器 -->
    <div v-if="globalLoading" class="global-loading">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
    </div>
    
    <!-- 路由视图 -->
    <router-view v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from './stores/admin'

const globalLoading = ref(false)
const adminStore = useAdminStore()
const router = useRouter()

// 简单的Toast函数
const showToast = (title: string, type: 'success' | 'error' = 'error') => {
  // 这里可以集成更完善的Toast组件，暂时用alert代替
  if (type === 'error') {
    console.error(title)
  } else {
    console.log(title)
  }
}

onMounted(async () => {
  // 初始化应用
  await initApp()
})

const initApp = async () => {
  globalLoading.value = true
  
  try {
    // 检查管理员登录状态
    await adminStore.checkAuthStatus()
    
    // 如果未登录，跳转到登录页
    if (!adminStore.isAuthenticated) {
      router.replace('/login')
    }
  } catch (error) {
    console.error('App initialization error:', error)
    showToast('初始化失败', 'error')
  } finally {
    globalLoading.value = false
  }
}

// 全局错误处理
window.addEventListener('error', (error) => {
  console.error('Global error:', error)
  showToast('系统错误', 'error')
})
</script>

<style lang="css">
@import "@/styles/common.css";

#app {
  height: 100vh;
  background-color: #f5f5f5;
}

.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: #666666;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 全局样式重置 */
body {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
}

/* 通用工具类 */
.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.text-center {
  text-align: center;
}

.text-primary {
  color: var(--primary-color);
}

.text-success {
  color: var(--success-color);
}

.text-warning {
  color: var(--warning-color);
}

.text-error {
  color: var(--error-color);
}

.bg-white {
  background-color: #ffffff;
}

.border-radius {
  border-radius: var(--border-radius);
}

.shadow {
  box-shadow: var(--box-shadow);
}

.margin-top {
  margin-top: 20rpx;
}

.margin-bottom {
  margin-bottom: 20rpx;
}

.padding {
  padding: 20rpx;
}
</style>