<template>
  <div class="login-container">
    <div class="login-header">
      <div class="logo">
        <!-- 临时移除logo，避免构建错误 -->
      </div>
      <div class="title">YesLocker 管理后台</div>
      <div class="subtitle">台球杆柜数字化管理系统</div>
    </div>

    <div class="login-form">
      <div class="form-item">
        <div class="form-label">管理员手机号</div>
        <input
          v-model="formData.phone"
          class="form-input"
          type="tel"
          placeholder="请输入管理员手机号"
          maxlength="11"
          :disabled="isLoading"
        />
      </div>

      <div class="form-item">
        <div class="form-label">登录密码</div>
        <input
          v-model="formData.password"
          class="form-input"
          type="password"
          placeholder="请输入登录密码"
          :disabled="isLoading"
        />
      </div>

      <div class="form-actions">
        <button
          class="login-btn"
          :class="{ 'loading': isLoading }"
          :disabled="!canSubmit || isLoading"
          @click="handleLogin"
        >
          <div v-if="isLoading" class="loading-spinner"></div>
          <span>{{ isLoading ? '登录中...' : '管理员登录' }}</span>
        </button>
      </div>

      <div class="form-footer">
        <span class="footer-text">请使用管理员账号登录系统</span>
      </div>
    </div>

    <!-- 开发环境提示 -->
    <div v-if="isDev" class="dev-tips">
      <div class="dev-title">开发环境测试账号：</div>
      <div class="dev-account" @click="fillTestAccount('super')">
        <span>超级管理员：13800000001 / admin123</span>
      </div>
      <div class="dev-account" @click="fillTestAccount('store')">
        <span>门店管理员：13800000002 / admin123</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '../../stores/admin'

const router = useRouter()
const adminStore = useAdminStore()

// 表单数据
const formData = ref({
  phone: '',
  password: ''
})

const isLoading = ref(false)
const isDev = ref(process.env.NODE_ENV === 'development')

// 计算属性
const canSubmit = computed(() => {
  return formData.value.phone.length === 11 && 
         formData.value.password.length >= 6
})

// 简单的提示函数
const showMessage = (message: string, type: 'success' | 'error' = 'error') => {
  alert(message) // 临时使用alert，后续可以替换为更好的UI组件
}

// 方法
const handleLogin = async () => {
  if (!canSubmit.value || isLoading.value) return

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(formData.value.phone)) {
    showMessage('请输入正确的手机号')
    return
  }

  isLoading.value = true
  
  try {
    await adminStore.login(formData.value.phone, formData.value.password)
    
    showMessage('登录成功', 'success')

    // 跳转到管理后台首页
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)

  } catch (error: any) {
    console.error('Login error:', error)
    
    showMessage(error.message || '登录失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const fillTestAccount = (type: 'super' | 'store') => {
  if (type === 'super') {
    formData.value.phone = '13800000001'
    formData.value.password = 'admin123'
  } else {
    formData.value.phone = '13800000002'
    formData.value.password = 'admin123'
  }
}

onMounted(() => {
  // 检查是否已经登录
  if (adminStore.isAuthenticated) {
    router.push('/dashboard')
  }
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  display: flex;
  flex-direction: column;
  padding: 0 var(--spacing-xl);
}

.login-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 100px;
}

.login-header .logo {
  margin-bottom: var(--spacing-lg);
}

.login-header .logo-image {
  width: 60px;
  height: 60px;
}

.login-header .title {
  font-size: var(--font-size-xxl);
  font-weight: bold;
  color: #ffffff;
  margin-bottom: var(--spacing-sm);
  text-align: center;
}

.login-header .subtitle {
  font-size: var(--font-size-md);
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

.login-form {
  flex: 1;
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  padding: var(--spacing-xl) var(--spacing-lg);
  margin-top: var(--spacing-xxl);
}

.login-form .form-item {
  margin-bottom: var(--spacing-lg);
}

.login-form .form-label {
  font-size: var(--font-size-md);
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
}

.login-form .form-input {
  /* input-style applied inline */
  width: 100%;
  padding: var(--spacing-md);
  border: var(--border-width) solid var(--divider-color);
  border-radius: var(--border-radius);
  font-size: var(--font-size-md);
  background-color: var(--bg-color-white);
  transition: border-color var(--animation-duration-normal);
  height: 44px;
}

.login-form .form-input:focus {
  border-color: var(--primary-color);
  outline: none;
}

.login-form .form-input::placeholder {
  color: var(--text-disabled);
}

.login-form .form-actions {
  margin-top: var(--spacing-xl);
}

.login-form .login-btn {
  /* button-style applied inline */
  background-color: var(--primary-color);
  color: #ffffff;
  border: none;
  border-radius: var(--border-radius);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-lg);
  font-weight: bold;
  transition: all var(--animation-duration-normal);
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-form .login-btn:hover {
  opacity: 0.8;
}

.login-form .login-btn:active {
  transform: scale(0.98);
}

.login-form .login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-form .login-btn.loading {
  background-color: var(--text-disabled);
}

.login-form .loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: var(--spacing-sm);
}

.login-form .form-footer {
  margin-top: var(--spacing-lg);
  text-align: center;
}

.login-form .footer-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.dev-tips {
  position: fixed;
  bottom: 20px;
  left: var(--spacing-md);
  right: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.8);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
}

.dev-tips .dev-title {
  color: #ffffff;
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-sm);
  font-weight: bold;
}

.dev-tips .dev-account {
  color: var(--secondary-color);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-xs);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  background-color: rgba(255, 255, 255, 0.1);
}

.dev-tips .dev-account:last-child {
  margin-bottom: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>