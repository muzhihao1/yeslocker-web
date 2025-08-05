<template>
  <view class="register-container">
    <view class="register-header">
      <text class="title">注册账号</text>
      <text class="subtitle">欢迎加入YesLocker台球杆柜管理系统</text>
    </view>

    <view class="register-form">
      <!-- Combined registration form -->
      <view class="form-step">
        <input-field
          v-model="formData.phone"
          type="number"
          label="手机号"
          placeholder="请输入手机号"
          :maxlength="11"
          required
          :error="!!errors.phone"
          :error-message="errors.phone"
          prefix-icon="📱"
        />
        <view class="avatar-upload" @click="chooseAvatar">
          <image
            v-if="formData.avatarUrl"
            :src="formData.avatarUrl"
            class="avatar-image"
            mode="aspectFill"
          />
          <view v-else class="avatar-placeholder">
            <text class="placeholder-icon">📷</text>
            <text class="placeholder-text">上传头像</text>
          </view>
        </view>

        <input-field
          v-model="formData.name"
          type="text"
          label="姓名"
          placeholder="请输入真实姓名"
          required
          :error="!!errors.name"
          :error-message="errors.name"
          prefix-icon="👤"
        />

        <view class="store-selector">
          <text class="selector-label">
            选择门店 <text class="required-mark">*</text>
          </text>
          <picker
            :range="stores"
            :range-key="'name'"
            :value="storeIndex"
            @change="handleStoreChange"
          >
            <view class="picker-wrapper">
              <text v-if="formData.storeId" class="picker-value">
                {{ selectedStore?.name }}
              </text>
              <text v-else class="picker-placeholder">请选择门店</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <text v-if="errors.storeId" class="error-text">{{ errors.storeId }}</text>
        </view>

        <custom-button
          type="primary"
          size="large"
          text="完成注册"
          :disabled="!isFormValid"
          :loading="registering"
          block
          @click="submitRegister"
        />
      </view>
    </view>

    <view class="register-footer">
      <text class="footer-text">已有账号？</text>
      <text class="link-text" @click="goToLogin">立即登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/api/auth'
import { storesApi } from '@/services/api/stores'
import { InputField, CustomButton } from '@/components/common'
import type { Store } from '@/types/user'

const authStore = useAuthStore()

// Form data
const formData = reactive({
  phone: '',
  name: '',
  avatarUrl: '',
  storeId: ''
})

// Errors
const errors = reactive({
  phone: '',
  name: '',
  storeId: ''
})

// Loading states
const registering = ref(false)
const uploadingAvatar = ref(false)

// Stores
const stores = ref<Store[]>([])
const storeIndex = ref(0)

// Computed
const isFormValid = computed(() => {
  return formData.phone.length === 11 && formData.name.trim() && formData.storeId
})

const selectedStore = computed(() => {
  return stores.value.find(s => s.id === formData.storeId)
})

// Methods
const validatePhone = (phone: string): boolean => {
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phone)) {
    errors.phone = '请输入正确的手机号'
    return false
  }
  errors.phone = ''
  return true
}


const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      uploadingAvatar.value = true
      
      try {
        // In production, upload to Supabase Storage
        // For now, use local path
        formData.avatarUrl = tempFilePath
        
        uni.showToast({
          title: '头像上传成功',
          icon: 'success'
        })
      } catch (error) {
        uni.showToast({
          title: '头像上传失败',
          icon: 'none'
        })
      } finally {
        uploadingAvatar.value = false
      }
    }
  })
}

const handleStoreChange = (e: any) => {
  const index = e.detail.value
  storeIndex.value = index
  formData.storeId = stores.value[index].id
  errors.storeId = ''
}

const submitRegister = async () => {
  // Validate form
  if (!formData.name.trim()) {
    errors.name = '请输入姓名'
    return
  }
  if (!formData.storeId) {
    errors.storeId = '请选择门店'
    return
  }

  registering.value = true
  try {
    const response = await authApi.register({
      phone: formData.phone,
      name: formData.name,
      avatarUrl: formData.avatarUrl,
      storeId: formData.storeId
    })

    // Save auth data
    authStore.setToken(response.token)
    authStore.setUser(response.user)

    uni.showToast({
      title: '注册成功',
      icon: 'success'
    })

    // Navigate to home
    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/index/index'
      })
    }, 1500)
  } catch (error: any) {
    uni.showToast({
      title: error.message || '注册失败',
      icon: 'none'
    })
  } finally {
    registering.value = false
  }
}

const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/auth/login'
  })
}

const loadStores = async () => {
  try {
    const data = await storesApi.getStores()
    stores.value = data
  } catch (error) {
    console.error('Failed to load stores:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadStores()
})
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background-color: var(--background-color);
  padding: 60rpx 40rpx;
}

.register-header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: var(--text-color);
  display: block;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 30rpx;
  color: var(--text-secondary);
}

.register-form {
  background-color: white;
  border-radius: 24rpx;
  padding: 48rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 48rpx;
}

.form-step {
  min-height: 400rpx;
}

.sms-code-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
}

.sms-code-wrapper .input-field {
  flex: 1;
}

.avatar-upload {
  width: 160rpx;
  height: 160rpx;
  margin: 0 auto 48rpx;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-upload:active {
  transform: scale(0.95);
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-placeholder {
  text-align: center;
}

.placeholder-icon {
  font-size: 48rpx;
  display: block;
  margin-bottom: 8rpx;
}

.placeholder-text {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.store-selector {
  margin-bottom: 32rpx;
}

.selector-label {
  font-size: 30rpx;
  color: var(--text-color);
  font-weight: 500;
  display: block;
  margin-bottom: 16rpx;
}

.required-mark {
  color: var(--error-color);
  margin-left: 8rpx;
}

.picker-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: white;
  border: 2rpx solid var(--border-color);
  border-radius: 12rpx;
  padding: 24rpx;
  height: 88rpx;
}

.picker-value {
  font-size: 32rpx;
  color: var(--text-color);
}

.picker-placeholder {
  font-size: 32rpx;
  color: #999;
}

.picker-arrow {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.error-text {
  font-size: 24rpx;
  color: var(--error-color);
  margin-top: 8rpx;
  display: block;
}

.button-group {
  display: flex;
  gap: 24rpx;
  margin-top: 48rpx;
}

.button-group .custom-button {
  flex: 1;
}

.register-footer {
  text-align: center;
}

.footer-text {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.link-text {
  font-size: 28rpx;
  color: var(--primary-color);
  margin-left: 8rpx;
  text-decoration: underline;
}
</style>