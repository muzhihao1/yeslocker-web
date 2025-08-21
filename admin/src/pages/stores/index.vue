<template>
  <div class="stores-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-title">
        <span class="title">门店管理</span>
        <span class="subtitle">{{ stores.length }} 个门店</span>
      </div>
      <div class="header-actions">
        <button 
          v-if="canCreateStore" 
          class="btn-create"
          @click="showCreateModal = true"
        >
          <span class="iconfont icon-plus"></span>
          新建门店
        </button>
        <button class="btn-refresh" @click="refreshList">
          <span class="iconfont icon-refresh"></span>
          刷新
        </button>
      </div>
    </div>

    <!-- 门店列表 -->
    <div class="stores-list">
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
      
      <div v-else-if="stores.length === 0" class="empty-container">
        <div class="empty-icon">🏪</div>
        <span class="empty-text">暂无门店数据</span>
      </div>

      <div v-else class="stores-grid">
        <div 
          v-for="store in stores" 
          :key="store.id" 
          class="store-card"
          @click="goToDetail(store.id)"
        >
          <div class="card-header">
            <h3 class="store-name">{{ store.name }}</h3>
            <span class="store-status" :class="`status-${store.status}`">
                  {{ store.is_active ? '营业中' : '已停业' }}
                </div>
              </div>
            </div>
            <div class="store-actions">
              <span class="iconfont icon-edit" @click="editStore(store)"></span>
              <span class="iconfont icon-more" @click="showMoreActions(store)"></span>
            </div>
          </div>

          <!-- 门店地址 -->
          <div class="store-address">
            <span class="iconfont icon-location"></span>
            <span class="address-text">{{ store.address }}</span>
          </div>

          <!-- 联系信息 -->
          <div class="store-contact">
            <div class="contact-item">
              <span class="iconfont icon-user"></span>
              <span>{{ store.manager_name || '未设置' }}</span>
            </div>
            <div class="contact-item">
              <span class="iconfont icon-phone"></span>
              <span>{{ store.contact_phone || '未设置' }}</span>
            </div>
          </div>

          <!-- 杆柜统计 -->
          <div class="locker-stats">
            <div class="stat-item">
              <span class="stat-value">{{ store.total_lockers || 0 }}</span>
              <span class="stat-label">总杆柜</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ store.available_lockers || 0 }}</span>
              <span class="stat-label">可用</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ store.occupied_lockers || 0 }}</span>
              <span class="stat-label">使用中</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ store.maintenance_lockers || 0 }}</span>
              <span class="stat-label">维护中</span>
            </div>
          </div>

          <!-- 营业时间 -->
          <div class="business-hours">
            <span class="hours-label">营业时间：</span>
            <span class="hours-value">{{ store.business_hours || '09:00 - 22:00' }}</span>
          </div>

          <!-- 快捷操作 -->
          <div class="store-quick-actions">
            <button class="btn-action" @click="viewLockers(store)">
              <span class="iconfont icon-locker"></span>
              查看杆柜
            </button>
            <button class="btn-action" @click="viewStatistics(store)">
              <span class="iconfont icon-chart"></span>
              数据统计
            </button>
            <button class="btn-action" :class="{ danger: store.is_active }" @click="toggleStoreStatus(store)">
              <span class="iconfont" :class="store.is_active ? 'icon-pause' : 'icon-play'"></span>
              {{ store.is_active ? '停业' : '营业' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑门店弹窗 -->
    <Teleport to="body">
      <div v-if="isStoreFormOpen" class="modal-overlay" @click.self="closeStoreForm">
        <div class="store-form">
          <div class="form-header">
            <span class="form-title">{{ isEdit ? '编辑门店' : '新增门店' }}</span>
            <span class="iconfont icon-close" @click="closeStoreForm"></span>
          </div>
          <div class="form-body">
            <div class="form-item">
              <span class="form-label required">门店名称</span>
              <input v-model="formData.name" class="form-input" placeholder="请输入门店名称" />
            </div>
            <div class="form-item">
              <span class="form-label required">门店编码</span>
              <input v-model="formData.code" class="form-input" placeholder="请输入门店编码" 
                     :disabled="isEdit" />
            </div>
            <div class="form-item">
              <span class="form-label required">门店地址</span>
              <textarea v-model="formData.address" class="form-textarea" placeholder="请输入详细地址" />
            </div>
            <div class="form-item">
              <span class="form-label">负责人</span>
              <input v-model="formData.manager_name" class="form-input" placeholder="请输入负责人姓名" />
            </div>
            <div class="form-item">
              <span class="form-label">联系电话</span>
              <input v-model="formData.contact_phone" class="form-input" placeholder="请输入联系电话" 
                     type="tel" maxlength="11" />
            </div>
            <div class="form-item">
              <span class="form-label">营业时间</span>
              <div class="time-inputs">
                <input type="time" v-model="formData.open_time" class="time-input" />
                <span class="time-separator">至</span>
                <input type="time" v-model="formData.close_time" class="time-input" />
              </div>
            </div>
            <div class="form-item">
              <span class="form-label">备注信息</span>
              <textarea v-model="formData.remark" class="form-textarea" placeholder="选填" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-cancel" @click="closeStoreForm">取消</button>
            <button class="btn-confirm" @click="confirmStoreForm">确定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 更多操作菜单 -->
    <Teleport to="body">
      <div v-if="isMoreActionsOpen" class="modal-overlay" @click.self="closeMoreActions">
        <div class="action-menu">
          <div class="action-item" @click="batchAddLockers">
            <span class="iconfont icon-add-circle"></span>
            <span>批量添加杆柜</span>
          </div>
          <div class="action-item" @click="exportStoreData">
            <span class="iconfont icon-export"></span>
            <span>导出门店数据</span>
          </div>
          <div class="action-item" @click="viewStoreQRCode">
            <span class="iconfont icon-qrcode"></span>
            <span>查看门店二维码</span>
          </div>
          <div class="action-item danger" @click="deleteStore">
            <span class="iconfont icon-delete"></span>
            <span>删除门店</span>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/services/api'
import { showToast, showModal } from '@/utils'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()

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
const isStoreFormOpen = ref(false)
const isMoreActionsOpen = ref(false)
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
    const response = await adminApi.getStoresAndLockers()
    stores.value = response.data?.stores || []
    
    // 获取每个门店的杆柜统计
    for (const store of stores.value) {
      const stats = await adminApi.getStatistics({ store_id: store.id })
      if (stats.data?.stores) {
        Object.assign(store, stats.data.stores)
      }
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
  isStoreFormOpen.value = true
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
  isStoreFormOpen.value = true
}

// 关闭表单
const closeStoreForm = () => {
  isStoreFormOpen.value = false
  currentStore.value = null
}

// Note: 营业时间现在直接通过HTML input[type="time"]的v-model绑定，不需要额外的事件处理函数

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
      await adminApi.updateStore(currentStore.value.id, data)
      showToast('编辑成功')
    } else {
      await adminApi.createStore(data)
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
  window.location.href = `/admin/lockers?storeId=${store.id}&storeName=${store.name}`
}

// 查看统计
const viewStatistics = (store: Store) => {
  window.location.href = `/admin/statistics?storeId=${store.id}&storeName=${store.name}`
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
      await adminApi.updateStore(store.id, {
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
  isMoreActionsOpen.value = true
}

// 关闭更多操作
const closeMoreActions = () => {
  isMoreActionsOpen.value = false
}

// 批量添加杆柜
const batchAddLockers = () => {
  closeMoreActions()
  window.location.href = `/admin/lockers/batch-add?storeId=${currentStore.value?.id}&storeName=${currentStore.value?.name}`
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
  window.location.href = `/admin/stores/qrcode?storeId=${currentStore.value?.id}&storeName=${currentStore.value?.name}`
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
      await adminApi.deleteStore(currentStore.value.id)
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
  align-items: center;
  z-index: 1000;
}

/* Bottom sheet style for action menu */
.modal-overlay .action-menu {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 16px 16px 0 0;
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