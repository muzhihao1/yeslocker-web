<template>
  <div class="profile-container">
    <!-- User header -->
    <div class="profile-header">
      <div class="avatar-section" @click="changeAvatar">
        <img
          v-if="userInfo.avatarUrl"
          :src="userInfo.avatarUrl"
          alt="用户头像"
          class="avatar-image"
        />
        <div v-else class="avatar-placeholder">
          <span class="placeholder-icon">👤</span>
        </div>
        <div class="avatar-edit">
          <span class="edit-icon">📷</span>
        </div>
        <input 
          ref="avatarInput" 
          type="file" 
          accept="image/*" 
          @change="handleAvatarChange"
          class="avatar-file-input"
        />
      </div>
      
      <div class="user-info">
        <h2 class="user-name">{{ userInfo.name || '未设置姓名' }}</h2>
        <p class="user-phone">{{ userInfo.phone }}</p>
      </div>
    </div>

    <!-- Profile sections -->
    <div class="profile-sections">
      <!-- Basic info section -->
      <div class="section-card">
        <h3 class="section-title">基本信息</h3>
        <div class="info-item" @click="editName">
          <span class="info-label">姓名</span>
          <div class="info-value-wrapper">
            <span class="info-value">{{ userInfo.name || '未设置' }}</span>
            <span class="arrow">›</span>
          </div>
        </div>
        
        <div class="info-item">
          <span class="info-label">手机号</span>
          <span class="info-value">{{ userInfo.phone }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">注册时间</span>
          <span class="info-value">{{ formatDate(userInfo.createdAt) }}</span>
        </div>
      </div>

      <!-- Locker info section -->
      <div class="section-card">
        <h3 class="section-title">杆柜信息</h3>
        <div v-if="userInfo.lockerId" class="info-item">
          <span class="info-label">杆柜编号</span>
          <span class="info-value">{{ userInfo.lockerNumber }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">所属门店</span>
          <span class="info-value">{{ userInfo.storeName || '未绑定' }}</span>
        </div>
        
        <div v-if="!userInfo.lockerId" class="empty-locker">
          <div class="empty-state">
            <div class="empty-icon">🎱</div>
            <h4 class="empty-title">暂未绑定杆柜</h4>
            <p class="empty-description">申请杆柜后即可开始使用</p>
            <button class="empty-action-button" @click="goToApply">
              申请杆柜
            </button>
          </div>
        </div>
      </div>

      <!-- Settings section -->
      <div class="section-card">
        <h3 class="section-title">设置</h3>
        <div class="info-item" @click="goToAbout">
          <span class="info-label">关于我们</span>
          <span class="arrow">›</span>
        </div>
        
        <div class="info-item" @click="goToHelp">
          <span class="info-label">帮助中心</span>
          <span class="arrow">›</span>
        </div>
        
        <div class="info-item" @click="goToPrivacy">
          <span class="info-label">隐私政策</span>
          <span class="arrow">›</span>
        </div>
      </div>

      <!-- Logout button -->
      <div class="logout-section">
        <button
          class="logout-button"
          @click="showLogoutModal = true"
        >
          退出登录
        </button>
      </div>
    </div>

    <!-- Edit name modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">修改姓名</h3>
          <button class="modal-close" @click="closeEditModal">×</button>
        </div>
        <div class="modal-body">
          <input
            v-model="editForm.name"
            type="text"
            placeholder="请输入姓名"
            class="name-input"
            :class="{ 'input-error': !!editError }"
          />
          <div v-if="editError" class="error-message">{{ editError }}</div>
        </div>
        <div class="modal-footer">
          <button class="modal-button secondary" @click="closeEditModal">取消</button>
          <button 
            class="modal-button primary" 
            :disabled="updating"
            @click="confirmEditName"
          >
            <span v-if="updating" class="loading-spinner small"></span>
            {{ updating ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Logout confirmation modal -->
    <div v-if="showLogoutModal" class="modal-overlay" @click="closeLogoutModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">确认退出</h3>
          <button class="modal-close" @click="closeLogoutModal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-text">确定要退出登录吗？</p>
        </div>
        <div class="modal-footer">
          <button class="modal-button secondary" @click="closeLogoutModal">取消</button>
          <button class="modal-button primary" @click="handleLogout">确认</button>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'
import { authApi } from '@/services/api/auth-vue'

const router = useRouter()
const authStore = useAuthStore()

// Refs
const avatarInput = ref<HTMLInputElement | null>(null)

// User info
const userInfo = computed(() => authStore.user || {})

// States
const showEditModal = ref(false)
const showLogoutModal = ref(false)
const updating = ref(false)
const uploadingAvatar = ref(false)

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Edit form
const editForm = reactive({
  name: ''
})
const editError = ref('')

// Methods
const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

const formatDate = (date: string) => {
  if (!date) return '未知'
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const changeAvatar = () => {
  if (avatarInput.value) {
    avatarInput.value.click()
  }
}

const handleAvatarChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToastMessage('请选择图片文件', 'error')
    return
  }
  
  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToastMessage('图片大小不能超过2MB', 'error')
    return
  }
  
  uploadingAvatar.value = true
  
  try {
    // Convert file to base64 for preview (in production, upload to server)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const avatarUrl = e.target?.result as string
      
      try {
        await authApi.updateProfile(userInfo.value.id, {
          avatarUrl: avatarUrl
        })
        
        // Update local state
        authStore.setUser({
          ...userInfo.value,
          avatarUrl: avatarUrl
        })
        
        showToastMessage('头像更新成功', 'success')
      } catch (error) {
        console.error('头像更新失败:', error)
        showToastMessage('头像更新失败', 'error')
      } finally {
        uploadingAvatar.value = false
      }
    }
    reader.readAsDataURL(file)
  } catch (error) {
    uploadingAvatar.value = false
    showToastMessage('头像更新失败', 'error')
  }
  
  // Reset input
  input.value = ''
}

const editName = () => {
  editForm.name = userInfo.value.name || ''
  editError.value = ''
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editError.value = ''
}

const confirmEditName = async () => {
  if (!editForm.name.trim()) {
    editError.value = '请输入姓名'
    return
  }

  updating.value = true
  try {
    await authApi.updateProfile(userInfo.value.id, {
      name: editForm.name.trim()
    })
    
    // Update local state
    authStore.setUser({
      ...userInfo.value,
      name: editForm.name.trim()
    })
    
    showEditModal.value = false
    showToastMessage('修改成功', 'success')
  } catch (error: any) {
    editError.value = error.message || '修改失败'
  } finally {
    updating.value = false
  }
}

const closeLogoutModal = () => {
  showLogoutModal.value = false
}

const goToApply = () => {
  router.push('/user/apply')
}

const goToAbout = () => {
  showToastMessage('功能开发中', 'error')
}

const goToHelp = () => {
  showToastMessage('功能开发中', 'error')
}

const goToPrivacy = () => {
  showToastMessage('功能开发中', 'error')
}

const handleLogout = () => {
  authStore.logout()
}

// Load user data
const loadUserData = async () => {
  if (!authStore.user?.id) return
  
  try {
    const user = await authApi.getCurrentUser()
    if (user) {
      authStore.setUser(user)
    }
  } catch (error) {
    console.error('Failed to load user data:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadUserData()
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.profile-header {
  background: linear-gradient(135deg, #1B5E20, #2E7D32);
  padding: 40px 32px;
  display: flex;
  align-items: center;
  gap: 32px;
}

.avatar-section {
  position: relative;
  width: 80px;
  height: 80px;
  cursor: pointer;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid white;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
}

.placeholder-icon {
  font-size: 32px;
  color: #666;
}

.avatar-edit {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 28px;
  height: 28px;
  background-color: #FFA000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.edit-icon {
  font-size: 12px;
}

.avatar-file-input {
  display: none;
}

.user-info {
  flex: 1;
  color: white;
}

.user-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.user-phone {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.profile-sections {
  padding: 20px;
}

.section-card {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item:hover {
  background-color: #f8f8f8;
  margin: 0 -20px;
  padding: 16px 20px;
}

.info-label {
  font-size: 15px;
  color: #666;
}

.info-value-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-value {
  font-size: 15px;
  color: #333;
}

.arrow {
  font-size: 18px;
  color: #ccc;
}

.empty-locker {
  padding: 32px 0;
}

.empty-state {
  text-align: center;
  max-width: 300px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.empty-action-button {
  background-color: #1B5E20;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.empty-action-button:hover {
  background-color: #2E7D32;
}

.logout-section {
  margin-top: 32px;
  padding: 0 20px 32px;
}

.logout-button {
  width: 100%;
  height: 48px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.logout-button:hover {
  background-color: #d32f2f;
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

.modal-content {
  background-color: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
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
  text-align: center;
}

.name-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.3s;
}

.name-input:focus {
  outline: none;
  border-color: #1B5E20;
}

.name-input.input-error {
  border-color: #f44336;
}

.error-message {
  color: #f44336;
  font-size: 12px;
  margin-top: 8px;
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.modal-button.secondary {
  background-color: #f5f5f5;
  color: #666;
}

.modal-button.primary {
  background-color: #1B5E20;
  color: white;
}

.modal-button:disabled {
  opacity: 0.6;
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