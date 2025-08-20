<template>
  <div class="action-container">
    <!-- Header -->
    <div class="action-header">
      <div class="header-content">
        <h1 class="action-title">{{ actionTitle }}</h1>
        <p class="locker-info">杆柜 {{ lockerNumber }} · {{ storeName }}</p>
      </div>
      <div class="action-icon-wrapper" :class="actionType">
        <span class="action-icon">{{ actionType === 'store' ? '📥' : '📤' }}</span>
      </div>
    </div>

    <!-- Steps progress -->
    <div class="steps-progress">
      <div 
        v-for="(step, index) in steps" 
        :key="index"
        class="step-item"
        :class="{ 
          'step-active': currentStep === index,
          'step-completed': currentStep > index 
        }"
      >
        <div class="step-indicator">
          <span v-if="currentStep > index" class="check-icon">✓</span>
          <span v-else class="step-number">{{ index + 1 }}</span>
        </div>
        <span class="step-text">{{ step.title }}</span>
      </div>
    </div>

    <!-- Step content -->
    <div class="section-card step-content-card">
      <div class="step-content">
        <div class="step-header">
          <h2 class="step-title">{{ currentStepData.title }}</h2>
          <div 
            v-if="currentStepData.status"
            :class="['status-badge', currentStepData.status]"
          >
            {{ currentStepData.statusText }}
          </div>
        </div>

        <div class="step-description">
          <p class="description-text">{{ currentStepData.description }}</p>
        </div>

        <!-- Step specific content -->
        <div v-if="currentStep === 0" class="step-verify">
          <div class="verify-info">
            <p class="verify-label">请确认以下信息：</p>
            <div class="info-item">
              <span class="info-label">姓名：</span>
              <span class="info-value">{{ userName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">手机号：</span>
              <span class="info-value">{{ userPhone }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">杆柜编号：</span>
              <span class="info-value">{{ lockerNumber }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 1" class="step-voucher">
          <div v-if="voucherLoading" class="voucher-loading">
            <div class="loading-spinner"></div>
            <p>正在生成凭证...</p>
          </div>
          
          <div v-else-if="voucherError" class="voucher-error">
            <span class="error-icon">❌</span>
            <p class="error-text">{{ voucherError }}</p>
            <button class="retry-button" @click="requestVoucher">重试</button>
          </div>
          
          <div v-else-if="currentVoucher" class="voucher-display">
            <div class="voucher-header">
              <h3 class="voucher-title">操作凭证</h3>
              <div class="voucher-code">{{ currentVoucher.code }}</div>
            </div>
            
            <div class="voucher-qr">
              <img :src="currentVoucher.qr_data" alt="凭证二维码" class="qr-image">
            </div>
            
            <div class="voucher-info">
              <div class="info-row">
                <span class="info-label">用户：</span>
                <span class="info-value">{{ currentVoucher.user_info.name }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">手机：</span>
                <span class="info-value">{{ currentVoucher.user_info.phone }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">操作：</span>
                <span class="info-value">{{ currentVoucher.operation_type === 'store' ? '存放' : '取回' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">有效期：</span>
                <span class="info-value timer">{{ formatTime(voucherTimeRemaining) }}</span>
              </div>
            </div>
            
            <p class="voucher-hint">请向工作人员出示此凭证</p>
            
            <!-- Development: Simulate verification -->
            <button 
              v-if="!scanSuccess" 
              class="simulate-verify-btn" 
              @click="simulateStaffVerification"
            >
              模拟工作人员验证 (开发环境)
            </button>
          </div>
        </div>

        <div v-else-if="currentStep === 2" class="step-action">
          <div v-if="actionType === 'store'" class="action-guide">
            <div class="guide-item">
              <span class="guide-number">1</span>
              <span class="guide-text">打开杆柜，将台球杆放入</span>
            </div>
            <div class="guide-item">
              <span class="guide-number">2</span>
              <span class="guide-text">确保杆具摆放整齐</span>
            </div>
            <div class="guide-item">
              <span class="guide-number">3</span>
              <span class="guide-text">关闭并锁好杆柜</span>
            </div>
          </div>
          
          <div v-else class="action-guide">
            <div class="guide-item">
              <span class="guide-number">1</span>
              <span class="guide-text">打开杆柜</span>
            </div>
            <div class="guide-item">
              <span class="guide-number">2</span>
              <span class="guide-text">取出您的台球杆</span>
            </div>
            <div class="guide-item">
              <span class="guide-number">3</span>
              <span class="guide-text">关闭杆柜，归还钥匙到吧台</span>
            </div>
          </div>

          <div class="action-timer" v-if="showTimer">
            <span class="timer-text">操作倒计时：{{ formatTime(countdown) }}</span>
            <div class="loading-spinner small"></div>
          </div>
        </div>

        <div v-else-if="currentStep === 3" class="step-complete">
          <div class="success-icon">
            <span class="icon-text">✅</span>
          </div>
          <h3 class="success-title">{{ actionType === 'store' ? '存杆成功' : '取杆成功' }}</h3>
          <p class="success-time">{{ formatDateTime(completedAt) }}</p>
          
          <div v-if="actionType === 'store'" class="reminder-card">
            <h4 class="reminder-title">温馨提示</h4>
            <p class="reminder-text">请确保已将杆柜锁好，妥善保管您的物品安全</p>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="step-actions">
        <button
          v-if="currentStep < steps.length - 1"
          class="action-button primary"
          :class="{ 'button-disabled': !canProceed }"
          :disabled="!canProceed || processing"
          @click="handleNextStep"
        >
          <span v-if="processing" class="loading-spinner small"></span>
          {{ processing ? '处理中...' : (currentStepData.buttonText || '下一步') }}
        </button>
        
        <button
          v-else
          class="action-button success"
          @click="handleComplete"
        >
          完成
        </button>

        <button
          v-if="currentStep > 0 && currentStep < steps.length - 1"
          class="action-button secondary"
          @click="handleCancel"
        >
          取消操作
        </button>
      </div>
    </div>

    <!-- Cancel confirmation modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click="closeCancelModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">确认取消</h3>
          <button class="modal-close" @click="closeCancelModal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-text">确定要取消本次操作吗？</p>
        </div>
        <div class="modal-footer">
          <button class="modal-button secondary" @click="closeCancelModal">取消</button>
          <button class="modal-button primary" @click="confirmCancel">确认</button>
        </div>
      </div>
    </div>

    <!-- QR Scanner Modal (Web simulation) -->
    <div v-if="showScannerModal" class="modal-overlay" @click="closeScannerModal">
      <div class="scanner-modal" @click.stop>
        <div class="scanner-header">
          <h3 class="scanner-title">扫描二维码</h3>
          <button class="modal-close" @click="closeScannerModal">×</button>
        </div>
        <div class="scanner-body">
          <div class="scanner-frame">
            <div class="scanner-overlay"></div>
            <p class="scanner-hint">将杆柜二维码对准扫描框</p>
          </div>
          <button class="simulate-scan-btn" @click="simulateScan">
            模拟扫描成功 (开发环境)
          </button>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'
import { lockersApi } from '@/services/api/lockers-vue'
import { vouchersApi } from '@/services/api/vouchers-vue'
import type { Voucher } from '@/services/api/vouchers-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Route params
const actionType = ref<'store' | 'retrieve'>('store')
const lockerId = ref('')
const lockerNumber = ref('')
const storeName = ref('')

// User info
const userName = computed(() => authStore.user?.name || '未设置')
const userPhone = computed(() => authStore.user?.phone || '')

// Steps data
const steps = computed(() => {
  if (actionType.value === 'store') {
    return [
      { title: '身份确认' },
      { title: '获取凭证' },
      { title: '存放台球杆' },
      { title: '完成' }
    ]
  } else {
    return [
      { title: '身份确认' },
      { title: '获取凭证' },
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

// Voucher states
const currentVoucher = ref<Voucher | null>(null)
const voucherLoading = ref(false)
const voucherError = ref('')
const voucherTimeRemaining = ref(0)
const voucherTimer = ref<any>(null)

// QR Scanner states
const showScannerModal = ref(false)
const scanSuccess = ref(false)

// Modals
const showCancelModal = ref(false)

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

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
        description: '请向工作人员出示凭证验证身份',
        buttonText: '已验证',
        status: scanSuccess.value ? 'success' : 'warning',
        statusText: scanSuccess.value ? '已验证' : '待验证'
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
const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatDateTime = (date: Date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Request voucher for operation
const requestVoucher = async () => {
  voucherLoading.value = true
  voucherError.value = ''
  
  try {
    const user = authStore.user
    if (!user) {
      throw new Error('请先登录')
    }
    
    // Validate required parameters
    if (!lockerId.value) {
      throw new Error('缺少杆柜ID参数')
    }
    
    if (!actionType.value) {
      throw new Error('缺少操作类型参数')
    }
    
    console.log('请求凭证参数:', {
      user_id: user.id,
      locker_id: lockerId.value,
      operation_type: actionType.value
    })
    
    const voucher = await vouchersApi.requestVoucher({
      user_id: user.id,
      locker_id: lockerId.value,
      operation_type: actionType.value
    })
    
    currentVoucher.value = voucher
    canProceed.value = false // Need staff verification
    
    // Start countdown timer
    startVoucherTimer()
    
    showToastMessage('凭证生成成功', 'success')
  } catch (error: any) {
    console.error('请求凭证失败:', error)
    voucherError.value = error.message || '生成凭证失败'
    showToastMessage(voucherError.value, 'error')
  } finally {
    voucherLoading.value = false
  }
}

// Start voucher countdown timer
const startVoucherTimer = () => {
  if (voucherTimer.value) {
    clearInterval(voucherTimer.value)
  }
  
  if (!currentVoucher.value) return
  
  voucherTimeRemaining.value = vouchersApi.calculateTimeRemaining(currentVoucher.value.expires_at)
  
  voucherTimer.value = setInterval(() => {
    if (!currentVoucher.value) {
      clearInterval(voucherTimer.value)
      return
    }
    
    voucherTimeRemaining.value = vouchersApi.calculateTimeRemaining(currentVoucher.value.expires_at)
    
    if (voucherTimeRemaining.value <= 0) {
      clearInterval(voucherTimer.value)
      currentVoucher.value = null
      voucherError.value = '凭证已过期，请重新申请'
      showToastMessage('凭证已过期', 'error')
    }
  }, 1000)
}

// Simulate staff verification
const simulateStaffVerification = () => {
  scanSuccess.value = true
  canProceed.value = true
  showToastMessage('工作人员已验证凭证', 'success')
}

const handleScan = () => {
  // In web environment, show scanner modal
  showScannerModal.value = true
}

const closeScannerModal = () => {
  showScannerModal.value = false
}

// Simulate QR code scan (for development)
const simulateScan = () => {
  // Simulate successful scan
  scanSuccess.value = true
  canProceed.value = true
  showScannerModal.value = false
  showToastMessage('扫描成功！杆柜已解锁', 'success')
}

// Validate QR code (mock implementation)
const validateLockerQRCode = (qrContent: string): boolean => {
  try {
    // Mock validation logic
    const qrData = JSON.parse(qrContent)
    return qrData.lockerId === lockerId.value && qrData.lockerNumber === lockerNumber.value
  } catch (error) {
    // Simple string matching
    return qrContent.includes(lockerId.value) || qrContent.includes(lockerNumber.value)
  }
}

const handleNextStep = async () => {
  processing.value = true
  
  try {
    // Handle different steps
    if (currentStep.value === 0) {
      // Identity verification - proceed to voucher generation
      await requestVoucher()
    } else if (currentStep.value === 1) {
      // Voucher verification - check if verified by staff
      if (!scanSuccess.value) {
        showToastMessage('请等待工作人员验证凭证', 'error')
        processing.value = false
        return
      }
    } else if (currentStep.value === 2) {
      // Actual operation - voucher is already used by staff
      // Just record completion locally
      completedAt.value = new Date()
      
      showToastMessage(
        actionType.value === 'store' ? '存杆成功' : '取杆成功', 
        'success'
      )
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
          showToastMessage('操作超时', 'error')
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
  } catch (error: any) {
    console.error('操作错误:', error)
    showToastMessage(error.message || '操作失败，请重试', 'error')
  } finally {
    processing.value = false
  }
}

const handleComplete = () => {
  router.back()
}

const handleCancel = () => {
  showCancelModal.value = true
}

const closeCancelModal = () => {
  showCancelModal.value = false
}

const confirmCancel = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
  router.back()
}

// Initialize from route params
onMounted(() => {
  const query = route.query
  
  // Set default action type if not provided
  if (query.type) {
    actionType.value = query.type as 'store' | 'retrieve'
  } else {
    // Default to 'store' if not specified
    actionType.value = 'store'
    console.warn('操作类型未指定，默认为存杆操作')
  }
  
  if (query.lockerId) {
    lockerId.value = query.lockerId as string
  } else {
    console.error('缺少必需的杆柜ID参数')
    showToastMessage('缺少杆柜信息，请重新选择杆柜', 'error')
    // Redirect back after a delay
    setTimeout(() => {
      router.back()
    }, 2000)
    return
  }
  
  if (query.lockerNumber) {
    lockerNumber.value = query.lockerNumber as string
  }
  if (query.storeName) {
    storeName.value = query.storeName as string
  }

  console.log('Action页面参数:', {
    type: actionType.value,
    lockerId: lockerId.value,
    lockerNumber: lockerNumber.value,
    storeName: storeName.value
  })
})

onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
  if (voucherTimer.value) {
    clearInterval(voucherTimer.value)
  }
})
</script>

<style scoped>
.action-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.action-header {
  background: linear-gradient(135deg, #1B5E20, #2E7D32);
  color: white;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content {
  flex: 1;
}

.action-title {
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.locker-info {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.action-icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.2);
}

.action-icon {
  font-size: 32px;
}

/* Steps progress */
.steps-progress {
  display: flex;
  padding: 32px;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 60%;
  right: -40%;
  height: 2px;
  background-color: #e0e0e0;
  z-index: 1;
}

.step-item.step-completed:not(:last-child)::after {
  background-color: #4CAF50;
}

.step-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.step-active .step-indicator {
  background-color: #1B5E20;
}

.step-completed .step-indicator {
  background-color: #4CAF50;
}

.step-number {
  font-size: 12px;
  font-weight: 500;
}

.check-icon {
  font-size: 12px;
  font-weight: bold;
}

.step-text {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.step-active .step-text,
.step-completed .step-text {
  color: #333;
}

/* Step content */
.section-card {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.step-content-card {
  margin: 24px;
  min-height: 500px;
}

.step-content {
  padding: 24px 0;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.status-badge.warning {
  background-color: #fff3cd;
  color: #f57c00;
}

.step-description {
  margin-bottom: 32px;
}

.description-text {
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

/* Step verify */
.verify-info {
  background-color: #f5f5f5;
  border-radius: 12px;
  padding: 24px;
}

.verify-label {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #666;
  margin-right: 16px;
  min-width: 80px;
}

.info-value {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

/* Step scan */
.scan-placeholder {
  width: 200px;
  height: 200px;
  margin: 0 auto 24px;
  background-color: #f5f5f5;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 2px dashed #ddd;
  cursor: pointer;
  transition: all 0.3s;
}

.scan-placeholder:hover {
  background-color: #f0f0f0;
  border-color: #1B5E20;
}

.scan-placeholder:active {
  transform: scale(0.98);
}

.scan-icon {
  font-size: 48px;
}

.scan-text {
  font-size: 14px;
  color: #666;
}

.scan-hint {
  text-align: center;
  font-size: 13px;
  color: #666;
  margin: 0;
}

.scan-success {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background-color: #e8f5e8;
  border-radius: 8px;
}

.success-icon {
  font-size: 16px;
}

.success-text {
  font-size: 14px;
  color: #2e7d32;
  font-weight: 500;
}

/* Step action */
.action-guide {
  margin-bottom: 32px;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.guide-number {
  width: 28px;
  height: 28px;
  background-color: #1B5E20;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.guide-text {
  font-size: 16px;
  color: #333;
  line-height: 28px;
}

.action-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background-color: rgba(250, 173, 20, 0.1);
  border-radius: 12px;
}

.timer-text {
  font-size: 16px;
  color: #f57c00;
  font-weight: 500;
}

/* Step complete */
.step-complete {
  text-align: center;
}

.success-icon {
  margin-bottom: 24px;
}

.icon-text {
  font-size: 72px;
}

.success-title {
  font-size: 20px;
  font-weight: 600;
  color: #4CAF50;
  margin: 0 0 12px 0;
}

.success-time {
  font-size: 14px;
  color: #666;
  margin: 0 0 32px 0;
}

.reminder-card {
  background-color: rgba(82, 196, 26, 0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: left;
}

.reminder-title {
  font-size: 15px;
  font-weight: 500;
  color: #4CAF50;
  margin: 0 0 8px 0;
}

.reminder-text {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  margin: 0;
}

/* Step actions */
.step-actions {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-button {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-button.primary {
  background-color: #1B5E20;
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background-color: #2E7D32;
}

.action-button.success {
  background-color: #4CAF50;
  color: white;
}

.action-button.secondary {
  background-color: #f5f5f5;
  color: #666;
}

.button-disabled {
  background-color: #ccc !important;
  cursor: not-allowed;
}

/* Loading spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.small {
  width: 12px;
  height: 12px;
  border-width: 1.5px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content, .scanner-modal {
  background-color: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header, .scanner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title, .scanner-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px 24px;
}

.modal-text {
  font-size: 15px;
  color: #333;
  margin: 0;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.modal-button.secondary {
  background-color: #f5f5f5;
  color: #666;
}

.modal-button.primary {
  background-color: #1B5E20;
  color: white;
}

/* Scanner Modal */
.scanner-body {
  padding: 24px;
  text-align: center;
}

.scanner-frame {
  width: 200px;
  height: 200px;
  margin: 0 auto 24px;
  position: relative;
  background-color: #000;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  bottom: 20px;
  border: 2px solid #1B5E20;
  border-radius: 8px;
}

.scanner-hint {
  color: white;
  font-size: 14px;
  margin: 0;
}

.simulate-scan-btn {
  background-color: #1B5E20;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  cursor: pointer;
}

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  background-color: #4CAF50;
  color: white;
}

.toast.error {
  background-color: #f44336;
  color: white;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Voucher Display */
.step-voucher {
  padding: 24px;
}

.voucher-loading {
  text-align: center;
  padding: 48px 24px;
}

.voucher-loading .loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1B5E20;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

.voucher-error {
  text-align: center;
  padding: 32px;
}

.voucher-error .error-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.voucher-error .error-text {
  color: #666;
  margin-bottom: 24px;
}

.retry-button {
  background-color: #1B5E20;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  cursor: pointer;
}

.voucher-display {
  padding: 24px;
  background-color: #f9f9f9;
  border-radius: 12px;
}

.voucher-header {
  text-align: center;
  margin-bottom: 24px;
}

.voucher-title {
  font-size: 18px;
  color: #333;
  margin: 0 0 12px 0;
}

.voucher-code {
  font-size: 28px;
  font-weight: bold;
  color: #1B5E20;
  letter-spacing: 2px;
  padding: 8px 16px;
  background-color: white;
  border-radius: 8px;
  display: inline-block;
}

.voucher-qr {
  text-align: center;
  margin: 24px 0;
}

.qr-image {
  width: 200px;
  height: 200px;
  border: 4px solid white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.voucher-info {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
}

.voucher-info .info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.voucher-info .info-row:last-child {
  border-bottom: none;
}

.voucher-info .info-label {
  color: #666;
  font-size: 14px;
}

.voucher-info .info-value {
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.voucher-info .info-value.timer {
  color: #FF5722;
  font-size: 16px;
}

.voucher-hint {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-top: 16px;
}

.simulate-verify-btn {
  display: block;
  width: 100%;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  margin-top: 16px;
  cursor: pointer;
}

.simulate-verify-btn:hover {
  background-color: #1976D2;
}
</style>