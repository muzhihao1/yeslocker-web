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
    <div v-if="loading" class="loading-wrapper">
      <div class="loading-spinner"></div>
    </div>
    <span v-else class="button-text">
      <slot>{{ text }}</slot>
    </span>
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
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  outline: none;
}

/* Size variations */
.custom-button--large {
  height: 48px;
  font-size: 18px;
  padding: 0 24px;
}

.custom-button--medium {
  height: 40px;
  font-size: 16px;
  padding: 0 16px;
}

.custom-button--small {
  height: 32px;
  font-size: 14px;
  padding: 0 12px;
}

.custom-button--mini {
  height: 24px;
  font-size: 12px;
  padding: 0 8px;
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
  border: 1px solid var(--border-color);
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
  border-radius: 999px;
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
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
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