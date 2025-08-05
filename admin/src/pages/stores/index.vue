<template>
  <view class="stores-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-title">
        <text class="title">门店管理</text>
        <text class="subtitle">共 {{ stores.length }} 家门店</text>
      </view>
      <view class="header-actions">
        <button class="btn-add" @click="addStore">
          <text class="iconfont icon-plus"></text>
          新增门店
        </button>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="iconfont icon-search"></text>
        <input 
          v-model="searchKey"
          class="search-input"
          placeholder="搜索门店名称、地址"
          @confirm="handleSearch"
        />
        <text v-if="searchKey" class="iconfont icon-close" @click="clearSearch"></text>
      </view>
    </view>

    <!-- 门店列表 -->
    <scroll-view class="stores-list" scroll-y :refresher-enabled="true" 
                 :refresher-triggered="refreshing" @refresherrefresh="onPullDownRefresh">
      <view v-if="loading" class="loading-container">
        <loading-spinner />
      </view>
      
      <view v-else-if="filteredStores.length === 0" class="empty-container">
        <image src="/static/images/empty-stores.png" class="empty-image" />
        <text class="empty-text">暂无门店数据</text>
      </view>

      <view v-else>
        <view v-for="store in filteredStores" :key="store.id" class="store-card">
          <!-- 门店基本信息 -->
          <view class="store-header">
            <view class="store-info">
              <text class="store-name">{{ store.name }}</text>
              <view class="store-meta">
                <text class="store-code">编码：{{ store.code }}</text>
                <view class="store-status" :class="store.is_active ? 'active' : 'inactive'">
                  {{ store.is_active ? '营业中' : '已停业' }}
                </view>
              </view>
            </view>
            <view class="store-actions">
              <text class="iconfont icon-edit" @click="editStore(store)"></text>
              <text class="iconfont icon-more" @click="showMoreActions(store)"></text>
            </view>
          </view>

          <!-- 门店地址 -->
          <view class="store-address">
            <text class="iconfont icon-location"></text>
            <text class="address-text">{{ store.address }}</text>
          </view>

          <!-- 联系信息 -->
          <view class="store-contact">
            <view class="contact-item">
              <text class="iconfont icon-user"></text>
              <text>{{ store.manager_name || '未设置' }}</text>
            </view>
            <view class="contact-item">
              <text class="iconfont icon-phone"></text>
              <text>{{ store.contact_phone || '未设置' }}</text>
            </view>
          </view>

          <!-- 杆柜统计 -->
          <view class="locker-stats">
            <view class="stat-item">
              <text class="stat-value">{{ store.total_lockers || 0 }}</text>
              <text class="stat-label">总杆柜</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ store.available_lockers || 0 }}</text>
              <text class="stat-label">可用</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ store.occupied_lockers || 0 }}</text>
              <text class="stat-label">使用中</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ store.maintenance_lockers || 0 }}</text>
              <text class="stat-label">维护中</text>
            </view>
          </view>

          <!-- 营业时间 -->
          <view class="business-hours">
            <text class="hours-label">营业时间：</text>
            <text class="hours-value">{{ store.business_hours || '09:00 - 22:00' }}</text>
          </view>

          <!-- 快捷操作 -->
          <view class="store-quick-actions">
            <button class="btn-action" @click="viewLockers(store)">
              <text class="iconfont icon-locker"></text>
              查看杆柜
            </button>
            <button class="btn-action" @click="viewStatistics(store)">
              <text class="iconfont icon-chart"></text>
              数据统计
            </button>
            <button class="btn-action" :class="{ danger: store.is_active }" @click="toggleStoreStatus(store)">
              <text class="iconfont" :class="store.is_active ? 'icon-pause' : 'icon-play'"></text>
              {{ store.is_active ? '停业' : '营业' }}
            </button>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 新增/编辑门店弹窗 -->
    <uni-popup ref="storeFormPopup" type="center">
      <view class="store-form">
        <view class="form-header">
          <text class="form-title">{{ isEdit ? '编辑门店' : '新增门店' }}</text>
          <text class="iconfont icon-close" @click="closeStoreForm"></text>
        </view>
        <scroll-view class="form-body" scroll-y>
          <view class="form-item">
            <text class="form-label required">门店名称</text>
            <input v-model="formData.name" class="form-input" placeholder="请输入门店名称" />
          </view>
          <view class="form-item">
            <text class="form-label required">门店编码</text>
            <input v-model="formData.code" class="form-input" placeholder="请输入门店编码" 
                   :disabled="isEdit" />
          </view>
          <view class="form-item">
            <text class="form-label required">门店地址</text>
            <textarea v-model="formData.address" class="form-textarea" placeholder="请输入详细地址" />
          </view>
          <view class="form-item">
            <text class="form-label">负责人</text>
            <input v-model="formData.manager_name" class="form-input" placeholder="请输入负责人姓名" />
          </view>
          <view class="form-item">
            <text class="form-label">联系电话</text>
            <input v-model="formData.contact_phone" class="form-input" placeholder="请输入联系电话" 
                   type="number" maxlength="11" />
          </view>
          <view class="form-item">
            <text class="form-label">营业时间</text>
            <view class="time-inputs">
              <picker mode="time" :value="formData.open_time" @change="handleOpenTimeChange">
                <view class="time-input">
                  <text>{{ formData.open_time || '09:00' }}</text>
                  <text class="iconfont icon-arrow-down"></text>
                </view>
              </picker>
              <text class="time-separator">至</text>
              <picker mode="time" :value="formData.close_time" @change="handleCloseTimeChange">
                <view class="time-input">
                  <text>{{ formData.close_time || '22:00' }}</text>
                  <text class="iconfont icon-arrow-down"></text>
                </view>
              </picker>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">备注信息</text>
            <textarea v-model="formData.remark" class="form-textarea" placeholder="选填" />
          </view>
        </scroll-view>
        <view class="form-actions">
          <button class="btn-cancel" @click="closeStoreForm">取消</button>
          <button class="btn-confirm" @click="confirmStoreForm">确定</button>
        </view>
      </view>
    </uni-popup>

    <!-- 更多操作菜单 -->
    <uni-popup ref="moreActionsPopup" type="bottom">
      <view class="action-menu">
        <view class="action-item" @click="batchAddLockers">
          <text class="iconfont icon-add-circle"></text>
          <text>批量添加杆柜</text>
        </view>
        <view class="action-item" @click="exportStoreData">
          <text class="iconfont icon-export"></text>
          <text>导出门店数据</text>
        </view>
        <view class="action-item" @click="viewStoreQRCode">
          <text class="iconfont icon-qrcode"></text>
          <text>查看门店二维码</text>
        </view>
        <view class="action-item danger" @click="deleteStore">
          <text class="iconfont icon-delete"></text>
          <text>删除门店</text>
        </view>
        <view class="action-cancel" @click="closeMoreActions">
          取消
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/services/api'
import { showToast, showModal } from '@/utils'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface Store {
  id: string
  name: string
  code: string
  address: string
  manager_name?: string
  contact_phone?: string
  business_hours?: string
  is_active: boolean
  total_lockers: number
  available_lockers: number
  occupied_lockers: number
  maintenance_lockers: number
  created_at: string
}


// 状态变量
const stores = ref<Store[]>([])
const loading = ref(false)
const refreshing = ref(false)
const searchKey = ref('')
const currentStore = ref<Store | null>(null)

// 表单相关
const storeFormPopup = ref()
const moreActionsPopup = ref()
const isEdit = ref(false)
const formData = ref({
  name: '',
  code: '',
  address: '',
  manager_name: '',
  contact_phone: '',
  open_time: '09:00',
  close_time: '22:00',
  remark: ''
})

// 计算属性：过滤后的门店列表
const filteredStores = computed(() => {
  if (!searchKey.value) return stores.value
  
  const key = searchKey.value.toLowerCase()
  return stores.value.filter(store => 
    store.name.toLowerCase().includes(key) ||
    store.address.toLowerCase().includes(key) ||
    store.code.toLowerCase().includes(key)
  )
})

// 获取门店列表
const getStores = async () => {
  loading.value = true
  
  try {
    const response = await adminApi.get('/stores-lockers')
    stores.value = response.stores || []
    
    // 获取每个门店的杆柜统计
    for (const store of stores.value) {
      const stats = await adminApi.get(`/admin/stores/${store.id}/stats`)
      Object.assign(store, stats.data)
    }
  } catch (error) {
    console.error('获取门店列表失败:', error)
    showToast('获取数据失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 搜索
const handleSearch = () => {
  // 搜索功能通过计算属性自动实现
}

// 清空搜索
const clearSearch = () => {
  searchKey.value = ''
}

// 下拉刷新
const onPullDownRefresh = () => {
  refreshing.value = true
  getStores()
}

// 新增门店
const addStore = () => {
  isEdit.value = false
  formData.value = {
    name: '',
    code: '',
    address: '',
    manager_name: '',
    contact_phone: '',
    open_time: '09:00',
    close_time: '22:00',
    remark: ''
  }
  storeFormPopup.value.open()
}

// 编辑门店
const editStore = (store: Store) => {
  isEdit.value = true
  currentStore.value = store
  
  // 解析营业时间
  const [openTime, closeTime] = (store.business_hours || '09:00 - 22:00').split(' - ')
  
  formData.value = {
    name: store.name,
    code: store.code,
    address: store.address,
    manager_name: store.manager_name || '',
    contact_phone: store.contact_phone || '',
    open_time: openTime,
    close_time: closeTime,
    remark: ''
  }
  storeFormPopup.value.open()
}

// 关闭表单
const closeStoreForm = () => {
  storeFormPopup.value.close()
  currentStore.value = null
}

// 处理营业开始时间
const handleOpenTimeChange = (e: any) => {
  formData.value.open_time = e.detail.value
}

// 处理营业结束时间
const handleCloseTimeChange = (e: any) => {
  formData.value.close_time = e.detail.value
}

// 确认提交表单
const confirmStoreForm = async () => {
  // 表单验证
  if (!formData.value.name.trim()) {
    showToast('请输入门店名称')
    return
  }
  
  if (!formData.value.code.trim()) {
    showToast('请输入门店编码')
    return
  }
  
  if (!formData.value.address.trim()) {
    showToast('请输入门店地址')
    return
  }
  
  try {
    const data = {
      ...formData.value,
      business_hours: `${formData.value.open_time} - ${formData.value.close_time}`
    }
    
    if (isEdit.value && currentStore.value) {
      await adminApi.patch(`/admin/stores/${currentStore.value.id}`, data)
      showToast('编辑成功')
    } else {
      await adminApi.post('/admin/stores', data)
      showToast('新增成功')
    }
    
    closeStoreForm()
    getStores()
  } catch (error) {
    console.error('操作失败:', error)
    showToast(isEdit.value ? '编辑失败' : '新增失败')
  }
}

// 查看杆柜
const viewLockers = (store: Store) => {
  uni.navigateTo({
    url: `/pages/lockers/index?storeId=${store.id}&storeName=${store.name}`
  })
}

// 查看统计
const viewStatistics = (store: Store) => {
  uni.navigateTo({
    url: `/pages/statistics/store?storeId=${store.id}&storeName=${store.name}`
  })
}

// 切换门店状态
const toggleStoreStatus = async (store: Store) => {
  const action = store.is_active ? '停业' : '营业'
  const result = await showModal({
    title: `确认${action}`,
    content: `确定要将 ${store.name} 设为${action}状态吗？`
  })
  
  if (result.confirm) {
    try {
      await adminApi.patch(`/admin/stores/${store.id}`, {
        is_active: !store.is_active
      })
      
      store.is_active = !store.is_active
      showToast(`${action}设置成功`)
    } catch (error) {
      console.error('操作失败:', error)
      showToast('操作失败')
    }
  }
}

// 显示更多操作
const showMoreActions = (store: Store) => {
  currentStore.value = store
  moreActionsPopup.value.open()
}

// 关闭更多操作
const closeMoreActions = () => {
  moreActionsPopup.value.close()
}

// 批量添加杆柜
const batchAddLockers = () => {
  closeMoreActions()
  uni.navigateTo({
    url: `/pages/lockers/batch-add?storeId=${currentStore.value?.id}&storeName=${currentStore.value?.name}`
  })
}

// 导出门店数据
const exportStoreData = async () => {
  closeMoreActions()
  try {
    showToast('正在导出...')
    const response = await adminApi.get(`/admin/stores/${currentStore.value!.id}/export`, {
      responseType: 'blob'
    })
    
    // 创建下载链接
    const blob = new Blob([response.data], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `门店数据_${currentStore.value!.name}_${new Date().toISOString().split('T')[0]}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    showToast('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    showToast('导出失败')
  }
}

// 查看门店二维码
const viewStoreQRCode = () => {
  closeMoreActions()
  uni.navigateTo({
    url: `/pages/stores/qrcode?storeId=${currentStore.value?.id}&storeName=${currentStore.value?.name}`
  })
}

// 删除门店
const deleteStore = async () => {
  closeMoreActions()
  
  if (!currentStore.value) return
  
  // 检查是否有杆柜
  if (currentStore.value.total_lockers > 0) {
    showToast('该门店下还有杆柜，无法删除')
    return
  }
  
  const result = await showModal({
    title: '危险操作',
    content: `确定要删除门店 ${currentStore.value.name} 吗？此操作不可恢复！`
  })
  
  if (result.confirm) {
    try {
      await adminApi.delete(`/admin/stores/${currentStore.value.id}`)
      showToast('删除成功')
      getStores()
    } catch (error) {
      console.error('删除失败:', error)
      showToast('删除失败')
    }
  }
}

// 初始化
onMounted(() => {
  getStores()
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.stores-page {
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
  
  .btn-add {
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
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  
  .search-input-wrapper {
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
}

.stores-list {
  height: calc(100vh - 280rpx);
  padding: 20rpx;
}

.store-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  
  .store-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24rpx;
    
    .store-info {
      flex: 1;
      
      .store-name {
        font-size: 34rpx;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 12rpx;
      }
      
      .store-meta {
        display: flex;
        align-items: center;
        
        .store-code {
          font-size: 26rpx;
          color: var(--text-secondary);
          margin-right: 20rpx;
        }
        
        .store-status {
          padding: 6rpx 16rpx;
          border-radius: 20rpx;
          font-size: 24rpx;
          
          &.active {
            background-color: $success-light;
            color: var(--success-color);
          }
          
          &.inactive {
            background-color: $danger-light;
            color: var(--danger-color);
          }
        }
      }
    }
    
    .store-actions {
      display: flex;
      
      .iconfont {
        font-size: 36rpx;
        color: var(--text-secondary);
        margin-left: 24rpx;
      }
    }
  }
  
  .store-address {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    font-size: 28rpx;
    color: var(--text-secondary);
    
    .iconfont {
      font-size: 28rpx;
      margin-right: 12rpx;
      color: var(--primary-color);
    }
  }
  
  .store-contact {
    display: flex;
    margin-bottom: 24rpx;
    
    .contact-item {
      flex: 1;
      display: flex;
      align-items: center;
      font-size: 26rpx;
      color: var(--text-secondary);
      
      .iconfont {
        font-size: 28rpx;
        margin-right: 8rpx;
      }
    }
  }
  
  .locker-stats {
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
  
  .business-hours {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    font-size: 28rpx;
    
    .hours-label {
      color: var(--text-secondary);
      margin-right: 12rpx;
    }
    
    .hours-value {
      color: var(--text-primary);
    }
  }
  
  .store-quick-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 24rpx;
    
    .btn-action {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16rpx 0;
      background-color: var(--bg-color);
      border-radius: 8rpx;
      font-size: 26rpx;
      color: var(--text-primary);
      margin-right: 16rpx;
      
      &:last-child {
        margin-right: 0;
      }
      
      .iconfont {
        font-size: 28rpx;
        margin-right: 8rpx;
      }
      
      &.danger {
        color: var(--danger-color);
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
}

.store-form {
  width: 680rpx;
  max-height: 80vh;
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
    max-height: calc(80vh - 200rpx);
    padding: 30rpx;
    
    .form-item {
      margin-bottom: 30rpx;
      
      .form-label {
        display: block;
        font-size: 28rpx;
        color: var(--text-secondary);
        margin-bottom: 16rpx;
        
        &.required::after {
          content: ' *';
          color: var(--danger-color);
        }
      }
      
      .form-input {
        width: 100%;
        padding: 20rpx;
        background-color: var(--bg-color);
        border-radius: 8rpx;
        font-size: 30rpx;
        color: var(--text-primary);
        
        &:disabled {
          opacity: 0.6;
        }
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
      
      .time-inputs {
        display: flex;
        align-items: center;
        
        .time-input {
          flex: 1;
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
        
        .time-separator {
          padding: 0 20rpx;
          color: var(--text-secondary);
        }
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