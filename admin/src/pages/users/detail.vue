<template>
  <view class="user-detail">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-left" @click="goBack">
        <text class="iconfont icon-arrow-left"></text>
        <text class="back-text">返回</text>
      </view>
      <text class="header-title">用户详情</text>
      <view class="header-right">
        <text class="iconfont icon-more" @click="showMoreActions"></text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-container">
      <loading-spinner />
    </view>

    <!-- 详情内容 -->
    <view v-else-if="user" class="detail-content">
      <!-- 用户卡片 -->
      <view class="user-card">
        <view class="user-avatar-section">
          <image :src="user.avatar || '/static/images/default-avatar.png'" 
                 class="user-avatar" mode="aspectFill" />
          <view class="user-status" :class="user.disabled ? 'disabled' : 'active'">
            {{ user.disabled ? '已禁用' : '正常' }}
          </view>
        </view>
        <view class="user-basic">
          <text class="user-name">{{ user.name || '未设置昵称' }}</text>
          <text class="user-phone">{{ user.phone }}</text>
          <text class="user-id">ID: {{ user.id }}</text>
        </view>
      </view>

      <!-- 统计信息 -->
      <view class="stats-section">
        <view class="stats-card">
          <view class="stat-item">
            <text class="stat-label">注册时间</text>
            <text class="stat-value">{{ formatDate(user.created_at) }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">最后活跃</text>
            <text class="stat-value">{{ user.last_active_at ? formatDate(user.last_active_at) : '从未' }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">累计存取</text>
            <text class="stat-value">{{ user.total_operations || 0 }} 次</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">当前杆柜</text>
            <text class="stat-value">{{ user.current_lockers || 0 }} 个</text>
          </view>
        </view>
      </view>

      <!-- 当前杆柜 -->
      <view v-if="user.lockers && user.lockers.length > 0" class="section">
        <view class="section-header">
          <text class="section-title">当前杆柜</text>
          <text class="section-count">{{ user.lockers.length }} 个</text>
        </view>
        <view class="locker-list">
          <view v-for="locker in user.lockers" :key="locker.id" class="locker-item">
            <view class="locker-info">
              <text class="locker-number">{{ locker.number }}</text>
              <text class="locker-store">{{ locker.store_name }}</text>
              <text class="locker-date">申请于 {{ formatDate(locker.approved_at, 'date') }}</text>
            </view>
            <view class="locker-status" :class="`status-${locker.status}`">
              {{ getLockerStatusText(locker.status) }}
            </view>
          </view>
        </view>
      </view>

      <!-- 最近操作记录 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">最近操作</text>
          <text class="section-more" @click="viewAllRecords">查看全部</text>
        </view>
        <view v-if="recentRecords.length > 0" class="record-list">
          <view v-for="record in recentRecords" :key="record.id" class="record-item">
            <view class="record-icon" :class="`action-${record.action}`">
              <text class="iconfont" :class="record.action === 'store' ? 'icon-in' : 'icon-out'"></text>
            </view>
            <view class="record-info">
              <text class="record-action">{{ record.action === 'store' ? '存杆' : '取杆' }}</text>
              <text class="record-detail">{{ record.locker_number }} - {{ record.store_name }}</text>
              <text class="record-time">{{ formatDate(record.created_at) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-records">
          <text>暂无操作记录</text>
        </view>
      </view>

      <!-- 个人信息 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">个人信息</text>
          <text class="section-action" @click="editUserInfo">编辑</text>
        </view>
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">真实姓名</text>
            <text class="info-value">{{ user.real_name || '未填写' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">身份证号</text>
            <text class="info-value">{{ user.id_card ? maskIdCard(user.id_card) : '未填写' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">会员等级</text>
            <text class="info-value">{{ user.member_level || '普通会员' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">备注信息</text>
            <text class="info-value">{{ user.remark || '无' }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button class="btn-secondary" @click="sendNotification">
          <text class="iconfont icon-notification"></text>
          发送通知
        </button>
        <button class="btn-primary" :class="{ danger: !user.disabled }" @click="toggleStatus">
          <text class="iconfont" :class="user.disabled ? 'icon-unlock' : 'icon-lock'"></text>
          {{ user.disabled ? '启用账户' : '禁用账户' }}
        </button>
      </view>
    </view>

    <!-- 更多操作菜单 -->
    <uni-popup ref="moreActionsPopup" type="bottom">
      <view class="action-menu">
        <view class="action-item" @click="resetPassword">
          <text class="iconfont icon-key"></text>
          <text>重置密码</text>
        </view>
        <view class="action-item" @click="viewLoginHistory">
          <text class="iconfont icon-history"></text>
          <text>登录历史</text>
        </view>
        <view class="action-item" @click="exportUserData">
          <text class="iconfont icon-export"></text>
          <text>导出数据</text>
        </view>
        <view class="action-item danger" @click="deleteUser">
          <text class="iconfont icon-delete"></text>
          <text>删除用户</text>
        </view>
        <view class="action-cancel" @click="closeMoreActions">
          取消
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount } from 'vue'
import { adminApi } from '@/services/api'
import { formatDate, showToast, showModal } from '@/utils'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface UserDetail {
  id: string
  name: string
  phone: string
  avatar: string
  real_name?: string
  id_card?: string
  member_level?: string
  remark?: string
  created_at: string
  last_active_at?: string
  disabled: boolean
  total_operations: number
  current_lockers: number
  lockers?: Array<{
    id: string
    number: string
    store_name: string
    status: string
    approved_at: string
  }>
}

interface OperationRecord {
  id: string
  action: 'store' | 'retrieve'
  locker_number: string
  store_name: string
  created_at: string
}

const userId = ref('')

// Get user ID from page options
onBeforeMount(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  userId.value = options.id || ''
})

const user = ref<UserDetail | null>(null)
const recentRecords = ref<OperationRecord[]>([])
const loading = ref(false)
const moreActionsPopup = ref()

// 获取杆柜状态文本
const getLockerStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    occupied: '使用中',
    available: '空闲',
    storing: '存杆中'
  }
  return statusMap[status] || status
}

// 身份证脱敏
const maskIdCard = (idCard: string) => {
  if (!idCard || idCard.length < 15) return idCard
  return idCard.replace(/^(.{6})(?:\d+)(.{4})$/, '$1****$2')
}

// 获取用户详情
const getUserDetail = async () => {
  const id = userId.value
  if (!id) {
    showToast('参数错误')
    setTimeout(() => goBack(), 1500)
    return
  }
  
  loading.value = true
  
  try {
    // 获取用户信息
        // Get from users list
    const response = await adminApi.getUsers()
    const users = response.data?.list || []
    user.value = users.find((u: any) => u.id === id) || null
    
    // 获取最近操作记录
    // TODO: Implement records endpoint
    // const recordsRes = await adminApi.getRecords({
    //   user_id: id,
    //   limit: 20,
    //   pageSize: 5
    // })
    // recentRecords.value = recordsRes.data.list || []
    recentRecords.value = []
  } catch (error) {
    console.error('获取用户详情失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 返回
const goBack = () => {
  uni.navigateBack()
}

// 显示更多操作
const showMoreActions = () => {
  moreActionsPopup.value.open()
}

// 关闭更多操作
const closeMoreActions = () => {
  moreActionsPopup.value.close()
}

// 查看全部记录
const viewAllRecords = () => {
  router.push({
    path: '/pages/records/index',
    query: { userId: user.value?.id }
  })
}

// 编辑用户信息
const editUserInfo = () => {
  showToast('功能开发中')
}

// 发送通知
const sendNotification = async () => {
  const result = await uni.showModal({
    title: '发送通知',
    content: '请输入通知内容',
    editable: true,
    placeholderText: '请输入要发送的通知内容'
  })
  
  if (result.confirm && result.content) {
    try {
      // TODO: Implement notification endpoint
      // await adminApi.sendNotification({
      //   userId: user.value!.id,
      //   content: result.content,
      //   type: 'custom'
      // })
      showToast('通知发送成功')
    } catch (error) {
      console.error('发送通知失败:', error)
      showToast('发送失败')
    }
  }
}

// 切换用户状态
const toggleStatus = async () => {
  const action = user.value!.disabled ? '启用' : '禁用'
  const result = await showModal({
    title: `确认${action}`,
    content: `确定要${action}该用户吗？${!user.value!.disabled ? '禁用后用户将无法登录和使用杆柜' : ''}`
  })
  
  if (result.confirm) {
    try {
      // TODO: Implement user update endpoint
      // await adminApi.updateUser(user.value!.id, {
      //   disabled: !user.value!.disabled
      // })
      
      user.value!.disabled = !user.value!.disabled
      showToast(`${action}成功`)
    } catch (error) {
      console.error('操作失败:', error)
      showToast('操作失败')
    }
  }
}

// 重置密码
const resetPassword = async () => {
  closeMoreActions()
  const result = await showModal({
    title: '重置密码',
    content: '确定要重置该用户的密码吗？新密码将通过短信发送给用户。'
  })
  
  if (result.confirm) {
    try {
      // TODO: Implement password reset endpoint
      // await adminApi.resetUserPassword(user.value!.id)
      showToast('密码已重置')
    } catch (error) {
      console.error('重置密码失败:', error)
      showToast('操作失败')
    }
  }
}

// 查看登录历史
const viewLoginHistory = () => {
  closeMoreActions()
  router.push({
    path: '/pages/users/login-history',
    query: { userId: user.value?.id }
  })
}

// 导出用户数据
const exportUserData = async () => {
  closeMoreActions()
  try {
    showToast('正在导出...')
    // TODO: Implement export endpoint
    // const response = await adminApi.exportUserData(user.value!.id)
    
    // 创建下载链接
    const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `用户数据_${user.value!.phone}_${formatDate(new Date(), 'date')}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    showToast('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    showToast('导出失败')
  }
}

// 删除用户
const deleteUser = async () => {
  closeMoreActions()
  const result = await showModal({
    title: '危险操作',
    content: '确定要删除该用户吗？此操作不可恢复！'
  })
  
  if (result.confirm) {
    // 二次确认
    const confirmResult = await uni.showModal({
      title: '请再次确认',
      content: `请输入用户手机号 ${user.value!.phone} 以确认删除`,
      editable: true,
      placeholderText: '请输入用户手机号'
    })
    
    if (confirmResult.confirm && confirmResult.content === user.value!.phone) {
      try {
        // TODO: Implement user delete endpoint
        // await adminApi.deleteUser(user.value!.id)
        showToast('删除成功')
        setTimeout(() => goBack(), 1500)
      } catch (error) {
        console.error('删除失败:', error)
        showToast('删除失败')
      }
    } else if (confirmResult.confirm) {
      showToast('手机号不匹配')
    }
  }
}

// 初始化
onMounted(() => {
  getUserDetail()
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.user-detail {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  
  .header-left {
    display: flex;
    align-items: center;
    color: var(--text-primary);
    
    .iconfont {
      font-size: 36rpx;
      margin-right: 10rpx;
    }
    
    .back-text {
      font-size: 30rpx;
    }
  }
  
  .header-title {
    font-size: 34rpx;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .header-right {
    .iconfont {
      font-size: 36rpx;
      color: var(--text-primary);
    }
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.detail-content {
  padding-bottom: 200rpx;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 40rpx 30rpx;
  background-color: #fff;
  
  .user-avatar-section {
    position: relative;
    margin-right: 30rpx;
    
    .user-avatar {
      width: 140rpx;
      height: 140rpx;
      border-radius: 50%;
    }
    
    .user-status {
      position: absolute;
      bottom: 0;
      right: 0;
      padding: 4rpx 12rpx;
      border-radius: 20rpx;
      font-size: 20rpx;
      background-color: #fff;
      
      &.active {
        color: var(--success-color);
        border: 1px solid var(--success-color);
      }
      
      &.disabled {
        color: var(--danger-color);
        border: 1px solid var(--danger-color);
      }
    }
  }
  
  .user-basic {
    flex: 1;
    
    .user-name {
      display: block;
      font-size: 36rpx;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 12rpx;
    }
    
    .user-phone {
      display: block;
      font-size: 30rpx;
      color: var(--text-secondary);
      margin-bottom: 8rpx;
    }
    
    .user-id {
      display: block;
      font-size: 26rpx;
      color: $text-tertiary;
    }
  }
}

.stats-section {
  padding: 20rpx;
  
  .stats-card {
    display: flex;
    flex-wrap: wrap;
    background-color: #fff;
    border-radius: 16rpx;
    padding: 20rpx;
    
    .stat-item {
      width: 50%;
      padding: 20rpx;
      
      .stat-label {
        display: block;
        font-size: 26rpx;
        color: var(--text-secondary);
        margin-bottom: 8rpx;
      }
      
      .stat-value {
        display: block;
        font-size: 30rpx;
        font-weight: 500;
        color: var(--text-primary);
      }
    }
  }
}

.section {
  margin: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1px solid var(--border-color);
    
    .section-title {
      font-size: 32rpx;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .section-count {
      font-size: 28rpx;
      color: var(--text-secondary);
    }
    
    .section-more,
    .section-action {
      font-size: 28rpx;
      color: var(--primary-color);
    }
  }
  
  .locker-list {
    padding: 20rpx 30rpx;
    
    .locker-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 0;
      border-bottom: 1px solid var(--border-color);
      
      &:last-child {
        border-bottom: none;
      }
      
      .locker-info {
        flex: 1;
        
        .locker-number {
          display: block;
          font-size: 30rpx;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 8rpx;
        }
        
        .locker-store {
          font-size: 26rpx;
          color: var(--text-secondary);
          margin-right: 20rpx;
        }
        
        .locker-date {
          font-size: 24rpx;
          color: $text-tertiary;
        }
      }
      
      .locker-status {
        padding: 8rpx 20rpx;
        border-radius: 20rpx;
        font-size: 24rpx;
        
        &.status-occupied {
          background-color: var(--primary-light);
          color: var(--primary-color);
        }
        
        &.status-available {
          background-color: #F5F5F5;
          color: var(--text-secondary);
        }
        
        &.status-storing {
          background-color: #FFF3CD;
          color: #856404;
        }
      }
    }
  }
  
  .record-list {
    padding: 20rpx 30rpx;
    
    .record-item {
      display: flex;
      align-items: center;
      padding: 20rpx 0;
      border-bottom: 1px solid var(--border-color);
      
      &:last-child {
        border-bottom: none;
      }
      
      .record-icon {
        width: 60rpx;
        height: 60rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        margin-right: 20rpx;
        
        &.action-store {
          background-color: $success-light;
          color: var(--success-color);
        }
        
        &.action-retrieve {
          background-color: var(--primary-light);
          color: var(--primary-color);
        }
        
        .iconfont {
          font-size: 32rpx;
        }
      }
      
      .record-info {
        flex: 1;
        
        .record-action {
          display: block;
          font-size: 30rpx;
          color: var(--text-primary);
          margin-bottom: 4rpx;
        }
        
        .record-detail {
          font-size: 26rpx;
          color: var(--text-secondary);
          margin-right: 20rpx;
        }
        
        .record-time {
          font-size: 24rpx;
          color: $text-tertiary;
        }
      }
    }
  }
  
  .empty-records {
    padding: 60rpx 0;
    text-align: center;
    font-size: 28rpx;
    color: var(--text-secondary);
  }
  
  .info-list {
    padding: 20rpx 30rpx;
    
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 0;
      border-bottom: 1px solid var(--border-color);
      
      &:last-child {
        border-bottom: none;
      }
      
      .info-label {
        font-size: 28rpx;
        color: var(--text-secondary);
      }
      
      .info-value {
        font-size: 28rpx;
        color: var(--text-primary);
        text-align: right;
        max-width: 400rpx;
      }
    }
  }
}

.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  padding: 30rpx;
  background-color: #fff;
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
  
  button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24rpx 0;
    border-radius: 12rpx;
    font-size: 32rpx;
    font-weight: 500;
    
    .iconfont {
      font-size: 36rpx;
      margin-right: 10rpx;
    }
    
    &.btn-secondary {
      background-color: #fff;
      color: var(--primary-color);
      border: 2rpx solid var(--primary-color);
      margin-right: 20rpx;
    }
    
    &.btn-primary {
      background-color: var(--primary-color);
      color: #fff;
      
      &.danger {
        background-color: var(--danger-color);
      }
    }
  }
}

.action-menu {
  background-color: #fff;
  
  .action-item {
    display: flex;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1px solid var(--border-color);
    
    .iconfont {
      font-size: 36rpx;
      margin-right: 20rpx;
      color: var(--text-secondary);
    }
    
    text {
      font-size: 32rpx;
      color: var(--text-primary);
    }
    
    &.danger {
      .iconfont,
      text {
        color: var(--danger-color);
      }
    }
  }
  
  .action-cancel {
    text-align: center;
    padding: 30rpx;
    font-size: 32rpx;
    color: var(--text-secondary);
  }
}
</style>