<template>
  <view class="input-field">
    <view v-if="label" class="input-label">
      <text class="label-text">{{ label }}</text>
      <text v-if="required" class="required-mark">*</text>
    </view>
    <view :class="['input-wrapper', {
      'input-wrapper--focus': isFocused,
      'input-wrapper--error': error,
      'input-wrapper--disabled': disabled
    }]">
      <view v-if="prefixIcon" class="input-icon prefix-icon">
        <text>{{ prefixIcon }}</text>
      </view>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :password="password"
        class="input-control"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @confirm="handleConfirm"
      />
      <view v-if="clearable && modelValue" class="input-icon suffix-icon" @click="handleClear">
        <text>✕</text>
      </view>
      <view v-if="suffixIcon && !clearable" class="input-icon suffix-icon">
        <text>{{ suffixIcon }}</text>
      </view>
    </view>
    <view v-if="error" class="error-message">
      <text class="error-text">{{ errorMessage }}</text>
    </view>
    <view v-if="hint && !error" class="hint-message">
      <text class="hint-text">{{ hint }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'

interface Props {
  modelValue: string
  type?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  password?: boolean
  maxlength?: number
  error?: boolean
  errorMessage?: string
  hint?: string
  prefixIcon?: string
  suffixIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '请输入',
  required: false,
  disabled: false,
  clearable: false,
  password: false,
  maxlength: -1,
  error: false,
  errorMessage: '',
  hint: ''
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'confirm', 'clear'])

const isFocused = ref(false)

const handleInput = (event: any) => {
  emit('update:modelValue', event.detail.value)
}

const handleFocus = (event: any) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: any) => {
  isFocused.value = false
  emit('blur', event)
}

const handleConfirm = (event: any) => {
  emit('confirm', event)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style scoped>
.input-field {
  margin-bottom: 32rpx;
}

.input-label {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.label-text {
  font-size: 30rpx;
  color: var(--text-color);
  font-weight: 500;
}

.required-mark {
  color: var(--error-color);
  margin-left: 8rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  border: 2rpx solid var(--border-color);
  border-radius: 12rpx;
  padding: 0 24rpx;
  height: 88rpx;
  transition: all 0.3s ease;
}

.input-wrapper--focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4rpx rgba(27, 94, 32, 0.1);
}

.input-wrapper--error {
  border-color: var(--error-color);
}

.input-wrapper--disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.input-control {
  flex: 1;
  height: 100%;
  font-size: 32rpx;
  color: var(--text-color);
  background: transparent;
  border: none;
  outline: none;
}

.input-control:disabled {
  color: #999;
  cursor: not-allowed;
}

.input-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  font-size: 32rpx;
  color: var(--text-secondary);
}

.prefix-icon {
  margin-right: 16rpx;
}

.suffix-icon {
  margin-left: 16rpx;
  cursor: pointer;
}

.error-message,
.hint-message {
  margin-top: 8rpx;
  padding: 0 4rpx;
}

.error-text {
  font-size: 24rpx;
  color: var(--error-color);
}

.hint-text {
  font-size: 24rpx;
  color: var(--text-secondary);
}
</style>