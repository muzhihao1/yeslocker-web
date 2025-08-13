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

    <!-- 筛选和操作栏 -->
    <div class="control-bar">
      <div class="filter-controls">
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
      <div class="action-controls">
        <button class="btn-add-store" @click="addStore">
          <span class="iconfont icon-plus"></span>
          新增门店
        </button>
      </div>
    </div>

    <!-- 门店-杆柜树形结构 v2.0 -->
    <div class="store-tree-container">
      <div v-if="storeOptions.length === 0" class="empty-stores">
        <div class="empty-icon">🏪</div>
        <span class="empty-text">暂无门店，请先添加门店</span>
      </div>
      
      <div v-else class="store-tree">
        <div v-for="store in storeOptions" :key="store.id" class="store-node">
          <!-- 门店卡片 -->
          <div class="store-card" :class="{ 'expanded': expandedStores.includes(store.id) }">
            <div class="store-main" @click="toggleStore(store.id)">
              <div class="store-expand-icon">
                <span v-if="expandedStores.includes(store.id)">📂</span>
                <span v-else>📁</span>
              </div>
              <div class="store-info">
                <h4 class="store-name">{{ store.name }}</h4>
                <p class="store-address">{{ store.address || '地址未设置' }}</p>
                <div class="store-stats">
                  <span class="stat-item">杆柜: {{ getStoreLockerCount(store.id) }}</span>
                  <span class="stat-item">管理员: {{ store.manager_name || '未设置' }}</span>
                </div>
              </div>
              <div class="store-actions" @click.stop>
                <button class="btn-edit" @click="editStore(store)">
                  <span class="iconfont icon-edit"></span>
                  编辑
                </button>
                <button class="btn-delete" @click="deleteStoreConfirm(store.id, store.name)">
                  <span class="iconfont icon-delete"></span>
                  删除
                </button>
              </div>
            </div>
            
            <!-- 杆柜列表 -->
            <div v-if="expandedStores.includes(store.id)" class="store-lockers">
              <div class="lockers-header">
                <span class="lockers-title">{{ store.name }} 的杆柜列表</span>
                <button class="btn-add-locker" @click="addLockerForStore(store.id)">
                  <span class="iconfont icon-plus"></span>
                  新增杆柜
                </button>
              </div>
              
              <div class="lockers-grid">
                <div v-for="locker in getStoreLockers(store.id)" :key="locker.id" 
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
                    <button class="btn-action danger" @click="deleteLockerConfirm(locker)">
                      删除
                    </button>
                  </div>
                </div>
                
                <!-- 该门店暂无杆柜 -->
                <div v-if="getStoreLockers(store.id).length === 0" class="empty-lockers">
                  <span class="empty-text">该门店暂无杆柜</span>
                  <button class="btn-add-first-locker" @click="addLockerForStore(store.id)">
                    新增第一个杆柜
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
  phone?: string  // 兼容旧字段名
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

// 树形结构状态
const expandedStores = ref<string[]>([])

// 展开/收起门店
const toggleStore = (storeId: string) => {
  const index = expandedStores.value.indexOf(storeId)
  if (index > -1) {
    expandedStores.value.splice(index, 1)
  } else {
    expandedStores.value.push(storeId)
  }
}

// 获取指定门店的杆柜
const getStoreLockers = (storeId: string) => {
  return allLockers.value.filter(locker => locker.store_id === storeId)
}

// 为指定门店新增杆柜
const addLockerForStore = (storeId: string) => {
  const store = storeOptions.value.find(s => s.id === storeId)
  if (store) {
    newLocker.value.storeIndex = storeOptions.value.indexOf(store)
    isAddLockerOpen.value = true
  }
}

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

// 原始数据存储
const allLockers = ref<Locker[]>([])

// 获取杆柜列表
const getLockers = async (isRefresh = false) => {
  if (loading.value) return
  
  loading.value = true
  
  try {
    const response = await adminApi.getStoresAndLockers()
    
    // 存储所有原始数据
    allLockers.value = response.data?.lockers || []
    
    // 应用筛选
    applyFilters()
    
    // 更新统计数据
    if (response.data?.stats) {
      stats.value = response.data.stats
    }
    
    totalCount.value = lockers.value.length
  } catch (error) {
    console.error('获取杆柜列表失败:', error)
    showToast('获取数据失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 应用筛选条件
const applyFilters = () => {
  let filtered = [...allLockers.value]
  
  // 门店筛选
  if (filterStore.value > -1 && storeOptions.value[filterStore.value]) {
    const selectedStoreId = storeOptions.value[filterStore.value].id
    filtered = filtered.filter(locker => locker.store_id === selectedStoreId)
  }
  
  // 状态筛选
  if (filterStatus.value > 0) {
    const statusMap = ['', 'available', 'occupied', 'storing', 'maintenance']
    const selectedStatus = statusMap[filterStatus.value]
    filtered = filtered.filter(locker => locker.status === selectedStatus)
  }
  
  lockers.value = filtered
  totalCount.value = filtered.length
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
  applyFilters()
}

// 处理状态筛选
const handleStatusChange = () => {
  applyFilters()
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
  console.log('编辑门店:', store)
  editingStore.value = store
  storeForm.value = {
    name: store.name || '',
    code: store.code || '',
    address: store.address || '',
    manager_name: store.manager_name || '',
    contact_phone: store.contact_phone || '',
    business_hours: store.business_hours || '09:00 - 22:00',
    remark: store.remark || ''
  }
  isStoreFormOpen.value = true
  console.log('表单数据:', storeForm.value)
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
  try {
    // 首先检查门店下的杆柜数量
    const storeLockers = allLockers.value.filter(locker => locker.store_id === storeId)
    const lockerCount = storeLockers.length
    
    if (lockerCount > 0) {
      // 如果有杆柜，提供更详细的选择
      const result = await showModal({
        title: '无法删除门店',
        content: `门店"${storeName}"下还有${lockerCount}个杆柜，请先删除所有杆柜后再删除门店。\n\n您可以：\n1. 取消删除\n2. 先手动删除所有杆柜\n3. 或点击"强制删除"同时删除门店和所有杆柜`,
        confirmText: '强制删除',
        cancelText: '取消'
      })
      
      if (result.confirm) {
        // 用户选择强制删除，先删除所有杆柜
        await deleteStoreWithLockers(storeId, storeName, storeLockers)
      }
    } else {
      // 没有杆柜，正常删除流程
      const result = await showModal({
        title: '确认删除',
        content: `确定要删除门店"${storeName}"吗？删除后无法恢复。`
      })
      
      if (result.confirm) {
        await deleteStoreOnly(storeId, storeName)
      }
    }
  } catch (error) {
    console.error('删除门店预检查失败:', error)
    showToast('操作失败，请重试')
  }
}

// 删除门店及其所有杆柜
const deleteStoreWithLockers = async (storeId: string, storeName: string, storeLockers: any[]) => {
  try {
    showToast('正在删除杆柜...', 'loading')
    
    // 并发删除所有杆柜
    const deletePromises = storeLockers.map(locker => 
      adminApi.deleteLocker(locker.id).catch(error => {
        console.warn(`删除杆柜${locker.number}失败:`, error)
        return null // 继续删除其他杆柜
      })
    )
    
    await Promise.allSettled(deletePromises)
    
    // 删除门店
    await deleteStoreOnly(storeId, storeName)
    
  } catch (error) {
    console.error('强制删除门店失败:', error)
    showToast('删除过程中出现错误，请检查并重试')
  }
}

// 仅删除门店
const deleteStoreOnly = async (storeId: string, storeName: string) => {
  try {
    await adminApi.deleteStore(storeId)
    showToast('门店删除成功')
    getStores() // 重新获取门店列表
    getLockers(true) // 重新获取杆柜列表
  } catch (error: any) {
    console.error('删除门店失败:', error)
    
    // 改进错误处理
    if (error?.response?.status === 400) {
      const errorMessage = error?.response?.data?.message || error?.message || '删除失败'
      showModal({
        title: '删除失败',
        content: `删除门店"${storeName}"失败：\n\n${errorMessage}\n\n请确保门店下没有关联的杆柜或其他数据。`,
        showCancel: false,
        confirmText: '我知道了'
      })
    } else {
      showToast('删除失败，请重试')
    }
  }
}

// 确认删除杆柜
const deleteLockerConfirm = async (locker: Locker) => {
  try {
    // 检查杆柜状态
    if (locker.status === 'occupied' || locker.status === 'storing') {
      showModal({
        title: '无法删除杆柜',
        content: `杆柜"${locker.number}"正在使用中，无法删除。\n\n请先释放杆柜后再进行删除操作。`,
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }
    
    const result = await showModal({
      title: '确认删除',
      content: `确定要删除杆柜"${locker.number}"吗？\n\n删除后无法恢复，请谨慎操作。`,
      confirmText: '确认删除',
      cancelText: '取消'
    })
    
    if (result.confirm) {
      await deleteLockerOnly(locker)
    }
  } catch (error) {
    console.error('删除杆柜预检查失败:', error)
    showToast('操作失败，请重试')
  }
}

// 执行杆柜删除
const deleteLockerOnly = async (locker: Locker) => {
  try {
    await adminApi.deleteLocker(locker.id)
    showToast('杆柜删除成功')
    
    // 更新本地数据
    const index = allLockers.value.findIndex(l => l.id === locker.id)
    if (index > -1) {
      allLockers.value.splice(index, 1)
    }
    
    // 重新应用筛选
    applyFilters()
    
    // 更新统计数据
    if (locker.status === 'available') {
      stats.value.available--
    } else if (locker.status === 'maintenance') {
      stats.value.maintenance--
    }
    
  } catch (error: any) {
    console.error('删除杆柜失败:', error)
    
    if (error?.status === 400) {
      const errorMessage = error?.message || '删除失败'
      showModal({
        title: '删除失败',
        content: `删除杆柜"${locker.number}"失败：\n\n${errorMessage}`,
        showCancel: false,
        confirmText: '我知道了'
      })
    } else {
      showToast('删除失败，请重试')
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

/* 控制栏样式 */
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  padding: 16px;
}

.filter-controls {
  display: flex;
  gap: 16px;
}

.action-controls {
  display: flex;
  gap: 16px;
}

/* 树形结构样式 */
.store-tree-container {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 16px;
}

.store-tree {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.store-node {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 300ms;
}

.store-node:hover {
  border-color: #1B5E20;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.store-card {
  background-color: #ffffff;
}

.store-card.expanded {
  background-color: #f5f5f5;
}

.store-main {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: all 300ms;
}

.store-main:hover {
  background-color: #fafafa;
}

.store-expand-icon {
  font-size: 20px;
  margin-right: 12px;
  min-width: 24px;
  text-align: center;
}

.store-info {
  flex: 1;
  margin-right: 16px;
}

.store-name {
  font-size: 16px;
  font-weight: 600;
  color: #212121;
  margin: 0 0 8px 0;
}

.store-address {
  font-size: 14px;
  color: #757575;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.store-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 12px;
  color: #212121;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.store-actions {
  display: flex;
  gap: 8px;
}

.btn-edit, .btn-delete {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 300ms;
  font-weight: 500;
}

.btn-edit {
  background-color: #2196F3;
  color: #ffffff;
}

.btn-edit:hover {
  opacity: 0.9;
}

.btn-delete {
  background-color: #F44336;
  color: #ffffff;
}

.btn-delete:hover {
  opacity: 0.9;
}

/* 杆柜列表样式 */
.store-lockers {
  border-top: 1px solid #e0e0e0;
  background-color: #ffffff;
  padding: 16px;
}

.lockers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.lockers-title {
  font-size: 14px;
  font-weight: 600;
  color: #212121;
}

.btn-add-locker {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #4CAF50;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 300ms;
  font-weight: 500;
}

.btn-add-locker:hover {
  opacity: 0.9;
}

.lockers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.empty-lockers {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: #757575;
  text-align: center;
}

.empty-lockers .empty-text {
  margin-bottom: 16px;
  font-size: 14px;
}

.btn-add-first-locker {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 300ms;
  font-weight: 500;
}

.btn-add-first-locker:hover {
  opacity: 0.9;
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
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
      
      &.danger {
        background-color: var(--error-color);
        border-color: var(--error-color);
        color: #fff;
        
        &:hover {
          opacity: 0.9;
          background-color: #d32f2f;
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
    padding: var(--spacing-xxl);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
    
    .form-item {
      margin-bottom: var(--spacing-xxl);
      position: relative;
      
      .form-label {
        display: block;
        font-size: var(--font-size-md);
        color: var(--text-primary);
        margin-bottom: var(--spacing-md);
        font-weight: 600;
        position: relative;
        z-index: 2;
        background-color: transparent;
        letter-spacing: 0.3px;
        
        &::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 28px;
          height: 3px;
          background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
          border-radius: 1.5px;
          opacity: 0.8;
        }
      }
      
      .form-input {
        width: 100%;
        padding: var(--spacing-lg) var(--spacing-md);
        background-color: var(--bg-color-white);
        border: 2px solid #e2e8f0;
        border-radius: var(--border-radius-lg);
        font-size: var(--font-size-md);
        color: var(--text-primary);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        position: relative;
        
        &:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(27, 94, 32, 0.12), 0 4px 14px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
          background-color: #fefffe;
        }
        
        &:hover:not(:focus):not(:disabled) {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        &:disabled {
          background-color: #f8fafc;
          color: var(--text-disabled);
          cursor: not-allowed;
          opacity: 0.6;
          border-color: #e2e8f0;
        }
        
        &::placeholder {
          color: #94a3b8;
          font-size: var(--font-size-sm);
          font-style: italic;
          transition: color 0.3s ease;
        }
        
        &:focus::placeholder {
          color: #cbd5e1;
        }
        
        .iconfont {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }
      }
      
      select.form-input {
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right var(--spacing-md) center;
        background-repeat: no-repeat;
        background-size: 16px;
        padding-right: calc(var(--spacing-md) + 24px);
        
        &:focus {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%231B5E20' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        }
      }
      
      .form-textarea {
        width: 100%;
        min-height: 100px;
        padding: var(--spacing-lg) var(--spacing-md);
        background-color: var(--bg-color-white);
        border: 2px solid #e2e8f0;
        border-radius: var(--border-radius-lg);
        font-size: var(--font-size-md);
        color: var(--text-primary);
        resize: vertical;
        font-family: inherit;
        line-height: 1.6;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        
        &:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(27, 94, 32, 0.12), 0 4px 14px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
          background-color: #fefffe;
        }
        
        &:hover:not(:focus) {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        &::placeholder {
          color: #94a3b8;
          font-size: var(--font-size-sm);
          font-style: italic;
          line-height: 1.5;
        }
        
        &:focus::placeholder {
          color: #cbd5e1;
        }
      }
    }
  }
  
  .form-actions {
    display: flex;
    gap: var(--spacing-lg);
    padding: var(--spacing-xxl);
    border-top: 1px solid #e2e8f0;
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%);
    
    button {
      flex: 1;
      padding: var(--spacing-lg) var(--spacing-xl);
      border: 2px solid transparent;
      border-radius: var(--border-radius-lg);
      font-size: var(--font-size-md);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      letter-spacing: 0.3px;
      text-transform: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      
      &.btn-cancel {
        background-color: var(--bg-color-white);
        border-color: #d1d5db;
        color: var(--text-primary);
        
        &:hover {
          background-color: #f9fafb;
          border-color: #9ca3af;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
        }
        
        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }
      }
      
      &.btn-confirm {
        background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
        color: #fff;
        border-color: var(--primary-color);
        
        &:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(27, 94, 32, 0.3);
        }
        
        &:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(27, 94, 32, 0.2);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #d1d5db;
          border-color: #d1d5db;
          transform: none;
          box-shadow: none;
        }
      }
    }
  }
}
</style>