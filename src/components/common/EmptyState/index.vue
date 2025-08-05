<template>
  <view class="empty-state">
    <view class="empty-icon">
      <text class="icon-text">{{ icon }}</text>
    </view>
    <text class="empty-title">{{ title }}</text>
    <text v-if="description" class="empty-description">{{ description }}</text>
    <view v-if="showButton" class="empty-action">
      <custom-button
        :type="buttonType"
        :size="buttonSize"
        :text="buttonText"
        @click="handleAction"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import CustomButton from '../CustomButton/index.vue'

interface Props {
  icon?: string
  title?: string
  description?: string
  showButton?: boolean
  buttonText?: string
  buttonType?: 'primary' | 'success' | 'warning' | 'danger' | 'default'
  buttonSize?: 'large' | 'medium' | 'small' | 'mini'
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📭',
  title: '暂无数据',
  description: '',
  showButton: false,
  buttonText: '刷新',
  buttonType: 'primary',
  buttonSize: 'medium'
})

const emit = defineEmits(['action'])

const handleAction = () => {
  emit('action')
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  text-align: center;
}

.empty-icon {
  margin-bottom: 32rpx;
}

.icon-text {
  font-size: 120rpx;
  opacity: 0.5;
}

.empty-title {
  font-size: 32rpx;
  color: var(--text-color);
  font-weight: 500;
  margin-bottom: 16rpx;
}

.empty-description {
  font-size: 28rpx;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 48rpx;
  max-width: 600rpx;
}

.empty-action {
  margin-top: 32rpx;
}
</style>