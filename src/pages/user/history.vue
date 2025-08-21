<template>
  <div class="history-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="back-btn" @click="goBack">
        <span class="iconfont icon-back"></span>
      </div>
      <h1 class="page-title">历史记录</h1>
    </div>

    <!-- Tab切换 -->
    <div class="tab-container">
      <div 
        v-for="tab in tabs" 
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="historyList.length === 0" class="empty-container">
        <div class="empty-icon">📋</div>
        <p class="empty-text">暂无{{ currentTabLabel }}记录</p>
      </div>

      <!-- 列表内容 -->
      <div v-else class="history-list">
        <!-- 申请记录 -->
        <div v-if="currentTab === 'applications'" 
             v-for="item in historyList" 
             :key="item.id"
             class="history-item application-item">
          <div class="item-header">
            <span class="item-title">{{ item.store_name }}</span>
            <span class="item-status" :class="`status-${item.status}`">
              {{ getStatusText(item.status) }}
            </span>
          </div>
          <div class="item-body">
            <div class="info-row">
              <span class="label">杆柜编号：</span>
              <span class="value">{{ item.locker_number }}</span>
            </div>
            <div class="info-row">
              <span class="label">申请时间：</span>
              <span class="value">{{ formatDate(item.created_at) }}</span>
            </div>
            <div v-if="item.approved_at" class="info-row">
              <span class="label">审核时间：</span>
              <span class="value">{{ formatDate(item.approved_at) }}</span>
            </div>
            <div v-if="item.rejection_reason" class="info-row">
              <span class="label">拒绝原因：</span>
              <span class="value">{{ item.rejection_reason }}</span>
            </div>
          </div>
        </div>

        <!-- 操作记录 -->
        <div v-if="currentTab === 'operations'" 
             v-for="item in historyList" 
             :key="item.id"
             class="history-item operation-item">
          <div class="item-header">
            <span class="item-title">
              {{ item.operation_type === 'store' ? '存杆' : '取杆' }}
            </span>
            <span class="item-time">{{ formatDate(item.created_at) }}</span>
          </div>
          <div class="item-body">
            <div class="info-row">
              <span class="label">门店：</span>
              <span class="value">{{ item.store_name }}</span>
            </div>
            <div class="info-row">
              <span class="label">杆柜：</span>
              <span class="value">{{ item.locker_number }}</span>
            </div>
            <div v-if="item.notes" class="info-row">
              <span class="label">备注：</span>
              <span class="value">{{ item.notes }}</span>
            </div>
          </div>
        </div>

        <!-- 凭证记录 -->
        <div v-if="currentTab === 'vouchers'" 
             v-for="item in historyList" 
             :key="item.id"
             class="history-item voucher-item">
          <div class="item-header">
            <span class="item-title">操作凭证</span>
            <span class="item-status" :class="`status-${item.status}`">
              {{ getVoucherStatusText(item.status) }}
            </span>
          </div>
          <div class="item-body">
            <div class="info-row">
              <span class="label">凭证码：</span>
              <span class="value code">{{ item.code }}</span>
            </div>
            <div class="info-row">
              <span class="label">操作类型：</span>
              <span class="value">{{ item.operation_type === 'store' ? '存杆' : '取杆' }}</span>
            </div>
            <div class="info-row">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatDate(item.created_at) }}</span>
            </div>
            <div v-if="item.used_at" class="info-row">
              <span class="label">使用时间：</span>
              <span class="value">{{ formatDate(item.used_at) }}</span>
            </div>
            <div v-if="item.expired_at" class="info-row">
              <span class="label">过期时间：</span>
              <span class="value">{{ formatDate(item.expired_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore && !loading" class="load-more" @click="loadMore">
        <span>加载更多</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { userApi } from '../../services/api/user-vue'

interface HistoryItem {
  id: string
  [key: string]: any
}

interface Tab {
  label: string
  value: string
  count: number
}

const router = useRouter()
const authStore = useAuthStore()

// 状态变量
const loading = ref(false)
const currentTab = ref('applications')
const historyList = ref<HistoryItem[]>([])
const page = ref(1)
const pageSize = 20
const hasMore = ref(true)

// Tab配置
const tabs = ref<Tab[]>([
  { label: '申请记录', value: 'applications', count: 0 },
  { label: '操作记录', value: 'operations', count: 0 },
  { label: '凭证记录', value: 'vouchers', count: 0 }
])

// 当前Tab标签
const currentTabLabel = computed(() => {
  const tab = tabs.value.find(t => t.value === currentTab.value)
  return tab ? tab.label : ''
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

// 获取凭证状态文本
const getVoucherStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待使用',
    used: '已使用',
    expired: '已过期'
  }
  return statusMap[status] || status
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 获取历史记录
const getHistory = async (isRefresh = false) => {
  if (loading.value) return
  
  if (isRefresh) {
    page.value = 1
    hasMore.value = true
    historyList.value = []
  }
  
  loading.value = true
  
  try {
    const response = await userApi.getUserHistory({
      user_id: authStore.userInfo?.id || '',
      type: currentTab.value as 'applications' | 'operations' | 'vouchers',
      page: page.value,
      limit: pageSize
    })
    
    if (response.success && response.data) {
      const newData = response.data.items || []
      
      if (isRefresh) {
        historyList.value = newData
      } else {
        historyList.value = [...historyList.value, ...newData]
      }
      
      // 更新总数
      const currentTabObj = tabs.value.find(t => t.value === currentTab.value)
      if (currentTabObj) {
        currentTabObj.count = response.data.total || 0
      }
      
      // 判断是否还有更多
      hasMore.value = newData.length === pageSize
      page.value++
    }
  } catch (error) {
    console.error('获取历史记录失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换Tab
const switchTab = (tabValue: string) => {
  if (currentTab.value === tabValue) return
  currentTab.value = tabValue
  getHistory(true)
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value) return
  getHistory()
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  getHistory(true)
})
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background-color: #f5f6f7;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 30px;
  background-color: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.back-btn {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  cursor: pointer;
}

.back-btn .iconfont {
  font-size: 36px;
  color: #333;
}

.page-title {
  font-size: 36px;
  font-weight: bold;
  color: #333;
}

.tab-container {
  display: flex;
  background-color: #fff;
  padding: 0 30px;
  border-bottom: 1px solid #e5e5e5;
}

.tab-item {
  flex: 1;
  padding: 25px 10px;
  text-align: center;
  font-size: 30px;
  color: #666;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.tab-item.active {
  color: #007aff;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background-color: #007aff;
}

.tab-count {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background-color: #f0f0f0;
  border-radius: 10px;
  font-size: 24px;
  min-width: 40px;
}

.tab-item.active .tab-count {
  background-color: #e6f2ff;
  color: #007aff;
}

.content-container {
  flex: 1;
  padding: 20px;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 30px;
  color: #999;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.history-item {
  background-color: #fff;
  border-radius: 16px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.item-title {
  font-size: 32px;
  font-weight: 500;
  color: #333;
}

.item-status {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 26px;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-approved,
.status-used {
  background-color: #d4edda;
  color: #155724;
}

.status-rejected,
.status-expired {
  background-color: #f8d7da;
  color: #721c24;
}

.item-time {
  font-size: 26px;
  color: #999;
}

.item-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  font-size: 28px;
}

.info-row .label {
  color: #999;
  margin-right: 10px;
  min-width: 140px;
}

.info-row .value {
  color: #333;
  flex: 1;
}

.info-row .value.code {
  font-family: monospace;
  font-weight: 500;
  color: #007aff;
}

.load-more {
  text-align: center;
  padding: 30px;
  font-size: 28px;
  color: #666;
  cursor: pointer;
}

.load-more:active {
  opacity: 0.7;
}
</style>