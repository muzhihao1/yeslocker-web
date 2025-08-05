<template>
  <view class="action-container">
    <!-- Header -->
    <view class="action-header">
      <view class="header-content">
        <text class="action-title">{{ actionTitle }}</text>
        <text class="locker-info">杆柜 {{ lockerNumber }} · {{ storeName }}</text>
      </view>
      <view class="action-icon-wrapper" :class="actionType">
        <text class="action-icon">{{ actionType === 'store' ? '📥' : '📤' }}</text>
      </view>
    </view>

    <!-- Steps progress -->
    <view class="steps-progress">
      <view 
        v-for="(step, index) in steps" 
        :key="index"
        class="step-item"
        :class="{ 
          'step-active': currentStep === index,
          'step-completed': currentStep > index 
        }"
      >
        <view class="step-indicator">
          <text v-if="currentStep > index" class="check-icon">✓</text>
          <text v-else class="step-number">{{ index + 1 }}</text>
        </view>
        <text class="step-text">{{ step.title }}</text>
      </view>
    </view>

    <!-- Step content -->
    <card class="step-content-card">
      <view class="step-content">
        <view class="step-header">
          <text class="step-title">{{ currentStepData.title }}</text>
          <status-badge 
            v-if="currentStepData.status"
            :type="currentStepData.status"
            :text="currentStepData.statusText"
          />
        </view>

        <view class="step-description">
          <text class="description-text">{{ currentStepData.description }}</text>
        </view>

        <!-- Step specific content -->
        <view v-if="currentStep === 0" class="step-verify">
          <view class="verify-info">
            <text class="verify-label">请确认以下信息：</text>
            <view class="info-item">
              <text class="info-label">姓名：</text>
              <text class="info-value">{{ userName }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">手机号：</text>
              <text class="info-value">{{ userPhone }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">杆柜编号：</text>
              <text class="info-value">{{ lockerNumber }}</text>
            </view>
          </view>
        </view>

        <view v-else-if="currentStep === 1" class="step-scan">
          <view class="scan-placeholder" @click="handleScan">
            <text class="scan-icon">📷</text>
            <text class="scan-text">点击扫描杆柜二维码</text>
          </view>
          <text class="scan-hint">请将镜头对准杆柜上的二维码</text>
        </view>

        <view v-else-if="currentStep === 2" class="step-action">
          <view v-if="actionType === 'store'" class="action-guide">
            <view class="guide-item">
              <text class="guide-number">1</text>
              <text class="guide-text">打开杆柜，将台球杆放入</text>
            </view>
            <view class="guide-item">
              <text class="guide-number">2</text>
              <text class="guide-text">确保杆具摆放整齐</text>
            </view>
            <view class="guide-item">
              <text class="guide-number">3</text>
              <text class="guide-text">关闭并锁好杆柜</text>
            </view>
          </view>
          
          <view v-else class="action-guide">
            <view class="guide-item">
              <text class="guide-number">1</text>
              <text class="guide-text">打开杆柜</text>
            </view>
            <view class="guide-item">
              <text class="guide-number">2</text>
              <text class="guide-text">取出您的台球杆</text>
            </view>
            <view class="guide-item">
              <text class="guide-number">3</text>
              <text class="guide-text">关闭杆柜，归还钥匙到吧台</text>
            </view>
          </view>

          <view class="action-timer" v-if="showTimer">
            <text class="timer-text">操作倒计时：{{ formatTime(countdown) }}</text>
            <loading-spinner size="small" />
          </view>
        </view>

        <view v-else-if="currentStep === 3" class="step-complete">
          <view class="success-icon">
            <text class="icon-text">✅</text>
          </view>
          <text class="success-title">{{ actionType === 'store' ? '存杆成功' : '取杆成功' }}</text>
          <text class="success-time">{{ formatDateTime(completedAt) }}</text>
          
          <view v-if="actionType === 'store'" class="reminder-card">
            <text class="reminder-title">温馨提示</text>
            <text class="reminder-text">请确保已将杆柜锁好，妥善保管您的物品安全</text>
          </view>
        </view>
      </view>

      <!-- Action buttons -->
      <view class="step-actions">
        <custom-button
          v-if="currentStep < steps.length - 1"
          type="primary"
          size="large"
          :text="currentStepData.buttonText || '下一步'"
          :loading="processing"
          :disabled="!canProceed"
          block
          @click="handleNextStep"
        />
        
        <custom-button
          v-else
          type="success"
          size="large"
          text="完成"
          block
          @click="handleComplete"
        />

        <custom-button
          v-if="currentStep > 0 && currentStep < steps.length - 1"
          type="default"
          size="medium"
          text="取消操作"
          block
          plain
          @click="handleCancel"
        />
      </view>
    </card>

    <!-- Cancel confirmation modal -->
    <modal
      v-model:visible="showCancelModal"
      title="确认取消"
      content="确定要取消本次操作吗？"
      @confirm="confirmCancel"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { lockersApi } from '@/services/api/lockers'
import { Card, CustomButton, StatusBadge, LoadingSpinner, Modal } from '@/components/common'
import dayjs from 'dayjs'

const authStore = useAuthStore()

// Route params
const actionType = ref<'store' | 'retrieve'>('store')
const lockerId = ref('')
const lockerNumber = ref('A03')
const storeName = ref('望京店')

// User info
const userName = computed(() => authStore.user?.name || '未设置')
const userPhone = computed(() => authStore.user?.phone || '')

// Steps data
const steps = computed(() => {
  if (actionType.value === 'store') {
    return [
      { title: '身份验证' },
      { title: '扫码开柜' },
      { title: '存放台球杆' },
      { title: '完成' }
    ]
  } else {
    return [
      { title: '身份验证' },
      { title: '扫码开柜' },
      { title: '取出台球杆' },
      { title: '完成' }
    ]
  }
})

// Current step
const currentStep = ref(0)
const processing = ref(false)
const canProceed = ref(true)
const showTimer = ref(false)
const countdown = ref(180) // 3 minutes
const countdownTimer = ref<any>(null)
const completedAt = ref(new Date())

// Modals
const showCancelModal = ref(false)

// Computed
const actionTitle = computed(() => {
  return actionType.value === 'store' ? '存放台球杆' : '取出台球杆'
})

const currentStepData = computed(() => {
  const step = steps.value[currentStep.value]
  
  switch (currentStep.value) {
    case 0:
      return {
        ...step,
        description: '请确认您的身份信息',
        buttonText: '确认信息'
      }
    case 1:
      return {
        ...step,
        description: '请扫描杆柜上的二维码以开启柜门',
        buttonText: '已扫描',
        status: 'warning' as const,
        statusText: '待扫描'
      }
    case 2:
      return {
        ...step,
        description: actionType.value === 'store' 
          ? '请按照指引完成存杆操作' 
          : '请按照指引完成取杆操作',
        buttonText: '完成操作'
      }
    case 3:
      return {
        ...step,
        description: actionType.value === 'store'
          ? '您的台球杆已安全存放'
          : '您已成功取出台球杆'
      }
    default:
      return step
  }
})

// Methods
const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatDateTime = (date: Date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const handleScan = () => {
  // 调用uni-app扫码功能
  uni.scanCode({
    scanType: ['qrCode'],
    success: (res) => {
      console.log('扫码结果:', res.result)
      
      // 验证二维码是否为当前杆柜
      if (validateLockerQRCode(res.result)) {
        uni.showToast({
          title: '扫描成功',
          icon: 'success'
        })
        canProceed.value = true
      } else {
        uni.showToast({
          title: '二维码不匹配',
          icon: 'none'
        })
      }
    },
    fail: (err) => {
      console.error('扫码失败:', err)
      // 在开发环境下，如果扫码失败，提供模拟功能
      if (process.env.NODE_ENV === 'development') {
        uni.showModal({
          title: '扫码失败',
          content: '是否使用模拟扫码？(仅开发环境)',
          success: (res) => {
            if (res.confirm) {
              simulateScan()
            }
          }
        })
      } else {
        uni.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        })
      }
    }
  })
}

// 验证二维码是否为当前杆柜
const validateLockerQRCode = (qrContent: string): boolean => {
  try {
    // 假设二维码格式为: {"lockerId":"xxx","lockerNumber":"xxx"}
    const qrData = JSON.parse(qrContent)
    return qrData.lockerId === lockerId.value && qrData.lockerNumber === lockerNumber.value
  } catch (error) {
    // 如果不是JSON格式，尝试简单字符串匹配
    return qrContent.includes(lockerId.value) || qrContent.includes(lockerNumber.value)
  }
}

// 模拟扫码（仅开发环境使用）
const simulateScan = () => {
  uni.showToast({
    title: '模拟扫描成功',
    icon: 'success'
  })
  canProceed.value = true
}

const handleNextStep = async () => {
  if (!canProceed.value) return

  processing.value = true
  
  try {
    // Handle different steps
    if (currentStep.value === 0) {
      // Identity verification - just proceed
      await new Promise(resolve => setTimeout(resolve, 500))
    } else if (currentStep.value === 1) {
      // QR code scan - check if scanned
      if (!canProceed.value) {
        uni.showToast({
          title: '请先扫描二维码',
          icon: 'none'
        })
        processing.value = false
        return
      }
    } else if (currentStep.value === 2) {
      // Actual operation - record to API
      await lockersApi.recordOperation({
        lockerId: lockerId.value,
        actionType: actionType.value,
        lockerNumber: lockerNumber.value,
        storeName: storeName.value
      })
      
      uni.showToast({
        title: actionType.value === 'store' ? '存杆成功' : '取杆成功',
        icon: 'success'
      })
    }
    
    // Special handling for step 2 (actual operation)
    if (currentStep.value === 1) {
      // Start timer for operation
      showTimer.value = true
      countdown.value = 180
      countdownTimer.value = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(countdownTimer.value)
          uni.showToast({
            title: '操作超时',
            icon: 'none'
          })
          handleCancel()
        }
      }, 1000)
    }
    
    // Move to next step
    currentStep.value++
    canProceed.value = currentStep.value === 1 ? false : true
    
    // Record completion time when reaching final step
    if (currentStep.value === steps.value.length - 1) {
      completedAt.value = new Date()
      showTimer.value = false
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
      }
    }
  } catch (error) {
    console.error('Operation error:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  } finally {
    processing.value = false
  }
}

const handleComplete = () => {
  uni.navigateBack()
}

const handleCancel = () => {
  showCancelModal.value = true
}

const confirmCancel = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
  uni.navigateBack()
}

// Lifecycle
onLoad((options) => {
  if (options?.type) {
    actionType.value = options.type as 'store' | 'retrieve'
  }
  if (options?.lockerId) {
    lockerId.value = options.lockerId
  }
  if (options?.lockerNumber) {
    lockerNumber.value = options.lockerNumber
  }
  if (options?.storeName) {
    storeName.value = options.storeName
  }
})

onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
})
</script>

<style scoped>
.action-container {
  min-height: 100vh;
  background-color: var(--background-color);
}

/* Header */
.action-header {
  background: linear-gradient(135deg, var(--primary-color), #2E7D32);
  color: white;
  padding: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content {
  flex: 1;
}

.action-title {
  font-size: 40rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.locker-info {
  font-size: 28rpx;
  opacity: 0.9;
}

.action-icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
}

.action-icon {
  font-size: 56rpx;
}

/* Steps progress */
.steps-progress {
  display: flex;
  padding: 40rpx;
  background-color: white;
  border-bottom: 1rpx solid var(--border-color);
}

.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 20rpx;
  left: 60%;
  right: -40%;
  height: 2rpx;
  background-color: var(--border-color);
  z-index: 1;
}

.step-item.step-completed:not(:last-child)::after {
  background-color: var(--success-color);
}

.step-indicator {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.step-active .step-indicator {
  background-color: var(--primary-color);
  color: white;
}

.step-completed .step-indicator {
  background-color: var(--success-color);
  color: white;
}

.step-number {
  font-size: 24rpx;
  font-weight: 500;
}

.check-icon {
  font-size: 20rpx;
  font-weight: bold;
}

.step-text {
  font-size: 26rpx;
  color: var(--text-secondary);
  text-align: center;
}

.step-active .step-text,
.step-completed .step-text {
  color: var(--text-color);
}

/* Step content */
.step-content-card {
  margin: 24rpx;
  min-height: 600rpx;
}

.step-content {
  padding: 32rpx 0;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.step-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-color);
}

.step-description {
  margin-bottom: 48rpx;
}

.description-text {
  font-size: 30rpx;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Step verify */
.verify-info {
  background-color: #f5f5f5;
  border-radius: 16rpx;
  padding: 32rpx;
}

.verify-label {
  font-size: 28rpx;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 24rpx;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: var(--text-secondary);
  margin-right: 24rpx;
}

.info-value {
  font-size: 30rpx;
  color: var(--text-color);
  font-weight: 500;
}

/* Step scan */
.scan-placeholder {
  width: 400rpx;
  height: 400rpx;
  margin: 0 auto 32rpx;
  background-color: #f5f5f5;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  border: 2rpx dashed var(--border-color);
  cursor: pointer;
}

.scan-placeholder:active {
  transform: scale(0.98);
}

.scan-icon {
  font-size: 80rpx;
}

.scan-text {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.scan-hint {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
}

/* Step action */
.action-guide {
  margin-bottom: 48rpx;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.guide-number {
  width: 48rpx;
  height: 48rpx;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.guide-text {
  font-size: 32rpx;
  color: var(--text-color);
  line-height: 48rpx;
}

.action-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 32rpx;
  background-color: rgba(250, 173, 20, 0.1);
  border-radius: 16rpx;
}

.timer-text {
  font-size: 32rpx;
  color: var(--warning-color);
  font-weight: 500;
}

/* Step complete */
.step-complete {
  text-align: center;
}

.success-icon {
  margin-bottom: 32rpx;
}

.icon-text {
  font-size: 120rpx;
}

.success-title {
  font-size: 40rpx;
  font-weight: 600;
  color: var(--success-color);
  display: block;
  margin-bottom: 16rpx;
}

.success-time {
  font-size: 28rpx;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 48rpx;
}

.reminder-card {
  background-color: rgba(82, 196, 26, 0.1);
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: left;
}

.reminder-title {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--success-color);
  display: block;
  margin-bottom: 16rpx;
}

.reminder-text {
  font-size: 28rpx;
  color: var(--text-color);
  line-height: 1.6;
}

/* Step actions */
.step-actions {
  margin-top: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
</style>