<template>
  <div class="loading-spinner-container">
    <div class="loading-spinner"></div>
    <span v-if="text" class="loading-text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'small' | 'medium' | 'large'
  text?: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  text: '',
  color: '#1B5E20'
})
</script>

<style scoped>
.loading-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.loading-spinner {
  border: 4rpx solid #e0e0e0;
  border-top: 4rpx solid #1B5E20;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner-container[data-size="small"] .loading-spinner {
  width: 32rpx;
  height: 32rpx;
}

.loading-spinner-container[data-size="medium"] .loading-spinner {
  width: 48rpx;
  height: 48rpx;
}

.loading-spinner-container[data-size="large"] .loading-spinner {
  width: 64rpx;
  height: 64rpx;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #666;
}
</style>