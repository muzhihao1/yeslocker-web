<template>
  <card 
    :class="['locker-card', { 'locker-card--occupied': isOccupied }]"
    :clickable="clickable"
    @click="handleClick"
  >
    <view class="locker-header">
      <view class="locker-number-wrapper">
        <text class="locker-icon">🎱</text>
        <text class="locker-number">{{ lockerNumber }}</text>
      </view>
      <status-badge
        :type="statusType"
        :text="statusText"
        :dot="true"
      />
    </view>
    
    <view v-if="isOccupied && userName" class="locker-user">
      <text class="user-label">使用者：</text>
      <text class="user-name">{{ userName }}</text>
    </view>
    
    <view v-if="lastActionTime" class="locker-time">
      <text class="time-label">最近操作：</text>
      <text class="time-value">{{ formatTime(lastActionTime) }}</text>
    </view>
    
    <view v-if="showActions" class="locker-actions">
      <custom-button
        v-if="!isOccupied"
        type="primary"
        size="small"
        text="申请使用"
        @click.stop="handleApply"
      />
      <custom-button
        v-if="isOccupied && isMyLocker"
        type="success"
        size="small"
        text="存取操作"
        @click.stop="handleAction"
      />
    </view>
  </card>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue'
import { Card, StatusBadge, CustomButton } from '@/components/common'
import dayjs from 'dayjs'

interface Props {
  lockerId: string
  lockerNumber: string
  status: 'available' | 'occupied' | 'maintenance'
  userId?: string
  userName?: string
  lastActionTime?: string
  isMyLocker?: boolean
  showActions?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMyLocker: false,
  showActions: true,
  clickable: true
})

const emit = defineEmits(['click', 'apply', 'action'])

const isOccupied = computed(() => props.status === 'occupied')

const statusType = computed(() => {
  switch (props.status) {
    case 'available':
      return 'success'
    case 'occupied':
      return 'warning'
    case 'maintenance':
      return 'danger'
    default:
      return 'default'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'available':
      return '可使用'
    case 'occupied':
      return '使用中'
    case 'maintenance':
      return '维护中'
    default:
      return '未知'
  }
})

const formatTime = (time: string) => {
  return dayjs(time).format('MM月DD日 HH:mm')
}

const handleClick = () => {
  emit('click', props.lockerId)
}

const handleApply = () => {
  emit('apply', props.lockerId)
}

const handleAction = () => {
  emit('action', props.lockerId)
}
</script>

<style scoped>
.locker-card {
  transition: all 0.3s ease;
}

.locker-card--occupied {
  background-color: rgba(250, 173, 20, 0.05);
}

.locker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.locker-number-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.locker-icon {
  font-size: 48rpx;
}

.locker-number {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-color);
}

.locker-user,
.locker-time {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.user-label,
.time-label {
  font-size: 28rpx;
  color: var(--text-secondary);
  margin-right: 16rpx;
}

.user-name,
.time-value {
  font-size: 28rpx;
  color: var(--text-color);
}

.locker-actions {
  margin-top: 24rpx;
  display: flex;
  gap: 20rpx;
}
</style>