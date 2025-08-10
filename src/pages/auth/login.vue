<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/logo.svg" mode="aspectFit" />
      <text class="title">欢迎回来</text>
      <text class="subtitle">登录YesLocker继续使用</text>
    </view>

    <view class="login-form">
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
        @blur="validatePhone"
      />

      <view class="remember-wrapper">
        <label class="remember-label">
          <checkbox 
            :checked="rememberPhone" 
            @change="handleRememberChange"
            color="#1B5E20"
          />
          <text class="remember-text">记住手机号</text>
        </label>
      </view>

      <custom-button
        type="primary"
        size="large"
        text="登录"
        :disabled="!isFormValid"
        :loading="loggingIn"
        block
        round
        @click="handleLogin"
      />

      <view class="quick-login">
        <view class="divider">
          <text class="divider-text">快速登录</text>
        </view>
        <view class="quick-login-buttons">
          <custom-button
            type="success"
            size="medium"
            text="微信一键登录"
            block
            @click="wechatLogin"
          />
        </view>
      </view>
    </view>

    <view class="login-footer">
      <text class="footer-text">还没有账号？</text>
      <text class="link-text" @click="goToRegister">立即注册</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/api/auth'
import { InputField, CustomButton } from '@/components/common'

const authStore = useAuthStore()

// Form data
const formData = reactive({
  phone: ''
})

// Errors
const errors = reactive({
  phone: ''
})

// States
const loggingIn = ref(false)
const rememberPhone = ref(true)

// Computed
const isFormValid = computed(() => {
  return formData.phone.length === 11
})

// Methods
const validatePhone = () => {
  const phoneReg = /^1[3-9]\d{9}$/
  if (formData.phone && !phoneReg.test(formData.phone)) {
    errors.phone = '请输入正确的手机号'
    return false
  }
  errors.phone = ''
  return true
}


const handleRememberChange = (e: any) => {
  rememberPhone.value = e.detail.value
}

const handleLogin = async () => {
  if (!isFormValid.value) return

  // Clear errors
  errors.phone = ''

  loggingIn.value = true
  try {
    const response = await authApi.login({
      phone: formData.phone
    })

    // Save auth data
    authStore.setToken(response.token)
    authStore.setUser(response.user)

    // Save phone if remember is checked
    if (rememberPhone.value) {
      uni.setStorageSync('rememberedPhone', formData.phone)
    } else {
      uni.removeStorageSync('rememberedPhone')
    }

    uni.showToast({
      title: '登录成功',
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
      title: error.message || '登录失败',
      icon: 'none'
    })
  } finally {
    loggingIn.value = false
  }
}

const wechatLogin = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

const goToRegister = () => {
  uni.navigateTo({
    url: '/pages/auth/register'
  })
}

// Load remembered phone
const loadRememberedPhone = () => {
  const phone = uni.getStorageSync('rememberedPhone')
  if (phone) {
    formData.phone = phone
  }
}

// Lifecycle
onMounted(() => {
  loadRememberedPhone()
  authStore.loadStoredAuth()
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background-color: var(--background-color);
  padding: 80rpx 40rpx 40rpx;
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 32rpx;
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

.login-form {
  background-color: white;
  border-radius: 24rpx;
  padding: 48rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 48rpx;
}

.sms-code-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 20rpx;
}

.sms-code-wrapper .input-field {
  flex: 1;
}

.remember-wrapper {
  margin: 32rpx 0 48rpx;
}

.remember-label {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: var(--text-secondary);
}

.remember-text {
  margin-left: 16rpx;
}

.quick-login {
  margin-top: 60rpx;
}

.divider {
  position: relative;
  text-align: center;
  margin-bottom: 32rpx;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1rpx;
  background-color: var(--border-color);
}

.divider-text {
  position: relative;
  display: inline-block;
  padding: 0 24rpx;
  background-color: white;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.quick-login-buttons {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.login-footer {
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