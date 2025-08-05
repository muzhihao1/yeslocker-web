<template>
  <view class="records-container">
    <view class="page-header">
      <view class="title">操作记录</view>
    </view>
    
    <view class="filter-section">
      <view class="filter-item">
        <text class="filter-label">操作类型:</text>
        <picker @change="onTypeChange" :value="filterType" :range="typeOptions">
          <view class="picker">{{ typeOptions[filterType] }}</view>
        </picker>
      </view>
      <view class="filter-item">
        <text class="filter-label">时间范围:</text>
        <picker mode="date" @change="onDateChange" :value="filterDate">
          <view class="picker">{{ filterDate || '选择日期' }}</view>
        </picker>
      </view>
    </view>
    
    <view class="records-list">
      <view 
        class="record-item" 
        v-for="record in recordsList" 
        :key="record.id"
        @click="viewDetail(record)"
      >
        <view class="record-header">
          <view class="record-type" :class="`type-${record.type}`">
            {{ getTypeText(record.type) }}
          </view>
          <view class="record-time">{{ record.createdAt }}</view>
        </view>
        <view class="record-content">
          <text class="record-desc">{{ record.description }}</text>
          <text class="record-operator">操作员: {{ record.operator }}</text>
        </view>
      </view>
    </view>
    
    <view class="load-more" v-if="hasMore" @click="loadMore">
      <text>加载更多</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const filterType = ref(0)
const filterDate = ref('')
const typeOptions = ['全部', '登录', '审批', '杆柜操作', '用户管理']
const hasMore = ref(true)

const recordsList = ref([
  {
    id: 1,
    type: 'login',
    description: '管理员登录系统',
    operator: '超级管理员',
    createdAt: '2025-08-04 10:00:00'
  },
  {
    id: 2,
    type: 'approval',
    description: '审批用户申请 - 张三的杆柜申请',
    operator: '超级管理员',
    createdAt: '2025-08-04 09:30:00'
  },
  {
    id: 3,
    type: 'locker',
    description: '释放杆柜 L001',
    operator: '门店管理员',
    createdAt: '2025-08-04 09:15:00'
  },
  {
    id: 4,
    type: 'user',
    description: '禁用用户账户 - 李四',
    operator: '超级管理员',
    createdAt: '2025-08-04 08:45:00'
  }
])

const onTypeChange = (e: any) => {
  filterType.value = e.detail.value
  // 根据类型筛选记录
}

const onDateChange = (e: any) => {
  filterDate.value = e.detail.value
  // 根据日期筛选记录
}

const getTypeText = (type: string) => {
  const typeMap = {
    login: '系统登录',
    approval: '申请审批',
    locker: '杆柜操作',
    user: '用户管理'
  }
  return typeMap[type] || '未知操作'
}

const viewDetail = (record: any) => {
  uni.showModal({
    title: '操作详情',
    content: `操作类型: ${getTypeText(record.type)}\n描述: ${record.description}\n操作员: ${record.operator}\n时间: ${record.createdAt}`,
    showCancel: false
  })
}

const loadMore = () => {
  uni.showToast({
    title: '暂无更多数据',
    icon: 'none'
  })
  hasMore.value = false
}

onMounted(() => {
  // 加载操作记录数据
})
</script>

<style scoped>
.records-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.filter-section {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
}

.filter-item {
  flex: 1;
}

.filter-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.picker {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.records-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.record-item {
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.record-item:hover {
  background-color: #f5f5f5;
}

.record-item:last-child {
  border-bottom: none;
}

.record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.record-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.type-login {
  background-color: #2196F3;
}

.type-approval {
  background-color: #4CAF50;
}

.type-locker {
  background-color: #FF9800;
}

.type-user {
  background-color: #9C27B0;
}

.record-time {
  font-size: 12px;
  color: #999;
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.record-desc {
  color: #333;
  font-size: 14px;
}

.record-operator {
  color: #666;
  font-size: 12px;
}

.load-more {
  text-align: center;
  padding: 20px;
  color: #666;
  cursor: pointer;
}
</style>