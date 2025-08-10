<template>
  <div class="lockers-container">
    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>

    <!-- No locker state -->
    <div v-else-if="!userLocker" class="no-locker">
      <div class="empty-state">
        <div class="empty-icon">🎱</div>
        <h2 class="empty-title">您还没有杆柜</h2>
        <p class="empty-description">申请杆柜后即可享受专属存储服务</p>
        <button class="apply-button" @click="goToApply">
          申请杆柜
        </button>
      </div>
    </div>

    <!-- Has locker state -->
    <div v-else class="locker-content">
      <!-- Locker info card -->
      <div class="section-card locker-info-card">
        <div class="locker-header">
          <div class="locker-title-section">
            <div class="locker-icon">🎱</div>
            <div class="locker-details">
              <h3 class="locker-number">杆柜 {{ userLocker.number }}</h3>
              <p class="store-name">{{ userLocker.storeName }}</p>
            </div>
          </div>
          <div 
            :class="['status-badge', userLocker.status === 'approved' ? 'status-success' : 'status-warning']"
          >
            {{ getStatusText(userLocker.status) }}
          </div>
        </div>

        <div v-if="userLocker.status === 'approved'" class="locker-stats">
          <div class="stat-item">
            <div class="stat-value">{{ totalUsageCount }}</div>
            <div class="stat-label">使用次数</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value">{{ daysSinceLastUse }}</div>
            <div class="stat-label">天未使用</div>
          </div>
        </div>

        <div v-if="userLocker.status === 'pending'" class="pending-notice">
          <span class="notice-icon">⏳</span>
          <span class="notice-text">您的申请正在审核中，请耐心等待</span>
        </div>
      </div>

      <!-- Quick actions -->
      <div v-if="userLocker.status === 'approved'" class="quick-actions">
        <div class="action-button" @click="handleStore">
          <div class="action-icon-wrapper store">
            <span class="action-icon">📥</span>
          </div>
          <span class="action-text">存杆</span>
        </div>
        
        <div class="action-button" @click="handleRetrieve">
          <div class="action-icon-wrapper retrieve">
            <span class="action-icon">📤</span>
          </div>
          <span class="action-text">取杆</span>
        </div>
        
        <div class="action-button" @click="showQRCode">
          <div class="action-icon-wrapper qrcode">
            <span class="action-icon">📱</span>
          </div>
          <span class="action-text">凭证</span>
        </div>
      </div>

      <!-- Recent records -->
      <div v-if="userLocker.status === 'approved'" class="section-card records-card">
        <h3 class="section-title">最近记录</h3>
        <div v-if="recentRecords.length === 0" class="no-records">
          <span class="no-records-text">暂无使用记录</span>
        </div>
        
        <div v-else class="record-list">
          <div
            v-for="record in recentRecords"
            :key="record.id"
            class="record-item"
            @click="viewRecordDetail(record)"
          >
            <div class="record-icon">
              <span>{{ record.actionType === 'store' ? '📥' : '📤' }}</span>
            </div>
            <div class="record-details">
              <div class="record-action">
                {{ record.actionType === 'store' ? '存杆' : '取杆' }}
              </div>
              <div class="record-time">{{ formatRecordTime(record.createdAt) }}</div>
            </div>
            <div class="record-store">{{ record.storeName }}</div>
          </div>
        </div>
        
        <div class="view-all" @click="viewAllRecords">
          <span class="view-all-text">查看全部记录</span>
          <span class="view-all-arrow">›</span>
        </div>
      </div>
    </div>

    <!-- Action confirmation modal -->
    <div v-if="showActionModal" class="modal-overlay" @click="closeActionModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
            {{ actionType === 'store' ? '确认存杆' : '确认取杆' }}
          </h3>
          <button class="modal-close" @click="closeActionModal">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-text">
            {{ actionType === 'store' 
              ? '确认要存放台球杆吗？' 
              : '确认要取出台球杆吗？' }}
          </p>
          <p class="modal-hint">
            操作完成后请记得{{ actionType === 'store' ? '锁好杆柜' : '归还钥匙到吧台' }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="modal-button secondary" @click="closeActionModal">取消</button>
          <button 
            class="modal-button primary" 
            :disabled="processing"
            @click="confirmAction"
          >
            <span v-if="processing" class="loading-spinner small"></span>
            {{ processing ? '处理中...' : '确认' }}
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'
import { lockersApi } from '@/services/api/lockers-vue'
import type { Locker } from '@/types/user'

const router = useRouter()
const authStore = useAuthStore()

// Types
interface LockerRecord {
  id: string
  actionType: 'store' | 'retrieve' | 'assigned'
  lockerNumber: string
  storeName: string
  createdAt: string
  note?: string
}

// Data
const userLocker = ref<Locker | null>(null)
const recentRecords = ref<LockerRecord[]>([])

// States
const showActionModal = ref(false)
const actionType = ref<'store' | 'retrieve'>('store')
const processing = ref(false)
const loading = ref(false)

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Computed
const totalUsageCount = computed(() => {
  return recentRecords.value.filter(r => r.actionType !== 'assigned').length
})

const daysSinceLastUse = computed(() => {
  if (!userLocker.value?.lastUseTime) return 0
  const lastUse = new Date(userLocker.value.lastUseTime)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - lastUse.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '审核中'
    case 'approved':
      return '使用中'
    case 'rejected':
      return '已驳回'
    default:
      return '未知'
  }
}

const formatRecordTime = (timeString: string) => {
  const date = new Date(timeString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const goToApply = () => {
  router.push('/user/apply')
}

const handleStore = () => {
  actionType.value = 'store'
  showActionModal.value = true
}

const handleRetrieve = () => {
  actionType.value = 'retrieve'
  showActionModal.value = true
}

const closeActionModal = () => {
  showActionModal.value = false
}

const confirmAction = async () => {
  if (!userLocker.value) return

  processing.value = true
  
  try {
    // Navigate to action page with query parameters
    const query = {
      type: actionType.value,
      lockerId: userLocker.value.id,
      lockerNumber: userLocker.value.number,
      storeName: userLocker.value.storeName || ''
    }
    
    router.push({
      path: '/locker/action',
      query
    })
    
    showActionModal.value = false
  } catch (error) {
    console.error('导航失败:', error)
    showToastMessage('操作失败，请重试', 'error')
  } finally {
    processing.value = false
  }
}

const showQRCode = () => {
  router.push('/locker/qrcode')
}

const viewRecordDetail = (record: LockerRecord) => {
  console.log('查看记录详情:', record)
  // TODO: 实现记录详情查看功能
}

const viewAllRecords = () => {
  router.push('/user/records')
}

const loadUserLocker = async () => {
  if (!authStore.user?.id) {
    showToastMessage('用户信息异常，请重新登录', 'error')
    return
  }
  
  loading.value = true
  try {
    const locker = await lockersApi.getUserLocker(authStore.user.id)
    userLocker.value = locker
    
    // Load records if user has an approved locker
    if (locker && locker.status === 'approved') {
      await loadRecentRecords()
    }
    
    console.log('用户杆柜信息:', locker)
  } catch (error) {
    console.error('加载用户杆柜失败:', error)
    showToastMessage('加载失败，请刷新重试', 'error')
  } finally {
    loading.value = false
  }
}

const loadRecentRecords = async () => {
  if (!authStore.user?.id) return
  
  try {
    const records = await lockersApi.getUserLockerRecords(authStore.user.id, 5)
    recentRecords.value = records
    console.log('最近使用记录:', records.length, '条')
  } catch (error) {
    console.error('加载使用记录失败:', error)
    // Don't show error toast for records as it's not critical
  }
}

// Lifecycle
onMounted(async () => {
  await loadUserLocker()
})
</script>

<style scoped>
.lockers-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Loading state */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #1B5E20;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0 8px 0 0;
}

.loading-text {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* No locker state */
.no-locker {
  padding-top: 150px;
}

.empty-state {
  text-align: center;
  max-width: 300px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

.apply-button {
  background-color: #1B5E20;
  color: white;
  border: none;
  border-radius: 24px;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.apply-button:hover {
  background-color: #2E7D32;
}

/* Locker content */
.locker-content {
  animation: fadeIn 0.3s ease;
}

.section-card {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

/* Locker info card */
.locker-info-card {
  background: linear-gradient(135deg, #f8f8f8 0%, white 100%);
}

.locker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.locker-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.locker-icon {
  font-size: 32px;
}

.locker-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.locker-number {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.store-name {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.status-warning {
  background-color: #fff3cd;
  color: #f57c00;
}

.locker-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 24px 0;
  background-color: #f8f8f8;
  border-radius: 12px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1B5E20;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background-color: #e0e0e0;
}

.pending-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: rgba(250, 173, 20, 0.1);
  border-radius: 8px;
}

.notice-icon {
  font-size: 18px;
}

.notice-text {
  font-size: 14px;
  color: #f57c00;
}

/* Quick actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.action-button:active {
  transform: scale(0.95);
}

.action-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.action-icon-wrapper.store {
  background-color: rgba(82, 196, 26, 0.1);
}

.action-icon-wrapper.retrieve {
  background-color: rgba(27, 94, 32, 0.1);
}

.action-icon-wrapper.qrcode {
  background-color: rgba(255, 160, 0, 0.1);
}

.action-icon {
  font-size: 24px;
}

.action-text {
  font-size: 14px;
  color: #333;
}

/* Records card */
.no-records {
  padding: 60px 0;
  text-align: center;
}

.no-records-text {
  font-size: 14px;
  color: #666;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f8f8f8;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.record-item:hover {
  background-color: #f0f0f0;
}

.record-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border-radius: 8px;
  font-size: 16px;
}

.record-details {
  flex: 1;
}

.record-action {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.record-time {
  font-size: 12px;
  color: #666;
}

.record-store {
  font-size: 12px;
  color: #666;
}

.view-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px 0;
  cursor: pointer;
}

.view-all-text {
  font-size: 14px;
  color: #1B5E20;
}

.view-all-arrow {
  font-size: 16px;
  color: #1B5E20;
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
  text-align: center;
}

.modal-text {
  font-size: 16px;
  color: #333;
  margin: 0 0 12px 0;
}

.modal-hint {
  font-size: 14px;
  color: #666;
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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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