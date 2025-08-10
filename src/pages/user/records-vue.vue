<template>
  <div class="records-container">
    <!-- Header with filters -->
    <div class="records-header">
      <h1 class="header-title">使用记录</h1>
      <div class="filter-tabs">
        <div
          v-for="filter in filters"
          :key="filter.value"
          :class="['filter-tab', { 'filter-tab--active': activeFilter === filter.value }]"
          @click="setFilter(filter.value)"
        >
          <span class="filter-text">{{ filter.label }}</span>
          <div v-if="activeFilter === filter.value" class="filter-indicator"></div>
        </div>
      </div>
    </div>

    <!-- Date range selector -->
    <div class="date-selector" v-if="activeFilter === 'custom'">
      <div class="date-item">
        <label class="date-label">开始日期</label>
        <input
          type="date"
          v-model="startDate"
          class="date-input"
        />
      </div>
      <span class="date-separator">至</span>
      <div class="date-item">
        <label class="date-label">结束日期</label>
        <input
          type="date"
          v-model="endDate"
          class="date-input"
        />
      </div>
    </div>

    <!-- Records list -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner large"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <div v-else-if="filteredRecords.length === 0" class="empty-container">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h2 class="empty-title">暂无记录</h2>
        <p class="empty-description">您在该时间段内没有使用记录</p>
      </div>
    </div>

    <div v-else class="records-list">
      <!-- Group by date -->
      <div v-for="group in groupedRecords" :key="group.date" class="date-group">
        <div class="date-header">
          <h3 class="date-title">{{ formatGroupDate(group.date) }}</h3>
          <span class="date-count">{{ group.records.length }}条记录</span>
        </div>
        
        <div class="group-records">
          <div
            v-for="record in group.records"
            :key="record.id"
            class="record-item"
            @click="viewRecordDetail(record)"
          >
            <div class="record-icon-wrapper" :class="record.actionType">
              <span class="record-icon">{{ record.actionType === 'store' ? '📥' : '📤' }}</span>
            </div>
            
            <div class="record-content">
              <div class="record-main">
                <span class="record-action">{{ getActionText(record.actionType) }}</span>
                <span class="record-locker">杆柜 {{ record.lockerNumber }}</span>
              </div>
              <div class="record-meta">
                <span class="record-store">{{ record.storeName }}</span>
                <span class="record-time">{{ formatTime(record.createdAt) }}</span>
              </div>
            </div>
            
            <span class="record-arrow">›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Statistics summary -->
    <div v-if="!loading && filteredRecords.length > 0" class="section-card stats-card">
      <h3 class="section-title">统计概览</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-label">总次数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ storeCount }}</div>
          <div class="stat-label">存杆次数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ retrieveCount }}</div>
          <div class="stat-label">取杆次数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ avgDuration }}</div>
          <div class="stat-label">平均存放时长</div>
        </div>
      </div>
    </div>

    <!-- Load more -->
    <div v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <span class="load-more-text">加载更多</span>
    </div>

    <!-- Record detail modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">操作详情</h3>
          <button class="modal-close" @click="closeDetailModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedRecord" class="detail-content">
            <div class="detail-item">
              <span class="detail-label">操作类型</span>
              <span class="detail-value">{{ getActionText(selectedRecord.actionType) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">杆柜编号</span>
              <span class="detail-value">{{ selectedRecord.lockerNumber }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">所属门店</span>
              <span class="detail-value">{{ selectedRecord.storeName }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">操作时间</span>
              <span class="detail-value">{{ formatDateTime(selectedRecord.createdAt) }}</span>
            </div>
            <div v-if="selectedRecord.duration" class="detail-item">
              <span class="detail-label">存放时长</span>
              <span class="detail-value">{{ formatDuration(selectedRecord.duration) }}</span>
            </div>
            <div v-if="selectedRecord.note" class="detail-item">
              <span class="detail-label">备注</span>
              <span class="detail-value">{{ selectedRecord.note }}</span>
            </div>
          </div>
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
import { useAuthStore } from '@/stores/auth-vue'
import { lockersApi } from '@/services/api/lockers-vue'

const authStore = useAuthStore()

// Types
interface LockerRecord {
  id: string
  userId: string
  lockerId: string
  lockerNumber: string
  storeId: string
  storeName: string
  actionType: 'store' | 'retrieve'
  createdAt: string
  duration?: number
  note?: string
}

// Filter options
const filters = [
  { label: '全部', value: 'all' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '近三月', value: 'quarter' },
  { label: '自定义', value: 'custom' }
]

// States
const activeFilter = ref('all')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const hasMore = ref(false)
const showDetailModal = ref(false)
const selectedRecord = ref<LockerRecord | null>(null)

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Mock data (in production, this would come from API)
const allRecords = ref<LockerRecord[]>([
  {
    id: '1',
    userId: 'user-1',
    lockerId: 'locker-1',
    lockerNumber: 'A03',
    storeId: 'store-1',
    storeName: '望京店',
    actionType: 'store',
    createdAt: '2024-08-01T14:30:00',
    duration: 180,
    note: ''
  },
  {
    id: '2',
    userId: 'user-1',
    lockerId: 'locker-1',
    lockerNumber: 'A03',
    storeId: 'store-1',
    storeName: '望京店',
    actionType: 'retrieve',
    createdAt: '2024-08-01T17:30:00',
    duration: 0,
    note: ''
  },
  {
    id: '3',
    userId: 'user-1',
    lockerId: 'locker-1',
    lockerNumber: 'A03',
    storeId: 'store-1',
    storeName: '望京店',
    actionType: 'store',
    createdAt: '2024-07-28T10:00:00',
    duration: 240,
    note: '周末打球'
  },
  {
    id: '4',
    userId: 'user-1',
    lockerId: 'locker-1',
    lockerNumber: 'A03',
    storeId: 'store-1',
    storeName: '望京店',
    actionType: 'retrieve',
    createdAt: '2024-07-28T14:00:00',
    duration: 0,
    note: ''
  },
  {
    id: '5',
    userId: 'user-1',
    lockerId: 'locker-1',
    lockerNumber: 'A03',
    storeId: 'store-1',
    storeName: '望京店',
    actionType: 'store',
    createdAt: '2024-07-20T09:00:00',
    duration: 300,
    note: ''
  },
  {
    id: '6',
    userId: 'user-1',
    lockerId: 'locker-1',
    lockerNumber: 'A03',
    storeId: 'store-1',
    storeName: '望京店',
    actionType: 'retrieve',
    createdAt: '2024-07-20T14:00:00',
    duration: 0,
    note: ''
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
const filteredRecords = computed(() => {
  let records = [...allRecords.value]
  const now = new Date()
  
  switch (activeFilter.value) {
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      records = records.filter(r => 
        new Date(r.createdAt) >= weekAgo
      )
      break
    case 'month':
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      records = records.filter(r => 
        new Date(r.createdAt) >= monthAgo
      )
      break
    case 'quarter':
      const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      records = records.filter(r => 
        new Date(r.createdAt) >= quarterAgo
      )
      break
    case 'custom':
      if (startDate.value && endDate.value) {
        const start = new Date(startDate.value)
        const end = new Date(endDate.value + ' 23:59:59')
        records = records.filter(r => {
          const date = new Date(r.createdAt)
          return date >= start && date <= end
        })
      }
      break
  }
  
  return records.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

const groupedRecords = computed(() => {
  const groups: { date: string; records: LockerRecord[] }[] = []
  const grouped: Record<string, LockerRecord[]> = {}
  
  filteredRecords.value.forEach(record => {
    const date = new Date(record.createdAt).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(record)
  })
  
  Object.keys(grouped)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .forEach(date => {
      groups.push({ date, records: grouped[date] })
    })
  
  return groups
})

const totalCount = computed(() => filteredRecords.value.length)
const storeCount = computed(() => 
  filteredRecords.value.filter(r => r.actionType === 'store').length
)
const retrieveCount = computed(() => 
  filteredRecords.value.filter(r => r.actionType === 'retrieve').length
)
const avgDuration = computed(() => {
  const durations = filteredRecords.value
    .filter(r => r.duration && r.duration > 0)
    .map(r => r.duration || 0)
  
  if (durations.length === 0) return '0小时'
  
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length
  const hours = Math.floor(avg / 60)
  const minutes = Math.round(avg % 60)
  
  return hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分钟`
})

// Methods
const setFilter = (filter: string) => {
  activeFilter.value = filter
  if (filter !== 'custom') {
    startDate.value = ''
    endDate.value = ''
  }
}

const formatGroupDate = (date: string) => {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  
  const inputDate = new Date(d)
  inputDate.setHours(0, 0, 0, 0)
  
  if (inputDate.getTime() === today.getTime()) {
    return '今天'
  } else if (inputDate.getTime() === yesterday.getTime()) {
    return '昨天'
  } else if (d.getFullYear() === today.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  } else {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }
}

const formatTime = (datetime: string) => {
  const date = new Date(datetime)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (datetime: string) => {
  const date = new Date(datetime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatDuration = (minutes: number) => {
  if (!minutes) return '0分钟'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
  } else {
    return `${mins}分钟`
  }
}

const getActionText = (actionType: string) => {
  return actionType === 'store' ? '存入台球杆' : '取出台球杆'
}

const viewRecordDetail = (record: LockerRecord) => {
  selectedRecord.value = record
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

const loadRecords = async () => {
  if (!authStore.user?.id) {
    showToastMessage('用户信息异常，请重新登录', 'error')
    return
  }

  loading.value = true
  try {
    // In production, load from API
    const records = await lockersApi.getUserLockerRecords(authStore.user.id, 50)
    allRecords.value = records
    console.log('加载使用记录:', records.length, '条')
  } catch (error) {
    console.error('加载记录失败:', error)
    showToastMessage('加载失败，请刷新重试', 'error')
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  showToastMessage('没有更多记录了', 'error')
}

// Lifecycle
onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.records-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.records-header {
  background-color: white;
  padding: 24px 24px 0;
  border-bottom: 1px solid #e0e0e0;
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0 0 24px 0;
}

.filter-tabs {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 1px;
}

.filter-tab {
  position: relative;
  padding: 12px 6px;
  cursor: pointer;
  white-space: nowrap;
}

.filter-text {
  font-size: 15px;
  color: #666;
  transition: color 0.3s;
}

.filter-tab--active .filter-text {
  color: #1B5E20;
  font-weight: 500;
}

.filter-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #1B5E20;
  border-radius: 1px;
}

/* Date selector */
.date-selector {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
  gap: 16px;
}

.date-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.date-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background-color: #f8f8f8;
}

.date-input:focus {
  outline: none;
  border-color: #1B5E20;
  background-color: white;
}

.date-separator {
  margin: 0 8px;
  font-size: 14px;
  color: #666;
  margin-top: 20px;
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

/* Records list */
.records-list {
  padding: 16px;
}

.date-group {
  margin-bottom: 24px;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.date-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.date-count {
  font-size: 13px;
  color: #666;
}

.group-records {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.record-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.record-item:last-child {
  border-bottom: none;
}

.record-item:hover {
  background-color: #f8f8f8;
}

.record-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.record-icon-wrapper.store {
  background-color: rgba(82, 196, 26, 0.1);
}

.record-icon-wrapper.retrieve {
  background-color: rgba(27, 94, 32, 0.1);
}

.record-icon {
  font-size: 24px;
}

.record-content {
  flex: 1;
}

.record-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.record-action {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.record-locker {
  font-size: 14px;
  color: #666;
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.record-store,
.record-time {
  font-size: 13px;
  color: #666;
}

.record-arrow {
  font-size: 18px;
  color: #ccc;
}

/* Statistics */
.section-card {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #1B5E20;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #666;
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
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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

/* Detail modal */
.detail-content {
  padding: 0;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

.detail-value {
  font-size: 15px;
  color: #333;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
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