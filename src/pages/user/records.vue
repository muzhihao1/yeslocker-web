<template>
  <view class="records-container">
    <!-- Header with filters -->
    <view class="records-header">
      <text class="header-title">使用记录</text>
      <view class="filter-tabs">
        <view
          v-for="filter in filters"
          :key="filter.value"
          :class="['filter-tab', { 'filter-tab--active': activeFilter === filter.value }]"
          @click="setFilter(filter.value)"
        >
          <text class="filter-text">{{ filter.label }}</text>
          <view v-if="activeFilter === filter.value" class="filter-indicator"></view>
        </view>
      </view>
    </view>

    <!-- Date range selector -->
    <view class="date-selector" v-if="activeFilter === 'custom'">
      <view class="date-item" @click="selectStartDate">
        <text class="date-label">开始日期</text>
        <text class="date-value">{{ startDate || '请选择' }}</text>
      </view>
      <text class="date-separator">至</text>
      <view class="date-item" @click="selectEndDate">
        <text class="date-label">结束日期</text>
        <text class="date-value">{{ endDate || '请选择' }}</text>
      </view>
    </view>

    <!-- Records list -->
    <view v-if="loading" class="loading-container">
      <loading-spinner size="large" text="加载中..." />
    </view>

    <view v-else-if="filteredRecords.length === 0" class="empty-container">
      <empty-state
        icon="📋"
        title="暂无记录"
        description="您在该时间段内没有使用记录"
      />
    </view>

    <view v-else class="records-list">
      <!-- Group by date -->
      <view v-for="group in groupedRecords" :key="group.date" class="date-group">
        <view class="date-header">
          <text class="date-title">{{ formatGroupDate(group.date) }}</text>
          <text class="date-count">{{ group.records.length }}条记录</text>
        </view>
        
        <view class="group-records">
          <view
            v-for="record in group.records"
            :key="record.id"
            class="record-item"
            @click="viewRecordDetail(record)"
          >
            <view class="record-icon-wrapper" :class="record.actionType">
              <text class="record-icon">{{ record.actionType === 'store' ? '📥' : '📤' }}</text>
            </view>
            
            <view class="record-content">
              <view class="record-main">
                <text class="record-action">{{ getActionText(record.actionType) }}</text>
                <text class="record-locker">杆柜 {{ record.lockerNumber }}</text>
              </view>
              <view class="record-meta">
                <text class="record-store">{{ record.storeName }}</text>
                <text class="record-time">{{ formatTime(record.createdAt) }}</text>
              </view>
            </view>
            
            <text class="record-arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Statistics summary -->
    <card v-if="!loading && filteredRecords.length > 0" title="统计概览" class="stats-card">
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-value">{{ totalCount }}</text>
          <text class="stat-label">总次数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ storeCount }}</text>
          <text class="stat-label">存杆次数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ retrieveCount }}</text>
          <text class="stat-label">取杆次数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ avgDuration }}</text>
          <text class="stat-label">平均存放时长</text>
        </view>
      </view>
    </card>

    <!-- Load more -->
    <view v-if="hasMore && !loading" class="load-more" @click="loadMore">
      <text class="load-more-text">加载更多</text>
    </view>

    <!-- Record detail modal -->
    <modal
      v-model:visible="showDetailModal"
      title="操作详情"
      :show-footer="false"
    >
      <view v-if="selectedRecord" class="detail-content">
        <view class="detail-item">
          <text class="detail-label">操作类型</text>
          <text class="detail-value">{{ getActionText(selectedRecord.actionType) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">杆柜编号</text>
          <text class="detail-value">{{ selectedRecord.lockerNumber }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">所属门店</text>
          <text class="detail-value">{{ selectedRecord.storeName }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">操作时间</text>
          <text class="detail-value">{{ formatDateTime(selectedRecord.createdAt) }}</text>
        </view>
        <view v-if="selectedRecord.duration" class="detail-item">
          <text class="detail-label">存放时长</text>
          <text class="detail-value">{{ formatDuration(selectedRecord.duration) }}</text>
        </view>
        <view v-if="selectedRecord.note" class="detail-item">
          <text class="detail-label">备注</text>
          <text class="detail-value">{{ selectedRecord.note }}</text>
        </view>
      </view>
    </modal>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Card, LoadingSpinner, EmptyState, Modal } from '@/components/common'
import dayjs from 'dayjs'
import type { LockerRecord } from '@/types/user'

const authStore = useAuthStore()

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

// Mock data
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

// Computed
const filteredRecords = computed(() => {
  let records = [...allRecords.value]
  const now = dayjs()
  
  switch (activeFilter.value) {
    case 'week':
      records = records.filter(r => 
        dayjs(r.createdAt).isAfter(now.subtract(7, 'day'))
      )
      break
    case 'month':
      records = records.filter(r => 
        dayjs(r.createdAt).isAfter(now.subtract(1, 'month'))
      )
      break
    case 'quarter':
      records = records.filter(r => 
        dayjs(r.createdAt).isAfter(now.subtract(3, 'month'))
      )
      break
    case 'custom':
      if (startDate.value && endDate.value) {
        records = records.filter(r => {
          const date = dayjs(r.createdAt)
          return date.isAfter(dayjs(startDate.value)) && 
                 date.isBefore(dayjs(endDate.value).endOf('day'))
        })
      }
      break
  }
  
  return records.sort((a, b) => 
    dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
  )
})

const groupedRecords = computed(() => {
  const groups: { date: string; records: LockerRecord[] }[] = []
  const grouped: Record<string, LockerRecord[]> = {}
  
  filteredRecords.value.forEach(record => {
    const date = dayjs(record.createdAt).format('YYYY-MM-DD')
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(record)
  })
  
  Object.keys(grouped)
    .sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf())
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

const selectStartDate = () => {
  const now = dayjs()
  uni.showModal({
    title: '选择开始日期',
    editable: true,
    placeholderText: 'YYYY-MM-DD',
    success: (res) => {
      if (res.confirm && res.content) {
        startDate.value = res.content
      }
    }
  })
}

const selectEndDate = () => {
  uni.showModal({
    title: '选择结束日期',
    editable: true,
    placeholderText: 'YYYY-MM-DD',
    success: (res) => {
      if (res.confirm && res.content) {
        endDate.value = res.content
      }
    }
  })
}

const formatGroupDate = (date: string) => {
  const d = dayjs(date)
  const today = dayjs().startOf('day')
  const yesterday = today.subtract(1, 'day')
  
  if (d.isSame(today, 'day')) {
    return '今天'
  } else if (d.isSame(yesterday, 'day')) {
    return '昨天'
  } else if (d.isSame(today, 'year')) {
    return d.format('MM月DD日')
  } else {
    return d.format('YYYY年MM月DD日')
  }
}

const formatTime = (datetime: string) => {
  return dayjs(datetime).format('HH:mm')
}

const formatDateTime = (datetime: string) => {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm:ss')
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

const loadRecords = async () => {
  loading.value = true
  try {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Records are already loaded in mock data
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
    title: '没有更多记录了',
    icon: 'none'
  })
}

// Lifecycle
onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.records-container {
  min-height: 100vh;
  background-color: var(--background-color);
}

/* Header */
.records-header {
  background-color: white;
  padding: 32rpx 32rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.header-title {
  font-size: 40rpx;
  font-weight: bold;
  color: var(--text-color);
  display: block;
  margin-bottom: 32rpx;
}

.filter-tabs {
  display: flex;
  gap: 32rpx;
  overflow-x: auto;
  padding-bottom: 2rpx;
}

.filter-tab {
  position: relative;
  padding: 16rpx 8rpx;
  cursor: pointer;
  white-space: nowrap;
}

.filter-text {
  font-size: 30rpx;
  color: var(--text-secondary);
  transition: color 0.3s;
}

.filter-tab--active .filter-text {
  color: var(--primary-color);
  font-weight: 500;
}

.filter-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background-color: var(--primary-color);
  border-radius: 2rpx;
}

/* Date selector */
.date-selector {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background-color: white;
  border-bottom: 1rpx solid var(--border-color);
}

.date-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  cursor: pointer;
}

.date-item:active {
  background-color: #eeeeee;
}

.date-label {
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 8rpx;
}

.date-value {
  font-size: 28rpx;
  color: var(--text-color);
}

.date-separator {
  margin: 0 24rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}

/* Loading and empty */
.loading-container,
.empty-container {
  padding: 200rpx 0;
}

/* Records list */
.records-list {
  padding: 24rpx;
}

.date-group {
  margin-bottom: 32rpx;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}

.date-title {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--text-color);
}

.date-count {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.group-records {
  background-color: white;
  border-radius: 16rpx;
  overflow: hidden;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--border-color);
  cursor: pointer;
}

.record-item:last-child {
  border-bottom: none;
}

.record-item:active {
  background-color: #f5f5f5;
}

.record-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.record-icon-wrapper.store {
  background-color: rgba(82, 196, 26, 0.1);
}

.record-icon-wrapper.retrieve {
  background-color: rgba(27, 94, 32, 0.1);
}

.record-icon {
  font-size: 40rpx;
}

.record-content {
  flex: 1;
}

.record-main {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.record-action {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--text-color);
}

.record-locker {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.record-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.record-store,
.record-time {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.record-arrow {
  font-size: 32rpx;
  color: var(--text-secondary);
}

/* Statistics */
.stats-card {
  margin: 0 24rpx 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32rpx;
}

.stat-item {
  text-align: center;
  padding: 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 26rpx;
  color: var(--text-secondary);
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

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 30rpx;
  color: var(--text-color);
  text-align: right;
  max-width: 60%;
}
</style>