<template>
  <view :class="['card', {
    'card--shadow': shadow,
    'card--border': border,
    'card--clickable': clickable
  }]" @click="handleClick">
    <view v-if="title || $slots.header" class="card-header">
      <slot name="header">
        <text class="card-title">{{ title }}</text>
        <text v-if="subtitle" class="card-subtitle">{{ subtitle }}</text>
      </slot>
    </view>
    <view class="card-body" :style="{ padding: bodyPadding }">
      <slot></slot>
    </view>
    <view v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, useSlots } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  shadow?: boolean
  border?: boolean
  clickable?: boolean
  bodyPadding?: string
}

const props = withDefaults(defineProps<Props>(), {
  shadow: true,
  border: false,
  clickable: false,
  bodyPadding: '32rpx'
})

const emit = defineEmits(['click'])
const $slots = useSlots()

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.card {
  background-color: white;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  transition: all 0.3s ease;
}

.card--shadow {
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card--border {
  border: 2rpx solid var(--border-color);
}

.card--clickable {
  cursor: pointer;
}

.card--clickable:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  padding: 32rpx;
  border-bottom: 1rpx solid var(--border-color);
}

.card-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-color);
  display: block;
}

.card-subtitle {
  font-size: 26rpx;
  color: var(--text-secondary);
  margin-top: 8rpx;
  display: block;
}

.card-body {
  font-size: 30rpx;
  color: var(--text-color);
  line-height: 1.6;
}

.card-footer {
  padding: 24rpx 32rpx;
  border-top: 1rpx solid var(--border-color);
  background-color: #fafafa;
}
</style>