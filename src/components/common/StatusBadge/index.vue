<template>
  <view 
    :class="['status-badge', `status-badge--${type}`, {
      'status-badge--dot': dot,
      'status-badge--small': size === 'small',
      'status-badge--large': size === 'large'
    }]"
  >
    <view v-if="dot" class="status-dot"></view>
    <text class="status-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

interface Props {
  type?: 'success' | 'warning' | 'danger' | 'info' | 'default'
  text: string
  dot?: boolean
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  dot: false,
  size: 'medium'
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  transition: all 0.3s ease;
}

/* Size variations */
.status-badge--small {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
}

.status-badge--large {
  padding: 8rpx 24rpx;
  font-size: 28rpx;
}

/* Type variations */
.status-badge--success {
  background-color: rgba(82, 196, 26, 0.1);
  color: var(--success-color);
}

.status-badge--warning {
  background-color: rgba(250, 173, 20, 0.1);
  color: var(--warning-color);
}

.status-badge--danger {
  background-color: rgba(245, 34, 45, 0.1);
  color: var(--error-color);
}

.status-badge--info {
  background-color: rgba(27, 94, 32, 0.1);
  color: var(--primary-color);
}

.status-badge--default {
  background-color: #f5f5f5;
  color: var(--text-secondary);
}

/* Dot style */
.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 8rpx;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-badge--success .status-dot {
  background-color: var(--success-color);
}

.status-badge--warning .status-dot {
  background-color: var(--warning-color);
}

.status-badge--danger .status-dot {
  background-color: var(--error-color);
}

.status-badge--info .status-dot {
  background-color: var(--primary-color);
}

.status-badge--default .status-dot {
  background-color: var(--text-secondary);
}

.status-text {
  line-height: 1.2;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>