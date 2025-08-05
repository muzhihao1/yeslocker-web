<template>
  <view class="qrcode-container">
    <!-- Header -->
    <view class="qrcode-header">
      <text class="header-title">电子凭证</text>
      <text class="header-subtitle">向工作人员出示此凭证</text>
    </view>

    <!-- QR Code Card -->
    <card class="qrcode-card">
      <view class="qrcode-wrapper">
        <!-- QR Code placeholder -->
        <view class="qrcode-box" @click="refreshQRCode">
          <canvas
            canvas-id="qrcode"
            class="qrcode-canvas"
            :style="{ width: qrSize + 'rpx', height: qrSize + 'rpx' }"
          />
          <view v-if="!qrGenerated" class="qrcode-loading">
            <loading-spinner size="large" text="生成中..." />
          </view>
        </view>
        
        <view class="refresh-hint" v-if="qrGenerated">
          <text class="refresh-icon">🔄</text>
          <text class="refresh-text">点击刷新二维码</text>
        </view>
      </view>

      <!-- User Info -->
      <view class="user-info-section">
        <view class="info-row">
          <text class="info-label">姓名</text>
          <text class="info-value">{{ userInfo.name || '未设置' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">手机号</text>
          <text class="info-value">{{ formatPhone(userInfo.phone) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">杆柜编号</text>
          <text class="info-value">{{ lockerInfo.number }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">所属门店</text>
          <text class="info-value">{{ lockerInfo.storeName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">申请时间</text>
          <text class="info-value">{{ formatDate(lockerInfo.createdAt) }}</text>
        </view>
      </view>
    </card>

    <!-- Instructions -->
    <card title="使用说明" class="instructions-card">
      <view class="instruction-list">
        <view class="instruction-item">
          <text class="instruction-number">1</text>
          <text class="instruction-text">向工作人员出示此二维码凭证</text>
        </view>
        <view class="instruction-item">
          <text class="instruction-number">2</text>
          <text class="instruction-text">工作人员扫码验证您的身份</text>
        </view>
        <view class="instruction-item">
          <text class="instruction-number">3</text>
          <text class="instruction-text">验证通过后即可进行存取杆操作</text>
        </view>
      </view>
    </card>

    <!-- Actions -->
    <view class="actions-section">
      <custom-button
        type="primary"
        size="large"
        text="保存到相册"
        block
        round
        @click="saveToAlbum"
      />
      <custom-button
        type="default"
        size="medium"
        text="分享给朋友"
        block
        plain
        @click="shareQRCode"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Card, CustomButton, LoadingSpinner } from '@/components/common'
import dayjs from 'dayjs'

const authStore = useAuthStore()

// QR Code settings
const qrSize = ref(400)
const qrGenerated = ref(false)
const qrCodeData = ref('')

// User and locker info
const userInfo = computed(() => authStore.user || {})
const lockerInfo = ref({
  id: 'locker-1',
  number: 'A03',
  storeName: '望京店',
  createdAt: '2024-07-15T10:30:00'
})

// Methods
const formatPhone = (phone: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY年MM月DD日')
}

const generateQRCode = () => {
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
  
  // In production, use a real QR code library
  // For now, simulate QR code generation
  setTimeout(() => {
    drawQRCode()
    qrGenerated.value = true
  }, 1000)
}

const generateSignature = () => {
  // In production, generate a secure signature
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const drawQRCode = () => {
  // In production, use a real QR code library like qrcode.js
  // For now, draw a placeholder pattern
  const ctx = uni.createCanvasContext('qrcode')
  const size = uni.upx2px(qrSize.value)
  
  // Background
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(0, 0, size, size)
  
  // Mock QR code pattern
  const moduleSize = size / 25
  ctx.setFillStyle('#000000')
  
  // Draw corner markers
  drawCornerMarker(ctx, 0, 0, moduleSize)
  drawCornerMarker(ctx, size - 7 * moduleSize, 0, moduleSize)
  drawCornerMarker(ctx, 0, size - 7 * moduleSize, moduleSize)
  
  // Draw random pattern in center
  for (let i = 9; i < 16; i++) {
    for (let j = 9; j < 16; j++) {
      if (Math.random() > 0.5) {
        ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize)
      }
    }
  }
  
  // Add logo in center
  ctx.setFillStyle('#1B5E20')
  ctx.fillRect(size / 2 - moduleSize * 2, size / 2 - moduleSize * 2, moduleSize * 4, moduleSize * 4)
  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(moduleSize * 2)
  ctx.setTextAlign('center')
  ctx.setTextBaseline('middle')
  ctx.fillText('Y', size / 2, size / 2)
  
  ctx.draw()
}

const drawCornerMarker = (ctx: any, x: number, y: number, size: number) => {
  // Outer square
  ctx.fillRect(x, y, size * 7, size * 7)
  ctx.setFillStyle('#ffffff')
  ctx.fillRect(x + size, y + size, size * 5, size * 5)
  ctx.setFillStyle('#000000')
  ctx.fillRect(x + size * 2, y + size * 2, size * 3, size * 3)
}

const refreshQRCode = () => {
  if (!qrGenerated.value) return
  
  qrGenerated.value = false
  setTimeout(() => {
    generateQRCode()
  }, 300)
}

const saveToAlbum = async () => {
  uni.showLoading({
    title: '保存中...'
  })
  
  try {
    // Convert canvas to image
    const res = await uni.canvasToTempFilePath({
      canvasId: 'qrcode',
      fileType: 'png'
    })
    
    // Save to album
    await uni.saveImageToPhotosAlbum({
      filePath: res.tempFilePath
    })
    
    uni.hideLoading()
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    })
  } catch (error: any) {
    uni.hideLoading()
    
    if (error.errMsg?.includes('auth deny')) {
      uni.showModal({
        title: '提示',
        content: '需要您的授权才能保存图片',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            uni.openSetting()
          }
        }
      })
    } else {
      uni.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }
}

const shareQRCode = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

// Lifecycle
onMounted(() => {
  generateQRCode()
})
</script>

<style scoped>
.qrcode-container {
  min-height: 100vh;
  background-color: var(--background-color);
  padding-bottom: 48rpx;
}

/* Header */
.qrcode-header {
  background: linear-gradient(135deg, var(--primary-color), #2E7D32);
  color: white;
  padding: 60rpx 40rpx;
  text-align: center;
}

.header-title {
  font-size: 44rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 16rpx;
}

.header-subtitle {
  font-size: 30rpx;
  opacity: 0.9;
}

/* QR Code Card */
.qrcode-card {
  margin: -40rpx 24rpx 24rpx;
  position: relative;
  z-index: 1;
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.qrcode-box {
  position: relative;
  padding: 32rpx;
  background-color: white;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.qrcode-box:active {
  transform: scale(0.98);
}

.qrcode-canvas {
  display: block;
}

.qrcode-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 24rpx;
}

.refresh-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 24rpx;
  opacity: 0.6;
}

.refresh-icon {
  font-size: 24rpx;
}

.refresh-text {
  font-size: 24rpx;
  color: var(--text-secondary);
}

/* User Info */
.user-info-section {
  padding: 32rpx 0;
  border-top: 1rpx solid var(--border-color);
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
}

.info-label {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.info-value {
  font-size: 30rpx;
  color: var(--text-color);
  font-weight: 500;
}

/* Instructions */
.instructions-card {
  margin: 0 24rpx 24rpx;
}

.instruction-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.instruction-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.instruction-number {
  width: 40rpx;
  height: 40rpx;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.instruction-text {
  font-size: 28rpx;
  color: var(--text-color);
  line-height: 40rpx;
}

/* Actions */
.actions-section {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
</style>