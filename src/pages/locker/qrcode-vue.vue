<template>
  <div class="qrcode-container">
    <!-- Header -->
    <div class="qrcode-header">
      <h1 class="header-title">电子凭证</h1>
      <p class="header-subtitle">向工作人员出示此凭证</p>
    </div>

    <!-- QR Code Card -->
    <div class="section-card qrcode-card">
      <div class="qrcode-wrapper">
        <!-- QR Code placeholder -->
        <div class="qrcode-box" @click="refreshQRCode">
          <canvas
            ref="qrCodeCanvas"
            class="qrcode-canvas"
            :width="qrSize"
            :height="qrSize"
          />
          <div v-if="!qrGenerated" class="qrcode-loading">
            <div class="loading-spinner large"></div>
            <span class="loading-text">生成中...</span>
          </div>
        </div>
        
        <div class="refresh-hint" v-if="qrGenerated">
          <span class="refresh-icon">🔄</span>
          <span class="refresh-text">点击刷新二维码</span>
        </div>
      </div>

      <!-- User Info -->
      <div class="user-info-section">
        <div class="info-row">
          <span class="info-label">姓名</span>
          <span class="info-value">{{ userInfo.name || '未设置' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">手机号</span>
          <span class="info-value">{{ formatPhone(userInfo.phone) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">杆柜编号</span>
          <span class="info-value">{{ lockerInfo.number }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">所属门店</span>
          <span class="info-value">{{ lockerInfo.storeName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">申请时间</span>
          <span class="info-value">{{ formatDate(lockerInfo.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="section-card instructions-card">
      <h3 class="section-title">使用说明</h3>
      <div class="instruction-list">
        <div class="instruction-item">
          <span class="instruction-number">1</span>
          <span class="instruction-text">向工作人员出示此二维码凭证</span>
        </div>
        <div class="instruction-item">
          <span class="instruction-number">2</span>
          <span class="instruction-text">工作人员扫码验证您的身份</span>
        </div>
        <div class="instruction-item">
          <span class="instruction-number">3</span>
          <span class="instruction-text">验证通过后即可进行存取杆操作</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-section">
      <button
        class="action-button primary"
        :disabled="!qrGenerated || downloading"
        @click="saveToDevice"
      >
        <span v-if="downloading" class="loading-spinner small"></span>
        {{ downloading ? '下载中...' : '下载凭证' }}
      </button>
      <button
        class="action-button secondary"
        @click="shareQRCode"
      >
        分享给朋友
      </button>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth-vue'

const authStore = useAuthStore()

// QR Code settings
const qrSize = ref(300)
const qrGenerated = ref(false)
const qrCodeData = ref('')
const qrCodeCanvas = ref<HTMLCanvasElement | null>(null)
const downloading = ref(false)

// User and locker info
const userInfo = computed(() => authStore.user || {})
const lockerInfo = ref({
  id: 'locker-1',
  number: 'A03',
  storeName: '望京店',
  createdAt: '2024-07-15T10:30:00'
})

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Methods
const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const formatPhone = (phone: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const generateQRCode = async () => {
  // Generate QR code data
  const data = {
    type: 'locker_credential',
    userId: userInfo.value.id,
    userName: userInfo.value.name,
    userPhone: userInfo.value.phone,
    lockerId: lockerInfo.value.id,
    lockerNumber: lockerInfo.value.number,
    storeName: lockerInfo.value.storeName,
    timestamp: Date.now(),
    signature: generateSignature()
  }
  
  qrCodeData.value = JSON.stringify(data)
  
  // Simulate QR code generation delay
  setTimeout(async () => {
    await drawQRCode()
    qrGenerated.value = true
  }, 1000)
}

const generateSignature = () => {
  // In production, generate a secure signature
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const drawQRCode = async () => {
  await nextTick()
  
  if (!qrCodeCanvas.value) {
    console.error('Canvas element not found')
    return
  }

  const canvas = qrCodeCanvas.value
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    console.error('Could not get canvas context')
    return
  }
  
  const size = qrSize.value
  canvas.width = size
  canvas.height = size
  
  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  
  // Mock QR code pattern
  const moduleSize = size / 25
  ctx.fillStyle = '#000000'
  
  // Draw corner markers (finder patterns)
  drawCornerMarker(ctx, 0, 0, moduleSize)
  drawCornerMarker(ctx, size - 7 * moduleSize, 0, moduleSize)
  drawCornerMarker(ctx, 0, size - 7 * moduleSize, moduleSize)
  
  // Draw random pattern in center to simulate QR code data
  for (let i = 9; i < 16; i++) {
    for (let j = 9; j < 16; j++) {
      if (Math.random() > 0.5) {
        ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize)
      }
    }
  }
  
  // Add some scattered modules throughout
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      // Skip corner marker areas
      if ((i < 9 && j < 9) || 
          (i > 15 && j < 9) || 
          (i < 9 && j > 15) ||
          (i > 8 && i < 16 && j > 8 && j < 16)) {
        continue
      }
      
      if (Math.random() > 0.6) {
        ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize)
      }
    }
  }
  
  // Add logo in center
  ctx.fillStyle = '#1B5E20'
  const logoSize = moduleSize * 3
  const centerX = size / 2 - logoSize / 2
  const centerY = size / 2 - logoSize / 2
  
  ctx.fillRect(centerX, centerY, logoSize, logoSize)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${moduleSize * 1.5}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Y', size / 2, size / 2)
}

const drawCornerMarker = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  // Outer square (7x7)
  ctx.fillStyle = '#000000'
  ctx.fillRect(x, y, size * 7, size * 7)
  
  // Inner white square (5x5)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + size, y + size, size * 5, size * 5)
  
  // Center black square (3x3)
  ctx.fillStyle = '#000000'
  ctx.fillRect(x + size * 2, y + size * 2, size * 3, size * 3)
}

const refreshQRCode = () => {
  if (!qrGenerated.value) return
  
  qrGenerated.value = false
  setTimeout(() => {
    generateQRCode()
  }, 300)
}

const saveToDevice = async () => {
  if (!qrGenerated.value || !qrCodeCanvas.value) {
    showToastMessage('二维码未生成完成', 'error')
    return
  }

  downloading.value = true
  
  try {
    // Convert canvas to data URL
    const dataURL = qrCodeCanvas.value.toDataURL('image/png')
    
    // Create download link
    const link = document.createElement('a')
    link.download = `杆柜凭证_${lockerInfo.value.number}_${Date.now()}.png`
    link.href = dataURL
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showToastMessage('凭证已保存到下载文件夹', 'success')
  } catch (error: any) {
    console.error('保存失败:', error)
    showToastMessage('保存失败，请重试', 'error')
  } finally {
    downloading.value = false
  }
}

const shareQRCode = () => {
  if (navigator.share && qrCodeCanvas.value) {
    // Use Web Share API if available
    qrCodeCanvas.value.toBlob(async (blob) => {
      if (blob) {
        try {
          await navigator.share({
            title: '杆柜电子凭证',
            text: `我的杆柜凭证 - ${lockerInfo.value.storeName} ${lockerInfo.value.number}`,
            files: [new File([blob], 'qrcode.png', { type: 'image/png' })]
          })
        } catch (error) {
          console.error('分享失败:', error)
          showToastMessage('分享已取消', 'error')
        }
      }
    })
  } else {
    // Fallback: copy to clipboard or show message
    showToastMessage('请长按二维码进行分享', 'success')
  }
}

// Lifecycle
onMounted(() => {
  generateQRCode()
})
</script>

<style scoped>
.qrcode-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header */
.qrcode-header {
  background: linear-gradient(135deg, #1B5E20, #2E7D32);
  color: white;
  padding: 40px 32px;
  text-align: center;
}

.header-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.header-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

/* Section Card */
.section-card {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin: 24px 24px 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

/* QR Code Card */
.qrcode-card {
  margin: -32px 24px 0;
  position: relative;
  z-index: 1;
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

.qrcode-box {
  position: relative;
  padding: 24px;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.qrcode-box:hover {
  transform: scale(1.02);
}

.qrcode-box:active {
  transform: scale(0.98);
}

.qrcode-canvas {
  display: block;
  border-radius: 8px;
}

.qrcode-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
}

.loading-text {
  font-size: 14px;
  color: #666;
}

.refresh-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  opacity: 0.6;
  font-size: 14px;
}

.refresh-icon {
  font-size: 16px;
}

.refresh-text {
  color: #666;
}

/* User Info */
.user-info-section {
  padding: 24px 0;
  border-top: 1px solid #e0e0e0;
  margin-top: 24px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

/* Instructions */
.instructions-card {
  margin-top: 24px;
}

.instruction-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.instruction-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.instruction-number {
  width: 24px;
  height: 24px;
  background-color: #1B5E20;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.instruction-text {
  font-size: 14px;
  color: #333;
  line-height: 24px;
}

/* Actions */
.actions-section {
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
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

.action-button.secondary {
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
}

.action-button.secondary:hover {
  background-color: #e8e8e8;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid #1B5E20;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.large {
  width: 24px;
  height: 24px;
  border-width: 3px;
  border-top-color: #1B5E20;
}

.loading-spinner.small {
  width: 12px;
  height: 12px;
  border-width: 1.5px;
  border-top-color: white;
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
</style>