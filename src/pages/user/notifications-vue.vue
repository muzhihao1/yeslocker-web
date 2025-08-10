<template>
  <div class="notifications-container">
    <!-- Header -->
    <div class="notifications-header">
      <h1 class="header-title">消息通知</h1>
      <div class="header-actions">
        <button v-if="unreadCount > 0" class="mark-all-button" @click="confirmMarkAllAsRead">
          全部已读
        </button>
      </div>
    </div>

    <!-- Notification tabs -->
    <div class="notification-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab-item', { 'tab-item--active': activeTab === tab.value }]"
        @click="setActiveTab(tab.value)"
      >
        <span class="tab-text">{{ tab.label }}</span>
        <div v-if="tab.count > 0" class="tab-badge">
          <span class="badge-text">{{ tab.count > 99 ? '99+' : tab.count }}</span>
        </div>
      </div>
    </div>

    <!-- Notifications list -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner large"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="filteredNotifications.length === 0" class="empty-container">
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h2 class="empty-title">暂无消息</h2>
        <p class="empty-description">{{ emptyDescription }}</p>
      </div>
    </div>

    <div v-else class="notifications-list">
      <div
        v-for="notification in filteredNotifications"
        :key="notification.id"
        :class="['notification-item', { 'notification-item--unread': !notification.isRead }]"
        @click="openNotification(notification)"
      >
        <div class="notification-icon-wrapper" :class="notification.type">
          <span class="notification-icon">{{ getNotificationIcon(notification.type) }}</span>
        </div>
        
        <div class="notification-content">
          <div class="notification-header">
            <h3 class="notification-title">{{ notification.title }}</h3>
            <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
          </div>
          <p class="notification-message">{{ notification.content }}</p>
          
          <!-- Action buttons for specific notification types -->
          <div v-if="notification.actionUrl" class="notification-action">
            <button
              class="action-button mini"
              @click.stop="handleAction(notification)"
            >
              {{ notification.actionText || '查看详情' }}
            </button>
          </div>
        </div>
        
        <div v-if="!notification.isRead" class="unread-dot"></div>
      </div>
    </div>

    <!-- Load more -->
    <div v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <span class="load-more-text">加载更多</span>
    </div>

    <!-- Notification detail modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content detail-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">消息详情</h3>
          <button class="modal-close" @click="closeDetailModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedNotification" class="detail-content">
            <div class="detail-header">
              <div class="detail-icon-wrapper" :class="selectedNotification.type">
                <span class="detail-icon">{{ getNotificationIcon(selectedNotification.type) }}</span>
              </div>
              <h4 class="detail-title">{{ selectedNotification.title }}</h4>
            </div>
            
            <div class="detail-time">{{ formatDateTime(selectedNotification.createdAt) }}</div>
            <p class="detail-message">{{ selectedNotification.content }}</p>
            
            <div v-if="selectedNotification.details" class="detail-extra">
              <div v-for="(value, key) in selectedNotification.details" :key="key" class="detail-item">
                <span class="detail-label">{{ getDetailLabel(key) }}</span>
                <span class="detail-value">{{ value }}</span>
              </div>
            </div>
            
            <div v-if="selectedNotification.actionUrl" class="detail-actions">
              <button
                class="detail-action-button"
                @click="handleAction(selectedNotification)"
              >
                {{ selectedNotification.actionText || '前往处理' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">确认</h3>
          <button class="modal-close" @click="closeConfirmModal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-text">确定将所有消息标记为已读吗？</p>
        </div>
        <div class="modal-footer">
          <button class="modal-button secondary" @click="closeConfirmModal">取消</button>
          <button 
            class="modal-button primary" 
            :disabled="markingAllRead"
            @click="markAllAsRead"
          >
            <span v-if="markingAllRead" class="loading-spinner small"></span>
            {{ markingAllRead ? '处理中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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
const showConfirmModal = ref(false)
const markingAllRead = ref(false)
const selectedNotification = ref<Notification | null>(null)

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Mock data
const allNotifications = ref<Notification[]>([
  {
    id: '1',
    type: 'approval',
    title: '杆柜申请已通过',
    content: '您申请的望京店A03号杆柜已通过审核，现在可以使用了。',
    isRead: false,
    createdAt: new Date().toISOString(),
    actionUrl: '/user/lockers',
    actionText: '查看杆柜'
  },
  {
    id: '2',
    type: 'reminder',
    title: '杆柜长时间未使用提醒',
    content: '您的A03号杆柜已经15天未使用，请及时使用以免被回收。',
    isRead: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    actionUrl: '/user/lockers',
    actionText: '立即使用'
  },
  {
    id: '3',
    type: 'system',
    title: '系统维护通知',
    content: '系统将于8月5日凌晨2:00-4:00进行维护升级，期间暂停服务。',
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
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
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    details: {
      lockerNumber: 'A03',
      storeName: '望京店',
      operationTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleString('zh-CN')
    }
  },
  {
    id: '5',
    type: 'system',
    title: '新功能上线',
    content: 'YesLocker新增快速取杆功能，扫码即可快速开柜！',
    isRead: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
])

// Methods
const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

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
  const date = new Date(datetime)
  const now = new Date()
  
  // Check if it's today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const messageDate = new Date(date)
  messageDate.setHours(0, 0, 0, 0)
  
  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // Check if it's yesterday
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  if (messageDate.getTime() === yesterday.getTime()) {
    return '昨天 ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // Within last 7 days
  if (date.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))
    return `${days}天前`
  }
  
  // Older dates
  return (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
         date.getDate().toString().padStart(2, '0') + ' ' +
         date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (datetime: string) => {
  return new Date(datetime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedNotification.value = null
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
}

const handleAction = (notification: Notification) => {
  if (notification.actionUrl) {
    router.push(notification.actionUrl)
    showDetailModal.value = false
  }
}

const markAsRead = async (notificationId: string) => {
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log('Marked notification as read:', notificationId)
  } catch (error) {
    console.error('Failed to mark as read:', error)
  }
}

const confirmMarkAllAsRead = () => {
  showConfirmModal.value = true
}

const markAllAsRead = async () => {
  markingAllRead.value = true
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    allNotifications.value.forEach(n => {
      n.isRead = true
    })
    updateTabCounts()
    
    showToastMessage('操作成功', 'success')
    showConfirmModal.value = false
  } catch (error) {
    showToastMessage('操作失败', 'error')
  } finally {
    markingAllRead.value = false
  }
}

const loadNotifications = async () => {
  loading.value = true
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    updateTabCounts()
    console.log('通知加载完成:', allNotifications.value.length, '条')
  } catch (error) {
    showToastMessage('加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  showToastMessage('没有更多消息了', 'error')
}

// Lifecycle
onMounted(() => {
  loadNotifications()
})
</script>

<style scoped>
.notifications-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
}

.mark-all-button {
  font-size: 14px;
  color: #1B5E20;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.mark-all-button:hover {
  background-color: rgba(27, 94, 32, 0.1);
}

/* Tabs */
.notification-tabs {
  display: flex;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 24px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 0;
  position: relative;
  cursor: pointer;
}

.tab-text {
  font-size: 15px;
  color: #666;
  transition: color 0.3s;
}

.tab-item--active .tab-text {
  color: #1B5E20;
  font-weight: 500;
}

.tab-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background-color: #1B5E20;
  border-radius: 1px;
}

.tab-badge {
  background-color: #f44336;
  border-radius: 12px;
  padding: 0 8px;
  min-width: 20px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  font-size: 11px;
  color: white;
  font-weight: 500;
}

/* Loading and empty */
.loading-container,
.empty-container {
  padding: 100px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #1B5E20;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner.large {
  width: 32px;
  height: 32px;
}

.loading-spinner.small {
  width: 14px;
  height: 14px;
  border-width: 2px;
  margin: 0 8px 0 0;
}

.loading-text {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.empty-state {
  text-align: center;
  max-width: 300px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

/* Notifications list */
.notifications-list {
  padding: 16px 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px 20px;
  background-color: white;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  position: relative;
  transition: background-color 0.3s;
}

.notification-item:hover {
  background-color: #f8f8f8;
}

.notification-item--unread {
  background-color: rgba(27, 94, 32, 0.02);
}

.notification-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
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
  font-size: 20px;
}

.notification-content {
  flex: 1;
  padding-right: 16px;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.notification-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 12px 0 0;
}

.notification-time {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.notification-message {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.notification-action {
  margin-top: 12px;
}

.action-button {
  background-color: #1B5E20;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.action-button:hover {
  background-color: #2E7D32;
}

.unread-dot {
  position: absolute;
  top: 20px;
  left: 8px;
  width: 8px;
  height: 8px;
  background-color: #f44336;
  border-radius: 50%;
}

/* Load more */
.load-more {
  padding: 24px;
  text-align: center;
  cursor: pointer;
}

.load-more-text {
  font-size: 14px;
  color: #1B5E20;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.detail-modal {
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px 24px;
  max-height: 400px;
  overflow-y: auto;
}

.modal-text {
  font-size: 15px;
  color: #333;
  margin: 0;
  text-align: center;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.modal-button.secondary {
  background-color: #f5f5f5;
  color: #666;
}

.modal-button.primary {
  background-color: #1B5E20;
  color: white;
}

.modal-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Detail modal */
.detail-content {
  padding: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-icon {
  font-size: 24px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.detail-time {
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}

.detail-message {
  font-size: 15px;
  color: #333;
  line-height: 1.8;
  margin: 0 0 20px 0;
}

.detail-extra {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.detail-item:not(:last-child) {
  border-bottom: 1px solid #e0e0e0;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

.detail-value {
  font-size: 14px;
  color: #333;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

.detail-actions {
  margin-top: 20px;
}

.detail-action-button {
  width: 100%;
  height: 40px;
  background-color: #1B5E20;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.detail-action-button:hover {
  background-color: #2E7D32;
}

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  background-color: #4CAF50;
  color: white;
}

.toast.error {
  background-color: #f44336;
  color: white;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>