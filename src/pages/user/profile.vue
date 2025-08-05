<template>
  <view class="profile-container">
    <!-- User header -->
    <view class="profile-header">
      <view class="avatar-section" @click="changeAvatar">
        <image
          v-if="userInfo.avatarUrl"
          :src="userInfo.avatarUrl"
          class="avatar-image"
          mode="aspectFill"
        />
        <view v-else class="avatar-placeholder">
          <text class="placeholder-icon">👤</text>
        </view>
        <view class="avatar-edit">
          <text class="edit-icon">📷</text>
        </view>
      </view>
      
      <view class="user-info">
        <text class="user-name">{{ userInfo.name || '未设置姓名' }}</text>
        <text class="user-phone">{{ userInfo.phone }}</text>
      </view>
    </view>

    <!-- Profile sections -->
    <view class="profile-sections">
      <!-- Basic info section -->
      <card title="基本信息" class="section-card">
        <view class="info-item" @click="editName">
          <text class="info-label">姓名</text>
          <view class="info-value-wrapper">
            <text class="info-value">{{ userInfo.name || '未设置' }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
        
        <view class="info-item">
          <text class="info-label">手机号</text>
          <text class="info-value">{{ userInfo.phone }}</text>
        </view>
        
        <view class="info-item">
          <text class="info-label">注册时间</text>
          <text class="info-value">{{ formatDate(userInfo.createdAt) }}</text>
        </view>
      </card>

      <!-- Locker info section -->
      <card title="杆柜信息" class="section-card">
        <view v-if="userInfo.lockerId" class="info-item">
          <text class="info-label">杆柜编号</text>
          <text class="info-value">{{ userInfo.lockerNumber }}</text>
        </view>
        
        <view class="info-item">
          <text class="info-label">所属门店</text>
          <text class="info-value">{{ userInfo.storeName || '未绑定' }}</text>
        </view>
        
        <view v-if="!userInfo.lockerId" class="empty-locker">
          <empty-state
            icon="🎱"
            title="暂未绑定杆柜"
            description="申请杆柜后即可开始使用"
            show-button
            button-text="申请杆柜"
            @action="goToApply"
          />
        </view>
      </card>

      <!-- Settings section -->
      <card title="设置" class="section-card">
        <view class="info-item" @click="goToAbout">
          <text class="info-label">关于我们</text>
          <text class="arrow">›</text>
        </view>
        
        <view class="info-item" @click="goToHelp">
          <text class="info-label">帮助中心</text>
          <text class="arrow">›</text>
        </view>
        
        <view class="info-item" @click="goToPrivacy">
          <text class="info-label">隐私政策</text>
          <text class="arrow">›</text>
        </view>
      </card>

      <!-- Logout button -->
      <view class="logout-section">
        <custom-button
          type="danger"
          size="large"
          text="退出登录"
          block
          @click="showLogoutModal = true"
        />
      </view>
    </view>

    <!-- Edit name modal -->
    <modal
      v-model:visible="showEditModal"
      title="修改姓名"
      @confirm="confirmEditName"
      :confirm-loading="updating"
    >
      <input-field
        v-model="editForm.name"
        type="text"
        placeholder="请输入姓名"
        :error="!!editError"
        :error-message="editError"
      />
    </modal>

    <!-- Logout confirmation modal -->
    <modal
      v-model:visible="showLogoutModal"
      title="确认退出"
      content="确定要退出登录吗？"
      @confirm="handleLogout"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/api/auth'
import { Card, CustomButton, EmptyState, Modal, InputField } from '@/components/common'
import dayjs from 'dayjs'

const authStore = useAuthStore()

// User info
const userInfo = computed(() => authStore.user || {})

// States
const showEditModal = ref(false)
const showLogoutModal = ref(false)
const updating = ref(false)
const uploadingAvatar = ref(false)

// Edit form
const editForm = reactive({
  name: ''
})
const editError = ref('')

// Methods
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY年MM月DD日')
}

const changeAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      uploadingAvatar.value = true
      
      uni.showLoading({
        title: '上传中...'
      })
      
      try {
        // In production, upload to Supabase Storage
        // For now, use local path
        await authApi.updateProfile(userInfo.value.id, {
          avatarUrl: tempFilePath
        })
        
        // Update local state
        authStore.setUser({
          ...userInfo.value,
          avatarUrl: tempFilePath
        })
        
        uni.hideLoading()
        uni.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
      } catch (error) {
        uni.hideLoading()
        uni.showToast({
          title: '头像更新失败',
          icon: 'none'
        })
      } finally {
        uploadingAvatar.value = false
      }
    }
  })
}

const editName = () => {
  editForm.name = userInfo.value.name || ''
  editError.value = ''
  showEditModal.value = true
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
    uni.showToast({
      title: '修改成功',
      icon: 'success'
    })
  } catch (error: any) {
    editError.value = error.message || '修改失败'
  } finally {
    updating.value = false
  }
}

const goToApply = () => {
  uni.navigateTo({
    url: '/pages/user/apply'
  })
}

const goToAbout = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

const goToHelp = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

const goToPrivacy = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

const handleLogout = () => {
  authStore.logout()
}

// Load user data
const loadUserData = async () => {
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
  background-color: var(--background-color);
}

.profile-header {
  background: linear-gradient(135deg, var(--primary-color), #2E7D32);
  padding: 60rpx 40rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 40rpx;
}

.avatar-section {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  cursor: pointer;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4rpx solid white;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid white;
}

.placeholder-icon {
  font-size: 60rpx;
  color: var(--text-secondary);
}

.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 48rpx;
  height: 48rpx;
  background-color: var(--secondary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid white;
}

.edit-icon {
  font-size: 24rpx;
}

.user-info {
  flex: 1;
  color: white;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.user-phone {
  font-size: 28rpx;
  opacity: 0.9;
}

.profile-sections {
  padding: 24rpx;
}

.section-card {
  margin-bottom: 24rpx;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 30rpx;
  color: var(--text-secondary);
}

.info-value-wrapper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.info-value {
  font-size: 30rpx;
  color: var(--text-color);
}

.arrow {
  font-size: 32rpx;
  color: var(--text-secondary);
}

.empty-locker {
  padding: 40rpx 0;
}

.logout-section {
  margin-top: 48rpx;
  padding: 0 24rpx 48rpx;
}
</style>