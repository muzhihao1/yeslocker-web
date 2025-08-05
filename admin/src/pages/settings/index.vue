<template>
  <view class="settings-container">
    <!-- 标题栏 -->
    <view class="page-header">
      <text class="page-title">系统设置</text>
      <text class="page-subtitle">配置系统参数和规则</text>
    </view>

    <!-- 设置组 -->
    <view class="settings-sections">
      <!-- 短信服务配置 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">短信服务配置</text>
          <view class="section-badge" :class="smsConfig.enabled ? 'active' : 'inactive'">
            {{ smsConfig.enabled ? '已启用' : '未启用' }}
          </view>
        </view>
        
        <view class="settings-form">
          <view class="form-item">
            <text class="form-label">服务商</text>
            <picker mode="selector" :value="smsProviderIndex" :range="smsProviders" @change="handleProviderChange">
              <view class="picker-display">
                <text>{{ smsProviders[smsProviderIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="form-label">App ID</text>
            <input 
              class="form-input" 
              v-model="smsConfig.appId" 
              placeholder="请输入SMS App ID"
              :disabled="!adminStore.isSuperAdmin"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">签名名称</text>
            <input 
              class="form-input" 
              v-model="smsConfig.signName" 
              placeholder="请输入短信签名"
              :disabled="!adminStore.isSuperAdmin"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">模板ID</text>
            <input 
              class="form-input" 
              v-model="smsConfig.templateId" 
              placeholder="请输入短信模板ID"
              :disabled="!adminStore.isSuperAdmin"
            />
          </view>
          
          <view class="form-item switch-item">
            <text class="form-label">启用短信服务</text>
            <switch 
              :checked="smsConfig.enabled" 
              @change="handleSmsToggle"
              :disabled="!adminStore.isSuperAdmin"
            />
          </view>
        </view>
        
        <view class="section-actions">
          <button 
            class="test-btn" 
            @tap="testSmsService"
            :disabled="!smsConfig.enabled || testingSms"
          >
            {{ testingSms ? '测试中...' : '测试短信发送' }}
          </button>
          <button 
            class="save-btn primary" 
            @tap="saveSmsConfig"
            :disabled="!adminStore.isSuperAdmin || savingSms"
          >
            {{ savingSms ? '保存中...' : '保存配置' }}
          </button>
        </view>
      </view>

      <!-- 杆柜规则设置 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">杆柜使用规则</text>
        </view>
        
        <view class="settings-form">
          <view class="form-item">
            <text class="form-label">申请审核模式</text>
            <picker mode="selector" :value="approvalModeIndex" :range="approvalModes" @change="handleApprovalModeChange">
              <view class="picker-display">
                <text>{{ approvalModes[approvalModeIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="form-label">最长使用期限（月）</text>
            <input 
              class="form-input" 
              type="number"
              v-model.number="lockerRules.maxDuration" 
              placeholder="请输入最长使用期限"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">提前提醒天数</text>
            <input 
              class="form-input" 
              type="number"
              v-model.number="lockerRules.reminderDays" 
              placeholder="请输入提前提醒天数"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">超期处理方式</text>
            <picker mode="selector" :value="overtimeModeIndex" :range="overtimeModes" @change="handleOvertimeModeChange">
              <view class="picker-display">
                <text>{{ overtimeModes[overtimeModeIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          
          <view class="form-item switch-item">
            <text class="form-label">允许续期申请</text>
            <switch 
              :checked="lockerRules.allowRenewal" 
              @change="handleRenewalToggle"
            />
          </view>
        </view>
        
        <view class="section-actions">
          <button 
            class="save-btn primary" 
            @tap="saveLockerRules"
            :disabled="savingRules"
          >
            {{ savingRules ? '保存中...' : '保存规则' }}
          </button>
        </view>
      </view>

      <!-- 通知模板管理 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">通知模板管理</text>
          <button class="add-btn" @tap="addTemplate">添加模板</button>
        </view>
        
        <view class="template-list">
          <view 
            v-for="template in notificationTemplates" 
            :key="template.id"
            class="template-item"
            @tap="editTemplate(template)"
          >
            <view class="template-info">
              <text class="template-name">{{ template.name }}</text>
              <text class="template-type">{{ template.type }}</text>
            </view>
            <view class="template-actions">
              <text class="edit-icon">编辑</text>
            </view>
          </view>
        </view>
        
        <view v-if="notificationTemplates.length === 0" class="empty-placeholder">
          <text>暂无通知模板</text>
        </view>
      </view>

      <!-- 数据备份设置 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">数据备份设置</text>
        </view>
        
        <view class="settings-form">
          <view class="form-item switch-item">
            <text class="form-label">自动备份</text>
            <switch 
              :checked="backupSettings.autoBackup" 
              @change="handleAutoBackupToggle"
              :disabled="!adminStore.isSuperAdmin"
            />
          </view>
          
          <view v-if="backupSettings.autoBackup" class="form-item">
            <text class="form-label">备份频率</text>
            <picker mode="selector" :value="backupFrequencyIndex" :range="backupFrequencies" @change="handleBackupFrequencyChange">
              <view class="picker-display">
                <text>{{ backupFrequencies[backupFrequencyIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="form-label">保留备份数量</text>
            <input 
              class="form-input" 
              type="number"
              v-model.number="backupSettings.retentionCount" 
              placeholder="请输入保留备份数量"
              :disabled="!adminStore.isSuperAdmin"
            />
          </view>
          
          <view class="backup-info">
            <view class="info-item">
              <text class="info-label">上次备份时间：</text>
              <text class="info-value">{{ lastBackupTime || '从未备份' }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">备份大小：</text>
              <text class="info-value">{{ backupSize || '-' }}</text>
            </view>
          </view>
        </view>
        
        <view class="section-actions">
          <button 
            class="backup-btn" 
            @tap="createBackup"
            :disabled="!adminStore.isSuperAdmin || backingUp"
          >
            {{ backingUp ? '备份中...' : '立即备份' }}
          </button>
          <button 
            class="save-btn primary" 
            @tap="saveBackupSettings"
            :disabled="!adminStore.isSuperAdmin || savingBackup"
          >
            {{ savingBackup ? '保存中...' : '保存设置' }}
          </button>
        </view>
      </view>

      <!-- 系统信息 -->
      <view class="settings-section">
        <view class="section-header">
          <text class="section-title">系统信息</text>
        </view>
        
        <view class="system-info">
          <view class="info-item">
            <text class="info-label">系统版本：</text>
            <text class="info-value">v1.0.0</text>
          </view>
          <view class="info-item">
            <text class="info-label">数据库版本：</text>
            <text class="info-value">PostgreSQL 14.6</text>
          </view>
          <view class="info-item">
            <text class="info-label">部署环境：</text>
            <text class="info-value">{{ deployEnv }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">最后更新：</text>
            <text class="info-value">{{ lastUpdateTime }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 模板编辑弹窗 -->
    <uni-popup ref="templatePopup" type="center">
      <view class="template-editor">
        <view class="editor-header">
          <text class="editor-title">{{ editingTemplate.id ? '编辑模板' : '新建模板' }}</text>
          <text class="close-btn" @tap="closeTemplateEditor">×</text>
        </view>
        <view class="editor-form">
          <view class="form-item">
            <text class="form-label">模板名称</text>
            <input 
              class="form-input" 
              v-model="editingTemplate.name" 
              placeholder="请输入模板名称"
            />
          </view>
          <view class="form-item">
            <text class="form-label">模板类型</text>
            <picker mode="selector" :value="templateTypeIndex" :range="templateTypes" @change="handleTemplateTypeChange">
              <view class="picker-display">
                <text>{{ templateTypes[templateTypeIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">模板内容</text>
            <textarea 
              class="form-textarea" 
              v-model="editingTemplate.content" 
              placeholder="请输入模板内容，可使用变量如 {name}, {date} 等"
              :maxlength="500"
            />
          </view>
        </view>
        <view class="editor-actions">
          <button class="cancel-btn" @tap="closeTemplateEditor">取消</button>
          <button class="save-btn primary" @tap="saveTemplate">保存</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import dayjs from 'dayjs'

const adminStore = useAdminStore()

// SMS配置
const smsConfig = ref({
  enabled: false,
  provider: 'tencent',
  appId: '',
  signName: '',
  templateId: ''
})

const smsProviders = ['腾讯云SMS', '阿里云SMS', '华为云SMS']
const smsProviderIndex = ref(0)
const testingSms = ref(false)
const savingSms = ref(false)

// 杆柜规则
const lockerRules = ref({
  approvalMode: 'manual',
  maxDuration: 12,
  reminderDays: 7,
  overtimeMode: 'notify',
  allowRenewal: true
})

const approvalModes = ['人工审核', '自动审核', '条件审核']
const approvalModeIndex = ref(0)
const overtimeModes = ['仅通知', '自动锁定', '强制清理']
const overtimeModeIndex = ref(0)
const savingRules = ref(false)

// 通知模板
const notificationTemplates = ref([
  { id: 1, name: '申请通过通知', type: 'approval', content: '您的杆柜申请已通过...' },
  { id: 2, name: '到期提醒通知', type: 'reminder', content: '您的杆柜将于{date}到期...' }
])

const editingTemplate = ref({
  id: null,
  name: '',
  type: 'approval',
  content: ''
})

const templateTypes = ['审核通知', '提醒通知', '系统通知', '营销通知']
const templateTypeIndex = ref(0)

// 备份设置
const backupSettings = ref({
  autoBackup: true,
  frequency: 'daily',
  retentionCount: 7
})

const backupFrequencies = ['每天', '每周', '每月']
const backupFrequencyIndex = ref(0)
const lastBackupTime = ref('2024-03-15 02:00:00')
const backupSize = ref('156.8 MB')
const backingUp = ref(false)
const savingBackup = ref(false)

// 系统信息
const deployEnv = ref('Production')
const lastUpdateTime = ref('2024-03-14 18:30:00')

// Methods
const handleProviderChange = (e: any) => {
  smsProviderIndex.value = e.detail.value
  smsConfig.value.provider = ['tencent', 'aliyun', 'huawei'][e.detail.value]
}

const handleSmsToggle = (e: any) => {
  smsConfig.value.enabled = e.detail.value
}

const testSmsService = async () => {
  testingSms.value = true
  try {
    // 模拟测试短信发送
    await new Promise(resolve => setTimeout(resolve, 2000))
    uni.showToast({
      title: '测试短信已发送',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '测试失败',
      icon: 'none'
    })
  } finally {
    testingSms.value = false
  }
}

const saveSmsConfig = async () => {
  savingSms.value = true
  try {
    // 模拟保存配置
    await new Promise(resolve => setTimeout(resolve, 1000))
    uni.showToast({
      title: '配置已保存',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    })
  } finally {
    savingSms.value = false
  }
}

const handleApprovalModeChange = (e: any) => {
  approvalModeIndex.value = e.detail.value
  lockerRules.value.approvalMode = ['manual', 'auto', 'conditional'][e.detail.value]
}

const handleOvertimeModeChange = (e: any) => {
  overtimeModeIndex.value = e.detail.value
  lockerRules.value.overtimeMode = ['notify', 'lock', 'clean'][e.detail.value]
}

const handleRenewalToggle = (e: any) => {
  lockerRules.value.allowRenewal = e.detail.value
}

const saveLockerRules = async () => {
  savingRules.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    uni.showToast({
      title: '规则已保存',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    })
  } finally {
    savingRules.value = false
  }
}

const addTemplate = () => {
  editingTemplate.value = {
    id: null,
    name: '',
    type: 'approval',
    content: ''
  }
  templateTypeIndex.value = 0
  ;(proxy.$refs.templatePopup as any).open()
}

const editTemplate = (template: any) => {
  editingTemplate.value = { ...template }
  templateTypeIndex.value = templateTypes.findIndex(t => 
    t.includes(template.type === 'approval' ? '审核' : '提醒')
  )
  ;(proxy.$refs.templatePopup as any).open()
}

const closeTemplateEditor = () => {
  ;(proxy.$refs.templatePopup as any).close()
}

const handleTemplateTypeChange = (e: any) => {
  templateTypeIndex.value = e.detail.value
  editingTemplate.value.type = ['approval', 'reminder', 'system', 'marketing'][e.detail.value]
}

const saveTemplate = async () => {
  if (!editingTemplate.value.name || !editingTemplate.value.content) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none'
    })
    return
  }

  if (editingTemplate.value.id) {
    // 更新模板
    const index = notificationTemplates.value.findIndex(t => t.id === editingTemplate.value.id)
    if (index > -1) {
      notificationTemplates.value[index] = { ...editingTemplate.value }
    }
  } else {
    // 新增模板
    notificationTemplates.value.push({
      ...editingTemplate.value,
      id: Date.now()
    })
  }

  closeTemplateEditor()
  uni.showToast({
    title: '模板已保存',
    icon: 'success'
  })
}

const handleAutoBackupToggle = (e: any) => {
  backupSettings.value.autoBackup = e.detail.value
}

const handleBackupFrequencyChange = (e: any) => {
  backupFrequencyIndex.value = e.detail.value
  backupSettings.value.frequency = ['daily', 'weekly', 'monthly'][e.detail.value]
}

const createBackup = async () => {
  backingUp.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 3000))
    lastBackupTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
    backupSize.value = '168.2 MB'
    uni.showToast({
      title: '备份成功',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '备份失败',
      icon: 'none'
    })
  } finally {
    backingUp.value = false
  }
}

const saveBackupSettings = async () => {
  savingBackup.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    uni.showToast({
      title: '设置已保存',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    })
  } finally {
    savingBackup.value = false
  }
}

// 获取当前实例
import { getCurrentInstance } from 'vue'
const { proxy } = getCurrentInstance()!

// Lifecycle
onMounted(() => {
  // 加载配置数据
  console.log('加载系统设置')
})
</script>

<style lang="css" scoped>
.settings-container {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  background-color: #fff;
  padding: 30rpx;
  border-bottom: 1px solid #e5e5e5;
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.page-subtitle {
  font-size: 28rpx;
  color: #666;
}

.settings-sections {
  padding: 20rpx;
}

.settings-section {
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.section-header {
  padding: 30rpx;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.section-badge {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.section-badge.active {
  background-color: #e8f5e9;
  color: #4caf50;
}

.section-badge.inactive {
  background-color: #f5f5f5;
  color: #999;
}

.settings-form {
  padding: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 30rpx;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 1px solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 30rpx;
  background-color: #f8f8f8;
}

.form-input:focus {
  border-color: #1B5E20;
  background-color: #fff;
}

.picker-display {
  height: 88rpx;
  padding: 0 24rpx;
  border: 1px solid #e0e0e0;
  border-radius: 8rpx;
  background-color: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .arrow {
    color: #999;
    font-size: 32rpx;
  }
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .form-label {
    margin-bottom: 0;
  }
}

.section-actions {
  padding: 30rpx;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 20rpx;
  
  button {
    flex: 1;
    height: 88rpx;
    border-radius: 8rpx;
    font-size: 30rpx;
    border: none;
    
  }
}

.section-actions button.test-btn {
  background-color: #f0f0f0;
  color: #333;
}

.section-actions button.backup-btn {
  background-color: #ff9800;
  color: #fff;
}

.section-actions button.save-btn.primary {
  background-color: #1B5E20;
  color: #fff;
}

.section-actions button:disabled {
  opacity: 0.6;
}

.add-btn {
  padding: 12rpx 24rpx;
  background-color: #1B5E20;
  color: #fff;
  border-radius: 6rpx;
  font-size: 26rpx;
  border: none;
}

.template-list {
  padding: 0 30rpx;
}

.template-item {
  padding: 24rpx 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-item:last-child {
  border-bottom: none;
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 30rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.template-type {
  font-size: 26rpx;
  color: #666;
}

.edit-icon {
  color: #1B5E20;
  font-size: 28rpx;
}

.empty-placeholder {
  padding: 60rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.backup-info,
.system-info {
  padding: 20rpx 30rpx;
  background-color: #f8f8f8;
  border-radius: 8rpx;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
}

.info-item:last-child {
  padding-bottom: 0;
}

.info-label {
  font-size: 28rpx;
  color: #666;
  margin-right: 16rpx;
}

.info-value {
  font-size: 28rpx;
  color: #333;
}

/* 模板编辑弹窗 */
.template-editor {
  width: 600rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.editor-header {
  padding: 30rpx;
  border-bottom: 1px solid #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
}

.close-btn {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.editor-form {
  padding: 30rpx;
}

.form-textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  border: 1px solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  background-color: #f8f8f8;
}

.editor-actions {
  padding: 30rpx;
  border-top: 1px solid #e5e5e5;
  display: flex;
  gap: 20rpx;
  
  button {
    flex: 1;
    height: 80rpx;
    border-radius: 8rpx;
    font-size: 30rpx;
    border: none;
    
  }
}

.template-editor button.cancel-btn {
  background-color: #f0f0f0;
  color: #333;
}

.template-editor button.save-btn.primary {
  background-color: #1B5E20;
  color: #fff;
}
</style>