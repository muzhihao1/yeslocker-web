<template>
  <view class="loading-spinner-container" v-if="show">
    <view class="loading-spinner-wrapper" :style="{ width: sizeMap[size], height: sizeMap[size] }">
      <view class="loading-spinner" :class="`loading-spinner--${color}`">
        <view class="spinner-dot" v-for="i in 4" :key="i"></view>
      </view>
      <text v-if="text" class="loading-text" :style="{ fontSize: textSizeMap[size] }">
        {{ text }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue'

interface Props {
  show?: boolean
  size?: 'large' | 'medium' | 'small'
  color?: 'primary' | 'white' | 'gray'
  text?: string
  fullScreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  size: 'medium',
  color: 'primary',
  text: '',
  fullScreen: false
})

const sizeMap = {
  large: '120rpx',
  medium: '80rpx',
  small: '48rpx'
}

const textSizeMap = {
  large: '32rpx',
  medium: '28rpx',
  small: '24rpx'
}
</script>

<style scoped>
.loading-spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.loading-spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.loading-spinner {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 100%;
}

.spinner-dot {
  position: absolute;
  width: 25%;
  height: 25%;
  border-radius: 50%;
  animation: spinner-animation 1.2s ease-in-out infinite;
}

.loading-spinner--primary .spinner-dot {
  background-color: var(--primary-color);
}

.loading-spinner--white .spinner-dot {
  background-color: white;
}

.loading-spinner--gray .spinner-dot {
  background-color: #999;
}

.spinner-dot:nth-child(1) {
  top: 0;
  left: 0;
}

.spinner-dot:nth-child(2) {
  top: 0;
  right: 0;
  animation-delay: -0.3s;
}

.spinner-dot:nth-child(3) {
  bottom: 0;
  right: 0;
  animation-delay: -0.6s;
}

.spinner-dot:nth-child(4) {
  bottom: 0;
  left: 0;
  animation-delay: -0.9s;
}

.loading-text {
  color: var(--text-secondary);
  margin-top: 8rpx;
}

@keyframes spinner-animation {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.5);
    opacity: 0.5;
  }
}
</style>