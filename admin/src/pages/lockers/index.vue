<template>
  <view class="lockers-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-title">
        <text class="title">杆柜管理</text>
        <text class="subtitle">共 {{ totalCount }} 个杆柜</text>
      </view>
      <view class="header-actions">
        <button class="btn-add" @click="addLocker">
          <text class="iconfont icon-plus"></text>
          新增
        </button>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-cards">
      <view class="stat-card">
        <view class="stat-icon available">
          <text class="iconfont icon-check-circle"></text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.available }}</text>
          <text class="stat-label">可用</text>
        </view>
      </view>
      <view class="stat-card">
        <view class="stat-icon occupied">
          <text class="iconfont icon-locker"></text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.occupied }}</text>
          <text class="stat-label">使用中</text>
        </view>
      </view>
      <view class="stat-card">
        <view class="stat-icon storing">
          <text class="iconfont icon-time"></text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.storing }}</text>
          <text class="stat-label">存杆中</text>
        </view>
      </view>
      <view class="stat-card">
        <view class="stat-icon maintenance">
          <text class="iconfont icon-warning"></text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.maintenance }}</text>
          <text class="stat-label">维护中</text>
        </view>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <picker mode="selector" :range="storeOptions" range-key="name" :value="filterStore" @change="handleStoreChange">
        <view class="filter-item">
          <text>{{ filterStore === -1 ? '全部门店' : storeOptions[filterStore].name }}</text>
          <text class="iconfont icon-arrow-down"></text>
        </view>
      </picker>
      <picker mode="selector" :range="statusOptions" :value="filterStatus" @change="handleStatusChange">
        <view class="filter-item">
          <text>{{ statusOptions[filterStatus] }}</text>
          <text class="iconfont icon-arrow-down"></text>
        </view>
      </picker>
    </view>

    <!-- 杆柜列表 -->
    <scroll-view class="lockers-list" scroll-y :refresher-enabled="true" 
                 :refresher-triggered="refreshing" @refresherrefresh="onPullDownRefresh"
                 @scrolltolower="loadMore">
      <view v-if="loading && lockers.length === 0" class="loading-container">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
      
      <view v-else-if="lockers.length === 0" class="empty-container">
        <image src="/static/images/empty-lockers.png" class="empty-image" />
        <text class="empty-text">暂无杆柜数据</text>
      </view>

      <view v-else class="locker-grid">
        <view v-for="locker in lockers" :key="locker.id" 
              class="locker-card" 
              :class="`status-${locker.status}`"
              @click="goToDetail(locker.id)">
          <!-- 杆柜编号和状态 -->
          <view class="locker-header">
            <text class="locker-number">{{ locker.number }}</text>
            <view class="locker-status">
              <text class="status-dot"></text>
              <text class="status-text">{{ getStatusText(locker.status) }}</text>
            </view>
          </view>
          
          <!-- 门店信息 -->
          <view class="store-info">
            <text class="iconfont icon-store"></text>
            <text class="store-name">{{ locker.store_name }}</text>
          </view>
          
          <!-- 使用者信息 -->
          <view v-if="locker.user" class="user-info">
            <image :src="locker.user.avatar || '/static/images/default-avatar.png'" 
                   class="user-avatar" mode="aspectFill" />
            <view class="user-detail">
              <text class="user-name">{{ locker.user.name }}</text>
              <text class="user-phone">{{ locker.user.phone }}</text>
            </view>
          </view>
          <view v-else class="empty-user">
            <text class="iconfont icon-user"></text>
            <text>暂无使用者</text>
          </view>
          
          <!-- 使用信息 -->
          <view v-if="locker.status === 'occupied' || locker.status === 'storing'" class="usage-info">
            <text class="usage-label">{{ locker.status === 'storing' ? '存杆时间' : '开始使用' }}：</text>
            <text class="usage-time">{{ formatDate(locker.last_operation_at, 'datetime') }}</text>
          </view>
          
          <!-- 快捷操作 -->
          <view class="locker-actions" @click.stop>
            <button v-if="locker.status === 'occupied'" class="btn-action" @click="releaseLocker(locker)">
              释放
            </button>
            <button v-if="locker.status === 'maintenance'" class="btn-action" @click="restoreLocker(locker)">
              恢复
            </button>
            <button v-else-if="locker.status === 'available'" class="btn-action" @click="setMaintenance(locker)">
              维护
            </button>
            <button class="btn-action primary" @click="viewHistory(locker.id)">
              历史
            </button>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore && !loading" class="load-more">
        <text>上拉加载更多</text>
      </view>
    </scroll-view>

    <!-- 新增杆柜弹窗 -->
    <uni-popup ref="addLockerPopup" type="center">
      <view class="add-locker-form">
        <view class="form-header">
          <text class="form-title">新增杆柜</text>
          <text class="iconfont icon-close" @click="closeAddForm"></text>
        </view>
        <view class="form-body">
          <view class="form-item">
            <text class="form-label">所属门店</text>
            <picker mode="selector" :range="storeOptions" range-key="name" :value="newLocker.storeIndex" @change="handleNewLockerStore">
              <view class="form-input">
                <text>{{ newLocker.storeIndex >= 0 ? storeOptions[newLocker.storeIndex].name : '请选择门店' }}</text>
                <text class="iconfont icon-arrow-down"></text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">杆柜编号</text>
            <input v-model="newLocker.number" class="form-input" placeholder="请输入杆柜编号" />
          </view>
          <view class="form-item">
            <text class="form-label">备注信息</text>
            <textarea v-model="newLocker.remark" class="form-textarea" placeholder="选填" />
          </view>
        </view>
        <view class="form-actions">
          <button class="btn-cancel" @click="closeAddForm">取消</button>
          <button class="btn-confirm" @click="confirmAddLocker">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi, request } from '@/services/api'
import { formatDate, showToast, showModal } from '@/utils'

interface Locker {
  id: string
  number: string
  store_id: string
  store_name: string
  status: 'available' | 'occupied' | 'storing' | 'maintenance'
  user?: {
    id: string
    name: string
    phone: string
    avatar: string
  }
  last_operation_at?: string
  created_at: string
}

interface Store {
  id: string
  name: string
}


// 状态变量
const lockers = ref<Locker[]>([])
const loading = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20
const totalCount = ref(0)

// 筛选条件
const filterStore = ref(-1)
const filterStatus = ref(0)
const storeOptions = ref<Store[]>([])
const statusOptions = ['全部状态', '可用', '使用中', '存杆中', '维护中']

// 统计数据
const stats = ref({
  available: 0,
  occupied: 0,
  storing: 0,
  maintenance: 0
})

// 新增杆柜
const addLockerPopup = ref()
const newLocker = ref({
  storeIndex: -1,
  number: '',
  remark: ''
})

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    available: '可用',
    occupied: '使用中',
    storing: '存杆中',
    maintenance: '维护中'
  }
  return statusMap[status] || status
}

// 获取杆柜列表
const getLockers = async (isRefresh = false) => {
  if (loading.value) return
  
  if (isRefresh) {
    page.value = 1
    hasMore.value = true
  }
  
  loading.value = true
  
  try {
    const params: any = {
      page: page.value,
      pageSize
    }
    
    // 添加筛选条件
    if (filterStore.value >= 0 && storeOptions.value[filterStore.value]) {
      params.storeId = storeOptions.value[filterStore.value].id
    }
    
    if (filterStatus.value > 0) {
      const statusMap = ['', 'available', 'occupied', 'storing', 'maintenance']
      params.status = statusMap[filterStatus.value]
    }
    
    const response = await adminApi.getStoresAndLockers()
    
    if (isRefresh) {
      lockers.value = response.lockers || []
    } else {
      lockers.value.push(...(response.lockers || []))
    }
    
    // 更新统计数据
    if (response.stats) {
      stats.value = response.stats
    }
    
    totalCount.value = response.total || 0
    hasMore.value = (response.lockers?.length || 0) === pageSize
    page.value++
  } catch (error) {
    console.error('获取杆柜列表失败:', error)
    showToast('获取数据失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 获取门店列表
const getStores = async () => {
  try {
    const response = await adminApi.getStoresAndLockers()
    storeOptions.value = response.stores || []
  } catch (error) {
    console.error('获取门店列表失败:', error)
  }
}

// 处理门店筛选
const handleStoreChange = (e: any) => {
  filterStore.value = e.detail.value
  getLockers(true)
}

// 处理状态筛选
const handleStatusChange = (e: any) => {
  filterStatus.value = e.detail.value
  getLockers(true)
}

// 下拉刷新
const onPullDownRefresh = () => {
  refreshing.value = true
  getLockers(true)
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return
  getLockers()
}

// 跳转详情
const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/lockers/detail?id=${id}`
  })
}

// 查看历史
const viewHistory = (lockerId: string) => {
  uni.navigateTo({
    url: `/pages/records/index?lockerId=${lockerId}`
  })
}

// 释放杆柜
const releaseLocker = async (locker: Locker) => {
  const result = await showModal({
    title: '确认释放',
    content: `确定要释放杆柜 ${locker.number} 吗？这将结束当前用户的使用权限。`
  })
  
  if (result.confirm) {
    try {
      await request.post('/admin/lockers/release', {
        lockerId: locker.id
      })
      
      showToast('释放成功')
      locker.status = 'available'
      locker.user = undefined
      stats.value.occupied--
      stats.value.available++
    } catch (error) {
      console.error('释放失败:', error)
      showToast('操作失败')
    }
  }
}

// 设置维护
const setMaintenance = async (locker: Locker) => {
  const result = await uni.showModal({
    title: '设置维护',
    content: '请输入维护原因',
    editable: true,
    placeholderText: '例如：设备损坏、清洁保养等'
  })
  
  if (result.confirm && result.content) {
    try {
      await request.put(`/admin/lockers/${locker.id}`, {
        status: 'maintenance',
        maintenanceReason: result.content
      })
      
      showToast('设置成功')
      locker.status = 'maintenance'
      stats.value.available--
      stats.value.maintenance++
    } catch (error) {
      console.error('设置失败:', error)
      showToast('操作失败')
    }
  }
}

// 恢复使用
const restoreLocker = async (locker: Locker) => {
  const result = await showModal({
    title: '恢复使用',
    content: `确定要恢复杆柜 ${locker.number} 的使用吗？`
  })
  
  if (result.confirm) {
    try {
      await request.put(`/admin/lockers/${locker.id}`, {
        status: 'available'
      })
      
      showToast('恢复成功')
      locker.status = 'available'
      stats.value.maintenance--
      stats.value.available++
    } catch (error) {
      console.error('恢复失败:', error)
      showToast('操作失败')
    }
  }
}

// 新增杆柜
const addLocker = () => {
  addLockerPopup.value.open()
}

// 关闭新增表单
const closeAddForm = () => {
  addLockerPopup.value.close()
  newLocker.value = {
    storeIndex: -1,
    number: '',
    remark: ''
  }
}

// 选择门店
const handleNewLockerStore = (e: any) => {
  newLocker.value.storeIndex = e.detail.value
}

// 确认新增
const confirmAddLocker = async () => {
  if (newLocker.value.storeIndex < 0) {
    showToast('请选择门店')
    return
  }
  
  if (!newLocker.value.number.trim()) {
    showToast('请输入杆柜编号')
    return
  }
  
  try {
    // TODO: 实现新增杆柜的API
    await request.post('/admin-lockers', {
      storeId: storeOptions.value[newLocker.value.storeIndex].id,
      number: newLocker.value.number,
      remark: newLocker.value.remark
    })
    
    showToast('新增成功')
    closeAddForm()
    getLockers(true)
  } catch (error) {
    console.error('新增失败:', error)
    showToast('新增失败')
  }
}

// 初始化
onMounted(() => {
  getStores()
  getLockers(true)
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.lockers-page {
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
}

.page-header .header-title .title {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--text-primary);
  margin-right: 20rpx;
}

.page-header .header-title .subtitle {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.page-header .btn-add {
  padding: 16rpx 32rpx;
  background-color: var(--primary-color);
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.page-header .btn-add .iconfont {
  margin-right: 8rpx;
}

.stats-cards {
  display: flex;
  padding: 20rpx;
  background-color: #fff;
  
  .stat-card {
    flex: 1;
    display: flex;
    align-items: center;
    
    .stat-icon {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12rpx;
      margin-right: 16rpx;
      
      .iconfont {
        font-size: 32rpx;
      }
      
      &.available {
        background-color: rgba(76, 175, 80, 0.1);
        color: var(--success-color);
      }
      
      &.occupied {
        background-color: var(--primary-light);
        color: var(--primary-color);
      }
      
      &.storing {
        background-color: #FFF3CD;
        color: #856404;
      }
      
      &.maintenance {
        background-color: rgba(244, 67, 54, 0.1);
        color: var(--danger-color);
      }
    }
    
    .stat-info {
      .stat-value {
        display: block;
        font-size: 32rpx;
        font-weight: 500;
        color: var(--text-primary);
      }
      
      .stat-label {
        display: block;
        font-size: 24rpx;
        color: var(--text-secondary);
        margin-top: 4rpx;
      }
    }
  }
}

.filter-bar {
  display: flex;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  
  .filter-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16rpx 24rpx;
    margin-right: 20rpx;
    background-color: var(--bg-color);
    border-radius: 8rpx;
    font-size: 28rpx;
    color: var(--text-primary);
    
    &:last-child {
      margin-right: 0;
    }
    
    .iconfont {
      font-size: 24rpx;
      color: var(--text-secondary);
    }
  }
}

.lockers-list {
  height: calc(100vh - 420rpx);
  padding: 20rpx;
}

.locker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.locker-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  
  &.status-available {
    border-color: var(--success-color);
  }
  
  &.status-occupied {
    border-color: var(--primary-color);
  }
  
  &.status-storing {
    border-color: #FFC107;
  }
  
  &.status-maintenance {
    border-color: var(--danger-color);
  }
  
  .locker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .locker-number {
      font-size: 32rpx;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .locker-status {
      display: flex;
      align-items: center;
      font-size: 24rpx;
      
      .status-dot {
        width: 12rpx;
        height: 12rpx;
        border-radius: 50%;
        margin-right: 8rpx;
      }
    }
  }
  
  &.status-available .status-dot {
    background-color: var(--success-color);
  }
  
  &.status-occupied .status-dot {
    background-color: var(--primary-color);
  }
  
  &.status-storing .status-dot {
    background-color: #FFC107;
  }
  
  &.status-maintenance .status-dot {
    background-color: var(--danger-color);
  }
  
  .store-info {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    font-size: 26rpx;
    color: var(--text-secondary);
    
    .iconfont {
      margin-right: 8rpx;
    }
  }
  
  .user-info {
    display: flex;
    align-items: center;
    padding: 16rpx;
    background-color: var(--bg-color);
    border-radius: 8rpx;
    margin-bottom: 16rpx;
    
    .user-avatar {
      width: 60rpx;
      height: 60rpx;
      border-radius: 50%;
      margin-right: 16rpx;
    }
    
    .user-detail {
      flex: 1;
      
      .user-name {
        display: block;
        font-size: 28rpx;
        color: var(--text-primary);
        margin-bottom: 4rpx;
      }
      
      .user-phone {
        display: block;
        font-size: 24rpx;
        color: var(--text-secondary);
      }
    }
  }
  
  .empty-user {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24rpx;
    background-color: var(--bg-color);
    border-radius: 8rpx;
    margin-bottom: 16rpx;
    font-size: 26rpx;
    color: var(--text-disabled);
    
    .iconfont {
      margin-right: 8rpx;
    }
  }
  
  .usage-info {
    font-size: 24rpx;
    color: var(--text-secondary);
    margin-bottom: 16rpx;
    
    .usage-label {
      margin-right: 8rpx;
    }
  }
  
  .locker-actions {
    display: flex;
    justify-content: space-between;
    
    .btn-action {
      flex: 1;
      padding: 12rpx 0;
      background-color: var(--bg-color);
      border-radius: 8rpx;
      font-size: 26rpx;
      color: var(--text-primary);
      text-align: center;
      margin-right: 12rpx;
      
      &:last-child {
        margin-right: 0;
      }
      
      &.primary {
        background-color: var(--primary-color);
        color: #fff;
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

.load-more {
  text-align: center;
  padding: 30rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}

.add-locker-form {
  width: 600rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1px solid var(--border-color);
    
    .form-title {
      font-size: 34rpx;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .iconfont {
      font-size: 36rpx;
      color: var(--text-secondary);
    }
  }
  
  .form-body {
    padding: 30rpx;
    
    .form-item {
      margin-bottom: 30rpx;
      
      .form-label {
        display: block;
        font-size: 28rpx;
        color: var(--text-secondary);
        margin-bottom: 16rpx;
      }
      
      .form-input {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20rpx;
        background-color: var(--bg-color);
        border-radius: 8rpx;
        font-size: 30rpx;
        color: var(--text-primary);
        
        .iconfont {
          font-size: 24rpx;
          color: var(--text-secondary);
        }
      }
      
      input.form-input {
        display: block;
      }
      
      .form-textarea {
        width: 100%;
        min-height: 120rpx;
        padding: 20rpx;
        background-color: var(--bg-color);
        border-radius: 8rpx;
        font-size: 30rpx;
        color: var(--text-primary);
      }
    }
  }
  
  .form-actions {
    display: flex;
    padding: 30rpx;
    border-top: 1px solid var(--border-color);
    
    button {
      flex: 1;
      padding: 20rpx 0;
      border-radius: 8rpx;
      font-size: 32rpx;
      
      &.btn-cancel {
        background-color: var(--bg-color);
        color: var(--text-primary);
        margin-right: 20rpx;
      }
      
      &.btn-confirm {
        background-color: var(--primary-color);
        color: #fff;
      }
    }
  }
}
</style>