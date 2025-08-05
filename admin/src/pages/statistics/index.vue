<template>
  <view class="statistics-page">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-title">
        <text class="title">数据统计</text>
        <text class="subtitle">实时业务数据分析</text>
      </view>
      <view class="header-actions">
        <button class="btn-export" @click="exportReport">
          <text class="iconfont icon-export"></text>
          导出报表
        </button>
      </view>
    </view>

    <!-- 时间筛选 -->
    <view class="time-filter">
      <scroll-view scroll-x class="filter-tabs">
        <view v-for="(item, index) in timeOptions" :key="index"
              class="filter-tab" 
              :class="{ active: currentTimeFilter === item.value }"
              @click="setTimeFilter(item.value)">
          {{ item.label }}
        </view>
      </scroll-view>
      <view class="custom-date" @click="showDatePicker">
        <text class="iconfont icon-calendar"></text>
        <text>自定义</text>
      </view>
    </view>

    <!-- 核心指标卡片 -->
    <view class="metrics-cards">
      <view class="metric-card">
        <view class="metric-icon users">
          <text class="iconfont icon-user"></text>
        </view>
        <view class="metric-info">
          <text class="metric-value">{{ stats.totalUsers || 0 }}</text>
          <text class="metric-label">总用户数</text>
          <text class="metric-change" :class="stats.userGrowth >= 0 ? 'positive' : 'negative'">
            {{ stats.userGrowth >= 0 ? '+' : '' }}{{ stats.userGrowth || 0 }}%
          </text>
        </view>
      </view>
      
      <view class="metric-card">
        <view class="metric-icon lockers">
          <text class="iconfont icon-locker"></text>
        </view>
        <view class="metric-info">
          <text class="metric-value">{{ stats.totalLockers || 0 }}</text>
          <text class="metric-label">总杆柜数</text>
          <text class="metric-change" :class="stats.lockerUtilization >= 70 ? 'positive' : 'negative'">
            {{ (stats.lockerUtilization || 0).toFixed(1) }}% 使用率
          </text>
        </view>
      </view>
      
      <view class="metric-card">
        <view class="metric-icon operations">
          <text class="iconfont icon-activity"></text>
        </view>
        <view class="metric-info">
          <text class="metric-value">{{ stats.totalOperations || 0 }}</text>
          <text class="metric-label">总操作次数</text>
          <text class="metric-change" :class="stats.operationGrowth >= 0 ? 'positive' : 'negative'">
            {{ stats.operationGrowth >= 0 ? '+' : '' }}{{ stats.operationGrowth || 0 }}%
          </text>
        </view>
      </view>
      
      <view class="metric-card">
        <view class="metric-icon revenue">
          <text class="iconfont icon-money"></text>
        </view>
        <view class="metric-info">
          <text class="metric-value">{{ stats.totalRevenue || 0 }}</text>
          <text class="metric-label">营收 (元)</text>
          <text class="metric-change" :class="stats.revenueGrowth >= 0 ? 'positive' : 'negative'">
            {{ stats.revenueGrowth >= 0 ? '+' : '' }}{{ stats.revenueGrowth || 0 }}%
          </text>
        </view>
      </view>
    </view>

    <!-- 图表区域 -->
    <scroll-view class="charts-container" scroll-y>
      <!-- 用户趋势图 -->
      <view class="chart-section">
        <view class="chart-header">
          <text class="chart-title">用户注册趋势</text>
          <view class="chart-legend">
            <view class="legend-item">
              <view class="legend-dot new-users"></view>
              <text>新增用户</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot active-users"></view>
              <text>活跃用户</text>
            </view>
          </view>
        </view>
        <view class="chart-container">
          <canvas v-if="userTrendData.length > 0" 
                  class="chart-canvas" 
                  canvas-id="userTrendChart"
                  :style="{ width: chartWidth + 'rpx', height: '400rpx' }">
          </canvas>
          <view v-else class="empty-chart">
            <text>暂无数据</text>
          </view>
        </view>
      </view>

      <!-- 杆柜使用分析 -->
      <view class="chart-section">
        <view class="chart-header">
          <text class="chart-title">杆柜使用分析</text>
        </view>
        <view class="locker-analysis">
          <view class="analysis-item">
            <view class="analysis-label">
              <view class="status-dot available"></view>
              <text>可用杆柜</text>
            </view>
            <view class="analysis-value">
              <text class="value">{{ lockerStats.available || 0 }}</text>
              <text class="percentage">{{ ((lockerStats.available || 0) / (stats.totalLockers || 1) * 100).toFixed(1) }}%</text>
            </view>
          </view>
          
          <view class="analysis-item">
            <view class="analysis-label">
              <view class="status-dot occupied"></view>
              <text>使用中</text>
            </view>
            <view class="analysis-value">
              <text class="value">{{ lockerStats.occupied || 0 }}</text>
              <text class="percentage">{{ ((lockerStats.occupied || 0) / (stats.totalLockers || 1) * 100).toFixed(1) }}%</text>
            </view>
          </view>
          
          <view class="analysis-item">
            <view class="analysis-label">
              <view class="status-dot storing"></view>
              <text>存杆中</text>
            </view>
            <view class="analysis-value">
              <text class="value">{{ lockerStats.storing || 0 }}</text>
              <text class="percentage">{{ ((lockerStats.storing || 0) / (stats.totalLockers || 1) * 100).toFixed(1) }}%</text>
            </view>
          </view>
          
          <view class="analysis-item">
            <view class="analysis-label">
              <view class="status-dot maintenance"></view>
              <text>维护中</text>
            </view>
            <view class="analysis-value">
              <text class="value">{{ lockerStats.maintenance || 0 }}</text>
              <text class="percentage">{{ ((lockerStats.maintenance || 0) / (stats.totalLockers || 1) * 100).toFixed(1) }}%</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 门店排行 -->
      <view class="chart-section">
        <view class="chart-header">
          <text class="chart-title">门店使用排行</text>
          <text class="chart-subtitle">按操作次数排序</text>
        </view>
        <view class="store-ranking">
          <view v-for="(store, index) in storeRanking" :key="store.id" class="ranking-item">
            <view class="ranking-position">
              <text class="position-number" :class="{ top: index < 3 }">{{ index + 1 }}</text>
            </view>
            <view class="store-info">
              <text class="store-name">{{ store.name }}</text>
              <text class="store-detail">{{ store.total_lockers }} 个杆柜 | {{ store.operations_count }} 次操作</text>
            </view>
            <view class="store-progress">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: (store.operations_count / maxOperations * 100) + '%' }"></view>
              </view>
              <text class="progress-text">{{ store.operations_count }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 用户活跃时段 -->
      <view class="chart-section">
        <view class="chart-header">
          <text class="chart-title">用户活跃时段</text>
          <text class="chart-subtitle">24小时分布</text>
        </view>
        <view class="hourly-activity">
          <view v-for="hour in hourlyData" :key="hour.hour" class="activity-bar">
            <view class="bar-container">
              <view class="bar-fill" :style="{ height: (hour.count / maxHourlyCount * 100) + '%' }"></view>
            </view>
            <text class="hour-label">{{ hour.hour }}:00</text>
            <text class="count-label">{{ hour.count }}</text>
          </view>
        </view>
      </view>

      <!-- 用户统计表格 -->
      <view class="chart-section">
        <view class="chart-header">
          <text class="chart-title">活跃用户 TOP 10</text>
          <text class="chart-subtitle">按操作次数排序</text>
        </view>
        <view class="user-table">
          <view class="table-header">
            <text class="col-user">用户</text>
            <text class="col-operations">操作次数</text>
            <text class="col-lockers">当前杆柜</text>
            <text class="col-last-active">最后活跃</text>
          </view>
          <view v-for="user in topUsers" :key="user.id" class="table-row">
            <view class="col-user">
              <image :src="user.avatar || '/static/images/default-avatar.png'" class="user-avatar" />
              <view class="user-info">
                <text class="user-name">{{ user.name || '未设置' }}</text>
                <text class="user-phone">{{ user.phone }}</text>
              </view>
            </view>
            <text class="col-operations">{{ user.operations_count }}</text>
            <text class="col-lockers">{{ user.current_lockers }}</text>
            <text class="col-last-active">{{ formatDate(user.last_active_at, 'date') }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 自定义日期选择器 -->
    <uni-popup ref="datePickerPopup" type="bottom">
      <view class="date-picker-container">
        <view class="picker-header">
          <text class="picker-title">选择时间范围</text>
          <text class="iconfont icon-close" @click="closeDatePicker"></text>
        </view>
        <view class="date-inputs">
          <view class="date-input-group">
            <text class="input-label">开始日期</text>
            <picker mode="date" :value="customDate.start" @change="handleStartDateChange">
              <view class="date-input">
                <text>{{ customDate.start }}</text>
                <text class="iconfont icon-calendar"></text>
              </view>
            </picker>
          </view>
          <view class="date-input-group">
            <text class="input-label">结束日期</text>
            <picker mode="date" :value="customDate.end" @change="handleEndDateChange">
              <view class="date-input">
                <text>{{ customDate.end }}</text>
                <text class="iconfont icon-calendar"></text>
              </view>
            </picker>
          </view>
        </view>
        <view class="picker-actions">
          <button class="btn-cancel" @click="closeDatePicker">取消</button>
          <button class="btn-confirm" @click="confirmCustomDate">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { adminApi } from '@/services/api'
import { formatDate, showToast, showLoading, hideLoading } from '@/utils'

// 状态变量
const loading = ref(false)
const currentTimeFilter = ref('week')
const chartWidth = ref(680)

// 统计数据
const stats = ref({
  totalUsers: 0,
  userGrowth: 0,
  totalLockers: 0,
  lockerUtilization: 0,
  totalOperations: 0,
  operationGrowth: 0,
  totalRevenue: 0,
  revenueGrowth: 0
})

const lockerStats = ref({
  available: 0,
  occupied: 0,
  storing: 0,
  maintenance: 0
})

const userTrendData = ref([])
const storeRanking = ref([])
const topUsers = ref([])
const hourlyData = ref([])

// 时间筛选选项
const timeOptions = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '季度', value: 'quarter' },
  { label: '年度', value: 'year' }
]

// 自定义日期
const datePickerPopup = ref()
const customDate = ref({
  start: '',
  end: ''
})

// 计算属性
const maxOperations = computed(() => {
  return Math.max(...storeRanking.value.map(store => store.operations_count), 1)
})

const maxHourlyCount = computed(() => {
  return Math.max(...hourlyData.value.map(item => item.count), 1)
})

// 获取统计数据
const getStatistics = async () => {
  loading.value = true
  
  try {
    // 获取核心指标
    const statsRes = await adminApi.get('/admin/statistics', {
      params: {
        period: currentTimeFilter.value,
        startDate: customDate.value.start,
        endDate: customDate.value.end
      }
    })
    
    stats.value = statsRes.data
    lockerStats.value = statsRes.data.lockerStats || {}
    
    // 获取用户趋势数据
    const trendRes = await adminApi.get('/admin/statistics/user-trend', {
      params: { period: currentTimeFilter.value }
    })
    userTrendData.value = trendRes.data || []
    
    // 获取门店排行
    const storeRes = await adminApi.get('/admin/statistics/store-ranking', {
      params: { period: currentTimeFilter.value }
    })
    storeRanking.value = storeRes.data || []
    
    // 获取活跃用户
    const userRes = await adminApi.get('/admin/statistics/top-users', {
      params: { period: currentTimeFilter.value }
    })
    topUsers.value = userRes.data || []
    
    // 获取时段分析
    const hourlyRes = await adminApi.get('/admin/statistics/hourly-activity', {
      params: { period: currentTimeFilter.value }
    })
    hourlyData.value = hourlyRes.data || []
    
    // 渲染图表
    nextTick(() => {
      renderUserTrendChart()
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    showToast('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 设置时间筛选
const setTimeFilter = (value: string) => {
  currentTimeFilter.value = value
  getStatistics()
}

// 显示日期选择器
const showDatePicker = () => {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  customDate.value = {
    start: weekAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  }
  
  datePickerPopup.value.open()
}

// 关闭日期选择器
const closeDatePicker = () => {
  datePickerPopup.value.close()
}

// 处理开始日期
const handleStartDateChange = (e: any) => {
  customDate.value.start = e.detail.value
}

// 处理结束日期
const handleEndDateChange = (e: any) => {
  customDate.value.end = e.detail.value
}

// 确认自定义日期
const confirmCustomDate = () => {
  if (!customDate.value.start || !customDate.value.end) {
    showToast('请选择完整的时间范围')
    return
  }
  
  if (new Date(customDate.value.start) > new Date(customDate.value.end)) {
    showToast('开始日期不能晚于结束日期')
    return
  }
  
  currentTimeFilter.value = 'custom'
  closeDatePicker()
  getStatistics()
}

// 渲染用户趋势图表
const renderUserTrendChart = () => {
  if (userTrendData.value.length === 0) return
  
  const ctx = uni.createCanvasContext('userTrendChart')
  const canvas = {
    width: chartWidth.value * 2, // 适配高分辨率
    height: 400 * 2,
    padding: { top: 40, right: 40, bottom: 80, left: 80 }
  }
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // 计算绘制区域
  const chartArea = {
    x: canvas.padding.left,
    y: canvas.padding.top,
    width: canvas.width - canvas.padding.left - canvas.padding.right,
    height: canvas.height - canvas.padding.top - canvas.padding.bottom
  }
  
  // 数据处理
  const maxValue = Math.max(...userTrendData.value.map(d => Math.max(d.newUsers, d.activeUsers)))
  const stepX = chartArea.width / (userTrendData.value.length - 1)
  
  // 绘制网格线
  ctx.setStrokeStyle('#F0F0F0')
  ctx.setLineWidth(1)
  for (let i = 0; i <= 5; i++) {
    const y = chartArea.y + (chartArea.height / 5) * i
    ctx.moveTo(chartArea.x, y)
    ctx.lineTo(chartArea.x + chartArea.width, y)
    ctx.stroke()
  }
  
  // 绘制新增用户曲线
  ctx.setStrokeStyle('#1890FF')
  ctx.setLineWidth(3)
  ctx.beginPath()
  userTrendData.value.forEach((data, index) => {
    const x = chartArea.x + stepX * index
    const y = chartArea.y + chartArea.height - (data.newUsers / maxValue * chartArea.height)
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
  
  // 绘制活跃用户曲线
  ctx.setStrokeStyle('#52C41A')
  ctx.setLineWidth(3)
  ctx.beginPath()
  userTrendData.value.forEach((data, index) => {
    const x = chartArea.x + stepX * index
    const y = chartArea.y + chartArea.height - (data.activeUsers / maxValue * chartArea.height)
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
  
  ctx.draw()
}

// 导出报表
const exportReport = async () => {
  try {
    showLoading('正在生成报表...')
    
    // 获取导出数据
    const exportData = await generateExportData()
    
    // 在H5环境下使用浏览器下载
    // #ifdef H5
    const csvContent = convertToCSV(exportData)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `数据统计报表_${formatDate(new Date(), 'datetime')}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    // #endif
    
    // 在小程序环境下使用文件系统
    // #ifndef H5
    const csvContent = convertToCSV(exportData)
    const filePath = `${uni.env.USER_DATA_PATH}/数据统计报表_${formatDate(new Date(), 'datetime')}.csv`
    
    uni.getFileSystemManager().writeFile({
      filePath: filePath,
      data: csvContent,
      encoding: 'utf8',
      success: () => {
        uni.openDocument({
          filePath: filePath,
          showMenu: true,
          success: () => {
            showToast('导出成功')
          },
          fail: () => {
            showToast('打开文件失败')
          }
        })
      },
      fail: (err) => {
        console.error('写入文件失败:', err)
        showToast('导出失败')
      }
    })
    // #endif
    
    hideLoading()
  } catch (error) {
    console.error('导出失败:', error)
    hideLoading()
    showToast('导出失败')
  }
}

// 生成导出数据
const generateExportData = async () => {
  const data = {
    summary: {
      period: currentTimeFilter.value === 'custom' 
        ? `${customDate.value.start} 至 ${customDate.value.end}`
        : getFilterText(currentTimeFilter.value),
      totalUsers: summaryData.value.totalUsers,
      activeUsers: summaryData.value.activeUsers,
      totalLockers: summaryData.value.totalLockers,
      occupiedLockers: summaryData.value.occupiedLockers,
      todayOperations: summaryData.value.todayOperations,
      totalRevenue: summaryData.value.totalRevenue
    },
    userTrend: userTrendData.value,
    operationTrend: operationTrendData.value,
    topUsers: topUsers.value
  }
  
  return data
}

// 转换为CSV格式
const convertToCSV = (data: any) => {
  let csv = '\uFEFF' // UTF-8 BOM
  
  // 概要数据
  csv += '数据统计报表\n\n'
  csv += '统计周期,' + data.summary.period + '\n'
  csv += '总用户数,' + data.summary.totalUsers + '\n'
  csv += '活跃用户,' + data.summary.activeUsers + '\n'
  csv += '总杆柜数,' + data.summary.totalLockers + '\n'
  csv += '已占用,' + data.summary.occupiedLockers + '\n'
  csv += '今日操作,' + data.summary.todayOperations + '\n'
  csv += '总收入,' + data.summary.totalRevenue + '\n\n'
  
  // 用户趋势
  csv += '用户增长趋势\n'
  csv += '日期,新增用户,活跃用户\n'
  data.userTrend.forEach((item: any) => {
    csv += `${item.date},${item.newUsers},${item.activeUsers}\n`
  })
  csv += '\n'
  
  // 操作趋势
  csv += '操作趋势\n'
  csv += '日期,存杆次数,取杆次数\n'
  data.operationTrend.forEach((item: any) => {
    csv += `${item.date},${item.storeCount},${item.retrieveCount}\n`
  })
  csv += '\n'
  
  // TOP用户
  csv += 'TOP10活跃用户\n'
  csv += '用户名,手机号,操作次数,当前杆柜数,最后活跃\n'
  data.topUsers.forEach((user: any) => {
    csv += `${user.name},${user.phone},${user.operations_count},${user.current_lockers},${formatDate(user.last_active_at, 'date')}\n`
  })
  
  return csv
}

// 获取筛选文本
const getFilterText = (filter: string) => {
  const filterMap: Record<string, string> = {
    'today': '今日',
    'week': '本周',
    'month': '本月',
    'quarter': '本季度',
    'year': '本年度'
  }
  return filterMap[filter] || filter
}

// 初始化
onMounted(() => {
  // 获取画布宽度
  uni.getSystemInfo({
    success: (res) => {
      chartWidth.value = res.windowWidth - 40
    }
  })
  
  getStatistics()
})
</script>

<style lang="css" scoped>
@import "@/styles/common.css";

.statistics-page {
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

.time-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
  
  .filter-tabs {
    flex: 1;
    white-space: nowrap;
    
    .filter-tab {
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
  
  .custom-date {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background-color: var(--bg-color);
    border-radius: 8rpx;
    font-size: 28rpx;
    color: var(--text-primary);
    
    .iconfont {
      font-size: 28rpx;
      margin-right: 8rpx;
    }
  }
}

.metrics-cards {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
  background-color: #fff;
  
  .metric-card {
    width: calc(50% - 10rpx);
    display: flex;
    align-items: center;
    padding: 30rpx;
    margin: 10rpx;
    background-color: var(--bg-color);
    border-radius: 16rpx;
    
    .metric-icon {
      width: 80rpx;
      height: 80rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12rpx;
      margin-right: 20rpx;
      
      .iconfont {
        font-size: 40rpx;
      }
      
      &.users {
        background-color: var(--primary-light);
        color: var(--primary-color);
      }
      
      &.lockers {
        background-color: $success-light;
        color: var(--success-color);
      }
      
      &.operations {
        background-color: #FFF3CD;
        color: #856404;
      }
      
      &.revenue {
        background-color: $danger-light;
        color: var(--danger-color);
      }
    }
    
    .metric-info {
      flex: 1;
      
      .metric-value {
        display: block;
        font-size: 32rpx;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 8rpx;
      }
      
      .metric-label {
        display: block;
        font-size: 24rpx;
        color: var(--text-secondary);
        margin-bottom: 4rpx;
      }
      
      .metric-change {
        font-size: 22rpx;
        
        &.positive {
          color: var(--success-color);
        }
        
        &.negative {
          color: var(--danger-color);
        }
      }
    }
  }
}

.charts-container {
  height: calc(100vh - 480rpx);
  padding: 20rpx;
}

.chart-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .chart-title {
      font-size: 32rpx;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .chart-subtitle {
      font-size: 26rpx;
      color: var(--text-secondary);
    }
    
    .chart-legend {
      display: flex;
      
      .legend-item {
        display: flex;
        align-items: center;
        margin-left: 30rpx;
        font-size: 24rpx;
        color: var(--text-secondary);
        
        .legend-dot {
          width: 16rpx;
          height: 16rpx;
          border-radius: 50%;
          margin-right: 8rpx;
          
          &.new-users {
            background-color: #1890FF;
          }
          
          &.active-users {
            background-color: #52C41A;
          }
        }
      }
    }
  }
  
  .chart-container {
    position: relative;
    
    .chart-canvas {
      width: 100%;
      border-radius: 8rpx;
    }
    
    .empty-chart {
      height: 400rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      font-size: 28rpx;
    }
  }
}

.locker-analysis {
  .analysis-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1px solid var(--border-color);
    
    &:last-child {
      border-bottom: none;
    }
    
    .analysis-label {
      display: flex;
      align-items: center;
      
      .status-dot {
        width: 20rpx;
        height: 20rpx;
        border-radius: 50%;
        margin-right: 16rpx;
        
        &.available {
          background-color: var(--success-color);
        }
        
        &.occupied {
          background-color: var(--primary-color);
        }
        
        &.storing {
          background-color: #FFC107;
        }
        
        &.maintenance {
          background-color: var(--danger-color);
        }
      }
      
      text {
        font-size: 28rpx;
        color: var(--text-secondary);
      }
    }
    
    .analysis-value {
      display: flex;
      align-items: center;
      
      .value {
        font-size: 32rpx;
        font-weight: 500;
        color: var(--text-primary);
        margin-right: 16rpx;
      }
      
      .percentage {
        font-size: 26rpx;
        color: var(--text-secondary);
      }
    }
  }
}

.store-ranking {
  .ranking-item {
    display: flex;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1px solid var(--border-color);
    
    &:last-child {
      border-bottom: none;
    }
    
    .ranking-position {
      width: 60rpx;
      
      .position-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48rpx;
        height: 48rpx;
        border-radius: 50%;
        font-size: 28rpx;
        font-weight: 500;
        background-color: var(--bg-color);
        color: var(--text-secondary);
        
        &.top {
          background-color: var(--primary-color);
          color: #fff;
        }
      }
    }
    
    .store-info {
      flex: 1;
      margin-left: 20rpx;
      
      .store-name {
        display: block;
        font-size: 30rpx;
        color: var(--text-primary);
        margin-bottom: 8rpx;
      }
      
      .store-detail {
        font-size: 24rpx;
        color: var(--text-secondary);
      }
    }
    
    .store-progress {
      width: 200rpx;
      display: flex;
      align-items: center;
      
      .progress-bar {
        flex: 1;
        height: 12rpx;
        background-color: var(--bg-color);
        border-radius: 6rpx;
        overflow: hidden;
        margin-right: 16rpx;
        
        .progress-fill {
          height: 100%;
          background-color: var(--primary-color);
          border-radius: 6rpx;
          transition: width 0.3s;
        }
      }
      
      .progress-text {
        font-size: 26rpx;
        color: var(--text-primary);
        min-width: 60rpx;
        text-align: right;
      }
    }
  }
}

.hourly-activity {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 300rpx;
  padding: 0 20rpx;
  
  .activity-bar {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    
    .bar-container {
      flex: 1;
      width: 16rpx;
      background-color: var(--bg-color);
      border-radius: 8rpx;
      position: relative;
      margin-bottom: 16rpx;
      
      .bar-fill {
        position: absolute;
        bottom: 0;
        width: 100%;
        background-color: var(--primary-color);
        border-radius: 8rpx;
        transition: height 0.3s;
      }
    }
    
    .hour-label {
      font-size: 20rpx;
      color: var(--text-secondary);
      margin-bottom: 4rpx;
    }
    
    .count-label {
      font-size: 18rpx;
      color: $text-tertiary;
    }
  }
}

.user-table {
  .table-header {
    display: flex;
    padding: 20rpx 0;
    border-bottom: 2rpx solid var(--border-color);
    font-size: 26rpx;
    font-weight: 500;
    color: var(--text-secondary);
    
    .col-user {
      flex: 2;
    }
    
    .col-operations,
    .col-lockers,
    .col-last-active {
      flex: 1;
      text-align: center;
    }
  }
  
  .table-row {
    display: flex;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1px solid var(--border-color);
    
    &:last-child {
      border-bottom: none;
    }
    
    .col-user {
      flex: 2;
      display: flex;
      align-items: center;
      
      .user-avatar {
        width: 60rpx;
        height: 60rpx;
        border-radius: 50%;
        margin-right: 16rpx;
      }
      
      .user-info {
        .user-name {
          display: block;
          font-size: 28rpx;
          color: var(--text-primary);
          margin-bottom: 4rpx;
        }
        
        .user-phone {
          font-size: 24rpx;
          color: var(--text-secondary);
        }
      }
    }
    
    .col-operations,
    .col-lockers,
    .col-last-active {
      flex: 1;
      text-align: center;
      font-size: 26rpx;
      color: var(--text-primary);
    }
  }
}

.date-picker-container {
  background-color: #fff;
  border-radius: 16rpx 16rpx 0 0;
  
  .picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1px solid var(--border-color);
    
    .picker-title {
      font-size: 34rpx;
      font-weight: 500;
      color: var(--text-primary);
    }
    
    .iconfont {
      font-size: 36rpx;
      color: var(--text-secondary);
    }
  }
  
  .date-inputs {
    padding: 30rpx;
    
    .date-input-group {
      margin-bottom: 30rpx;
      
      .input-label {
        display: block;
        font-size: 28rpx;
        color: var(--text-secondary);
        margin-bottom: 16rpx;
      }
      
      .date-input {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20rpx;
        background-color: var(--bg-color);
        border-radius: 8rpx;
        font-size: 30rpx;
        color: var(--text-primary);
        
        .iconfont {
          font-size: 28rpx;
          color: var(--text-secondary);
        }
      }
    }
  }
  
  .picker-actions {
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