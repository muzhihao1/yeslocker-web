<template>
  <button 
    :class="['custom-button', `custom-button--${type}`, `custom-button--${size}`, {
      'custom-button--block': block,
      'custom-button--round': round,
      'custom-button--disabled': disabled,
      'custom-button--loading': loading
    }]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <view v-if="loading" class="loading-wrapper">
      <view class="loading-spinner"></view>
    </view>
    <text v-else class="button-text">
      <slot>{{ text }}</slot>
    </text>
  </button>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface Props {
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  size?: 'large' | 'medium' | 'small' | 'mini'
  text?: string
  disabled?: boolean
  loading?: boolean
  block?: boolean
  round?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'medium',
  text: '',
  disabled: false,
  loading: false,
  block: false,
  round: false
})

const emit = defineEmits(['click'])

const handleClick = (event: Event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.custom-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 32rpx;
  border: none;
  border-radius: 8rpx;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  outline: none;
}

/* Size variations */
.custom-button--large {
  height: 96rpx;
  font-size: 36rpx;
  padding: 0 48rpx;
}

.custom-button--medium {
  height: 80rpx;
  font-size: 32rpx;
  padding: 0 32rpx;
}

.custom-button--small {
  height: 64rpx;
  font-size: 28rpx;
  padding: 0 24rpx;
}

.custom-button--mini {
  height: 48rpx;
  font-size: 24rpx;
  padding: 0 16rpx;
}

/* Type variations */
.custom-button--primary {
  background-color: var(--primary-color);
  color: white;
}

.custom-button--primary:active {
  background-color: #0D5215;
}

.custom-button--success {
  background-color: var(--success-color);
  color: white;
}

.custom-button--success:active {
  background-color: #389e0d;
}

.custom-button--warning {
  background-color: var(--warning-color);
  color: white;
}

.custom-button--warning:active {
  background-color: #d48806;
}

.custom-button--danger {
  background-color: var(--error-color);
  color: white;
}

.custom-button--danger:active {
  background-color: #cf1322;
}

.custom-button--default {
  background-color: white;
  color: var(--text-color);
  border: 2rpx solid var(--border-color);
}

.custom-button--default:active {
  background-color: #f5f5f5;
}

/* Block style */
.custom-button--block {
  display: flex;
  width: 100%;
}

/* Round style */
.custom-button--round {
  border-radius: 999rpx;
}

/* Disabled state */
.custom-button--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Loading state */
.custom-button--loading {
  opacity: 0.8;
  cursor: wait;
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.button-text {
  line-height: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>