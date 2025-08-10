<template>
  <div class="applications-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-title">
        <span class="title">申请审核</span>
        <span class="subtitle">{{ pendingCount }} 个待审核</span>
      </div>
      <div class="header-actions">
        <button class="btn-refresh" @click="refreshList">
          <span class="iconfont icon-refresh"></span>
          刷新
        </button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-item">
        <select class="filter-select" v-model="filterStatus" @change="refreshList">
          <option v-for="(option, index) in statusOptions" :key="index" :value="index">
            状态：{{ option }}
          </option>
        </select>
      </div>
      <div class="filter-item">
        <select class="filter-select" v-model="filterStore" @change="refreshList">
          <option value="-1">门店：全部门店</option>
          <option v-for="(store, index) in storeOptions" :key="store.id" :value="index">
            门店：{{ store.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 申请列表 -->
    <div class="applications-list">
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
      
      <div v-else-if="applications.length === 0" class="empty-container">
        <div class="empty-icon">📋</div>
        <span class="empty-text">暂无申请记录</span>
      </div>

      <div v-else>
        <div v-for="app in applications" :key="app.id" class="application-card" :class="{ 'selected': selectedIds.has(app.id) }" @click="goToDetail(app.id)">
          <!-- 选择框 -->
          <div v-if="app.status === 'pending'" class="select-checkbox" @click.stop="toggleSelect(app.id)">
            <div class="checkbox" :class="{ 'checked': selectedIds.has(app.id) }">
              <span v-if="selectedIds.has(app.id)" class="iconfont icon-check"></span>
            </div>
          </div>
          <!-- 申请信息 -->
          <div class="card-header">
            <div class="user-info">
              <div class="user-avatar-placeholder">👤</div>
              <div class="user-detail">
                <span class="user-name">{{ app.user.name }}</span>
                <span class="user-phone">{{ app.user.phone }}</span>
              </div>
            </div>
            <div class="status-badge" :class="`status-${app.status}`">
              {{ getStatusText(app.status) }}
            </div>
          </div>

          <!-- 杆柜信息 -->
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">申请门店：</span>
              <span class="info-value">{{ app.store.name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">杆柜编号：</span>
              <span class="info-value">{{ app.locker.number }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">申请时间：</span>
              <span class="info-value">{{ formatDate(app.created_at) }}</span>
            </div>
            <div v-if="app.remark" class="info-row">
              <span class="info-label">备注信息：</span>
              <span class="info-value">{{ app.remark }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div v-if="app.status === 'pending'" class="card-actions">
            <button class="btn-reject" @click.stop="handleReject(app)">
              拒绝
            </button>
            <button class="btn-approve" @click.stop="handleApprove(app)">
              通过
            </button>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore && !loading" class="load-more" @click="loadMore">
        <span>加载更多</span>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectedCount > 0" class="batch-actions">
      <div class="batch-info">
        <span>已选择 {{ selectedCount }} 项</span>
      </div>
      <div class="batch-buttons">
        <button class="btn-batch-reject" @click="batchReject">批量拒绝</button>
        <button class="btn-batch-approve" @click="batchApprove">批量通过</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '../../stores/admin'
import { adminApi } from '../../services/api'
import { formatDate } from '../../utils'

interface Application {
  id: string
  user: {
    id: string
    name: string
    phone: string
    avatar: string
  }
  store: {
    id: string
    name: string
  }
  locker: {
    id: string
    number: string
  }
  status: 'pending' | 'approved' | 'rejected'
  remark: string
  created_at: string
  approved_at?: string
  approved_by?: string
}

const adminStore = useAdminStore()
const router = useRouter()

// 简单的提示函数
const showToast = (message: string) => {
  alert(message)
}

const showModal = (options: { title: string; content: string; showCancel?: boolean }) => {
  return Promise.resolve({ 
    confirm: confirm(`${options.title}\n${options.content}`) 
  })
}

// 状态变量
const applications = ref<Application[]>([])
const loading = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 20

// 筛选条件
const filterStatus = ref(0)
const filterStore = ref(-1)
const statusOptions = ['全部状态', '待审核', '已通过', '已拒绝']
const storeOptions = ref<Array<{id: string, name: string}>>([])

// 批量选择
const selectedIds = ref<Set<string>>(new Set())
const selectedCount = computed(() => selectedIds.value.size)

// 待审核数量
const pendingCount = computed(() => {
  return applications.value.filter(app => app.status === 'pending').length
})

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return statusMap[status] || status
}

// 获取申请列表
const getApplications = async (isRefresh = false) => {
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
      adminId: adminStore.adminInfo?.id
    }
    
    if (filterStatus.value > 0) {
      const statusMap = ['', 'pending', 'approved', 'rejected']
      params.status = statusMap[filterStatus.value]
    }
    
    if (filterStore.value >= 0 && storeOptions.value[filterStore.value]) {
      params.storeId = storeOptions.value[filterStore.value].id
    }
    
    const response = await adminApi.getApplications(params)
    
    if (isRefresh) {
      applications.value = response.data || []
    } else {
      const newData = response.data || []
      if (newData.length > 0) {
        applications.value = [...applications.value, ...newData]
      }
    }
    
    hasMore.value = response.data && response.data.length === pageSize
    page.value++
    
  } catch (error) {
    console.error('获取申请列表失败:', error)
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

// 清除选择并刷新列表
const clearSelectionAndRefresh = () => {
  selectedIds.value.clear()
  refreshList()
}

// 刷新列表
const refreshList = () => {
  getApplications(true)
}

// 下拉刷新
const onPullDownRefresh = () => {
  refreshing.value = true
  refreshList()
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return
  getApplications()
}

// 跳转详情
const goToDetail = (id: string) => {
  if (selectedCount.value > 0) {
    toggleSelect(id)
    return
  }
  
  router.push(`/applications/detail?id=${id}`)
}

// 切换选中状态
const toggleSelect = (id: string) => {
  const app = applications.value.find(a => a.id === id)
  if (!app || app.status !== 'pending') return
  
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

// 审核通过
const handleApprove = async (app: Application) => {
  const result = await showModal({
    title: '确认通过',
    content: `确定通过 ${app.user.name} 的杆柜申请吗？`
  })
  
  if (result.confirm) {
    try {
      await adminApi.approveApplication({
        application_id: app.id,
        action: 'approve',
        admin_id: adminStore.adminInfo?.id
      })
      
      showToast('审核通过')
      app.status = 'approved'
    } catch (error) {
      console.error('审核失败:', error)
      showToast('操作失败')
    }
  }
}

// 审核拒绝
const handleReject = async (app: Application) => {
  const confirmResult = await showModal({
    title: '确认拒绝',
    content: `确定拒绝 ${app.user.name} 的杆柜申请吗？`,
    showCancel: true
  })
  
  if (confirmResult.confirm) {
    const reason = '不符合申请条件'
    try {
      await adminApi.approveApplication({
        application_id: app.id,
        action: 'reject',
        rejection_reason: reason,
        admin_id: adminStore.adminInfo?.id
      })
      
      showToast('已拒绝')
      app.status = 'rejected'
    } catch (error) {
      console.error('审核失败:', error)
      showToast('操作失败')
    }
  }
}

// 批量通过
const batchApprove = async () => {
  if (selectedIds.value.size === 0) {
    showToast('请选择要审核的申请')
    return
  }
  
  const result = await showModal({
    title: '批量通过',
    content: `确定要通过选中的 ${selectedIds.value.size} 个申请吗？`
  })
  
  if (result.confirm) {
    loading.value = true
    let successCount = 0
    let failCount = 0
    
    try {
      const promises = Array.from(selectedIds.value).map(async (id) => {
        try {
          await adminApi.approveApplication({
            application_id: id,
            action: 'approve',
            admin_id: adminStore.adminInfo?.id
          })
          
          const app = applications.value.find(a => a.id === id)
          if (app) {
            app.status = 'approved'
          }
          successCount++
        } catch (error) {
          console.error(`审核申请 ${id} 失败:`, error)
          failCount++
        }
      })
      
      await Promise.all(promises)
      
      loading.value = false
      
      if (failCount === 0) {
        showToast(`成功通过 ${successCount} 个申请`)
      } else {
        showToast(`成功: ${successCount} 个, 失败: ${failCount} 个`)
      }
      
      selectedIds.value.clear()
      refreshList()
      
    } catch (error) {
      loading.value = false
      console.error('批量审核失败:', error)
      showToast('批量审核失败')
    }
  }
}

// 批量拒绝
const batchReject = async () => {
  if (selectedIds.value.size === 0) {
    showToast('请选择要拒绝的申请')
    return
  }
  
  const result = await showModal({
    title: '批量拒绝',
    content: `确定要拒绝选中的 ${selectedIds.value.size} 个申请吗？`,
    showCancel: true
  })
  
  if (result.confirm) {
    const reason = '不符合申请条件'
    
    loading.value = true
    let successCount = 0
    let failCount = 0
    
    try {
      const promises = Array.from(selectedIds.value).map(async (id) => {
        try {
          await adminApi.approveApplication({
            application_id: id,
            action: 'reject',
            rejection_reason: reason,
            admin_id: adminStore.adminInfo?.id
          })
          
          const app = applications.value.find(a => a.id === id)
          if (app) {
            app.status = 'rejected'
          }
          successCount++
        } catch (error) {
          console.error(`拒绝申请 ${id} 失赅:`, error)
          failCount++
        }
      })
      
      await Promise.all(promises)
      
      loading.value = false
      
      if (failCount === 0) {
        showToast(`成功拒绝 ${successCount} 个申请`)
      } else {
        showToast(`成功: ${successCount} 个, 失败: ${failCount} 个`)
      }
      
      selectedIds.value.clear()
      refreshList()
      
    } catch (error) {
      loading.value = false
      console.error('批量拒绝失败:', error)
      showToast('批量拒绝失败')
    }
  }
}

// 初始化
onMounted(() => {
  getStores()
  getApplications(true)
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.applications-page {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
}

.page-header .title {
  font-size: 36px;
  font-weight: bold;
  color: var(--text-primary);
  margin-right: 20px;
}

.page-header .subtitle {
  font-size: 28px;
  color: var(--text-secondary);
}

.page-header .btn-refresh {
  padding: 16px 32px;
  background-color: var(--primary-color);
  color: #fff;
  border-radius: 8px;
  font-size: 28px;
}

.page-header .btn-refresh .iconfont {
  margin-right: 8px;
}

.filter-bar {
  display: flex;
  padding: 20px 30px;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
}

.filter-bar .filter-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  margin-right: 20px;
  background-color: var(--bg-color);
  border-radius: 8px;
  font-size: 28px;
  color: var(--text-primary);
}

.filter-bar .filter-item:last-child {
  margin-right: 0;
}

.filter-bar .filter-item .iconfont {
  font-size: 24px;
  color: var(--text-secondary);
}

.applications-list {
  height: calc(100vh - 280px);
  padding: 20px;
}

.application-card {
  position: relative;
  background-color: #fff;
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.application-card.selected {
  background-color: #f0f9ff;
  border: 2px solid var(--primary-color);
}

.select-checkbox {
  position: absolute;
  top: 30px;
  left: 30px;
  padding: 10px;
}

.select-checkbox .checkbox {
  width: 40px;
  height: 40px;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  transition: all 0.3s ease;
}

.select-checkbox .checkbox.checked {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.select-checkbox .checkbox.checked .iconfont {
  color: #fff;
  font-size: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  margin-left: 60px;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
  background-color: var(--bg-color-grey);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 32px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.user-phone {
  font-size: 26px;
  color: var(--text-secondary);
}

.status-badge {
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 24px;
}

.status-badge.status-pending {
  background-color: #FFF3CD;
  color: #856404;
}

.status-badge.status-approved {
  background-color: #D4EDDA;
  color: #155724;
}

.status-badge.status-rejected {
  background-color: #F8D7DA;
  color: #721C24;
}

.info-row {
  display: flex;
  margin-bottom: 16px;
}

.info-label {
  width: 160px;
  font-size: 28px;
  color: var(--text-secondary);
}

.info-value {
  flex: 1;
  font-size: 28px;
  color: var(--text-primary);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.card-actions button {
  padding: 16px 40px;
  border-radius: 8px;
  font-size: 28px;
  margin-left: 20px;
}

.btn-reject {
  background-color: #fff;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
}

.btn-approve {
  background-color: var(--success-color);
  color: #fff;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 32px;
  color: var(--text-secondary);
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 100px 0;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 28px;
  color: var(--text-secondary);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.load-more {
  text-align: center;
  padding: 30px;
  font-size: 28px;
  color: var(--text-secondary);
}

.batch-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background-color: #fff;
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.batch-info {
  font-size: 28px;
  color: var(--text-primary);
}

.batch-buttons {
  display: flex;
}

.batch-buttons button {
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 28px;
  margin-left: 20px;
}

.btn-batch-reject {
  background-color: #fff;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
}

.btn-batch-approve {
  background-color: var(--success-color);
  color: #fff;
}
</style>