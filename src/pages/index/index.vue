<template>
  <view class="container">
    <view class="header">
      <image class="logo" src="/logo.svg" mode="aspectFit" />
      <text class="title">YesLocker</text>
      <text class="subtitle">台球杆柜智能管理系统</text>
    </view>
    
    <view class="welcome-card">
      <text class="welcome-text">欢迎使用YesLocker</text>
      <text class="desc">专业的台球杆柜管理解决方案</text>
    </view>
    
    <view class="quick-actions">
      <view class="action-item" @click="navigateToApply">
        <view class="icon-wrapper">
          <text class="icon">📝</text>
        </view>
        <text class="action-text">申请杆柜</text>
      </view>
      
      <view class="action-item" @click="navigateToLocker">
        <view class="icon-wrapper">
          <text class="icon">🎱</text>
        </view>
        <text class="action-text">存取杆具</text>
      </view>
      
      <view class="action-item" @click="navigateToQRCode">
        <view class="icon-wrapper">
          <text class="icon">📱</text>
        </view>
        <text class="action-text">电子凭证</text>
      </view>
      
      <view class="action-item" @click="navigateToRecords">
        <view class="icon-wrapper">
          <text class="icon">📊</text>
        </view>
        <text class="action-text">使用记录</text>
      </view>
      
      <view class="action-item" @click="navigateToNotifications">
        <view class="icon-wrapper">
          <text class="icon">🔔</text>
          <view v-if="unreadCount > 0" class="notification-badge">
            <text class="badge-text">{{ unreadCount }}</text>
          </view>
        </view>
        <text class="action-text">消息通知</text>
      </view>
    </view>
    
    <view class="notice" v-if="hasNotice">
      <text class="notice-title">系统公告</text>
      <text class="notice-content">{{ noticeContent }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const hasNotice = ref(false)
const noticeContent = ref('')
const unreadCount = ref(2) // Mock unread count

onMounted(() => {
  checkLoginStatus()
  loadNotice()
  loadUnreadCount()
})

const checkLoginStatus = () => {
  if (!authStore.isLoggedIn) {
    uni.navigateTo({
      url: '/pages/auth/login'
    })
  }
}

const loadNotice = () => {
  // TODO: 从后端加载系统公告
  hasNotice.value = true
  noticeContent.value = '系统维护通知：每周二凌晨2:00-4:00进行系统维护'
}

const navigateToApply = () => {
  uni.navigateTo({
    url: '/pages/user/apply'
  })
}

const navigateToLocker = () => {
  uni.navigateTo({
    url: '/pages/locker/action'
  })
}

const navigateToQRCode = () => {
  uni.navigateTo({
    url: '/pages/locker/qrcode'
  })
}

const navigateToRecords = () => {
  uni.navigateTo({
    url: '/pages/user/records'
  })
}

const navigateToNotifications = () => {
  uni.navigateTo({
    url: '/pages/user/notifications'
  })
}

const loadUnreadCount = async () => {
  // Mock loading unread notification count
  // In production, fetch from API
  unreadCount.value = 2
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: var(--background-color);
  min-height: 100vh;
}

.header {
  text-align: center;
  padding: 40rpx 0;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: var(--primary-color);
  display: block;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.welcome-card {
  background: linear-gradient(135deg, var(--primary-color), #2E7D32);
  color: white;
  padding: 40rpx;
  border-radius: 20rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.welcome-text {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.desc {
  font-size: 28rpx;
  opacity: 0.9;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.action-item {
  background: white;
  padding: 40rpx 20rpx;
  border-radius: 16rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.action-item:active {
  transform: scale(0.95);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.1);
}

.icon-wrapper {
  margin-bottom: 20rpx;
  position: relative;
  display: inline-block;
}

.icon {
  font-size: 60rpx;
}

.notification-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background-color: var(--danger-color);
  border-radius: 20rpx;
  padding: 0 12rpx;
  min-width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  font-size: 20rpx;
  color: white;
  font-weight: 500;
}

.action-text {
  font-size: 28rpx;
  color: var(--text-color);
}

.notice {
  background: white;
  padding: 30rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.notice-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--primary-color);
  display: block;
  margin-bottom: 16rpx;
}

.notice-content {
  font-size: 28rpx;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>