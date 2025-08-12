<template>
  <div class="lockers-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-title">
        <span class="title">杆柜管理</span>
        <span class="subtitle">共 {{ totalCount }} 个杆柜</span>
      </div>
      <div class="header-actions">
        <button class="btn-add" @click="addLocker">
          <span class="iconfont icon-plus"></span>
          新增
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon available">
          <span class="iconfont icon-check-circle"></span>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.available }}</span>
          <span class="stat-label">可用</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon occupied">
          <span class="iconfont icon-locker"></span>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.occupied }}</span>
          <span class="stat-label">使用中</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon storing">
          <span class="iconfont icon-time"></span>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.storing }}</span>
          <span class="stat-label">存杆中</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon maintenance">
          <span class="iconfont icon-warning"></span>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.maintenance }}</span>
          <span class="stat-label">维护中</span>
        </div>
      </div>
    </div>

    <!-- 门店管理 -->
    <div class="store-management">
      <div class="section-header">
        <h3 class="section-title">门店管理</h3>
        <button class="btn-add-store" @click="addStore">
          <span class="iconfont icon-plus"></span>
          新增门店
        </button>
      </div>
      
      <div v-if="storeOptions.length === 0" class="empty-stores">
        <div class="empty-icon">🏪</div>
        <span class="empty-text">暂无门店，请先添加门店</span>
      </div>
      
      <div v-else class="store-grid">
        <div v-for="store in storeOptions" :key="store.id" class="store-card">
          <div class="store-header">
            <h4 class="store-name">{{ store.name }}</h4>
            <div class="store-actions">
              <button class="btn-edit" @click="editStore(store)">
                <span class="iconfont icon-edit"></span>
              </button>
              <button class="btn-delete" @click="deleteStoreConfirm(store.id, store.name)">
                <span class="iconfont icon-delete"></span>
              </button>
            </div>
          </div>
          <div class="store-info">
            <p class="store-address">{{ store.address || '地址未设置' }}</p>
            <div class="store-stats">
              <span class="stat-item">杆柜: {{ getStoreLockerCount(store.id) }}</span>
              <span class="stat-item">管理员: {{ store.manager_name || '未设置' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="filterStore" @change="handleStoreChange" class="filter-select">
        <option value="-1">全部门店</option>
        <option v-for="(store, index) in storeOptions" :key="store.id" :value="index">
          {{ store.name }}
        </option>
      </select>
      <select v-model="filterStatus" @change="handleStatusChange" class="filter-select">
        <option v-for="(status, index) in statusOptions" :key="index" :value="index">
          {{ status }}
        </option>
      </select>
    </div>

    <!-- 杆柜列表 -->
    <div class="lockers-list">
      <div v-if="loading && lockers.length === 0" class="loading-container">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
      
      <div v-else-if="lockers.length === 0" class="empty-container">
        <div class="empty-icon">📦</div>
        <span class="empty-text">暂无杆柜数据</span>
      </div>

      <div v-else class="locker-grid">
        <div v-for="locker in lockers" :key="locker.id" 
              class="locker-card" 
              :class="`status-${locker.status}`"
              @click="goToDetail(locker.id)">
          <!-- 杆柜编号和状态 -->
          <div class="locker-header">
            <span class="locker-number">{{ locker.number }}</span>
            <div class="locker-status">
              <span class="status-dot"></span>
              <span class="status-text">{{ getStatusText(locker.status) }}</span>
            </div>
          </div>
          
          <!-- 门店信息 -->
          <div class="store-info">
            <span class="iconfont icon-store"></span>
            <span class="store-name">{{ locker.store_name }}</span>
          </div>
          
          <!-- 使用者信息 -->
          <div v-if="locker.user" class="user-info">
            <div class="user-avatar">👤</div>
            <div class="user-detail">
              <span class="user-name">{{ locker.user.name }}</span>
              <span class="user-phone">{{ locker.user.phone }}</span>
            </div>
          </div>
          <div v-else class="empty-user">
            <span class="iconfont icon-user"></span>
            <span>暂无使用者</span>
          </div>
          
          <!-- 使用信息 -->
          <div v-if="locker.status === 'occupied' || locker.status === 'storing'" class="usage-info">
            <span class="usage-label">{{ locker.status === 'storing' ? '存杆时间' : '开始使用' }}：</span>
            <span class="usage-time">{{ formatDate(locker.last_operation_at, 'datetime') }}</span>
          </div>
          
          <!-- 快捷操作 -->
          <div class="locker-actions" @click.stop>
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
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore && !loading" class="load-more">
        <span>上拉加载更多</span>
      </div>
    </div>

    <!-- 新增杆柜弹窗 -->
    <Teleport to="body">
      <div v-if="isAddLockerOpen" class="modal-overlay" @click.self="closeAddForm">
        <div class="add-locker-form">
          <div class="form-header">
            <span class="form-title">新增杆柜</span>
            <span class="iconfont icon-close" @click="closeAddForm"></span>
          </div>
          <div class="form-body">
            <div class="form-item">
              <span class="form-label">所属门店</span>
              <select v-model="newLocker.storeIndex" class="form-input">
                <option value="-1">请选择门店</option>
                <option v-for="(store, index) in storeOptions" :key="store.id" :value="index">
                  {{ store.name }}
                </option>
              </select>
            </div>
            <div class="form-item">
              <span class="form-label">杆柜编号</span>
              <input v-model="newLocker.number" class="form-input" placeholder="请输入杆柜编号" />
            </div>
            <div class="form-item">
              <span class="form-label">备注信息</span>
              <textarea v-model="newLocker.remark" class="form-textarea" placeholder="选填"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-cancel" @click="closeAddForm">取消</button>
            <button class="btn-confirm" @click="confirmAddLocker">确定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 新增/编辑门店弹窗 -->
    <Teleport to="body">
      <div v-if="isStoreFormOpen" class="modal-overlay" @click.self="closeStoreForm">
        <div class="add-store-form">
          <div class="form-header">
            <span class="form-title">{{ editingStore ? '编辑门店' : '新增门店' }}</span>
            <span class="iconfont icon-close" @click="closeStoreForm"></span>
          </div>
          <div class="form-body">
            <div class="form-item">
              <span class="form-label">门店名称 *</span>
              <input v-model="storeForm.name" class="form-input" placeholder="请输入门店名称" />
            </div>
            <div class="form-item">
              <span class="form-label">门店编码 *</span>
              <input v-model="storeForm.code" class="form-input" placeholder="请输入门店编码" :disabled="editingStore !== null" />
            </div>
            <div class="form-item">
              <span class="form-label">门店地址 *</span>
              <input v-model="storeForm.address" class="form-input" placeholder="请输入门店地址" />
            </div>
            <div class="form-item">
              <span class="form-label">管理员姓名</span>
              <input v-model="storeForm.manager_name" class="form-input" placeholder="请输入管理员姓名" />
            </div>
            <div class="form-item">
              <span class="form-label">联系电话</span>
              <input v-model="storeForm.contact_phone" class="form-input" placeholder="请输入联系电话" />
            </div>
            <div class="form-item">
              <span class="form-label">营业时间</span>
              <input v-model="storeForm.business_hours" class="form-input" placeholder="如：09:00 - 22:00" />
            </div>
            <div class="form-item">
              <span class="form-label">备注信息</span>
              <textarea v-model="storeForm.remark" class="form-textarea" placeholder="选填"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-cancel" @click="closeStoreForm">取消</button>
            <button class="btn-confirm" @click="confirmStoreAction" :disabled="!storeForm.name || !storeForm.code || !storeForm.address">
              {{ editingStore ? '更新' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
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
  code?: string
  address?: string
  manager_name?: string
  contact_phone?: string
  business_hours?: string
  remark?: string
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
const isAddLockerOpen = ref(false)
const newLocker = ref({
  storeIndex: -1,
  number: '',
  remark: ''
})

// 门店管理
const isStoreFormOpen = ref(false)
const editingStore = ref(null)
const storeForm = ref({
  name: '',
  code: '',
  address: '',
  manager_name: '',
  contact_phone: '',
  business_hours: '09:00 - 22:00',
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
    if (filterStore.value > -1 && storeOptions.value[filterStore.value]) {
      params.storeId = storeOptions.value[filterStore.value].id
    }
    
    if (filterStatus.value > 0) {
      const statusMap = ['', 'available', 'occupied', 'storing', 'maintenance']
      params.status = statusMap[filterStatus.value]
    }
    
    const response = await adminApi.getStoresAndLockers()
    
    if (isRefresh) {
      lockers.value = response.data?.lockers || []
    } else {
      lockers.value.push(...(response.data?.lockers || []))
    }
    
    // 更新统计数据
    if (response.data?.stats) {
      stats.value = response.data.stats
    }
    
    totalCount.value = response.data?.total || 0
    hasMore.value = (response.data?.lockers?.length || 0) === pageSize
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
    storeOptions.value = response.data?.stores || []
  } catch (error) {
    console.error('获取门店列表失败:', error)
  }
}

// 处理门店筛选
const handleStoreChange = () => {
  getLockers(true)
}

// 处理状态筛选
const handleStatusChange = () => {
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
  window.location.href = `/admin/lockers/detail?id=${id}`
}

// 查看历史
const viewHistory = (lockerId: string) => {
  window.location.href = `/admin/records?lockerId=${lockerId}`
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
  const reason = prompt('请输入维护原因（例如：设备损坏、清洁保养等）：')
  
  if (reason) {
    try {
      await request.put(`/admin/lockers/${locker.id}`, {
        status: 'maintenance',
        maintenanceReason: reason
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
  isAddLockerOpen.value = true
}

// 关闭新增表单
const closeAddForm = () => {
  isAddLockerOpen.value = false
  newLocker.value = {
    storeIndex: -1,
    number: '',
    remark: ''
  }
}

// 选择门店 - 现在通过v-model直接绑定，不需要额外处理

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
      store_id: storeOptions.value[newLocker.value.storeIndex].id,
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

// 门店管理方法

// 获取门店的杆柜数量
const getStoreLockerCount = (storeId: string) => {
  return lockers.value.filter(locker => locker.store_id === storeId).length
}

// 打开新增门店表单
const addStore = () => {
  editingStore.value = null
  storeForm.value = {
    name: '',
    code: '',
    address: '',
    manager_name: '',
    contact_phone: '',
    business_hours: '09:00 - 22:00',
    remark: ''
  }
  isStoreFormOpen.value = true
}

// 打开编辑门店表单
const editStore = (store: Store) => {
  editingStore.value = store
  storeForm.value = {
    name: store.name,
    code: store.code || '',
    address: store.address || '',
    manager_name: store.manager_name || '',
    contact_phone: store.contact_phone || '',
    business_hours: store.business_hours || '09:00 - 22:00',
    remark: store.remark || ''
  }
  isStoreFormOpen.value = true
}

// 关闭门店表单
const closeStoreForm = () => {
  isStoreFormOpen.value = false
  editingStore.value = null
  storeForm.value = {
    name: '',
    code: '',
    address: '',
    manager_name: '',
    contact_phone: '',
    business_hours: '09:00 - 22:00',
    remark: ''
  }
}

// 确认门店操作（新增或编辑）
const confirmStoreAction = async () => {
  if (!storeForm.value.name.trim() || !storeForm.value.code.trim() || !storeForm.value.address.trim()) {
    showToast('请填写必填项')
    return
  }

  try {
    if (editingStore.value) {
      // 编辑门店
      await adminApi.updateStore(editingStore.value.id, {
        name: storeForm.value.name,
        address: storeForm.value.address,
        manager_name: storeForm.value.manager_name,
        contact_phone: storeForm.value.contact_phone,
        business_hours: storeForm.value.business_hours,
        remark: storeForm.value.remark
      })
      showToast('门店更新成功')
    } else {
      // 新增门店
      await adminApi.createStore({
        name: storeForm.value.name,
        code: storeForm.value.code,
        address: storeForm.value.address,
        manager_name: storeForm.value.manager_name,
        contact_phone: storeForm.value.contact_phone,
        business_hours: storeForm.value.business_hours,
        remark: storeForm.value.remark
      })
      showToast('门店创建成功')
    }
    
    closeStoreForm()
    getStores() // 重新获取门店列表
  } catch (error) {
    console.error('门店操作失败:', error)
    showToast('操作失败')
  }
}

// 确认删除门店
const deleteStoreConfirm = async (storeId: string, storeName: string) => {
  const result = await showModal({
    title: '确认删除',
    content: `确定要删除门店"${storeName}"吗？删除后无法恢复。`
  })
  
  if (result.confirm) {
    try {
      await adminApi.deleteStore(storeId)
      showToast('门店删除成功')
      getStores() // 重新获取门店列表
      getLockers(true) // 重新获取杆柜列表
    } catch (error) {
      console.error('删除门店失败:', error)
      showToast('删除失败')
    }
  }
}
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.lockers-page {
  min-height: 100vh;
  background-color: var(--bg-color);
}

/* 门店管理样式 */
.store-management {
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-light);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-lg);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.btn-add-store {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--border-radius);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all var(--animation-duration-normal);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.btn-add-store:hover {
  opacity: 0.9;
}

.empty-stores {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xxl);
  color: var(--text-secondary);
}

.empty-stores .empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
  opacity: 0.6;
}

.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.store-card {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  transition: all var(--animation-duration-normal);
  background-color: var(--bg-color-white);
}

.store-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--box-shadow);
  border-color: var(--primary-color);
}

.store-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.store-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.store-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.btn-edit, .btn-delete {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--animation-duration-normal);
}

.btn-edit {
  background-color: var(--info-color);
  color: #fff;
}

.btn-edit:hover {
  opacity: 0.9;
}

.btn-delete {
  background-color: var(--error-color);
  color: #fff;
}

.btn-delete:hover {
  opacity: 0.9;
}

.store-address {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.4;
}

.store-stats {
  display: flex;
  gap: var(--spacing-lg);
}

.stat-item {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  background-color: var(--bg-color);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-weight: 500;
}

.add-store-form {
  width: 500px;
  max-width: 90vw;
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--box-shadow-heavy);
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background-color: var(--bg-color-white);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: var(--spacing-md);
}

.page-header .header-title .title {
  font-size: var(--font-size-xl);
  font-weight: bold;
  color: var(--text-primary);
  margin-right: var(--spacing-sm);
}

.page-header .header-title .subtitle {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
}

.page-header .btn-add {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--border-radius);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all var(--animation-duration-normal);
}

.page-header .btn-add:hover {
  opacity: 0.8;
}

.page-header .btn-add .iconfont {
  margin-right: var(--spacing-xs);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--box-shadow-light);
  
  .stat-card {
    display: flex;
    align-items: center;
    padding: var(--spacing-md);
    
    .stat-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--border-radius-lg);
      margin-right: var(--spacing-md);
      font-size: var(--font-size-xl);
      
      &.available {
        background-color: rgba(76, 175, 80, 0.1);
        color: var(--success-color);
      }
      
      &.occupied {
        background-color: rgba(33, 150, 243, 0.1);
        color: var(--info-color);
      }
      
      &.storing {
        background-color: rgba(255, 193, 7, 0.1);
        color: var(--warning-color);
      }
      
      &.maintenance {
        background-color: rgba(244, 67, 54, 0.1);
        color: var(--error-color);
      }
    }
    
    .stat-info {
      .stat-value {
        display: block;
        font-size: var(--font-size-xl);
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.2;
      }
      
      .stat-label {
        display: block;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        margin-top: var(--spacing-xs);
      }
    }
  }
}

.filter-bar {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--box-shadow-light);
  
  .filter-select {
    flex: 1;
    padding: var(--spacing-md);
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: var(--font-size-md);
    color: var(--text-primary);
    transition: border-color var(--animation-duration-normal);
    
    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }
  
  .filter-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: var(--font-size-md);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--animation-duration-normal);
    
    &:hover {
      border-color: var(--primary-color);
    }
    
    .iconfont {
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }
}

.lockers-list {
  padding: var(--spacing-lg);
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow-light);
}

.locker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.locker-card {
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  border: 2px solid var(--border-color);
  transition: all var(--animation-duration-normal);
  box-shadow: var(--box-shadow-light);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--box-shadow);
  }
  
  &.status-available {
    border-color: var(--success-color);
    border-left: 4px solid var(--success-color);
  }
  
  &.status-occupied {
    border-color: var(--info-color);
    border-left: 4px solid var(--info-color);
  }
  
  &.status-storing {
    border-color: var(--warning-color);
    border-left: 4px solid var(--warning-color);
  }
  
  &.status-maintenance {
    border-color: var(--error-color);
    border-left: 4px solid var(--error-color);
  }
  
  .locker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    
    .locker-number {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .locker-status {
      display: flex;
      align-items: center;
      font-size: var(--font-size-sm);
      font-weight: 500;
      padding: 4px 8px;
      border-radius: var(--border-radius);
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: var(--spacing-xs);
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
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    
    .iconfont {
      margin-right: var(--spacing-xs);
    }
  }
  
  .user-info {
    display: flex;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--bg-color);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    
    .user-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      margin-right: var(--spacing-md);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-color-grey);
      font-size: var(--font-size-sm);
    }
    
    .user-detail {
      flex: 1;
      
      .user-name {
        display: block;
        font-size: var(--font-size-md);
        color: var(--text-primary);
        margin-bottom: var(--spacing-xs);
        font-weight: 500;
      }
      
      .user-phone {
        display: block;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }
    }
  }
  
  .empty-user {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
    background-color: var(--bg-color);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-disabled);
    
    .iconfont {
      margin-right: var(--spacing-xs);
    }
  }
  
  .usage-info {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
    line-height: 1.4;
    
    .usage-label {
      margin-right: var(--spacing-xs);
      font-weight: 500;
    }
  }
  
  .locker-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
    
    .btn-action {
      flex: 1;
      padding: var(--spacing-sm) var(--spacing-md);
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      font-size: var(--font-size-sm);
      color: var(--text-primary);
      text-align: center;
      cursor: pointer;
      transition: all var(--animation-duration-normal);
      font-weight: 500;
      
      &:hover {
        background-color: var(--bg-color-grey);
        border-color: var(--primary-color);
      }
      
      &.primary {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
        color: #fff;
        
        &:hover {
          opacity: 0.9;
        }
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
  padding: var(--spacing-xxl) 0;
  min-height: 200px;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: var(--spacing-lg);
    opacity: 0.6;
  }
  
  .empty-text {
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
    text-align: center;
  }
  
  .loading-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md);
  }
  
  .loading-text {
    font-size: var(--font-size-md);
    color: var(--text-secondary);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.load-more {
  text-align: center;
  padding: var(--spacing-lg);
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--animation-duration-normal);
  
  &:hover {
    color: var(--primary-color);
  }
}

.add-locker-form {
  width: 400px;
  max-width: 90vw;
  background-color: var(--bg-color-white);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--box-shadow-heavy);
  
  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
    
    .form-title {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .iconfont {
      font-size: var(--font-size-xl);
      color: var(--text-secondary);
      cursor: pointer;
      padding: var(--spacing-xs);
      transition: color var(--animation-duration-normal);
      
      &:hover {
        color: var(--text-primary);
      }
    }
  }
  
  .form-body {
    padding: var(--spacing-lg);
    
    .form-item {
      margin-bottom: var(--spacing-lg);
      position: relative;
      
      .form-label {
        display: block;
        font-size: var(--font-size-md);
        color: var(--text-primary);
        margin-bottom: var(--spacing-sm);
        font-weight: 500;
        position: relative;
        z-index: 2;
        background-color: var(--bg-color-white);
        padding-bottom: 4px;
      }
      
      .form-input {
        width: 100%;
        padding: var(--spacing-md);
        background-color: var(--bg-color-white);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        font-size: var(--font-size-md);
        color: var(--text-primary);
        transition: border-color var(--animation-duration-normal);
        
        &:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        
        .iconfont {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }
      }
      
      select.form-input {
        cursor: pointer;
      }
      
      .form-textarea {
        width: 100%;
        min-height: 80px;
        padding: var(--spacing-md);
        background-color: var(--bg-color-white);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        font-size: var(--font-size-md);
        color: var(--text-primary);
        resize: vertical;
        font-family: inherit;
        transition: border-color var(--animation-duration-normal);
        
        &:focus {
          outline: none;
          border-color: var(--primary-color);
        }
      }
    }
  }
  
  .form-actions {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
    background-color: var(--bg-color);
    
    button {
      flex: 1;
      padding: var(--spacing-md) var(--spacing-lg);
      border: none;
      border-radius: var(--border-radius);
      font-size: var(--font-size-md);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--animation-duration-normal);
      
      &.btn-cancel {
        background-color: var(--bg-color-white);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        
        &:hover {
          background-color: var(--bg-color-grey);
        }
      }
      
      &.btn-confirm {
        background-color: var(--primary-color);
        color: #fff;
        
        &:hover {
          opacity: 0.9;
        }
        
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style>