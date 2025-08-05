<template>
  <view class="dashboard">
    <!-- 顶部欢迎区域 -->
    <view class="welcome-header">
      <view class="welcome-content">
        <view class="welcome-text">
          <text class="greeting">您好，{{ adminStore.adminInfo?.name }}</text>
          <text class="role-badge" :class="adminStore.isSuperAdmin ? 'super' : 'store'">
            {{ adminStore.isSuperAdmin ? '超级管理员' : '门店管理员' }}
          </text>
        </view>
        <view v-if="adminStore.adminInfo?.store" class="store-info">
          <text>{{ adminStore.adminInfo.store.name }}</text>
        </view>
      </view>
      <view class="logout-btn" @tap="handleLogout">
        <text>退出登录</text>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-grid">
      <view class="stats-card" @tap="navigateTo('/pages/applications/index')">
        <view class="stats-icon pending">📋</view>
        <view class="stats-content">
          <view class="stats-number">{{ dashboardData.pendingApplications }}</view>
          <view class="stats-label">待审核申请</view>
        </view>
        <view class="stats-arrow">›</view>
      </view>

      <view class="stats-card" @tap="navigateTo('/pages/lockers/index')">
        <view class="stats-icon occupied">🔒</view>
        <view class="stats-content">
          <view class="stats-number">{{ dashboardData.occupiedLockers }}</view>
          <view class="stats-label">已占用杆柜</view>
        </view>
        <view class="stats-arrow">›</view>
      </view>

      <view class="stats-card" @tap="navigateTo('/pages/users/index')">
        <view class="stats-icon users">👥</view>
        <view class="stats-content">
          <view class="stats-number">{{ dashboardData.activeUsers }}</view>
          <view class="stats-label">活跃用户</view>
        </view>
        <view class="stats-arrow">›</view>
      </view>

      <view class="stats-card" @tap="navigateTo('/pages/records/index')">
        <view class="stats-icon records">📈</view>
        <view class="stats-content">
          <view class="stats-number">{{ dashboardData.todayRecords }}</view>
          <view class="stats-label">今日操作</view>
        </view>
        <view class="stats-arrow">›</view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="section-title">快捷操作</view>
      <view class="actions-grid">
        <view class="action-item" @tap="navigateTo('/pages/applications/index')">
          <view class="action-icon">✅</view>
          <text class="action-text">审核申请</text>
        </view>
        <view class="action-item" @tap="navigateTo('/pages/lockers/index')">
          <view class="action-icon">🔧</view>
          <text class="action-text">管理杆柜</text>
        </view>
        <view class="action-item" @tap="navigateTo('/pages/reminders/index')">
          <view class="action-icon">📢</view>
          <text class="action-text">发送提醒</text>
        </view>
        <view class="action-item" @tap="navigateTo('/pages/statistics/index')">
          <view class="action-icon">📊</view>
          <text class="action-text">查看统计</text>
        </view>
      </view>
    </view>

    <!-- 最近活动 -->
    <view class="recent-activities">
      <view class="section-title">最近活动</view>
      <view v-if="isLoading" class="loading-placeholder">
        <text>加载中...</text>
      </view>
      <view v-else-if="recentActivities.length === 0" class="empty-placeholder">
        <text>暂无最近活动</text>
      </view>
      <view v-else class="activity-list">
        <view
          v-for="activity in recentActivities"
          :key="activity.id"
          class="activity-item"
        >
          <view class="activity-icon" :class="activity.type">
            {{ getActivityIcon(activity.type) }}
          </view>
          <view class="activity-content">
            <view class="activity-text">{{ activity.description }}</view>
            <view class="activity-time">{{ formatTime(activity.created_at) }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 系统状态 -->
    <view class="system-status">
      <view class="section-title">系统状态</view>
      <view class="status-list">
        <view class="status-item">
          <view class="status-dot online"></view>
          <text class="status-text">数据库连接正常</text>
        </view>
        <view class="status-item">
          <view class="status-dot online"></view>
          <text class="status-text">短信服务正常</text>
        </view>
        <view class="status-item">
          <view class="status-dot online"></view>
          <text class="status-text">文件上传正常</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAdminStore } from '../../stores/admin'
import { adminApi } from '../../services/api'
import dayjs from 'dayjs'

const adminStore = useAdminStore()

// 数据状态
const isLoading = ref(true)
const dashboardData = ref({
  pendingApplications: 0,
  occupiedLockers: 0,
  activeUsers: 0,
  todayRecords: 0
})

const recentActivities = ref<any[]>([])

// 方法
const loadDashboardData = async () => {
  isLoading.value = true
  
  try {
    // 获取统计数据
    const statsResponse = await adminApi.getStatistics({
      store_id: adminStore.currentStoreId || undefined
    })
    
    if (statsResponse.success) {
      dashboardData.value = {
        pendingApplications: statsResponse.data.pending_applications || 0,
        occupiedLockers: statsResponse.data.occupied_lockers || 0,
        activeUsers: statsResponse.data.active_users || 0,
        todayRecords: statsResponse.data.today_records || 0
      }
    }

    // 获取最近活动
    const recordsResponse = await adminApi.getRecords({
      store_id: adminStore.currentStoreId || undefined,
      limit: 10
    })
    
    if (recordsResponse.success) {
      recentActivities.value = recordsResponse.data.records || []
    }

  } catch (error) {
    console.error('Load dashboard data error:', error)
    uni.showToast({
      title: '数据加载失败',
      icon: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

const navigateTo = (url: string) => {
  uni.navigateTo({ url })
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出管理后台吗？',
    success: (res) => {
      if (res.confirm) {
        adminStore.logout()
      }
    }
  })
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    'apply': '📝',
    'approve': '✅',
    'reject': '❌',
    'store': '📥',
    'retrieve': '📤',
    'login': '🔑'
  }
  return icons[type] || '📋'
}

const formatTime = (timestamp: string) => {
  return dayjs(timestamp).format('MM-DD HH:mm')
}

// 页面生命周期
onMounted(() => {
  loadDashboardData()
})

// 下拉刷新
const onPullDownRefresh = () => {
  loadDashboardData().finally(() => {
    uni.stopPullDownRefresh()
  })
}

// 页面显示时刷新数据
const onShow = () => {
  loadDashboardData()
}
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.dashboard {
  padding: var(--spacing-md);
  min-height: 100vh;
  background-color: var(--bg-color-light);
}

.welcome-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-color-white);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--box-shadow-light);
}

.welcome-header .welcome-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.welcome-header .greeting {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--text-primary);
}

.welcome-header .role-badge {
  padding: 6rpx 12rpx;
  border-radius: 20rpx;
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.welcome-header .role-badge.super {
  background-color: var(--error-color);
  color: #ffffff;
}

.welcome-header .role-badge.store {
  background-color: var(--primary-color);
  color: #ffffff;
}

.welcome-header .store-info {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.welcome-header .logout-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-color-grey);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.stats-card {
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-light);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-height: 120rpx;
}

.stats-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}

.stats-icon.pending {
  background-color: rgba(255, 152, 0, 0.1);
}

.stats-icon.occupied {
  background-color: rgba(27, 94, 32, 0.1);
}

.stats-icon.users {
  background-color: rgba(33, 150, 243, 0.1);
}

.stats-icon.records {
  background-color: rgba(76, 175, 80, 0.1);
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: var(--font-size-xl);
  font-weight: bold;
  color: var(--text-primary);
  line-height: 1.2;
}

.stats-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 4rpx;
}

.stats-arrow {
  font-size: var(--font-size-lg);
  color: var(--text-disabled);
}

.quick-actions, .recent-activities, .system-status {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.action-item {
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-light);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--spacing-sm);
  min-height: 120rpx;
}

.action-icon {
  font-size: 48rpx;
}

.action-text {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  font-weight: 500;
}

.activity-list {
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-light);
  padding: 0;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-bottom: 2rpx solid var(--divider-color);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  background-color: var(--bg-color-grey);
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  line-height: 1.4;
}

.activity-time {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: 4rpx;
}

.status-list {
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-light);
  padding: var(--spacing-md);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.status-dot.online {
  background-color: var(--success-color);
}

.status-dot.offline {
  background-color: var(--error-color);
}

.status-text {
  font-size: var(--font-size-md);
  color: var(--text-primary);
}

.loading-placeholder, .empty-placeholder {
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-light);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200rpx;
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}
</style>