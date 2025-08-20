<template>
  <div class="container">
    <div class="header">
      <img class="logo" src="/logo.svg" alt="YesLocker Logo" />
      <h1 class="title">YesLocker</h1>
      <p class="subtitle">台球杆柜智能管理系统</p>
    </div>
    
    <div class="welcome-card">
      <div class="welcome-text">欢迎使用YesLocker</div>
      <div class="desc">专业的台球杆柜管理解决方案</div>
    </div>
    
    <div class="quick-actions">
      <div class="action-item" @click="navigateToApply">
        <div class="icon-wrapper">
          <div class="icon">📝</div>
        </div>
        <div class="action-text">申请杆柜</div>
      </div>
      
      <div class="action-item" @click="navigateToLocker">
        <div class="icon-wrapper">
          <div class="icon">🎱</div>
        </div>
        <div class="action-text">存取杆具</div>
      </div>
      
      <div class="action-item" @click="navigateToQRCode">
        <div class="icon-wrapper">
          <div class="icon">📱</div>
        </div>
        <div class="action-text">电子凭证</div>
      </div>
      
      <div class="action-item" @click="navigateToRecords">
        <div class="icon-wrapper">
          <div class="icon">📊</div>
        </div>
        <div class="action-text">使用记录</div>
      </div>
      
      <div class="action-item" @click="navigateToNotifications">
        <div class="icon-wrapper">
          <div class="icon">🔔</div>
          <div v-if="unreadCount > 0" class="notification-badge">
            <span class="badge-text">{{ unreadCount }}</span>
          </div>
        </div>
        <div class="action-text">消息通知</div>
      </div>
    </div>
    
    <div class="notice" v-if="hasNotice">
      <div class="notice-title">系统公告</div>
      <div class="notice-content">{{ noticeContent }}</div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'
import { lockersApi } from '@/services/api/lockers-vue'

const router = useRouter()
const authStore = useAuthStore()

// State
const hasNotice = ref(false)
const noticeContent = ref('')
const unreadCount = ref(0)
const loading = ref(false)
const userLocker = ref<any>(null)

onMounted(async () => {
  await checkLoginStatus()
  await loadUserLocker()
  loadNotice()
  await loadUnreadCount()
})

/**
 * 检查登录状态，如果未登录则跳转到登录页
 */
const checkLoginStatus = async () => {
  loading.value = true
  try {
    // 先尝试从localStorage恢复登录状态
    await authStore.loadStoredAuth()
    
    if (!authStore.isLoggedIn) {
      router.replace('/auth/login')
      return
    }

    console.log('用户已登录:', authStore.user?.name)
  } catch (error) {
    console.error('检查登录状态失败:', error)
    router.replace('/auth/login')
  } finally {
    loading.value = false
  }
}

/**
 * 加载系统公告
 */
const loadNotice = () => {
  // TODO: 从后端API加载系统公告
  hasNotice.value = true
  noticeContent.value = '系统维护通知：每周二凌晨2:00-4:00进行系统维护，期间可能影响正常使用。'
}

/**
 * 加载用户的杆柜信息
 */
const loadUserLocker = async () => {
  try {
    // Get user's active locker from their application
    const user = authStore.user
    if (!user) return
    
    // Call API to get user's assigned locker
    const lockerData = await lockersApi.getUserLockerAssignment()
    
    if (lockerData) {
      userLocker.value = lockerData
      console.log('用户杆柜信息:', userLocker.value)
    } else {
      // Also check localStorage as fallback
      const storedLocker = localStorage.getItem('user_locker')
      if (storedLocker) {
        userLocker.value = JSON.parse(storedLocker)
      }
    }
  } catch (error) {
    console.error('加载用户杆柜信息失败:', error)
  }
}

/**
 * 加载未读消息数量
 */
const loadUnreadCount = async () => {
  try {
    // TODO: 从后端API加载未读消息数量
    // const count = await notificationsApi.getUnreadCount(authStore.user?.id)
    // unreadCount.value = count
    unreadCount.value = 2 // Mock数据
  } catch (error) {
    console.error('加载未读消息数量失败:', error)
  }
}

// Navigation methods
const navigateToApply = () => {
  router.push('/user/apply')
}

const navigateToLocker = () => {
  // Check if user has an assigned locker
  if (!userLocker.value) {
    // Show message to apply for a locker first
    alert('您还没有分配的杆柜，请先申请杆柜')
    router.push('/user/apply')
    return
  }
  
  // Navigate with proper parameters
  router.push({
    path: '/locker/action',
    query: {
      type: 'store', // Default to store action
      lockerId: userLocker.value.id,
      lockerNumber: userLocker.value.number,
      storeName: userLocker.value.store_name || '未知门店'
    }
  })
}

const navigateToQRCode = () => {
  router.push('/locker/qrcode')
}

const navigateToRecords = () => {
  router.push('/user/records')
}

const navigateToNotifications = () => {
  router.push('/user/notifications')
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  text-align: center;
  padding: 40px 0;
}

.logo {
  width: 60px;
  height: 60px;
  margin-bottom: 20px;
  border-radius: 12px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #1B5E20;
  margin: 0 0 10px 0;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.welcome-card {
  background: linear-gradient(135deg, #1B5E20, #2E7D32);
  color: white;
  padding: 40px;
  border-radius: 16px;
  margin-bottom: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.welcome-text {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  opacity: 0.9;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.action-item {
  background: white;
  padding: 32px 16px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.action-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.action-item:active {
  transform: scale(0.95);
}

.icon-wrapper {
  margin-bottom: 16px;
  position: relative;
  display: inline-block;
}

.icon {
  font-size: 32px;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #f44336;
  border-radius: 12px;
  padding: 0 8px;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  font-size: 10px;
  color: white;
  font-weight: 600;
}

.action-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.notice {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.notice-title {
  font-size: 16px;
  font-weight: bold;
  color: #1B5E20;
  margin-bottom: 12px;
}

.notice-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #1B5E20;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 14px;
  color: #666;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>