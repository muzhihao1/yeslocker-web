<template>
  <view class="notifications-container">
    <!-- Header -->
    <view class="notifications-header">
      <text class="header-title">消息通知</text>
      <view class="header-actions">
        <text class="mark-all" @click="markAllAsRead" v-if="unreadCount > 0">
          全部已读
        </text>
      </view>
    </view>

    <!-- Notification tabs -->
    <view class="notification-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { 'tab-item--active': activeTab === tab.value }]"
        @click="setActiveTab(tab.value)"
      >
        <text class="tab-text">{{ tab.label }}</text>
        <view v-if="tab.count > 0" class="tab-badge">
          <text class="badge-text">{{ tab.count > 99 ? '99+' : tab.count }}</text>
        </view>
      </view>
    </view>

    <!-- Notifications list -->
    <view v-if="loading" class="loading-container">
      <loading-spinner size="large" text="加载中..." />
    </view>

    <view v-else-if="filteredNotifications.length === 0" class="empty-container">
      <empty-state
        icon="📭"
        title="暂无消息"
        :description="emptyDescription"
      />
    </view>

    <view v-else class="notifications-list">
      <view
        v-for="notification in filteredNotifications"
        :key="notification.id"
        :class="['notification-item', { 'notification-item--unread': !notification.isRead }]"
        @click="openNotification(notification)"
      >
        <view class="notification-icon-wrapper" :class="notification.type">
          <text class="notification-icon">{{ getNotificationIcon(notification.type) }}</text>
        </view>
        
        <view class="notification-content">
          <view class="notification-header">
            <text class="notification-title">{{ notification.title }}</text>
            <text class="notification-time">{{ formatTime(notification.createdAt) }}</text>
          </view>
          <text class="notification-message">{{ notification.content }}</text>
          
          <!-- Action buttons for specific notification types -->
          <view v-if="notification.actionUrl" class="notification-action">
            <custom-button
              type="primary"
              size="mini"
              :text="notification.actionText || '查看详情'"
              @click.stop="handleAction(notification)"
            />
          </view>
        </view>
        
        <view v-if="!notification.isRead" class="unread-dot"></view>
      </view>
    </view>

    <!-- Load more -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>

    <!-- Notification detail modal -->
    <modal
      v-model:visible="showDetailModal"
      title="消息详情"
      :show-footer="false"
    >
      <view v-if="selectedNotification" class="detail-content">
        <view class="detail-header">
          <view class="detail-icon-wrapper" :class="selectedNotification.type">
            <text class="detail-icon">{{ getNotificationIcon(selectedNotification.type) }}</text>
          </view>
          <text class="detail-title">{{ selectedNotification.title }}</text>
        </view>
        
        <text class="detail-time">{{ formatDateTime(selectedNotification.createdAt) }}</text>
        <text class="detail-message">{{ selectedNotification.content }}</text>
        
        <view v-if="selectedNotification.details" class="detail-extra">
          <view v-for="(value, key) in selectedNotification.details" :key="key" class="detail-item">
            <text class="detail-label">{{ getDetailLabel(key) }}</text>
            <text class="detail-value">{{ value }}</text>
          </view>
        </view>
        
        <view v-if="selectedNotification.actionUrl" class="detail-actions">
          <custom-button
            type="primary"
            size="medium"
            :text="selectedNotification.actionText || '前往处理'"
            block
            @click="handleAction(selectedNotification)"
          />
        </view>
      </view>
    </modal>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { LoadingSpinner, EmptyState, Modal, CustomButton } from '@/components/common'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const authStore = useAuthStore()

// Notification types
interface Notification {
  id: string
  type: 'system' | 'approval' | 'reminder' | 'activity'
  title: string
  content: string
  isRead: boolean
  createdAt: string
  actionUrl?: string
  actionText?: string
  details?: Record<string, any>
}

// Tabs
const tabs = ref([
  { label: '全部', value: 'all', count: 0 },
  { label: '系统', value: 'system', count: 0 },
  { label: '审核', value: 'approval', count: 0 },
  { label: '提醒', value: 'reminder', count: 0 }
])

// States
const activeTab = ref('all')
const loading = ref(false)
const hasMore = ref(false)
const showDetailModal = ref(false)
const selectedNotification = ref<Notification | null>(null)

// Mock data
const allNotifications = ref<Notification[]>([
  {
    id: '1',
    type: 'approval',
    title: '杆柜申请已通过',
    content: '您申请的望京店A03号杆柜已通过审核，现在可以使用了。',
    isRead: false,
    createdAt: new Date().toISOString(),
    actionUrl: '/pages/user/lockers',
    actionText: '查看杆柜'
  },
  {
    id: '2',
    type: 'reminder',
    title: '杆柜长时间未使用提醒',
    content: '您的A03号杆柜已经15天未使用，请及时使用以免被回收。',
    isRead: false,
    createdAt: dayjs().subtract(1, 'day').toISOString(),
    actionUrl: '/pages/user/lockers',
    actionText: '立即使用'
  },
  {
    id: '3',
    type: 'system',
    title: '系统维护通知',
    content: '系统将于8月5日凌晨2:00-4:00进行维护升级，期间暂停服务。',
    isRead: true,
    createdAt: dayjs().subtract(2, 'day').toISOString(),
    details: {
      startTime: '2024-08-05 02:00',
      endTime: '2024-08-05 04:00',
      affectedServices: '全部服务'
    }
  },
  {
    id: '4',
    type: 'activity',
    title: '存杆成功',
    content: '您已成功在望京店A03号杆柜存入台球杆。',
    isRead: true,
    createdAt: dayjs().subtract(3, 'day').toISOString(),
    details: {
      lockerNumber: 'A03',
      storeName: '望京店',
      operationTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss')
    }
  },
  {
    id: '5',
    type: 'system',
    title: '新功能上线',
    content: 'YesLocker新增快速取杆功能，扫码即可快速开柜！',
    isRead: true,
    createdAt: dayjs().subtract(5, 'day').toISOString()
  }
])

// Computed
const filteredNotifications = computed(() => {
  if (activeTab.value === 'all') {
    return allNotifications.value
  }
  return allNotifications.value.filter(n => n.type === activeTab.value)
})

const unreadCount = computed(() => {
  return allNotifications.value.filter(n => !n.isRead).length
})

const emptyDescription = computed(() => {
  switch (activeTab.value) {
    case 'system':
      return '暂无系统消息'
    case 'approval':
      return '暂无审核消息'
    case 'reminder':
      return '暂无提醒消息'
    default:
      return '暂无任何消息'
  }
})

// Update tab counts
const updateTabCounts = () => {
  tabs.value.forEach(tab => {
    if (tab.value === 'all') {
      tab.count = unreadCount.value
    } else {
      tab.count = allNotifications.value.filter(n => 
        n.type === tab.value && !n.isRead
      ).length
    }
  })
}

// Methods
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'system':
      return '📢'
    case 'approval':
      return '✅'
    case 'reminder':
      return '⏰'
    case 'activity':
      return '📋'
    default:
      return '📌'
  }
}

const formatTime = (datetime: string) => {
  const date = dayjs(datetime)
  const now = dayjs()
  
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm')
  } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天 ' + date.format('HH:mm')
  } else if (date.isAfter(now.subtract(7, 'day'))) {
    return date.fromNow()
  } else {
    return date.format('MM-DD HH:mm')
  }
}

const formatDateTime = (datetime: string) => {
  return dayjs(datetime).format('YYYY年MM月DD日 HH:mm')
}

const getDetailLabel = (key: string) => {
  const labels: Record<string, string> = {
    startTime: '开始时间',
    endTime: '结束时间',
    affectedServices: '影响服务',
    lockerNumber: '杆柜编号',
    storeName: '门店名称',
    operationTime: '操作时间'
  }
  return labels[key] || key
}

const setActiveTab = (tab: string) => {
  activeTab.value = tab
}

const openNotification = (notification: Notification) => {
  selectedNotification.value = notification
  showDetailModal.value = true
  
  // Mark as read
  if (!notification.isRead) {
    notification.isRead = true
    updateTabCounts()
    
    // Update in backend
    markAsRead(notification.id)
  }
}

const handleAction = (notification: Notification) => {
  if (notification.actionUrl) {
    uni.navigateTo({
      url: notification.actionUrl
    })
    showDetailModal.value = false
  }
}

const markAsRead = async (notificationId: string) => {
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 300))
  } catch (error) {
    console.error('Failed to mark as read:', error)
  }
}

const markAllAsRead = async () => {
  uni.showModal({
    title: '确认',
    content: '确定将所有消息标记为已读吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true
        try {
          // Mock API call
          await new Promise(resolve => setTimeout(resolve, 500))
          
          allNotifications.value.forEach(n => {
            n.isRead = true
          })
          updateTabCounts()
          
          uni.showToast({
            title: '操作成功',
            icon: 'success'
          })
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'none'
          })
        } finally {
          loading.value = false
        }
      }
    }
  })
}

const loadNotifications = async () => {
  loading.value = true
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    updateTabCounts()
  } catch (error) {
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  uni.showToast({
    title: '没有更多消息了',
    icon: 'none'
  })
}

// Lifecycle
onMounted(() => {
  loadNotifications()
})
</script>

<style scoped>
.notifications-container {
  min-height: 100vh;
  background-color: var(--background-color);
}

/* Header */
.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background-color: white;
  border-bottom: 1rpx solid var(--border-color);
}

.header-title {
  font-size: 40rpx;
  font-weight: bold;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  align-items: center;
}

.mark-all {
  font-size: 28rpx;
  color: var(--primary-color);
  cursor: pointer;
}

/* Tabs */
.notification-tabs {
  display: flex;
  background-color: white;
  border-bottom: 1rpx solid var(--border-color);
  padding: 0 32rpx;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
  position: relative;
  cursor: pointer;
}

.tab-text {
  font-size: 30rpx;
  color: var(--text-secondary);
  transition: color 0.3s;
}

.tab-item--active .tab-text {
  color: var(--primary-color);
  font-weight: 500;
}

.tab-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 4rpx;
  background-color: var(--primary-color);
  border-radius: 2rpx;
}

.tab-badge {
  background-color: var(--danger-color);
  border-radius: 20rpx;
  padding: 0 12rpx;
  min-width: 40rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  font-size: 22rpx;
  color: white;
  font-weight: 500;
}

/* Loading and empty */
.loading-container,
.empty-container {
  padding: 200rpx 0;
}

/* Notifications list */
.notifications-list {
  padding: 24rpx 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 32rpx;
  background-color: white;
  border-bottom: 1rpx solid var(--border-color);
  cursor: pointer;
  position: relative;
}

.notification-item:active {
  background-color: #f5f5f5;
}

.notification-item--unread {
  background-color: rgba(27, 94, 32, 0.02);
}

.notification-icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.notification-icon-wrapper.system {
  background-color: rgba(33, 150, 243, 0.1);
}

.notification-icon-wrapper.approval {
  background-color: rgba(82, 196, 26, 0.1);
}

.notification-icon-wrapper.reminder {
  background-color: rgba(255, 160, 0, 0.1);
}

.notification-icon-wrapper.activity {
  background-color: rgba(27, 94, 32, 0.1);
}

.notification-icon {
  font-size: 36rpx;
}

.notification-content {
  flex: 1;
  padding-right: 24rpx;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.notification-title {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--text-color);
  margin-right: 16rpx;
}

.notification-time {
  font-size: 24rpx;
  color: var(--text-secondary);
  white-space: nowrap;
}

.notification-message {
  font-size: 28rpx;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.notification-action {
  margin-top: 16rpx;
}

.unread-dot {
  position: absolute;
  top: 32rpx;
  left: 16rpx;
  width: 16rpx;
  height: 16rpx;
  background-color: var(--danger-color);
  border-radius: 50%;
}

/* Load more */
.load-more {
  padding: 32rpx;
  text-align: center;
  cursor: pointer;
}

.load-more-text {
  font-size: 28rpx;
  color: var(--primary-color);
}

/* Detail modal */
.detail-content {
  padding: 24rpx 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.detail-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-icon {
  font-size: 40rpx;
}

.detail-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-color);
}

.detail-time {
  display: block;
  font-size: 26rpx;
  color: var(--text-secondary);
  margin-bottom: 24rpx;
}

.detail-message {
  display: block;
  font-size: 30rpx;
  color: var(--text-color);
  line-height: 1.8;
  margin-bottom: 32rpx;
}

.detail-extra {
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.detail-item:not(:last-child) {
  border-bottom: 1rpx solid var(--border-color);
}

.detail-label {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 28rpx;
  color: var(--text-color);
  text-align: right;
  max-width: 60%;
}

.detail-actions {
  margin-top: 32rpx;
}
</style>