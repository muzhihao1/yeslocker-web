<template>
  <view v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <view class="modal-container" @click.stop>
      <view v-if="title || showClose" class="modal-header">
        <text class="modal-title">{{ title }}</text>
        <view v-if="showClose" class="modal-close" @click="handleClose">
          <text class="close-icon">✕</text>
        </view>
      </view>
      <view class="modal-body">
        <slot>
          <text class="modal-content">{{ content }}</text>
        </slot>
      </view>
      <view v-if="showFooter" class="modal-footer">
        <slot name="footer">
          <custom-button
            v-if="showCancel"
            type="default"
            size="medium"
            :text="cancelText"
            @click="handleCancel"
          />
          <custom-button
            v-if="showConfirm"
            type="primary"
            size="medium"
            :text="confirmText"
            :loading="confirmLoading"
            @click="handleConfirm"
          />
        </slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import CustomButton from '../CustomButton/index.vue'

interface Props {
  visible: boolean
  title?: string
  content?: string
  showClose?: boolean
  showFooter?: boolean
  showCancel?: boolean
  showConfirm?: boolean
  cancelText?: string
  confirmText?: string
  confirmLoading?: boolean
  closeOnClickOverlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  content: '',
  showClose: true,
  showFooter: true,
  showCancel: true,
  showConfirm: true,
  cancelText: '取消',
  confirmText: '确定',
  confirmLoading: false,
  closeOnClickOverlay: true
})

const emit = defineEmits(['update:visible', 'close', 'cancel', 'confirm'])

const handleOverlayClick = () => {
  if (props.closeOnClickOverlay) {
    handleClose()
  }
}

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleCancel = () => {
  emit('update:visible', false)
  emit('cancel')
}

const handleConfirm = () => {
  emit('confirm')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  animation: fadeIn 0.3s ease;
}

.modal-container {
  width: 90%;
  max-width: 600rpx;
  background-color: white;
  border-radius: 24rpx;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid var(--border-color);
}

.modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-color);
}

.modal-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-icon {
  font-size: 36rpx;
  color: var(--text-secondary);
}

.modal-body {
  padding: 48rpx 32rpx;
}

.modal-content {
  font-size: 30rpx;
  color: var(--text-color);
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid var(--border-color);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(40rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>