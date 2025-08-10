<template>
  <div class="apply-container">
    <div class="apply-header">
      <h1 class="title">申请杆柜</h1>
      <p class="subtitle">选择门店和杆柜，开始使用YesLocker服务</p>
    </div>

    <div class="apply-form">
      <!-- Store selection -->
      <div class="form-section">
        <div class="section-card">
          <h3 class="section-title">选择门店</h3>
          <div v-if="loadingStores" class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">加载门店列表...</p>
          </div>
          <div v-else class="store-list">
            <div
              v-for="store in stores"
              :key="store.id"
              :class="['store-item', { 'store-item--active': selectedStoreId === store.id }]"
              @click="selectStore(store)"
            >
              <div class="store-info">
                <div class="store-name">{{ store.name }}</div>
                <div class="store-address">{{ store.address }}</div>
              </div>
              <div v-if="selectedStoreId === store.id" class="check-icon">
                <span>✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Locker selection -->
      <div v-if="selectedStoreId" class="form-section">
        <div class="section-card">
          <h3 class="section-title">选择杆柜</h3>
          <div v-if="loadingLockers" class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">加载杆柜列表...</p>
          </div>
          
          <div v-else-if="availableLockers.length === 0" class="empty-container">
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <h4 class="empty-title">暂无可用杆柜</h4>
              <p class="empty-description">该门店暂时没有可用的杆柜</p>
            </div>
          </div>
          
          <div v-else class="locker-grid">
            <div
              v-for="locker in availableLockers"
              :key="locker.id"
              :class="['locker-item', { 
                'locker-item--selected': selectedLockerId === locker.id,
                'locker-item--disabled': locker.status !== 'available'
              }]"
              @click="selectLocker(locker)"
            >
              <div class="locker-number">{{ locker.number }}</div>
              <div 
                :class="['status-badge', locker.status === 'available' ? 'status-success' : 'status-warning']"
              >
                {{ locker.status === 'available' ? '可用' : '已占用' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Application reason -->
      <div v-if="selectedLockerId" class="form-section">
        <div class="section-card">
          <h3 class="section-title">申请说明</h3>
          <textarea
            v-model="applicationReason"
            class="reason-textarea"
            placeholder="请简要说明申请理由（选填）"
            maxlength="200"
          ></textarea>
          <div class="char-count">{{ applicationReason.length }}/200</div>
        </div>
      </div>

      <!-- Terms and conditions -->
      <div v-if="selectedLockerId" class="terms-section">
        <label class="terms-label">
          <input 
            v-model="agreedToTerms" 
            type="checkbox"
            class="terms-checkbox"
          />
          <span class="terms-text">
            我已阅读并同意
            <button class="link-button" @click="showTerms">《杆柜使用协议》</button>
          </span>
        </label>
      </div>

      <!-- Submit button -->
      <div class="submit-section">
        <button
          class="submit-button"
          :class="{ 'button-disabled': !canSubmit }"
          :disabled="!canSubmit"
          @click="submitApplication"
        >
          <span v-if="submitting" class="loading-spinner small"></span>
          {{ submitting ? '提交中...' : '提交申请' }}
        </button>
      </div>
    </div>

    <!-- Terms modal -->
    <div v-if="showTermsModal" class="modal-overlay" @click="closeTermsModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">杆柜使用协议</h3>
          <button class="modal-close" @click="closeTermsModal">×</button>
        </div>
        <div class="modal-body">
          <div class="terms-content">
            <p class="terms-paragraph">
              1. 用户需妥善保管个人物品，如有遗失本店概不负责。
            </p>
            <p class="terms-paragraph">
              2. 杆柜仅供存放台球杆具，不得存放其他物品。
            </p>
            <p class="terms-paragraph">
              3. 连续三个月未使用的杆柜，门店有权进行清理。
            </p>
            <p class="terms-paragraph">
              4. 请遵守门店管理规定，爱护公共设施。
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-button primary" @click="closeTermsModal">我已了解</button>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-vue'
import { storesApi } from '@/services/api/stores-vue'
import { lockersApi } from '@/services/api/lockers-vue'
import type { Store, Locker } from '@/types/user'

const router = useRouter()
const authStore = useAuthStore()

// Data
const stores = ref<Store[]>([])
const availableLockers = ref<Locker[]>([])
const selectedStoreId = ref('')
const selectedLockerId = ref('')
const applicationReason = ref('')
const agreedToTerms = ref(false)

// States
const loadingStores = ref(false)
const loadingLockers = ref(false)
const submitting = ref(false)
const showTermsModal = ref(false)

// Toast state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Computed
const canSubmit = computed(() => {
  return selectedStoreId.value && 
         selectedLockerId.value && 
         agreedToTerms.value &&
         !submitting.value
})

// Set test values in development
if (import.meta.env.DEV) {
  selectedStoreId.value = '1'
  selectedLockerId.value = 'locker_1'
  agreedToTerms.value = true
}

// Watch store selection
watch(selectedStoreId, (newStoreId) => {
  if (newStoreId) {
    loadLockers(newStoreId)
  } else {
    availableLockers.value = []
    selectedLockerId.value = ''
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

const loadStores = async () => {
  loadingStores.value = true
  try {
    const data = await storesApi.getStores()
    stores.value = data
    console.log('加载门店成功:', data.length, '个门店')
  } catch (error) {
    console.error('加载门店失败:', error)
    showToastMessage('加载门店失败，请刷新重试', 'error')
  } finally {
    loadingStores.value = false
  }
}

const loadLockers = async (storeId: string) => {
  loadingLockers.value = true
  selectedLockerId.value = ''
  
  try {
    const data = await lockersApi.getLockersByStore(storeId)
    availableLockers.value = data.filter(locker => locker.status === 'available')
    console.log('加载杆柜成功:', availableLockers.value.length, '个可用杆柜')
  } catch (error) {
    console.error('加载杆柜失败:', error)
    showToastMessage('加载杆柜失败，请重试', 'error')
  } finally {
    loadingLockers.value = false
  }
}

const selectStore = (store: Store) => {
  selectedStoreId.value = store.id
}

const selectLocker = (locker: Locker) => {
  if (locker.status === 'available') {
    selectedLockerId.value = locker.id
  }
}

const showTerms = () => {
  showTermsModal.value = true
}

const closeTermsModal = () => {
  showTermsModal.value = false
}

const submitApplication = async () => {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    const response = await lockersApi.applyLocker({
      storeId: selectedStoreId.value,
      lockerId: selectedLockerId.value,
      reason: applicationReason.value.trim() || undefined
    })

    showToastMessage('申请提交成功！等待审核中...', 'success')

    // Navigate back after success
    setTimeout(() => {
      router.back()
    }, 2000)
  } catch (error: any) {
    console.error('提交申请失败:', error)
    showToastMessage(error.message || '申请失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadStores()
})
</script>

<style scoped>
.apply-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.apply-header {
  padding: 40px;
  text-align: center;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px 0;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.apply-form {
  padding: 24px;
}

.form-section {
  margin-bottom: 24px;
}

.section-card {
  background-color: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

/* Loading states */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #1B5E20;
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

/* Store selection */
.store-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.store-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.store-item:hover {
  background-color: #e8e8e8;
}

.store-item:active {
  transform: scale(0.98);
}

.store-item--active {
  background-color: rgba(27, 94, 32, 0.1);
  border-color: #1B5E20;
}

.store-info {
  flex: 1;
}

.store-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.store-address {
  font-size: 13px;
  color: #666;
}

.check-icon {
  width: 24px;
  height: 24px;
  background-color: #1B5E20;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

/* Empty state */
.empty-container {
  padding: 60px 0;
}

.empty-state {
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* Locker selection */
.locker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
}

.locker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 16px;
  background-color: #f5f5f5;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.locker-item:hover:not(.locker-item--disabled) {
  background-color: #e8e8e8;
}

.locker-item:active:not(.locker-item--disabled) {
  transform: scale(0.95);
}

.locker-item--selected {
  background-color: rgba(27, 94, 32, 0.1);
  border-color: #1B5E20;
}

.locker-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locker-number {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  padding: 4px 8px;
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

/* Application reason */
.reason-textarea {
  width: 100%;
  min-height: 120px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
  resize: vertical;
  font-family: inherit;
}

.reason-textarea:focus {
  outline: none;
  border-color: #1B5E20;
  background-color: white;
}

.char-count {
  text-align: right;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

/* Terms section */
.terms-section {
  padding: 0 24px 24px;
}

.terms-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.terms-checkbox {
  margin-top: 2px;
  accent-color: #1B5E20;
}

.terms-text {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.link-button {
  color: #1B5E20;
  text-decoration: underline;
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  cursor: pointer;
}

/* Submit section */
.submit-section {
  padding: 24px;
}

.submit-button {
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

.submit-button:hover:not(:disabled) {
  background-color: #2E7D32;
}

.button-disabled {
  background-color: #ccc;
  cursor: not-allowed;
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
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
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
  max-height: 400px;
  overflow-y: auto;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  text-align: right;
}

.modal-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.modal-button.primary {
  background-color: #1B5E20;
  color: white;
}

/* Terms content */
.terms-content {
  padding: 12px 0;
}

.terms-paragraph {
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  margin: 0 0 16px 0;
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