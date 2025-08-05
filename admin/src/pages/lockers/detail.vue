<template>
  <view class="locker-detail-container">
    <view class="page-header">
      <view class="title">杆柜详情</view>
    </view>
    
    <view class="detail-content">
      <view class="info-section">
        <view class="section-title">基本信息</view>
        <view class="info-item">
          <text class="label">杆柜编号:</text>
          <text class="value">{{ lockerInfo.code }}</text>
        </view>
        <view class="info-item">
          <text class="label">所属门店:</text>
          <text class="value">{{ lockerInfo.storeName }}</text>
        </view>
        <view class="info-item">
          <text class="label">状态:</text>
          <text class="value" :class="statusClass">{{ statusText }}</text>
        </view>
      </view>
      
      <view class="info-section" v-if="lockerInfo.currentUser">
        <view class="section-title">使用信息</view>
        <view class="info-item">
          <text class="label">用户姓名:</text>
          <text class="value">{{ lockerInfo.currentUser.name }}</text>
        </view>
        <view class="info-item">
          <text class="label">手机号:</text>
          <text class="value">{{ lockerInfo.currentUser.phone }}</text>
        </view>
        <view class="info-item">
          <text class="label">开始时间:</text>
          <text class="value">{{ lockerInfo.startTime }}</text>
        </view>
      </view>
    </view>
    
    <view class="action-buttons">
      <button class="btn btn-primary" @click="handleEdit">编辑信息</button>
      <button class="btn btn-secondary" @click="handleViewHistory">查看历史</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const lockerInfo = ref({
  code: 'L001',
  storeName: '旗舰店',
  status: 'occupied',
  currentUser: {
    name: '张三',
    phone: '13800000003'
  },
  startTime: '2025-08-04 10:00:00'
})

const statusText = computed(() => {
  const statusMap = {
    available: '空闲',
    occupied: '使用中',
    maintenance: '维护中'
  }
  return statusMap[lockerInfo.value.status] || '未知'
})

const statusClass = computed(() => {
  return `status-${lockerInfo.value.status}`
})

const handleEdit = () => {
  uni.showToast({
    title: '编辑功能开发中',
    icon: 'none'
  })
}

const handleViewHistory = () => {
  uni.showToast({
    title: '历史记录功能开发中',
    icon: 'none'
  })
}

onMounted(() => {
  // 获取杆柜详情数据
})
</script>

<style scoped>
.locker-detail-container {
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