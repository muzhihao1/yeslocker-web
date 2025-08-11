<template>
  <div class="application-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left" @click="goBack">
        <span class="iconfont icon-arrow-left"></span>
        <span class="back-text">返回</span>
      </div>
      <span class="header-title">申请详情</span>
      <div class="header-right"></div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <loading-spinner />
    </div>

    <!-- 详情内容 -->
    <div v-else-if="application" class="detail-content">
      <!-- 状态卡片 -->
      <div class="status-card" :class="`status-${application.status}`">
        <span class="status-icon iconfont" :class="getStatusIcon(application.status)"></span>
        <span class="status-text">{{ getStatusText(application.status) }}</span>
        <span v-if="application.approved_at" class="status-time">
          {{ formatDate(application.approved_at) }}
        </span>
      </div>

      <!-- 用户信息 -->
      <div class="info-section">
        <div class="section-title">申请人信息</div>
        <div class="info-card">
          <div class="user-header">
            <img :src="application.user.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGNUY1RjUiLz4KPHN2ZyB4PSI1IiB5PSI1IiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzk5OTk5OSI+CjxwYXRoIGQ9Ik0xMiAxMmM0IDAgNi0yIDYtNnMtMi02LTYtNi02IDItNiA2IDIgNiA2IDZ6bTAgMmMtNiAwLTEyIDMtMTIgOXYzaDI0di0zYzAtNi02LTktMTItOXoiLz4KPC9zdmc+Cjwvc3ZnPg=='" 
                   class="user-avatar" />
            <div class="user-basic">
              <span class="user-name">{{ application.user.name }}</span>
              <span class="user-phone">{{ application.user.phone }}</span>
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">用户ID：</span>
            <span class="info-value">{{ application.user.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">注册时间：</span>
            <span class="info-value">{{ formatDate(application.user.created_at) }}</span>
          </div>
          <div v-if="application.user.id_card" class="info-item">
            <span class="info-label">身份证号：</span>
            <span class="info-value">{{ maskIdCard(application.user.id_card) }}</span>
          </div>
        </div>
      </div>

      <!-- 杆柜信息 -->
      <div class="info-section">
        <div class="section-title">杆柜信息</div>
        <div class="info-card">
          <div class="info-item">
            <span class="info-label">所属门店：</span>
            <span class="info-value">{{ application.store.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">门店地址：</span>
            <span class="info-value">{{ application.store.address }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">杆柜编号：</span>
            <span class="info-value">{{ application.locker.number }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">杆柜状态：</span>
            <span class="info-value" :class="application.locker.status === 'available' ? 'text-success' : 'text-danger'">
              {{ application.locker.status === 'available' ? '可用' : '已占用' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 申请信息 -->
      <div class="info-section">
        <div class="section-title">申请信息</div>
        <div class="info-card">
          <div class="info-item">
            <span class="info-label">申请时间：</span>
            <span class="info-value">{{ formatDate(application.created_at) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">申请编号：</span>
            <span class="info-value">{{ application.id }}</span>
          </div>
          <div v-if="application.remark" class="info-item">
            <span class="info-label">备注信息：</span>
            <span class="info-value">{{ application.remark }}</span>
          </div>
          <div v-if="application.approved_by" class="info-item">
            <span class="info-label">审核人：</span>
            <span class="info-value">{{ application.approved_by_name }}</span>
          </div>
          <div v-if="application.reject_reason" class="info-item">
            <span class="info-label">拒绝原因：</span>
            <span class="info-value text-danger">{{ application.reject_reason }}</span>
          </div>
        </div>
      </div>

      <!-- 审核历史记录 -->
      <div class="info-section">
        <div class="section-title">审核历史记录</div>
        <div v-if="auditHistory.length === 0" class="empty-history">
          <span class="empty-text">暂无审核记录</span>
        </div>
        <div v-else class="history-timeline">
          <div v-for="(item, index) in auditHistory" :key="item.id" class="timeline-item">
            <div class="timeline-dot" :class="getActionClass(item.action)"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-action">{{ getActionText(item.action) }}</span>
                <span class="timeline-time">{{ formatDateTime(item.created_at) }}</span>
              </div>
              <div class="timeline-body">
                <div class="timeline-info">
                  <span class="info-label">操作人：</span>
                  <span class="info-value">{{ item.operator_name || item.operator }}</span>
                </div>
                <div v-if="item.details" class="timeline-info">
                  <span class="info-label">详情：</span>
                  <span class="info-value">{{ item.details }}</span>
                </div>
                <div v-if="item.ip_address" class="timeline-info">
                  <span class="info-label">IP地址：</span>
                  <span class="info-value">{{ item.ip_address }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="application.status === 'pending'" class="action-buttons">
        <button class="btn-reject" @click="handleReject">
          <span class="iconfont icon-close"></span>
          拒绝申请
        </button>
        <button class="btn-approve" @click="handleApprove">
          <span class="iconfont icon-check"></span>
          通过申请
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-else class="error-container">
      <span class="error-text">申请信息加载失败</span>
      <button class="btn-retry" @click="getApplicationDetail">重新加载</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount } from 'vue'
import { useAdminStore } from '@/stores/admin'
import { adminApi } from '@/services/api'
import { formatDate, formatDateTime, showToast, showModal } from '@/utils'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface ApplicationDetail {
  id: string
  user: {
    id: string
    name: string
    phone: string
    avatar: string
    created_at: string
    id_card?: string
  }
  store: {
    id: string
    name: string
    address: string
  }
  locker: {
    id: string
    number: string
    status: string
  }
  status: 'pending' | 'approved' | 'rejected'
  remark: string
  created_at: string
  approved_at?: string
  approved_by?: string
  approved_by_name?: string
  reject_reason?: string
  history?: Array<{
    id: string
    action: string
    operator: string
    operator_name: string
    created_at: string
    details?: string
    ip_address?: string
  }>
}

const adminStore = useAdminStore()

const application = ref<ApplicationDetail | null>(null)
const loading = ref(false)
const auditHistory = ref<Array<any>>([])
const applicationId = ref('')

// Get application ID from URL parameters
onBeforeMount(() => {
  const urlParams = new URLSearchParams(window.location.search)
  applicationId.value = urlParams.get('id') || ''
})

// 获取状态图标
const getStatusIcon = (status: string) => {
  const iconMap: Record<string, string> = {
    pending: 'icon-time',
    approved: 'icon-check-circle',
    rejected: 'icon-close-circle'
  }
  return iconMap[status] || 'icon-info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return statusMap[status] || status
}

// 身份证脱敏
const maskIdCard = (idCard: string) => {
  if (!idCard || idCard.length < 15) return idCard
  return idCard.replace(/^(.{6})(?:\d+)(.{4})$/, '$1****$2')
}

// 获取申请详情
const getApplicationDetail = async () => {
  const id = applicationId.value
  if (!id) {
    showToast('参数错误')
    setTimeout(() => goBack(), 1500)
    return
  }
  
  loading.value = true
  
  try {
    // For now, get from the list and filter
    const response = await adminApi.getApplications()
    const apps = response.data || []
    application.value = apps.find((app: any) => app.id === id) || null
    
    // 获取审核历史记录
    await getAuditHistory(id)
  } catch (error) {
    console.error('获取申请详情失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 获取审核历史记录
const getAuditHistory = async (applicationId: string) => {
  try {
    // TODO: Implement history endpoint
    // const response = await adminApi.getApplicationHistory(applicationId)
    // auditHistory.value = response.data || []
    auditHistory.value = []
  } catch (error) {
    console.error('获取审核历史失败:', error)
    // 如果历史记录获取失败，不影响主流程
    auditHistory.value = []
  }
}

// 获取操作类型的样式类
const getActionClass = (action: string) => {
  const classMap: Record<string, string> = {
    'created': 'dot-info',
    'approved': 'dot-success',
    'rejected': 'dot-danger',
    'updated': 'dot-warning',
    'viewed': 'dot-default'
  }
  return classMap[action] || 'dot-default'
}

// 获取操作类型的文本
const getActionText = (action: string) => {
  const textMap: Record<string, string> = {
    'created': '提交申请',
    'approved': '审核通过',
    'rejected': '审核拒绝',
    'updated': '更新信息',
    'viewed': '查看详情'
  }
  return textMap[action] || action
}

// 返回上一页
const goBack = () => {
  window.history.back()
}

// 审核通过
const handleApprove = async () => {
  const result = await showModal({
    title: '确认通过',
    content: `确定通过该申请吗？用户将获得杆柜使用权限。`
  })
  
  if (result.confirm) {
    try {
      await adminApi.approveApplication({
        application_id: application.value!.id,
        action: 'approve',
        admin_id: adminStore.adminInfo?.id
      })
      
      showToast('审核通过')
      // 刷新审核历史
      await getAuditHistory(application.value!.id)
      // 刷新申请详情
      await getApplicationDetail()
    } catch (error) {
      console.error('审核失败:', error)
      showToast('操作失败')
    }
  }
}

// 审核拒绝
const handleReject = async () => {
  const reason = prompt('请输入拒绝原因（必填）')
  
  const result = {
    confirm: reason !== null && reason.trim() !== '',
    content: reason
  }
  
  if (result.confirm) {
    if (!result.content || result.content.trim().length === 0) {
      showToast('请输入拒绝原因')
      return
    }
    
    try {
      await adminApi.approveApplication({
        application_id: application.value!.id,
        action: 'reject',
        admin_id: adminStore.adminInfo?.id,
        rejection_reason: result.content
      })
      
      showToast('已拒绝')
      // 刷新审核历史
      await getAuditHistory(application.value!.id)
      // 刷新申请详情
      await getApplicationDetail()
    } catch (error) {
      console.error('审核失败:', error)
      showToast('操作失败')
    }
  }
}

// 初始化
onMounted(() => {
  getApplicationDetail()
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.application-detail {
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
    width: 120rpx;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.detail-content {
  padding: 20rpx;
}

.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
  margin-bottom: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  
  .status-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
  }
  
  .status-text {
    font-size: 36rpx;
    font-weight: 500;
    margin-bottom: 10rpx;
  }
  
  .status-time {
    font-size: 26rpx;
    color: var(--text-secondary);
  }
  
  &.status-pending {
    .status-icon,
    .status-text {
      color: var(--warning-color);
    }
  }
  
  &.status-approved {
    .status-icon,
    .status-text {
      color: var(--success-color);
    }
  }
  
  &.status-rejected {
    .status-icon,
    .status-text {
      color: var(--danger-color);
    }
  }
}

.info-section {
  margin-bottom: 20rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: 500;
    color: var(--text-primary);
    padding: 20rpx 0;
  }
  
  .info-card {
    background-color: #fff;
    border-radius: 16rpx;
    padding: 30rpx;
    
    .user-header {
      display: flex;
      align-items: center;
      margin-bottom: 30rpx;
      padding-bottom: 30rpx;
      border-bottom: 1px solid var(--border-color);
      
      .user-avatar {
        width: 100rpx;
        height: 100rpx;
        border-radius: 50%;
        margin-right: 24rpx;
      }
      
      .user-basic {
        display: flex;
        flex-direction: column;
        
        .user-name {
          font-size: 34rpx;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 10rpx;
        }
        
        .user-phone {
          font-size: 28rpx;
          color: var(--text-secondary);
        }
      }
    }
    
    .info-item {
      display: flex;
      align-items: center;
      padding: 16rpx 0;
      
      .info-label {
        width: 180rpx;
        font-size: 28rpx;
        color: var(--text-secondary);
      }
      
      .info-value {
        flex: 1;
        font-size: 28rpx;
        color: var(--text-primary);
        
        &.text-success {
          color: var(--success-color);
        }
        
        &.text-danger {
          color: var(--danger-color);
        }
      }
    }
  }
}

.empty-history {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 60rpx;
  text-align: center;
  
  .empty-text {
    font-size: 28rpx;
    color: var(--text-secondary);
  }
}

.history-timeline {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  
  .timeline-item {
    position: relative;
    padding-left: 60rpx;
    padding-bottom: 40rpx;
    
    &:last-child {
      padding-bottom: 0;
      
      &::before {
        display: none;
      }
    }
    
    &::before {
      content: '';
      position: absolute;
      left: 19rpx;
      top: 40rpx;
      width: 2rpx;
      height: calc(100% - 20rpx);
      background-color: #e5e5e5;
    }
    
    .timeline-dot {
      position: absolute;
      left: 10rpx;
      top: 10rpx;
      width: 20rpx;
      height: 20rpx;
      border-radius: 50%;
      border: 4rpx solid #fff;
      box-shadow: 0 0 0 2rpx #e5e5e5;
      
      &.dot-info {
        background-color: #1890ff;
      }
      
      &.dot-success {
        background-color: var(--success-color);
      }
      
      &.dot-danger {
        background-color: var(--danger-color);
      }
      
      &.dot-warning {
        background-color: var(--warning-color);
      }
      
      &.dot-default {
        background-color: #999;
      }
    }
    
    .timeline-content {
      background-color: #f8f8f8;
      border-radius: 12rpx;
      padding: 20rpx;
      
      .timeline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16rpx;
        
        .timeline-action {
          font-size: 30rpx;
          font-weight: 500;
          color: var(--text-primary);
        }
        
        .timeline-time {
          font-size: 24rpx;
          color: var(--text-secondary);
        }
      }
      
      .timeline-body {
        .timeline-info {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8rpx;
          
          &:last-child {
            margin-bottom: 0;
          }
          
          .info-label {
            font-size: 26rpx;
            color: var(--text-secondary);
            margin-right: 16rpx;
            flex-shrink: 0;
          }
          
          .info-value {
            font-size: 26rpx;
            color: var(--text-primary);
            word-break: break-all;
          }
        }
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
    
    &.btn-reject {
      background-color: #fff;
      color: var(--danger-color);
      border: 2rpx solid var(--danger-color);
      margin-right: 20rpx;
    }
    
    &.btn-approve {
      background-color: var(--success-color);
      color: #fff;
    }
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
  
  .error-text {
    font-size: 32rpx;
    color: var(--text-secondary);
    margin-bottom: 40rpx;
  }
  
  .btn-retry {
    padding: 20rpx 60rpx;
    background-color: var(--primary-color);
    color: #fff;
    border-radius: 12rpx;
    font-size: 30rpx;
  }
}
</style>