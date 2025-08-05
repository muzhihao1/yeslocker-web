<template>
  <view class="record-item" @click="handleClick">
    <view class="record-icon">
      <text :class="['icon', `icon--${record.actionType}`]">
        {{ record.actionType === 'store' ? '📥' : '📤' }}
      </text>
    </view>
    
    <view class="record-content">
      <view class="record-header">
        <text class="record-action">
          {{ record.actionType === 'store' ? '存杆' : '取杆' }}
        </text>
        <text class="record-time">{{ formatTime(record.createdAt) }}</text>
      </view>
      
      <view class="record-details">
        <text class="detail-item">杆柜编号：{{ record.lockerNumber }}</text>
        <text class="detail-item">门店：{{ record.storeName }}</text>
      </view>
      
      <view v-if="record.note" class="record-note">
        <text class="note-text">备注：{{ record.note }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

interface RecordData {
  id: string
  actionType: 'store' | 'retrieve'
  lockerNumber: string
  storeName: string
  createdAt: string
  note?: string
}

interface Props {
  record: RecordData
}

const props = defineProps<Props>()
const emit = defineEmits(['click'])

const formatTime = (time: string) => {
  const diff = dayjs().diff(dayjs(time), 'hour')
  if (diff < 24) {
    return dayjs(time).fromNow()
  }
  return dayjs(time).format('MM月DD日 HH:mm')
}

const handleClick = () => {
  emit('click', props.record)
}
</script>

<style scoped>
.record-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  padding: 32rpx;
  background-color: white;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.record-item:active {
  transform: scale(0.98);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.08);
}

.record-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background-color: #f5f5f5;
}

.icon {
  font-size: 48rpx;
}

.icon--store {
  color: var(--success-color);
}

.icon--retrieve {
  color: var(--primary-color);
}

.record-content {
  flex: 1;
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.record-action {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--text-color);
}

.record-time {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.record-details {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.detail-item {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.record-note {
  padding-top: 12rpx;
  border-top: 1rpx solid var(--border-color);
}

.note-text {
  font-size: 26rpx;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>