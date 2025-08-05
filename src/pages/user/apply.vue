<template>
  <view class="apply-container">
    <view class="apply-header">
      <text class="title">申请杆柜</text>
      <text class="subtitle">选择门店和杆柜，开始使用YesLocker服务</text>
    </view>

    <view class="apply-form">
      <!-- Store selection -->
      <card title="选择门店" class="form-section">
        <view class="store-list">
          <view
            v-for="store in stores"
            :key="store.id"
            :class="['store-item', { 'store-item--active': selectedStoreId === store.id }]"
            @click="selectStore(store)"
          >
            <view class="store-info">
              <text class="store-name">{{ store.name }}</text>
              <text class="store-address">{{ store.address }}</text>
            </view>
            <view v-if="selectedStoreId === store.id" class="check-icon">
              <text>✓</text>
            </view>
          </view>
        </view>
      </card>

      <!-- Locker selection -->
      <card v-if="selectedStoreId" title="选择杆柜" class="form-section">
        <view v-if="loadingLockers" class="loading-container">
          <loading-spinner size="medium" text="加载杆柜列表..." />
        </view>
        
        <view v-else-if="availableLockers.length === 0" class="empty-container">
          <empty-state
            icon="📭"
            title="暂无可用杆柜"
            description="该门店暂时没有可用的杆柜"
          />
        </view>
        
        <view v-else class="locker-grid">
          <view
            v-for="locker in availableLockers"
            :key="locker.id"
            :class="['locker-item', { 
              'locker-item--selected': selectedLockerId === locker.id,
              'locker-item--disabled': locker.status !== 'available'
            }]"
            @click="selectLocker(locker)"
          >
            <text class="locker-number">{{ locker.number }}</text>
            <status-badge
              :type="locker.status === 'available' ? 'success' : 'warning'"
              :text="locker.status === 'available' ? '可用' : '已占用'"
              size="small"
            />
          </view>
        </view>
      </card>

      <!-- Application reason -->
      <card v-if="selectedLockerId" title="申请说明" class="form-section">
        <textarea
          v-model="applicationReason"
          class="reason-textarea"
          placeholder="请简要说明申请理由（选填）"
          maxlength="200"
        />
        <text class="char-count">{{ applicationReason.length }}/200</text>
      </card>

      <!-- Terms and conditions -->
      <view v-if="selectedLockerId" class="terms-section">
        <label class="terms-label">
          <checkbox 
            :checked="agreedToTerms" 
            @change="handleTermsChange"
            color="#1B5E20"
          />
          <text class="terms-text">
            我已阅读并同意
            <text class="link-text" @click="showTerms">《杆柜使用协议》</text>
          </text>
        </label>
      </view>

      <!-- Submit button -->
      <view class="submit-section">
        <custom-button
          type="primary"
          size="large"
          text="提交申请"
          :disabled="!canSubmit"
          :loading="submitting"
          block
          round
          @click="submitApplication"
        />
      </view>
    </view>

    <!-- Terms modal -->
    <modal
      v-model:visible="showTermsModal"
      title="杆柜使用协议"
      :show-footer="false"
    >
      <view class="terms-content">
        <text class="terms-paragraph">
          1. 用户需妥善保管个人物品，如有遗失本店概不负责。
        </text>
        <text class="terms-paragraph">
          2. 杆柜仅供存放台球杆具，不得存放其他物品。
        </text>
        <text class="terms-paragraph">
          3. 连续三个月未使用的杆柜，门店有权进行清理。
        </text>
        <text class="terms-paragraph">
          4. 请遵守门店管理规定，爱护公共设施。
        </text>
      </view>
    </modal>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { storesApi } from '@/services/api/stores'
import { lockersApi } from '@/services/api/lockers'
import { Card, CustomButton, LoadingSpinner, EmptyState, StatusBadge, Modal } from '@/components/common'
import type { Store, Locker } from '@/types/user'

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

// Computed
const canSubmit = computed(() => {
  return selectedStoreId.value && 
         selectedLockerId.value && 
         agreedToTerms.value &&
         !submitting.value
})

// Set test values
if (import.meta.env.DEV) {
  selectedStoreId.value = '1'
  selectedLockerId.value = 'A01'
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
const loadStores = async () => {
  loadingStores.value = true
  try {
    const data = await storesApi.getStores()
    stores.value = data
  } catch (error) {
    uni.showToast({
      title: '加载门店失败',
      icon: 'none'
    })
  } finally {
    loadingStores.value = false
  }
}

const loadLockers = async (storeId: string) => {
  loadingLockers.value = true
  selectedLockerId.value = ''
  
  try {
    const data = await lockersApi.getLockersByStore(storeId)
    availableLockers.value = data
  } catch (error) {
    uni.showToast({
      title: '加载杆柜失败',
      icon: 'none'
    })
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

const handleTermsChange = (e: any) => {
  agreedToTerms.value = e.detail.value
}

const showTerms = () => {
  showTermsModal.value = true
}

const submitApplication = async () => {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    await lockersApi.applyLocker({
      storeId: selectedStoreId.value,
      lockerId: selectedLockerId.value,
      reason: applicationReason.value
    })

    uni.showToast({
      title: '申请提交成功',
      icon: 'success'
    })

    // Navigate back after success
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.showToast({
      title: error.message || '申请失败',
      icon: 'none'
    })
  } finally {
    submitting.value = false
  }
}


// Initialize
loadStores()
</script>

<style scoped>
.apply-container {
  min-height: 100vh;
  background-color: var(--background-color);
}

.apply-header {
  padding: 40rpx;
  text-align: center;
  background-color: white;
  border-bottom: 1rpx solid var(--border-color);
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: var(--text-color);
  display: block;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.apply-form {
  padding: 24rpx;
}

.form-section {
  margin-bottom: 24rpx;
}

/* Store selection */
.store-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.store-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.store-item:active {
  transform: scale(0.98);
}

.store-item--active {
  background-color: rgba(27, 94, 32, 0.1);
  border-color: var(--primary-color);
}

.store-info {
  flex: 1;
}

.store-name {
  font-size: 32rpx;
  font-weight: 500;
  color: var(--text-color);
  display: block;
  margin-bottom: 8rpx;
}

.store-address {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.check-icon {
  width: 40rpx;
  height: 40rpx;
  background-color: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

/* Locker selection */
.loading-container,
.empty-container {
  padding: 60rpx 0;
}

.locker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.locker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.locker-item:active:not(.locker-item--disabled) {
  transform: scale(0.95);
}

.locker-item--selected {
  background-color: rgba(27, 94, 32, 0.1);
  border-color: var(--primary-color);
}

.locker-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locker-number {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-color);
}

/* Application reason */
.reason-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 24rpx;
  font-size: 30rpx;
  line-height: 1.6;
  border: 2rpx solid var(--border-color);
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.char-count {
  display: block;
  text-align: right;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

/* Terms section */
.terms-section {
  padding: 0 24rpx 24rpx;
}

.terms-label {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.terms-text {
  font-size: 28rpx;
  color: var(--text-secondary);
  line-height: 1.5;
}

.link-text {
  color: var(--primary-color);
  text-decoration: underline;
}

/* Submit section */
.submit-section {
  padding: 24rpx;
}

/* Terms modal */
.terms-content {
  padding: 24rpx 0;
}

.terms-paragraph {
  display: block;
  font-size: 28rpx;
  color: var(--text-color);
  line-height: 1.8;
  margin-bottom: 20rpx;
}
</style>