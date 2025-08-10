<template>
  <div class="register-container">
    <div class="register-header">
      <h1 class="title">注册账号</h1>
      <p class="subtitle">欢迎加入YesLocker台球杆柜管理系统</p>
    </div>

    <div class="register-form">
      <div class="form-step">
        <!-- 手机号输入 -->
        <div class="input-field">
          <label class="input-label">
            手机号 <span class="required-mark">*</span>
          </label>
          <div class="input-wrapper" :class="{ 'input-error': !!errors.phone }">
            <span class="input-prefix">📱</span>
            <input
              v-model="formData.phone"
              type="tel"
              placeholder="请输入手机号"
              maxlength="11"
              class="input"
              @blur="validatePhone"
            />
          </div>
          <div v-if="errors.phone" class="error-message">{{ errors.phone }}</div>
        </div>

        <!-- 头像上传 -->
        <div class="avatar-upload" @click="triggerAvatarUpload">
          <img
            v-if="formData.avatarUrl"
            :src="formData.avatarUrl"
            class="avatar-image"
            alt="用户头像"
          />
          <div v-else class="avatar-placeholder">
            <div class="placeholder-icon">📷</div>
            <div class="placeholder-text">上传头像</div>
          </div>
          <input
            ref="avatarInput"
            type="file"
            accept="image/*"
            class="avatar-input"
            @change="handleAvatarUpload"
          />
        </div>

        <!-- 姓名输入 -->
        <div class="input-field">
          <label class="input-label">
            姓名 <span class="required-mark">*</span>
          </label>
          <div class="input-wrapper" :class="{ 'input-error': !!errors.name }">
            <span class="input-prefix">👤</span>
            <input
              v-model="formData.name"
              type="text"
              placeholder="请输入真实姓名"
              class="input"
              @blur="validateName"
            />
          </div>
          <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
        </div>

        <!-- 门店选择 -->
        <div class="store-selector">
          <label class="selector-label">
            选择门店 <span class="required-mark">*</span>
          </label>
          <select
            v-model="formData.storeId"
            class="store-select"
            :class="{ 'select-error': !!errors.storeId }"
            @change="handleStoreChange"
          >
            <option value="">请选择门店</option>
            <option 
              v-for="store in stores" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </option>
          </select>
          <div v-if="errors.storeId" class="error-message">{{ errors.storeId }}</div>
        </div>

        <!-- 注册按钮 -->
        <button
          class="register-button"
          :class="{ 'button-disabled': !isFormValid }"
          :disabled="!isFormValid || registering"
          @click="submitRegister"
        >
          <span v-if="registering" class="loading-spinner"></span>
          {{ registering ? '注册中...' : '完成注册' }}
        </button>
      </div>
    </div>

    <div class="register-footer">
      <span class="footer-text">已有账号？</span>
      <button class="link-button" @click="goToLogin">立即登录</button>
    </div>

    <!-- Toast notification -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>

    <!-- Loading overlay -->
    <div v-if="uploadingAvatar" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">上传头像中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'
import { storesApi } from '@/services/api/stores-vue'
import type { Store } from '@/types/user'

const router = useRouter()
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

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Stores and refs
const stores = ref<Store[]>([])
const avatarInput = ref<HTMLInputElement>()

// Computed
const isFormValid = computed(() => {
  return formData.phone.length === 11 && 
         formData.name.trim() && 
         formData.storeId &&
         !errors.phone &&
         !errors.name
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

const validatePhone = (): boolean => {
  const phoneReg = /^1[3-9]\d{9}$/
  if (!formData.phone) {
    errors.phone = ''
    return true
  }
  if (!phoneReg.test(formData.phone)) {
    errors.phone = '请输入正确的手机号'
    return false
  }
  errors.phone = ''
  return true
}

const validateName = (): boolean => {
  if (!formData.name.trim()) {
    errors.name = ''
    return true
  }
  if (formData.name.trim().length < 2) {
    errors.name = '姓名至少需要2个字符'
    return false
  }
  errors.name = ''
  return true
}

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showToastMessage('请选择图片文件', 'error')
    return
  }

  // 验证文件大小 (2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToastMessage('图片大小不能超过2MB', 'error')
    return
  }

  uploadingAvatar.value = true
  try {
    // 创建本地预览URL
    const imageUrl = URL.createObjectURL(file)
    formData.avatarUrl = imageUrl
    
    // TODO: 在生产环境中，这里应该上传到服务器或云存储
    // const uploadedUrl = await uploadToServer(file)
    // formData.avatarUrl = uploadedUrl
    
    showToastMessage('头像上传成功', 'success')
  } catch (error) {
    console.error('头像上传失败:', error)
    showToastMessage('头像上传失败，请重试', 'error')
  } finally {
    uploadingAvatar.value = false
  }
}

const handleStoreChange = () => {
  if (formData.storeId) {
    errors.storeId = ''
  }
}

const submitRegister = async () => {
  // 最终验证
  if (!validatePhone() || !validateName()) {
    return
  }

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
    await authStore.register({
      phone: formData.phone,
      name: formData.name,
      avatarUrl: formData.avatarUrl,
      storeId: formData.storeId
    })

    showToastMessage('注册成功！正在跳转...', 'success')

    // Navigate to home
    setTimeout(() => {
      router.replace('/')
    }, 2000)
  } catch (error: any) {
    showToastMessage(error.message || '注册失败，请重试', 'error')
  } finally {
    registering.value = false
  }
}

const goToLogin = () => {
  router.push('/auth/login')
}

const loadStores = async () => {
  try {
    const data = await storesApi.getStores()
    stores.value = data
    console.log('加载门店列表成功:', data.length, '个门店')
  } catch (error) {
    console.error('加载门店列表失败:', error)
    showToastMessage('加载门店列表失败', 'error')
  }
}

// Lifecycle
onMounted(async () => {
  await loadStores()
})
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 60px 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.register-header {
  text-align: center;
  margin-bottom: 60px;
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

.register-form {
  background-color: white;
  border-radius: 12px;
  padding: 48px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 48px;
  max-width: 400px;
  margin: 0 auto 48px;
}

.form-step {
  min-height: 400px;
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

.required-mark {
  color: #f44336;
  margin-left: 4px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 16px;
  height: 48px;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: #1B5E20;
  box-shadow: 0 0 0 2px rgba(27, 94, 32, 0.1);
}

.input-error {
  border-color: #f44336;
}

.input-prefix {
  margin-right: 12px;
  font-size: 16px;
}

.input {
  flex: 1;
  height: 100%;
  font-size: 16px;
  color: #333;
  background: transparent;
  border: none;
  outline: none;
}

.error-message {
  font-size: 12px;
  color: #f44336;
  margin-top: 4px;
}

.avatar-upload {
  width: 80px;
  height: 80px;
  margin: 0 auto 32px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.avatar-upload:hover {
  background-color: #e0e0e0;
  transform: scale(1.05);
}

.avatar-input {
  display: none;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  text-align: center;
}

.placeholder-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.placeholder-text {
  font-size: 12px;
  color: #666;
}

.store-selector {
  margin-bottom: 24px;
}

.selector-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.store-select {
  width: 100%;
  height: 48px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  transition: border-color 0.3s;
}

.store-select:focus {
  outline: none;
  border-color: #1B5E20;
  box-shadow: 0 0 0 2px rgba(27, 94, 32, 0.1);
}

.select-error {
  border-color: #f44336;
}

.register-button {
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
  margin-top: 32px;
}

.register-button:hover:not(:disabled) {
  background-color: #2E7D32;
}

.button-disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.register-footer {
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

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid #1B5E20;
  border-right: 2px solid #1B5E20;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #666;
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