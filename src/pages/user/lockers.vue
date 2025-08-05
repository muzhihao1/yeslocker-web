<template>
  <view class="lockers-container">
    <!-- No locker state -->
    <view v-if="!userLocker" class="no-locker">
      <empty-state
        icon="🎱"
        title="您还没有杆柜"
        description="申请杆柜后即可享受专属存储服务"
        show-button
        button-text="申请杆柜"
        @action="goToApply"
      />
    </view>

    <!-- Has locker state -->
    <view v-else class="locker-content">
      <!-- Locker info card -->
      <card class="locker-info-card">
        <view class="locker-header">
          <view class="locker-title-section">
            <text class="locker-icon">🎱</text>
            <view class="locker-details">
              <text class="locker-number">杆柜 {{ userLocker.number }}</text>
              <text class="store-name">{{ userLocker.storeName }}</text>
            </view>
          </view>
          <status-badge
            :type="userLocker.status === 'approved' ? 'success' : 'warning'"
            :text="getStatusText(userLocker.status)"
          />
        </view>

        <view v-if="userLocker.status === 'approved'" class="locker-stats">
          <view class="stat-item">
            <text class="stat-value">{{ totalUsageCount }}</text>
            <text class="stat-label">使用次数</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ daysSinceLastUse }}</text>
            <text class="stat-label">天未使用</text>
          </view>
        </view>

        <view v-if="userLocker.status === 'pending'" class="pending-notice">
          <text class="notice-icon">⏳</text>
          <text class="notice-text">您的申请正在审核中，请耐心等待</text>
        </view>
      </card>

      <!-- Quick actions -->
      <view v-if="userLocker.status === 'approved'" class="quick-actions">
        <view class="action-button" @click="handleStore">
          <view class="action-icon-wrapper store">
            <text class="action-icon">📥</text>
          </view>
          <text class="action-text">存杆</text>
        </view>
        
        <view class="action-button" @click="handleRetrieve">
          <view class="action-icon-wrapper retrieve">
            <text class="action-icon">📤</text>
          </view>
          <text class="action-text">取杆</text>
        </view>
        
        <view class="action-button" @click="showQRCode">
          <view class="action-icon-wrapper qrcode">
            <text class="action-icon">📱</text>
          </view>
          <text class="action-text">凭证</text>
        </view>
      </view>

      <!-- Recent records -->
      <card v-if="userLocker.status === 'approved'" title="最近记录" class="records-card">
        <view v-if="recentRecords.length === 0" class="no-records">
          <text class="no-records-text">暂无使用记录</text>
        </view>
        
        <view v-else class="record-list">
          <record-item
            v-for="record in recentRecords"
            :key="record.id"
            :record="record"
            @click="viewRecordDetail"
          />
        </view>
        
        <view class="view-all" @click="viewAllRecords">
          <text class="view-all-text">查看全部记录</text>
          <text class="view-all-arrow">›</text>
        </view>
      </card>
    </view>

    <!-- Action confirmation modal -->
    <modal
      v-model:visible="showActionModal"
      :title="actionType === 'store' ? '确认存杆' : '确认取杆'"
      @confirm="confirmAction"
      :confirm-loading="processing"
    >
      <view class="modal-content">
        <text class="modal-text">
          {{ actionType === 'store' 
            ? '确认要存放台球杆吗？' 
            : '确认要取出台球杆吗？' }}
        </text>
        <text class="modal-hint">
          操作完成后请记得{{ actionType === 'store' ? '锁好杆柜' : '归还钥匙到吧台' }}
        </text>
      </view>
    </modal>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { lockersApi } from '@/services/api/lockers'
import { Card, EmptyState, StatusBadge, Modal } from '@/components/common'
import { RecordItem } from '@/components/business'
import type { Locker, LockerRecord } from '@/types/user'
import dayjs from 'dayjs'

const authStore = useAuthStore()

// Data
const userLocker = ref<Locker | null>(null)
const recentRecords = ref<LockerRecord[]>([])

// States
const showActionModal = ref(false)
const actionType = ref<'store' | 'retrieve'>('store')
const processing = ref(false)
const loading = ref(false)

// Computed
const totalUsageCount = computed(() => {
  return recentRecords.value.length
})

const daysSinceLastUse = computed(() => {
  if (!userLocker.value?.lastUseTime) return 0
  return dayjs().diff(dayjs(userLocker.value.lastUseTime), 'day')
})

// Methods
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '审核中'
    case 'approved':
      return '使用中'
    case 'rejected':
      return '已驳回'
    default:
      return '未知'
  }
}

const goToApply = () => {
  uni.navigateTo({
    url: '/pages/user/apply'
  })
}

const handleStore = () => {
  actionType.value = 'store'
  showActionModal.value = true
}

const handleRetrieve = () => {
  actionType.value = 'retrieve'
  showActionModal.value = true
}

const confirmAction = async () => {
  processing.value = true
  
  try {
    // Navigate to action page
    uni.navigateTo({
      url: `/pages/locker/action?type=${actionType.value}&lockerId=${userLocker.value.id}&lockerNumber=${userLocker.value.number}&storeName=${userLocker.value.storeName}`
    })
    
    showActionModal.value = false
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  } finally {
    processing.value = false
  }
}

const showQRCode = () => {
  uni.navigateTo({
    url: '/pages/locker/qrcode'
  })
}

const viewRecordDetail = (record: any) => {
  console.log('View record detail:', record)
}

const viewAllRecords = () => {
  uni.navigateTo({
    url: '/pages/user/records'
  })
}

const loadUserLocker = async () => {
  if (!authStore.user) return
  
  loading.value = true
  try {
    const locker = await lockersApi.getUserLocker(authStore.user.id)
    userLocker.value = locker
    
    // Load records if user has an approved locker
    if (locker && locker.status === 'approved') {
      await loadRecentRecords()
    }
  } catch (error) {
    console.error('Failed to load user locker:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const loadRecentRecords = async () => {
  if (!authStore.user) return
  
  try {
    const records = await lockersApi.getUserLockerRecords(authStore.user.id, 5)
    recentRecords.value = records
  } catch (error) {
    console.error('Failed to load records:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadUserLocker()
})
</script>

<style scoped>
.lockers-container {
  min-height: 100vh;
  background-color: var(--background-color);
  padding: 24rpx;
}

/* No locker state */
.no-locker {
  padding-top: 200rpx;
}

/* Locker content */
.locker-content {
  animation: fadeIn 0.3s ease;
}

/* Locker info card */
.locker-info-card {
  margin-bottom: 32rpx;
  background: linear-gradient(135deg, #f8f8f8 0%, white 100%);
}

.locker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.locker-title-section {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.locker-icon {
  font-size: 60rpx;
}

.locker-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.locker-number {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-color);
}

.store-name {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.locker-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
  padding: 32rpx 0;
  background-color: #f8f8f8;
  border-radius: 16rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 48rpx;
  font-weight: bold;
  color: var(--primary-color);
  display: block;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background-color: var(--border-color);
}

.pending-notice {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background-color: rgba(250, 173, 20, 0.1);
  border-radius: 12rpx;
}

.notice-icon {
  font-size: 36rpx;
}

.notice-text {
  font-size: 28rpx;
  color: var(--warning-color);
}

/* Quick actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx 20rpx;
  background-color: white;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.action-button:active {
  transform: scale(0.95);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.08);
}

.action-icon-wrapper {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
}

.action-icon-wrapper.store {
  background-color: rgba(82, 196, 26, 0.1);
}

.action-icon-wrapper.retrieve {
  background-color: rgba(27, 94, 32, 0.1);
}

.action-icon-wrapper.qrcode {
  background-color: rgba(255, 160, 0, 0.1);
}

.action-icon {
  font-size: 48rpx;
}

.action-text {
  font-size: 28rpx;
  color: var(--text-color);
}

/* Records card */
.records-card {
  margin-bottom: 32rpx;
}

.no-records {
  padding: 60rpx 0;
  text-align: center;
}

.no-records-text {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.view-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 0;
  cursor: pointer;
}

.view-all-text {
  font-size: 28rpx;
  color: var(--primary-color);
}

.view-all-arrow {
  font-size: 32rpx;
  color: var(--primary-color);
}

/* Modal content */
.modal-content {
  text-align: center;
  padding: 20rpx 0;
}

.modal-text {
  font-size: 32rpx;
  color: var(--text-color);
  display: block;
  margin-bottom: 16rpx;
}

.modal-hint {
  font-size: 28rpx;
  color: var(--text-secondary);
  display: block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>