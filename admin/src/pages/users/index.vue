<template>
  <div class="users-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-title">
        <span class="title">用户管理</span>
        <span class="subtitle">共 {{ totalCount }} 位用户</span>
      </div>
      <div class="header-actions">
        <button class="btn-export" @click="exportUsers">
          <span class="iconfont icon-export"></span>
          导出
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <span class="iconfont icon-search"></span>
        <input 
          v-model="searchKey"
          class="search-input"
          placeholder="搜索用户名、手机号"
          @confirm="handleSearch"
        />
        <span v-if="searchKey" class="iconfont icon-close" @click="clearSearch"></span>
      </div>
      <button class="btn-search" @click="handleSearch">搜索</button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-scroll">
        <div class="filter-item" :class="{ active: filterType === 'all' }" @click="setFilter('all')">
          全部用户
        </div>
        <div class="filter-item" :class="{ active: filterType === 'active' }" @click="setFilter('active')">
          活跃用户
        </div>
        <div class="filter-item" :class="{ active: filterType === 'hasLocker' }" @click="setFilter('hasLocker')">
          有杆柜
        </div>
        <div class="filter-item" :class="{ active: filterType === 'noLocker' }" @click="setFilter('noLocker')">
          无杆柜
        </div>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="users-list">
      <div v-if="loading && users.length === 0" class="loading-container">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
      
      <div v-else-if="users.length === 0" class="empty-container">
        <div class="empty-icon">👥</div>
        <span class="empty-text">暂无用户数据</span>
      </div>

      <div v-else>
        <div v-for="user in users" :key="user.id" class="user-card" @click="goToDetail(user.id)">
          <!-- 用户基本信息 -->
          <div class="user-header">
            <div class="user-avatar">👤</div>
            <div class="user-info">
              <div class="user-name-line">
                <span class="user-name">{{ user.name || '未设置' }}</span>
                <div v-if="user.lockerCount > 0" class="locker-badge">
                  <span class="iconfont icon-locker"></span>
                  <span class="locker-count">{{ user.lockerCount }}</span>
                </div>
              </div>
              <span class="user-phone">{{ user.phone }}</span>
              <span class="user-meta">注册于 {{ formatDate(user.created_at, 'date') }}</span>
            </div>
            <div class="user-status" :class="user.isActive ? 'active' : 'inactive'">
              {{ user.isActive ? '活跃' : '不活跃' }}
            </div>
          </div>

          <!-- 用户统计信息 -->
          <div class="user-stats">
            <div class="stat-item">
              <span class="stat-value">{{ user.totalOperations || 0 }}</span>
              <span class="stat-label">存取次数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ user.currentLockers || 0 }}</span>
              <span class="stat-label">当前杆柜</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ formatDays(user.lastActiveAt) }}</span>
              <span class="stat-label">最后活跃</span>
            </div>
          </div>

          <!-- 快捷操作 -->
          <div class="user-actions" @click.stop>
            <button class="btn-action" @click="viewRecords(user.id)">
              <span class="iconfont icon-list"></span>
              记录
            </button>
            <button class="btn-action" @click="sendNotification(user)">
              <span class="iconfont icon-notification"></span>
              通知
            </button>
            <button class="btn-action" :class="{ disabled: user.disabled }" 
                    @click="toggleUserStatus(user)">
              <span class="iconfont" :class="user.disabled ? 'icon-unlock' : 'icon-lock'"></span>
              {{ user.disabled ? '启用' : '禁用' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore && !loading" class="load-more">
        <span>上拉加载更多</span>
      </div>
      <div v-else-if="!hasMore && users.length > 0" class="no-more">
        <span>没有更多数据了</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { adminApi } from '../../services/api'
import { formatDate, showToast, showModal } from '../../utils'

interface User {
  id: string
  name: string
  phone: string
  avatar: string
  created_at: string
  lastActiveAt: string
  isActive: boolean
  disabled: boolean
  lockerCount: number
  currentLockers: number
  totalOperations: number
}


// 状态变量
const users = ref<User[]>([])
const loading = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20
const totalCount = ref(0)

// 搜索和筛选
const searchKey = ref('')
const filterType = ref<'all' | 'active' | 'hasLocker' | 'noLocker'>('all')

// 格式化天数
const formatDays = (date: string) => {
  if (!date) return '从未'
  
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}月前`
  return `${Math.floor(days / 365)}年前`
}

// 获取用户列表
const getUsers = async (isRefresh = false) => {
  if (loading.value) return
  
  if (isRefresh) {
    page.value = 1
    hasMore.value = true
  }
  
  loading.value = true
  
  try {
    const params: any = {
      page: page.value,
      pageSize,
      search: searchKey.value,
      filter: filterType.value
    }
    
    const response = await adminApi.getUsers(params)
    
    if (isRefresh) {
      users.value = response.data.list
    } else {
      users.value.push(...response.data.list)
    }
    
    totalCount.value = response.data.total
    hasMore.value = response.data.list.length === pageSize
    page.value++
  } catch (error) {
    console.error('获取用户列表失败:', error)
    showToast('获取数据失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 搜索
const handleSearch = () => {
  getUsers(true)
}

// 清空搜索
const clearSearch = () => {
  searchKey.value = ''
  getUsers(true)
}

// 设置筛选
const setFilter = (type: typeof filterType.value) => {
  filterType.value = type
  getUsers(true)
}

// 下拉刷新
const onPullDownRefresh = () => {
  refreshing.value = true
  getUsers(true)
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return
  getUsers()
}

// 跳转详情
const goToDetail = (id: string) => {
  window.location.href = `/admin/pages/users/detail?id=${id}`
}

// 查看记录
const viewRecords = (userId: string) => {
  window.location.href = `/admin/pages/logs/index?userId=${userId}`
}

// 发送通知
const sendNotification = async (user: User) => {
  const content = prompt('请输入要发送的通知内容：')
  
  if (content) {
    try {
      await adminApi.sendReminder({
        user_ids: [user.id],
        reminder_type: 'custom',
        message: content
      })
      showToast('通知发送成功')
    } catch (error) {
      console.error('发送通知失败:', error)
      showToast('发送失败')
    }
  }
}

// 切换用户状态
const toggleUserStatus = async (user: User) => {
  const action = user.disabled ? '启用' : '禁用'
  const result = await showModal({
    title: `确认${action}`,
    content: `确定要${action}用户 ${user.name || user.phone} 吗？`
  })
  
  if (result.confirm) {
    try {
      // TODO: 实现用户状态切换API
      await adminApi.request.patch(`/admin-users/${user.id}`, {
        disabled: !user.disabled
      })
      
      user.disabled = !user.disabled
      showToast(`${action}成功`)
    } catch (error) {
      console.error('操作失败:', error)
      showToast('操作失败')
    }
  }
}

// 导出用户
const exportUsers = async () => {
  try {
    showToast('正在准备导出...')
    const response = await adminApi.exportData({
      type: 'users',
      // TODO: 传递搜索和筛选参数
    })
    
    // 创建下载链接
    const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `用户列表_${formatDate(new Date(), 'datetime')}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    showToast('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    showToast('导出失败')
  }
}

// 监听筛选变化
watch([searchKey, filterType], () => {
  getUsers(true)
})

// 初始化
onMounted(() => {
  getUsers(true)
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.users-page {
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
  
  .header-title {
    .title {
      font-size: 36rpx;
      font-weight: bold;
      color: var(--text-primary);
      margin-right: 20rpx;
    }
    
    .subtitle {
      font-size: 28rpx;
      color: var(--text-secondary);
    }
  }
  
  .btn-export {
    padding: 16rpx 32rpx;
    background-color: var(--primary-color);
    color: #fff;
    border-radius: 8rpx;
    font-size: 28rpx;
    
    .iconfont {
      margin-right: 8rpx;
    }
  }
}

.search-bar {
  display: flex;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  
  .search-input-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    background-color: var(--bg-color);
    border-radius: 8rpx;
    
    .iconfont {
      font-size: 32rpx;
      color: var(--text-secondary);
      
      &.icon-close {
        margin-left: auto;
      }
    }
    
    .search-input {
      flex: 1;
      padding: 20rpx 16rpx;
      font-size: 28rpx;
      background: transparent;
    }
  }
  
  .btn-search {
    margin-left: 20rpx;
    padding: 20rpx 40rpx;
    background-color: var(--primary-color);
    color: #fff;
    border-radius: 8rpx;
    font-size: 28rpx;
  }
}

.filter-bar {
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  
  .filter-scroll {
    white-space: nowrap;
    padding: 20rpx 30rpx;
  }
  
  .filter-item {
    display: inline-block;
    padding: 16rpx 32rpx;
    margin-right: 20rpx;
    background-color: var(--bg-color);
    border-radius: 8rpx;
    font-size: 28rpx;
    color: var(--text-secondary);
    transition: all 0.3s;
    
    &.active {
      background-color: var(--primary-color);
      color: #fff;
    }
  }
}

.users-list {
  height: calc(100vh - 380rpx);
  padding: 20rpx;
}

.user-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  
  .user-header {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
    
    .user-avatar {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      margin-right: 24rpx;
    }
    
    .user-info {
      flex: 1;
      
      .user-name-line {
        display: flex;
        align-items: center;
        margin-bottom: 8rpx;
        
        .user-name {
          font-size: 32rpx;
          font-weight: 500;
          color: var(--text-primary);
          margin-right: 16rpx;
        }
        
        .locker-badge {
          display: flex;
          align-items: center;
          padding: 4rpx 12rpx;
          background-color: var(--primary-light);
          border-radius: 20rpx;
          
          .iconfont {
            font-size: 24rpx;
            color: var(--primary-color);
            margin-right: 4rpx;
          }
          
          .locker-count {
            font-size: 24rpx;
            color: var(--primary-color);
          }
        }
      }
      
      .user-phone {
        font-size: 28rpx;
        color: var(--text-secondary);
        margin-bottom: 4rpx;
      }
      
      .user-meta {
        font-size: 24rpx;
        color: $text-tertiary;
      }
    }
    
    .user-status {
      padding: 8rpx 20rpx;
      border-radius: 20rpx;
      font-size: 24rpx;
      
      &.active {
        background-color: #D4EDDA;
        color: #155724;
      }
      
      &.inactive {
        background-color: #F5F5F5;
        color: var(--text-secondary);
      }
    }
  }
  
  .user-stats {
    display: flex;
    padding: 24rpx 0;
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    
    .stat-item {
      flex: 1;
      text-align: center;
      
      .stat-value {
        display: block;
        font-size: 32rpx;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 8rpx;
      }
      
      .stat-label {
        font-size: 24rpx;
        color: var(--text-secondary);
      }
    }
  }
  
  .user-actions {
    display: flex;
    justify-content: space-around;
    margin-top: 24rpx;
    
    .btn-action {
      display: flex;
      align-items: center;
      padding: 12rpx 24rpx;
      background-color: var(--bg-color);
      border-radius: 8rpx;
      font-size: 26rpx;
      color: var(--text-primary);
      
      .iconfont {
        font-size: 28rpx;
        margin-right: 8rpx;
      }
      
      &.disabled {
        opacity: 0.6;
      }
    }
  }
}

.empty-container,
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  
  .empty-image {
    width: 300rpx;
    height: 300rpx;
    margin-bottom: 40rpx;
  }
  
  .empty-text {
    font-size: 32rpx;
    color: var(--text-secondary);
  }
  
  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid #e0e0e0;
    border-top: 4rpx solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20rpx;
  }
  
  .loading-text {
    font-size: 28rpx;
    color: var(--text-secondary);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.load-more,
.no-more {
  text-align: center;
  padding: 30rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}
</style>