<template>
  <div class="login-container">
    <div class="login-header">
      <img class="logo" src="/logo.svg" alt="YesLocker Logo" />
      <h1 class="title">欢迎回来</h1>
      <p class="subtitle">登录YesLocker继续使用</p>
    </div>

    <div class="login-form">
      <div class="input-field">
        <label class="input-label">手机号</label>
        <div class="input-wrapper">
          <span class="input-prefix">📱</span>
          <input
            v-model="formData.phone"
            type="tel"
            placeholder="请输入手机号"
            maxlength="11"
            class="input"
            :class="{ 'input-error': !!errors.phone }"
            @blur="validatePhone"
          />
        </div>
        <div v-if="errors.phone" class="error-message">{{ errors.phone }}</div>
      </div>

      <div class="remember-wrapper">
        <label class="remember-label">
          <input
            v-model="rememberPhone"
            type="checkbox"
            class="checkbox"
          />
          <span class="remember-text">记住手机号</span>
        </label>
      </div>

      <button
        class="login-button"
        :class="{ 'login-button-disabled': !isFormValid }"
        :disabled="!isFormValid || loggingIn"
        @click="handleLogin"
      >
        <span v-if="loggingIn" class="loading-spinner"></span>
        {{ loggingIn ? '登录中...' : '登录' }}
      </button>

    </div>

    <div class="login-footer">
      <span class="footer-text">还没有账号？</span>
      <button class="link-button" @click="goToRegister">立即注册</button>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'

const router = useRouter()
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

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Computed
const isFormValid = computed(() => {
  return formData.phone.length === 11 && !errors.phone
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

const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

const handleLogin = async () => {
  if (!isFormValid.value) return

  // Clear errors
  errors.phone = ''

  loggingIn.value = true
  try {
    await authStore.login({
      phone: formData.phone
    })

    // Save phone if remember is checked
    if (rememberPhone.value) {
      localStorage.setItem('yeslocker_remembered_phone', formData.phone)
    } else {
      localStorage.removeItem('yeslocker_remembered_phone')
    }

    showToastMessage('登录成功', 'success')

    // Navigate to home
    setTimeout(() => {
      router.replace('/')
    }, 1500)
  } catch (error: any) {
    showToastMessage(error.message || '登录失败', 'error')
  } finally {
    loggingIn.value = false
  }
}


const goToRegister = () => {
  router.push('/auth/register')
}

// Load remembered phone
const loadRememberedPhone = () => {
  const phone = localStorage.getItem('yeslocker_remembered_phone')
  if (phone) {
    formData.phone = phone
  }
}

// Lifecycle
onMounted(async () => {
  loadRememberedPhone()
  await authStore.loadStoredAuth()
  
  // If already logged in, redirect to home
  if (authStore.isLoggedIn) {
    router.replace('/')
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 80px 40px 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.login-header {
  text-align: center;
  margin-bottom: 80px;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 32px;
  border-radius: 16px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px 0;
}

.subtitle {
  font-size: 15px;
  color: #666;
  margin: 0;
}

.login-form {
  background-color: white;
  border-radius: 12px;
  padding: 48px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 48px;
}

.input-field {
  margin-bottom: 24px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 16px;
  font-size: 16px;
  z-index: 1;
}

.input {
  width: 100%;
  height: 48px;
  padding: 0 16px 0 48px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.input:focus {
  outline: none;
  border-color: #1B5E20;
}

.input-error {
  border-color: #f44336;
}

.error-message {
  font-size: 12px;
  color: #f44336;
  margin-top: 4px;
}

.remember-wrapper {
  margin: 32px 0 48px;
}

.remember-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.checkbox {
  margin-right: 8px;
  accent-color: #1B5E20;
}

.remember-text {
  margin-left: 8px;
}

.login-button {
  width: 100%;
  height: 48px;
  background-color: #1B5E20;
  color: white;
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

.login-button:hover:not(:disabled) {
  background-color: #2E7D32;
}

.login-button-disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}


.login-footer {
  text-align: center;
}

.footer-text {
  font-size: 14px;
  color: #666;
}

.link-button {
  font-size: 14px;
  color: #1B5E20;
  background: none;
  border: none;
  text-decoration: underline;
  margin-left: 8px;
  cursor: pointer;
}

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