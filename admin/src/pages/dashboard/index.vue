<template>
  <div class="dashboard">
    <!-- 顶部欢迎区域 -->
    <div class="welcome-header">
      <div class="welcome-content">
        <div class="welcome-text">
          <span class="greeting">您好，{{ adminStore.adminInfo?.name }}</span>
          <span class="role-badge" :class="adminStore.isSuperAdmin ? 'super' : 'store'">
            {{ adminStore.isSuperAdmin ? '超级管理员' : '门店管理员' }}
          </span>
        </div>
        <div v-if="adminStore.adminInfo?.store" class="store-info">
          <span>{{ adminStore.adminInfo.store.name }}</span>
        </div>
      </div>
      <div class="logout-btn" @click="handleLogout">
        <span>退出登录</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stats-card" @click="navigateTo('/applications')">
        <div class="stats-icon pending">📋</div>
        <div class="stats-content">
          <div class="stats-number">{{ dashboardData.pendingApplications }}</div>
          <div class="stats-label">待审核申请</div>
        </div>
        <div class="stats-arrow">›</div>
      </div>

      <div class="stats-card" @click="navigateTo('/lockers')">
        <div class="stats-icon occupied">🔒</div>
        <div class="stats-content">
          <div class="stats-number">{{ dashboardData.occupiedLockers }}</div>
          <div class="stats-label">已占用杆柜</div>
        </div>
        <div class="stats-arrow">›</div>
      </div>

      <div class="stats-card" @click="navigateTo('/users')">
        <div class="stats-icon users">👥</div>
        <div class="stats-content">
          <div class="stats-number">{{ dashboardData.activeUsers }}</div>
          <div class="stats-label">活跃用户</div>
        </div>
        <div class="stats-arrow">›</div>
      </div>

      <div class="stats-card" @click="navigateTo('/records')">
        <div class="stats-icon records">📈</div>
        <div class="stats-content">
          <div class="stats-number">{{ dashboardData.todayRecords }}</div>
          <div class="stats-label">今日操作</div>
        </div>
        <div class="stats-arrow">›</div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <div class="section-title">快捷操作</div>
      <div class="actions-grid">
        <div class="action-item" @click="navigateTo('/applications')">
          <div class="action-icon">✅</div>
          <span class="action-text">审核申请</span>
        </div>
        <div class="action-item" @click="navigateTo('/lockers')">
          <div class="action-icon">🔧</div>
          <span class="action-text">管理杆柜</span>
        </div>
        <div class="action-item" @click="navigateTo('/reminders')">
          <div class="action-icon">📢</div>
          <span class="action-text">发送提醒</span>
        </div>
        <div class="action-item" @click="navigateTo('/statistics')">
          <div class="action-icon">📊</div>
          <span class="action-text">查看统计</span>
        </div>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activities">
      <div class="section-title">最近活动</div>
      <div v-if="isLoading" class="loading-placeholder">
        <span>加载中...</span>
      </div>
      <div v-else-if="recentActivities.length === 0" class="empty-placeholder">
        <span>暂无最近活动</span>
      </div>
      <div v-else class="activity-list">
        <div
          v-for="activity in recentActivities"
          :key="activity.id"
          class="activity-item"
        >
          <div class="activity-icon" :class="activity.type">
            {{ getActivityIcon(activity.type) }}
          </div>
          <div class="activity-content">
            <div class="activity-text">{{ activity.description }}</div>
            <div class="activity-time">{{ formatTime(activity.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统状态 -->
    <div class="system-status">
      <div class="section-title">系统状态</div>
      <div class="status-list">
        <div class="status-item">
          <div class="status-dot online"></div>
          <span class="status-text">数据库连接正常</span>
        </div>
        <div class="status-item">
          <div class="status-dot online"></div>
          <span class="status-text">短信服务正常</span>
        </div>
        <div class="status-item">
          <div class="status-dot online"></div>
          <span class="status-text">文件上传正常</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '../../stores/admin'
import { adminApi } from '../../services/api'
import dayjs from 'dayjs'

const adminStore = useAdminStore()
const router = useRouter()

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
      // 转换数据格式以匹配前端显示逻辑
      const rawRecords = recordsResponse.data.list || []
      recentActivities.value = rawRecords.map((record: any) => ({
        id: record.id,
        type: record.action, // assigned, store, retrieve等
        description: `${record.user.name} ${getActionText(record.action)}${record.locker.number ? ' ('+record.locker.number+')' : ''}`,
        created_at: record.created_at,
        user: record.user,
        locker: record.locker,
        store: record.store
      }))
    }

  } catch (error) {
    console.error('Load dashboard data error:', error)
    alert('数据加载失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const navigateTo = (url: string) => {
  router.push(url)
}

const handleLogout = () => {
  if (confirm('确定要退出管理后台吗？')) {
    adminStore.logout()
    router.push('/login')
  }
}

const getActionText = (action: string) => {
  const actionTexts: Record<string, string> = {
    'assigned': '被分配杆柜',
    'store': '存放球杆',
    'retrieve': '取回球杆',
    'released': '释放杆柜'
  }
  return actionTexts[action] || action
}

const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    'assigned': '🔑',
    'store': '📥',
    'retrieve': '📤', 
    'released': '🔓',
    'apply': '📝',
    'approve': '✅',
    'reject': '❌',
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

// 页面刷新
const refreshPage = () => {
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
  padding: 3px 6px;
  border-radius: 10px;
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
  min-height: 60px;
}

.stats-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
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
  margin-top: 2px;
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
  min-height: 60px;
}

.action-icon {
  font-size: 24px;
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
  border-bottom: 1px solid var(--divider-color);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
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
  margin-top: 2px;
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
  width: 8px;
  height: 8px;
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
  min-height: 100px;
  color: var(--text-secondary);
  font-size: var(--font-size-md);
}
</style>