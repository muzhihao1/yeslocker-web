<template>
  <view class="app">
    <!-- 全局加载指示器 -->
    <view v-if="globalLoading" class="global-loading">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminStore } from './stores/admin'

const globalLoading = ref(false)
const adminStore = useAdminStore()

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
      uni.reLaunch({
        url: '/pages/login/index'
      })
    }
  } catch (error) {
    console.error('App initialization error:', error)
    uni.showToast({
      title: '初始化失败',
      icon: 'error'
    })
  } finally {
    globalLoading.value = false
  }
}

// 全局错误处理
uni.onError((error: any) => {
  console.error('Global error:', error)
  uni.showToast({
    title: '系统错误',
    icon: 'error'
  })
})
</script>

<style lang="css">
@import "@/styles/common.css";

.app {
  height: 100vh;
  background-color: var(--bg-color)-light;
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

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;

    .loading-spinner {
      width: 60rpx;
      height: 60rpx;
      border: 4rpx solid #e0e0e0;
      border-top: 4rpx solid var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      color: var(--text-secondary);
      font-size: 28rpx;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 全局样式重置 */
page {
  background-color: var(--bg-color)-light;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
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