<template>
  <div class="locker-detail-container">
    <div class="page-header">
      <button class="btn-back" @click="goBack">← 返回列表</button>
      <div class="title">杆柜详情</div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{{ error }}</div>
      <button class="btn btn-primary" @click="goBack">返回列表</button>
    </div>
    
    <!-- 正常显示 -->
    <div v-else-if="lockerInfo" class="detail-content">
      <div class="info-section">
        <div class="section-title">基本信息</div>
        <div class="info-item">
          <span class="label">杆柜编号:</span>
          <span class="value">{{ lockerInfo.number }}</span>
        </div>
        <div class="info-item">
          <span class="label">所属门店:</span>
          <span class="value">{{ lockerInfo.store?.name || '未知门店' }}</span>
        </div>
        <div class="info-item">
          <span class="label">状态:</span>
          <span class="value" :class="statusClass">{{ statusText }}</span>
        </div>
        <div class="info-item">
          <span class="label">创建时间:</span>
          <span class="value">{{ formatDate(lockerInfo.created_at) }}</span>
        </div>
      </div>
      
      <div class="info-section" v-if="lockerInfo.current_user_id">
        <div class="section-title">使用信息</div>
        <div class="info-item">
          <span class="label">用户ID:</span>
          <span class="value">{{ lockerInfo.current_user_id }}</span>
        </div>
        <div class="info-item">
          <span class="label">分配时间:</span>
          <span class="value">{{ formatDate(lockerInfo.assigned_at) }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="lockerInfo && !loading && !error" class="action-buttons">
      <button class="btn btn-secondary" @click="handleViewHistory">查看历史</button>
      <button class="btn btn-primary" @click="goBack">返回列表</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../../services/api'

// 路由相关
const route = useRoute()
const router = useRouter()

// 响应式数据
const lockerInfo = ref(null)
const loading = ref(true)
const error = ref('')

// 计算属性
const statusText = computed(() => {
  if (!lockerInfo.value) return ''
  const statusMap = {
    available: '空闲',
    occupied: '使用中',
    maintenance: '维护中'
  }
  return statusMap[lockerInfo.value.status] || '未知'
})

const statusClass = computed(() => {
  if (!lockerInfo.value) return ''
  return `status-${lockerInfo.value.status}`
})

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '未知'
  try {
    return new Date(dateString).toLocaleString('zh-CN')
  } catch {
    return '格式错误'
  }
}

// 获取杆柜详情
const fetchLockerDetail = async () => {
  const lockerId = route.query.id as string
  
  if (!lockerId) {
    error.value = '缺少杆柜ID参数'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = ''
    
    // 这里需要调用获取单个杆柜的API
    // 由于目前API可能没有单独的获取杆柜详情接口，我们先用获取门店杆柜的方式
    const response = await adminApi.getStoresLockers()
    
    // 从所有杆柜中找到目标杆柜
    let targetLocker = null
    if (response.data && response.data.stores) {
      for (const store of response.data.stores) {
        if (store.lockers) {
          targetLocker = store.lockers.find(locker => locker.id === lockerId)
          if (targetLocker) {
            // 添加门店信息
            targetLocker.store = { name: store.name }
            break
          }
        }
      }
    }

    if (targetLocker) {
      lockerInfo.value = targetLocker
    } else {
      error.value = '杆柜不存在或已被删除'
    }
  } catch (err: any) {
    console.error('获取杆柜详情失败:', err)
    error.value = err?.message || '获取杆柜详情失败'
  } finally {
    loading.value = false
  }
}

// 返回列表页面
const goBack = () => {
  router.push('/lockers')
}

// 查看历史记录
const handleViewHistory = () => {
  if (lockerInfo.value) {
    router.push(`/records?lockerId=${lockerInfo.value.id}`)
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchLockerDetail()
})
</script>

<style scoped>
.locker-detail-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.btn-back {
  padding: 8px 16px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background-color: #555;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1B5E20;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-message {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

.detail-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.info-section {
  margin-bottom: 30px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  border-bottom: 2px solid #1B5E20;
  padding-bottom: 5px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-weight: bold;
}

.status-available {
  color: #4CAF50;
}

.status-occupied {
  color: #FF9800;
}

.status-maintenance {
  color: #F44336;
}

.action-buttons {
  display: flex;
  gap: 15px;
}

.btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.btn-primary {
  background-color: #1B5E20;
  color: white;
}

.btn-secondary {
  background-color: #666;
  color: white;
}
</style>