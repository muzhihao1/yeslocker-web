<template>
  <div class="dashboard-enhanced">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1 class="page-title">数据仪表板</h1>
        <p class="welcome-text">
          欢迎回来，{{ adminStore.adminInfo?.name }}
          <span class="role-badge" :class="getRoleBadgeClass">
            {{ getRoleText }}
          </span>
        </p>
      </div>
      <div class="header-right">
        <div class="period-selector">
          <button 
            v-for="p in periods" 
            :key="p.value"
            :class="['period-btn', { active: period === p.value }]"
            @click="changePeriod(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <button class="btn-refresh" @click="refreshData">
          <span class="iconfont icon-refresh"></span>
          刷新
        </button>
        <button class="btn-export" @click="showExportModal">
          <span class="iconfont icon-export"></span>
          导出
        </button>
      </div>
    </div>

    <!-- Store Filter (for non-store admins) -->
    <div v-if="canFilterByStore" class="store-filter">
      <label>选择门店：</label>
      <select v-model="selectedStoreId" @change="handleStoreChange">
        <option value="">全部门店</option>
        <option v-for="store in stores" :key="store.id" :value="store.id">
          {{ store.name }}
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载统计数据中...</p>
    </div>

    <!-- Main Content -->
    <div v-else class="dashboard-content">
      <!-- Overview Cards -->
      <div class="overview-section">
        <div class="stat-card users">
          <div class="card-icon">👥</div>
          <div class="card-content">
            <div class="card-value">{{ formatNumber(statistics.overview.users.active) }}</div>
            <div class="card-label">活跃用户</div>
            <div class="card-trend" :class="getTrendClass(statistics.overview.users.growth)">
              <span class="trend-icon">{{ getTrendIcon(statistics.overview.users.growth) }}</span>
              <span class="trend-value">{{ Math.abs(statistics.overview.users.growth) }}%</span>
            </div>
          </div>
        </div>

        <div class="stat-card lockers">
          <div class="card-icon">🗄️</div>
          <div class="card-content">
            <div class="card-value">{{ statistics.overview.lockers.occupancy_rate }}%</div>
            <div class="card-label">杆柜使用率</div>
            <div class="card-detail">
              {{ statistics.overview.lockers.occupied }} / {{ statistics.overview.lockers.total }}
            </div>
          </div>
        </div>

        <div class="stat-card applications">
          <div class="card-icon">📋</div>
          <div class="card-content">
            <div class="card-value">{{ statistics.overview.applications.pending }}</div>
            <div class="card-label">待审批申请</div>
            <div class="card-detail">今日 {{ statistics.overview.applications.today }} 个</div>
          </div>
        </div>

        <div class="stat-card vouchers">
          <div class="card-icon">🎫</div>
          <div class="card-content">
            <div class="card-value">{{ statistics.overview.vouchers.active }}</div>
            <div class="card-label">有效凭证</div>
            <div class="card-detail">
              已使用 {{ statistics.overview.vouchers.used }} / {{ statistics.overview.vouchers.total }}
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <!-- Usage Trends Chart -->
        <div class="chart-container">
          <div class="chart-header">
            <h3>使用趋势</h3>
            <div class="chart-legend">
              <span class="legend-item checkin">
                <span class="legend-dot"></span>存入
              </span>
              <span class="legend-item checkout">
                <span class="legend-dot"></span>取出
              </span>
              <span class="legend-item users">
                <span class="legend-dot"></span>活跃用户
              </span>
            </div>
          </div>
          <div class="chart-body">
            <canvas ref="trendChart"></canvas>
          </div>
          <div class="chart-summary">
            <div class="summary-item">
              <span class="summary-label">总存入：</span>
              <span class="summary-value">{{ trendSummary.totalCheckIns }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总取出：</span>
              <span class="summary-value">{{ trendSummary.totalCheckOuts }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">日均用户：</span>
              <span class="summary-value">{{ trendSummary.averageDailyUsers }}</span>
            </div>
          </div>
        </div>

        <!-- Locker Distribution Chart -->
        <div class="chart-container">
          <div class="chart-header">
            <h3>杆柜状态分布</h3>
          </div>
          <div class="chart-body">
            <canvas ref="lockerChart"></canvas>
          </div>
          <div class="chart-stats">
            <div class="stat-row">
              <span class="stat-label available">可用</span>
              <span class="stat-value">{{ statistics.overview.lockers.available }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label occupied">使用中</span>
              <span class="stat-value">{{ statistics.overview.lockers.occupied }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label maintenance">维护中</span>
              <span class="stat-value">{{ statistics.overview.lockers.maintenance }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Stores Section (for super admin and HQ admin) -->
      <div v-if="showTopStores" class="top-stores-section">
        <div class="section-header">
          <h3>门店排行榜</h3>
          <span class="section-subtitle">按操作次数排序</span>
        </div>
        <div class="stores-table">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>门店名称</th>
                <th>杆柜总数</th>
                <th>使用率</th>
                <th>操作次数</th>
                <th>已批准申请</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(store, index) in statistics.topStores" :key="store.id">
                <td class="rank">
                  <span :class="['rank-badge', getRankClass(index)]">
                    {{ index + 1 }}
                  </span>
                </td>
                <td>
                  <div class="store-name">{{ store.name }}</div>
                  <div class="store-address">{{ store.address }}</div>
                </td>
                <td>{{ store.totalLockers }}</td>
                <td>
                  <div class="usage-rate">
                    <div class="rate-bar">
                      <div 
                        class="rate-fill" 
                        :style="{ width: getUsageRate(store) + '%' }"
                      ></div>
                    </div>
                    <span class="rate-text">{{ getUsageRate(store) }}%</span>
                  </div>
                </td>
                <td>{{ store.totalOperations }}</td>
                <td>{{ store.approvedApplications }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="activities-section">
        <div class="section-header">
          <h3>最近活动</h3>
          <button class="btn-view-all" @click="viewAllActivities">
            查看全部 <span class="iconfont icon-arrow-right"></span>
          </button>
        </div>
        <div class="activities-list">
          <div 
            v-for="activity in statistics.recentActivities" 
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon" :class="getActivityIconClass(activity.type)">
              {{ getActivityIcon(activity.type) }}
            </div>
            <div class="activity-content">
              <div class="activity-title">
                {{ getActivityTitle(activity) }}
              </div>
              <div class="activity-meta">
                <span class="meta-user">{{ activity.userName }}</span>
                <span class="meta-store">{{ activity.storeName }}</span>
                <span class="meta-time">{{ formatTime(activity.createdAt) }}</span>
              </div>
            </div>
            <div class="activity-status" :class="`status-${activity.status}`">
              {{ getStatusText(activity.status) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="metrics-section">
        <h3>关键指标</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-content">
              <div class="metric-value">{{ performanceMetrics.utilizationRate }}%</div>
              <div class="metric-label">资源利用率</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-content">
              <div class="metric-value">{{ performanceMetrics.conversionRate }}%</div>
              <div class="metric-label">转化率</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">✅</div>
            <div class="metric-content">
              <div class="metric-value">{{ performanceMetrics.voucherUsageRate }}%</div>
              <div class="metric-label">凭证使用率</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <Teleport to="body">
      <div v-if="isExportModalOpen" class="modal-overlay" @click.self="closeExportModal">
        <div class="export-modal">
          <div class="modal-header">
            <h3>导出数据</h3>
            <span class="iconfont icon-close" @click="closeExportModal"></span>
          </div>
          <div class="modal-body">
            <div class="export-option">
              <label>数据类型：</label>
              <select v-model="exportOptions.type">
                <option value="overview">概览数据</option>
                <option value="trends">趋势数据</option>
                <option value="stores">门店数据</option>
                <option value="users">用户数据</option>
              </select>
            </div>
            <div class="export-option">
              <label>导出格式：</label>
              <div class="format-buttons">
                <button 
                  :class="['format-btn', { active: exportOptions.format === 'csv' }]"
                  @click="exportOptions.format = 'csv'"
                >
                  CSV
                </button>
                <button 
                  :class="['format-btn', { active: exportOptions.format === 'excel' }]"
                  @click="exportOptions.format = 'excel'"
                >
                  Excel
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeExportModal">取消</button>
            <button class="btn-confirm" @click="confirmExport">导出</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import statisticsService, { type StatisticsResponse } from '@/services/statistics'
import storeService from '@/services/stores'
import { showToast } from '@/utils'
import Chart from 'chart.js/auto'

const router = useRouter()
const adminStore = useAdminStore()

// Refs
const trendChart = ref<HTMLCanvasElement>()
const lockerChart = ref<HTMLCanvasElement>()

// State
const loading = ref(false)
const period = ref<'7d' | '30d' | '90d' | '1y'>('7d')
const selectedStoreId = ref('')
const stores = ref<any[]>([])
const statistics = ref<StatisticsResponse>({
  overview: {
    users: { active: 0, growth: 0 },
    lockers: { total: 0, occupied: 0, available: 0, maintenance: 0, occupancy_rate: 0 },
    applications: { pending: 0, today: 0 },
    vouchers: { total: 0, used: 0, active: 0 },
    stores: { total: 0 }
  },
  trends: [],
  topStores: [],
  recentActivities: [],
  period: '7d',
  role: adminStore.role || 'store_admin'
})

// Chart instances
let trendChartInstance: Chart | null = null
let lockerChartInstance: Chart | null = null

// Export modal
const isExportModalOpen = ref(false)
const exportOptions = ref({
  type: 'overview' as 'overview' | 'trends' | 'stores' | 'users',
  format: 'excel' as 'csv' | 'excel'
})

// Period options
const periods = [
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: '90d', label: '最近90天' },
  { value: '1y', label: '最近1年' }
]

// Computed
const canFilterByStore = computed(() => 
  adminStore.role !== 'store_admin'
)

const showTopStores = computed(() => 
  adminStore.role !== 'store_admin' && statistics.value.topStores.length > 0
)

const getRoleBadgeClass = computed(() => {
  const roleMap: Record<string, string> = {
    super_admin: 'super',
    hq_admin: 'hq',
    store_admin: 'store'
  }
  return roleMap[adminStore.role || 'store_admin']
})

const getRoleText = computed(() => {
  const roleMap: Record<string, string> = {
    super_admin: '超级管理员',
    hq_admin: '总部管理员',
    store_admin: '门店管理员'
  }
  return roleMap[adminStore.role || 'store_admin']
})

const trendSummary = computed(() => 
  statisticsService.getTrendSummary(statistics.value.trends)
)

const performanceMetrics = computed(() => 
  statisticsService.getPerformanceMetrics(statistics.value.overview)
)

// Methods
const formatNumber = (num: number) => {
  return statisticsService.formatNumber(num)
}

const getTrendClass = (growth: number) => {
  if (growth > 0) return 'positive'
  if (growth < 0) return 'negative'
  return 'neutral'
}

const getTrendIcon = (growth: number) => {
  if (growth > 0) return '↑'
  if (growth < 0) return '↓'
  return '→'
}

const getRankClass = (index: number) => {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

const getUsageRate = (store: any) => {
  if (!store.totalLockers) return 0
  return Math.round((store.occupiedLockers / store.totalLockers) * 100)
}

const getActivityIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    application: '📋',
    voucher: '🎫',
    locker: '🗄️',
    user: '👤'
  }
  return iconMap[type] || '📄'
}

const getActivityIconClass = (type: string) => {
  return `activity-${type}`
}

const getActivityTitle = (activity: any) => {
  const titleMap: Record<string, string> = {
    application: '新的申请',
    voucher: '凭证使用',
    locker: '杆柜操作',
    user: '用户活动'
  }
  return titleMap[activity.type] || '系统活动'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
    used: '已使用',
    expired: '已过期'
  }
  return statusMap[status] || status
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// Fetch data
const fetchStatistics = async () => {
  loading.value = true
  
  try {
    const params: any = { period: period.value }
    
    if (adminStore.role === 'store_admin') {
      params.store_id = adminStore.storeId
    } else if (selectedStoreId.value) {
      params.store_id = selectedStoreId.value
    }
    
    const response = await statisticsService.getStatistics(params)
    statistics.value = response.data
    
    // Update charts after data is loaded
    await nextTick()
    updateCharts()
  } catch (error) {
    console.error('Failed to fetch statistics:', error)
    showToast('获取统计数据失败')
  } finally {
    loading.value = false
  }
}

const fetchStores = async () => {
  if (adminStore.role === 'store_admin') return
  
  try {
    const response = await storeService.getStores()
    stores.value = response.data || []
  } catch (error) {
    console.error('Failed to fetch stores:', error)
  }
}

// Chart functions
const updateCharts = () => {
  updateTrendChart()
  updateLockerChart()
}

const updateTrendChart = () => {
  if (!trendChart.value) return
  
  if (trendChartInstance) {
    trendChartInstance.destroy()
  }
  
  const ctx = trendChart.value.getContext('2d')
  if (!ctx) return
  
  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: statistics.value.trends.map(t => 
        new Date(t.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: '存入',
          data: statistics.value.trends.map(t => t.checkIns),
          borderColor: '#52c41a',
          backgroundColor: 'rgba(82, 196, 26, 0.1)',
          tension: 0.4
        },
        {
          label: '取出',
          data: statistics.value.trends.map(t => t.checkOuts),
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          tension: 0.4
        },
        {
          label: '活跃用户',
          data: statistics.value.trends.map(t => t.uniqueUsers),
          borderColor: '#fa8c16',
          backgroundColor: 'rgba(250, 140, 22, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          position: 'left'
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  })
}

const updateLockerChart = () => {
  if (!lockerChart.value) return
  
  if (lockerChartInstance) {
    lockerChartInstance.destroy()
  }
  
  const ctx = lockerChart.value.getContext('2d')
  if (!ctx) return
  
  const { available, occupied, maintenance } = statistics.value.overview.lockers
  
  lockerChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['可用', '使用中', '维护中'],
      datasets: [{
        data: [available, occupied, maintenance],
        backgroundColor: ['#52c41a', '#1890ff', '#fa8c16'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  })
}

// Event handlers
const changePeriod = (newPeriod: typeof period.value) => {
  period.value = newPeriod
  fetchStatistics()
}

const handleStoreChange = () => {
  fetchStatistics()
}

const refreshData = () => {
  fetchStatistics()
}

const showExportModal = () => {
  isExportModalOpen.value = true
}

const closeExportModal = () => {
  isExportModalOpen.value = false
}

const confirmExport = async () => {
  try {
    await statisticsService.exportStatistics({
      type: exportOptions.value.type,
      format: exportOptions.value.format,
      period: period.value,
      store_id: selectedStoreId.value || undefined
    })
    
    showToast('数据导出成功')
    closeExportModal()
  } catch (error) {
    console.error('Export failed:', error)
    showToast('导出失败')
  }
}

const viewAllActivities = () => {
  router.push('/admin/logs')
}

// Lifecycle
onMounted(() => {
  fetchStores()
  fetchStatistics()
})

onUnmounted(() => {
  if (trendChartInstance) {
    trendChartInstance.destroy()
  }
  if (lockerChartInstance) {
    lockerChartInstance.destroy()
  }
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.dashboard-enhanced {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left .page-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.welcome-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 8px;
}

.role-badge.super {
  background: #f0f5ff;
  color: #1890ff;
}

.role-badge.hq {
  background: #fff7e6;
  color: #fa8c16;
}

.role-badge.store {
  background: #f6ffed;
  color: #52c41a;
}

.header-right {
  display: flex;
  gap: 15px;
  align-items: center;
}

.period-selector {
  display: flex;
  gap: 5px;
  background: var(--bg-color);
  padding: 4px;
  border-radius: 6px;
}

.period-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.period-btn.active {
  background: white;
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-refresh,
.btn-export {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: white;
  color: var(--text-primary);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-refresh:hover,
.btn-export:hover {
  background: var(--bg-color);
}

.store-filter {
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.store-filter label {
  font-size: 14px;
  color: var(--text-secondary);
}

.store-filter select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: white;
  border-radius: 8px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Overview Cards */
.overview-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
  border-radius: 12px;
}

.stat-card.users .card-icon {
  background: #f0f5ff;
}

.stat-card.lockers .card-icon {
  background: #f6ffed;
}

.stat-card.applications .card-icon {
  background: #fff7e6;
}

.stat-card.vouchers .card-icon {
  background: #fff1f0;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.card-detail {
  font-size: 12px;
  color: var(--text-tertiary);
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  margin-top: 4px;
}

.card-trend.positive {
  color: #52c41a;
}

.card-trend.negative {
  color: #f5222d;
}

.card-trend.neutral {
  color: var(--text-secondary);
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.chart-legend {
  display: flex;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.legend-item.checkin .legend-dot {
  background: #52c41a;
}

.legend-item.checkout .legend-dot {
  background: #1890ff;
}

.legend-item.users .legend-dot {
  background: #fa8c16;
}

.chart-body {
  height: 300px;
  position: relative;
}

.chart-summary {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.summary-item {
  text-align: center;
}

.summary-label {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.chart-stats {
  margin-top: 20px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  position: relative;
  padding-left: 20px;
}

.stat-label::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.stat-label.available::before {
  background: #52c41a;
}

.stat-label.occupied::before {
  background: #1890ff;
}

.stat-label.maintenance::before {
  background: #fa8c16;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Top Stores Section */
.top-stores-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.section-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
}

.stores-table {
  overflow-x: auto;
}

.stores-table table {
  width: 100%;
  border-collapse: collapse;
}

.stores-table th {
  text-align: left;
  padding: 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
}

.stores-table td {
  padding: 12px;
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-color);
}

.rank-badge.gold {
  background: #ffd700;
  color: white;
}

.rank-badge.silver {
  background: #c0c0c0;
  color: white;
}

.rank-badge.bronze {
  background: #cd7f32;
  color: white;
}

.store-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.store-address {
  font-size: 12px;
  color: var(--text-secondary);
}

.usage-rate {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rate-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-color);
  border-radius: 3px;
  overflow: hidden;
}

.rate-fill {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #1890ff);
  border-radius: 3px;
  transition: width 0.3s;
}

.rate-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 35px;
}

/* Activities Section */
.activities-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.activities-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-view-all {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-view-all:hover {
  opacity: 0.8;
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--bg-color);
  border-radius: 8px;
  transition: all 0.3s;
}

.activity-item:hover {
  background: #f5f5f5;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 20px;
}

.activity-icon.activity-application {
  background: #fff7e6;
}

.activity-icon.activity-voucher {
  background: #fff1f0;
}

.activity-icon.activity-locker {
  background: #f6ffed;
}

.activity-icon.activity-user {
  background: #f0f5ff;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.activity-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: var(--text-secondary);
}

.activity-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.activity-status.status-pending {
  background: #fff7e6;
  color: #fa8c16;
}

.activity-status.status-approved {
  background: #f6ffed;
  color: #52c41a;
}

.activity-status.status-rejected {
  background: #fff1f0;
  color: #f5222d;
}

.activity-status.status-used {
  background: #f0f5ff;
  color: #1890ff;
}

/* Metrics Section */
.metrics-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.metrics-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--bg-color);
  border-radius: 8px;
}

.metric-icon {
  font-size: 28px;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.metric-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Export Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-body {
  padding: 20px;
}

.export-option {
  margin-bottom: 20px;
}

.export-option label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.export-option select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
}

.format-buttons {
  display: flex;
  gap: 10px;
}

.format-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.format-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  background: var(--bg-color);
  color: var(--text-primary);
}

.btn-confirm {
  background: var(--primary-color);
  color: white;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .overview-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .header-right {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .period-selector {
    width: 100%;
    justify-content: space-between;
  }
  
  .overview-section {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .stores-table {
    font-size: 12px;
  }
  
  .stores-table th,
  .stores-table td {
    padding: 8px;
  }
}
</style>