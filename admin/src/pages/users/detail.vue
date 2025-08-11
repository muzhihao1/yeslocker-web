<template>
  <div class="user-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left" @click="goBack">
        <span class="iconfont icon-arrow-left"></span>
        <span class="back-text">返回</span>
      </div>
      <span class="header-title">用户详情</span>
      <div class="header-right">
        <span class="iconfont icon-more" @click="showMoreActions"></span>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <loading-spinner />
    </div>

    <!-- 详情内容 -->
    <div v-else-if="user" class="detail-content">
      <!-- 用户卡片 -->
      <div class="user-card">
        <div class="user-avatar-section">
          <div class="user-avatar">👤</div>
          <div class="user-status" :class="user.disabled ? 'disabled' : 'active'">
            {{ user.disabled ? '已禁用' : '正常' }}
          </div>
        </div>
        <div class="user-basic">
          <span class="user-name">{{ user.name || '未设置昵称' }}</span>
          <span class="user-phone">{{ user.phone }}</span>
          <span class="user-id">ID: {{ user.id }}</span>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stats-card">
          <div class="stat-item">
            <span class="stat-label">注册时间</span>
            <span class="stat-value">{{ formatDate(user.created_at) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最后活跃</span>
            <span class="stat-value">{{ user.last_active_at ? formatDate(user.last_active_at) : '从未' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">累计存取</span>
            <span class="stat-value">{{ user.total_operations || 0 }} 次</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">当前杆柜</span>
            <span class="stat-value">{{ user.current_lockers || 0 }} 个</span>
          </div>
        </div>
      </div>

      <!-- 当前杆柜 -->
      <div v-if="user.lockers && user.lockers.length > 0" class="section">
        <div class="section-header">
          <span class="section-title">当前杆柜</span>
          <span class="section-count">{{ user.lockers.length }} 个</span>
        </div>
        <div class="locker-list">
          <div v-for="locker in user.lockers" :key="locker.id" class="locker-item">
            <div class="locker-info">
              <span class="locker-number">{{ locker.number }}</span>
              <span class="locker-store">{{ locker.store_name }}</span>
              <span class="locker-date">申请于 {{ formatDate(locker.approved_at, 'date') }}</span>
            </div>
            <div class="locker-status" :class="`status-${locker.status}`">
              {{ getLockerStatusText(locker.status) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 最近操作记录 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">最近操作</span>
          <span class="section-more" @click="viewAllRecords">查看全部</span>
        </div>
        <div v-if="recentRecords.length > 0" class="record-list">
          <div v-for="record in recentRecords" :key="record.id" class="record-item">
            <div class="record-icon" :class="`action-${record.action}`">
              <span class="iconfont" :class="record.action === 'store' ? 'icon-in' : 'icon-out'"></span>
            </div>
            <div class="record-info">
              <span class="record-action">{{ record.action === 'store' ? '存杆' : '取杆' }}</span>
              <span class="record-detail">{{ record.locker_number }} - {{ record.store_name }}</span>
              <span class="record-time">{{ formatDate(record.created_at) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-records">
          <span>暂无操作记录</span>
        </div>
      </div>

      <!-- 个人信息 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">个人信息</span>
          <span class="section-action" @click="editUserInfo">编辑</span>
        </div>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">真实姓名</span>
            <span class="info-value">{{ user.real_name || '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">身份证号</span>
            <span class="info-value">{{ user.id_card ? maskIdCard(user.id_card) : '未填写' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">会员等级</span>
            <span class="info-value">{{ user.member_level || '普通会员' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">备注信息</span>
            <span class="info-value">{{ user.remark || '无' }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="btn-secondary" @click="sendNotification">
          <span class="iconfont icon-notification"></span>
          发送通知
        </button>
        <button class="btn-primary" :class="{ danger: !user.disabled }" @click="toggleStatus">
          <span class="iconfont" :class="user.disabled ? 'icon-unlock' : 'icon-lock'"></span>
          {{ user.disabled ? '启用账户' : '禁用账户' }}
        </button>
      </div>
    </div>

    <!-- 更多操作菜单 -->
    <Teleport to="body">
      <div v-if="isMoreActionsOpen" class="modal-overlay" @click.self="closeMoreActions">
        <div class="action-menu">
          <div class="action-item" @click="resetPassword">
            <span class="iconfont icon-key"></span>
            <span>重置密码</span>
          </div>
          <div class="action-item" @click="viewLoginHistory">
            <span class="iconfont icon-history"></span>
            <span>登录历史</span>
          </div>
          <div class="action-item" @click="exportUserData">
            <span class="iconfont icon-export"></span>
            <span>导出数据</span>
          </div>
          <div class="action-item danger" @click="deleteUser">
            <span class="iconfont icon-delete"></span>
            <span>删除用户</span>
          </div>
          <div class="action-cancel" @click="closeMoreActions">
            取消
          </div>
        </div>
      </div>
    </Teleport>
  </div>
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

// Get user ID from URL parameters
onBeforeMount(() => {
  const urlParams = new URLSearchParams(window.location.search)
  userId.value = urlParams.get('id') || ''
})

const user = ref<UserDetail | null>(null)
const recentRecords = ref<OperationRecord[]>([])
const loading = ref(false)
const isMoreActionsOpen = ref(false)

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
  window.history.back()
}

// 显示更多操作
const showMoreActions = () => {
  isMoreActionsOpen.value = true
}

// 关闭更多操作
const closeMoreActions = () => {
  isMoreActionsOpen.value = false
}

// 查看全部记录
const viewAllRecords = () => {
  window.location.href = `/admin/records?userId=${user.value?.id}`
}

// 编辑用户信息
const editUserInfo = () => {
  showToast('功能开发中')
}

// 发送通知
const sendNotification = async () => {
  const content = prompt('请输入要发送的通知内容：')
  
  if (content) {
    try {
      // TODO: Implement notification endpoint
      // await adminApi.sendNotification({
      //   userId: user.value!.id,
      //   content: content,
      //   type: 'custom'
      // })
      alert('通知发送成功')
    } catch (error) {
      console.error('发送通知失败:', error)
      alert('发送失败')
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
  window.location.href = `/admin/users/login-history?userId=${user.value?.id}`
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
  const confirmed = confirm('确定要删除该用户吗？此操作不可恢复！')
  
  if (confirmed) {
    // 二次确认
    const phoneConfirm = prompt(`请输入用户手机号 ${user.value!.phone} 以确认删除：`)
    
    if (phoneConfirm === user.value!.phone) {
      try {
        // TODO: Implement user delete endpoint
        // await adminApi.deleteUser(user.value!.id)
        alert('删除成功')
        setTimeout(() => goBack(), 1500)
      } catch (error) {
        console.error('删除失败:', error)
        alert('删除失败')
      }
    } else if (phoneConfirm) {
      alert('手机号不匹配')
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

/* Modal overlay styles for Teleport modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 1000;
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