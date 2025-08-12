<template>
  <div class="reminders-container">
    <div class="page-header">
      <div class="title">提醒管理</div>
      <button class="btn btn-primary" @click="addReminder">新增提醒</button>
    </div>
    
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-number">{{ stats.total }}</div>
        <div class="stat-label">总提醒数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.active }}</div>
        <div class="stat-label">启用中</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.today }}</div>
        <div class="stat-label">今日发送</div>
      </div>
    </div>
    
    <div class="reminders-list">
      <div 
        class="reminder-item" 
        v-for="reminder in remindersList" 
        :key="reminder.id"
      >
        <div class="reminder-header">
          <div class="reminder-title">{{ reminder.title }}</div>
          <div class="reminder-status" :class="`status-${reminder.status}`">
            {{ getStatusText(reminder.status) }}
          </div>
        </div>
        
        <div class="reminder-content">
          <span class="reminder-desc">{{ reminder.description }}</span>
          <div class="reminder-meta">
            <span class="meta-item">类型: {{ reminder.type }}</span>
            <span class="meta-item">频率: {{ reminder.frequency }}</span>
            <span class="meta-item">下次执行: {{ reminder.nextRun }}</span>
          </div>
        </div>
        
        <div class="reminder-actions">
          <button class="btn-small btn-secondary" @click="editReminder(reminder)">编辑</button>
          <button 
            class="btn-small" 
            :class="reminder.status === 'active' ? 'btn-warning' : 'btn-success'"
            @click="toggleStatus(reminder)"
          >
            {{ reminder.status === 'active' ? '暂停' : '启用' }}
          </button>
          <button class="btn-small btn-danger" @click="deleteReminder(reminder)">删除</button>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-if="remindersList.length === 0">
      <span>暂无提醒规则</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  total: 5,
  active: 3,
  today: 12
})

const remindersList = ref([
  {
    id: 1,
    title: '杆柜超时提醒',
    description: '用户使用杆柜超过12小时时发送提醒',
    type: '杆柜管理',
    frequency: '实时监控',
    status: 'active',
    nextRun: '持续运行'
  },
  {
    id: 2,
    title: '审批待处理提醒',
    description: '有新的用户申请需要审批时通知管理员',
    type: '审批管理',
    frequency: '实时监控',
    status: 'active',
    nextRun: '持续运行'
  },
  {
    id: 3,
    title: '每日数据统计',
    description: '每日晚上发送当日运营数据统计',
    type: '数据统计',
    frequency: '每日一次',
    status: 'active',
    nextRun: '2025-08-04 20:00'
  },
  {
    id: 4,
    title: '系统维护提醒',
    description: '每周日凌晨进行系统维护提醒',
    type: '系统维护',
    frequency: '每周一次',
    status: 'paused',
    nextRun: '已暂停'
  },
  {
    id: 5,
    title: '用户满意度调查',
    description: '每月月底发送用户满意度调查',
    type: '用户调研',
    frequency: '每月一次',
    status: 'paused',
    nextRun: '已暂停'
  }
])

const getStatusText = (status: string) => {
  const statusMap = {
    active: '运行中',
    paused: '已暂停',
    error: '异常'
  }
  return statusMap[status] || '未知'
}

const addReminder = () => {
  alert('新增提醒功能开发中')
}

const editReminder = (reminder: any) => {
  if (confirm(`编辑提醒: ${reminder.title}`)) {
    alert('编辑功能开发中')
  }
}

const toggleStatus = (reminder: any) => {
  const newStatus = reminder.status === 'active' ? 'paused' : 'active'
  reminder.status = newStatus
  reminder.nextRun = newStatus === 'active' ? '持续运行' : '已暂停'
  
  alert(`提醒已${newStatus === 'active' ? '启用' : '暂停'}`)
}

const deleteReminder = (reminder: any) => {
  if (confirm(`确定要删除提醒 "${reminder.title}" 吗？`)) {
    const index = remindersList.value.findIndex(item => item.id === reminder.id)
    if (index > -1) {
      remindersList.value.splice(index, 1)
      stats.value.total--
      if (reminder.status === 'active') {
        stats.value.active--
      }
      alert('删除成功')
    }
  }
}

onMounted(() => {
  // 加载提醒数据
})
</script>

<style scoped>
.reminders-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stats-section {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #1B5E20;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.reminders-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.reminder-item {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.reminder-item:last-child {
  border-bottom: none;
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.reminder-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.reminder-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.status-active {
  background-color: #4CAF50;
}

.status-paused {
  background-color: #FF9800;
}

.status-error {
  background-color: #F44336;
}

.reminder-content {
  margin-bottom: 15px;
}

.reminder-desc {
  color: #666;
  margin-bottom: 10px;
  display: block;
}

.reminder-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 12px;
  color: #999;
}

.reminder-actions {
  display: flex;
  gap: 10px;
}

.btn, .btn-small {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn {
  padding: 10px 20px;
}

.btn-primary {
  background-color: #1B5E20;
  color: white;
}

.btn-secondary {
  background-color: #666;
  color: white;
}

.btn-success {
  background-color: #4CAF50;
  color: white;
}

.btn-warning {
  background-color: #FF9800;
  color: white;
}

.btn-danger {
  background-color: #F44336;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 50px;
  color: #999;
  background: white;
  border-radius: 8px;
}
</style>