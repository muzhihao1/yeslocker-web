# 结果状态插画使用指南

## 插画清单

### 成功状态插画

#### 1. success-apply.svg - 申请成功
- **尺寸**：200×200px
- **主色调**：绿色系 (#4CAF50, #E8F5E9)
- **设计元素**：对勾 + 申请表单 + 批准印章 + 台球装饰
- **使用场景**：
  - 杆柜申请提交成功页面
  - 申请审核通过通知
  - 成功提交反馈页面

#### 2. success-locker.svg - 存取成功
- **尺寸**：200×200px
- **主色调**：绿色系 (#4CAF50, #E8F5E9)
- **设计元素**：开启的杆柜 + 球杆 + 成功标志 + 光芒效果
- **使用场景**：
  - 存杆操作成功
  - 取杆操作成功
  - 杆柜开锁确认
  - 操作完成反馈

### 失败状态插画

#### 3. failure-apply.svg - 申请失败
- **尺寸**：200×200px
- **主色调**：红色系 (#F44336, #FFEBEE)
- **设计元素**：叉号 + 拒绝印章 + 失望台球 + 问号
- **使用场景**：
  - 申请被拒绝通知
  - 审核不通过页面
  - 申请条件不符提示

#### 4. failure-locker.svg - 设备故障
- **尺寸**：200×200px
- **主色调**：红色系 (#F44336, #FFEBEE)
- **设计元素**：故障杆柜 + 破损锁具 + 错误波形 + 警告标志
- **使用场景**：
  - 杆柜无法开启
  - 设备故障提示
  - 网络连接失败
  - 系统异常页面

## 使用示例

### 结果页面组件

```vue
<!-- ResultPage.vue -->
<template>
  <view class="result-page">
    <!-- 结果插画 -->
    <image 
      :src="resultImage" 
      class="result-illustration"
      mode="aspectFit"
    />
    
    <!-- 结果标题 -->
    <text class="result-title" :class="resultType">
      {{ resultTitle }}
    </text>
    
    <!-- 结果描述 -->
    <text class="result-description">
      {{ resultDescription }}
    </text>
    
    <!-- 操作按钮 -->
    <view class="result-actions">
      <button 
        v-for="action in actions" 
        :key="action.key"
        :class="['result-button', action.type]"
        @click="handleAction(action.key)"
      >
        {{ action.text }}
      </button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ResultPage',
  props: {
    type: {
      type: String,
      required: true,
      validator: (value) => [
        'success-apply',
        'success-locker', 
        'failure-apply',
        'failure-locker'
      ].includes(value)
    },
    title: String,
    description: String,
    actions: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    resultImage() {
      return require(`@/assets/images/result-states/${this.type}.svg`)
    },
    resultType() {
      return this.type.startsWith('success') ? 'success' : 'failure'
    },
    resultTitle() {
      return this.title || this.getDefaultTitle()
    },
    resultDescription() {
      return this.description || this.getDefaultDescription()
    }
  },
  methods: {
    getDefaultTitle() {
      const titles = {
        'success-apply': '申请提交成功！',
        'success-locker': '操作成功完成！',
        'failure-apply': '申请未通过审核',
        'failure-locker': '操作失败，请重试'
      }
      return titles[this.type]
    },
    getDefaultDescription() {
      const descriptions = {
        'success-apply': '您的杆柜申请已提交，预计1-2小时内完成审核',
        'success-locker': '您的球杆已安全存放，感谢使用YesLocker',
        'failure-apply': '很抱歉，您的申请暂时无法通过，请检查申请信息',
        'failure-locker': '系统暂时无法处理您的请求，请稍后重试或联系客服'
      }
      return descriptions[this.type]
    },
    handleAction(actionKey) {
      this.$emit('action', actionKey)
    }
  }
}
</script>

<style scoped>
.result-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
  min-height: 100vh;
  background: #FAFAFA;
}

.result-illustration {
  width: 400rpx;
  height: 400rpx;
  margin-bottom: 40rpx;
}

.result-title {
  font-size: 36rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  text-align: center;
}

.result-title.success {
  color: #1B5E20;
}

.result-title.failure {
  color: #C62828;
}

.result-description {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 60rpx;
  max-width: 500rpx;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 100%;
  max-width: 400rpx;
}

.result-button {
  padding: 28rpx 48rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  transition: all 0.3s ease;
}

.result-button.primary {
  background: #1B5E20;
  color: #FFFFFF;
}

.result-button.secondary {
  background: #FFFFFF;
  color: #1B5E20;
  border: 2rpx solid #1B5E20;
}

.result-button.danger {
  background: #F44336;
  color: #FFFFFF;
}
</style>
```

### 使用示例

```vue
<template>
  <view>
    <!-- 申请成功页面 -->
    <result-page 
      v-if="showResult"
      type="success-apply"
      title="申请提交成功！"
      description="您的杆柜申请已提交，我们将在1-2小时内完成审核，请耐心等待。"
      :actions="[
        { key: 'home', text: '返回首页', type: 'primary' },
        { key: 'status', text: '查看状态', type: 'secondary' }
      ]"
      @action="handleResultAction"
    />

    <!-- 存杆成功页面 -->
    <result-page 
      v-if="showLockerSuccess"
      type="success-locker"
      title="存杆成功！"
      description="您的球杆已安全存放在08号杆柜中，感谢使用YesLocker。"
      :actions="[
        { key: 'home', text: '返回首页', type: 'primary' },
        { key: 'record', text: '查看记录', type: 'secondary' }
      ]"
      @action="handleResultAction"
    />

    <!-- 申请失败页面 -->
    <result-page 
      v-if="showApplyFailure"
      type="failure-apply" 
      title="申请未通过"
      description="很抱歉，您的申请暂时无法通过。请检查申请信息是否完整或联系客服了解详情。"
      :actions="[
        { key: 'retry', text: '重新申请', type: 'primary' },
        { key: 'service', text: '联系客服', type: 'secondary' }
      ]"
      @action="handleResultAction"
    />

    <!-- 设备故障页面 -->
    <result-page 
      v-if="showLockerFailure"
      type="failure-locker"
      title="操作失败"
      description="系统暂时无法处理您的请求，请稍后重试。如问题持续存在，请联系现场工作人员。"
      :actions="[
        { key: 'retry', text: '重新尝试', type: 'primary' },
        { key: 'service', text: '联系客服', type: 'danger' }
      ]"
      @action="handleResultAction"
    />
  </view>
</template>

<script>
import ResultPage from '@/components/ResultPage.vue'

export default {
  components: {
    ResultPage
  },
  data() {
    return {
      showResult: false,
      showLockerSuccess: false,
      showApplyFailure: false,
      showLockerFailure: false
    }
  },
  methods: {
    handleResultAction(actionKey) {
      switch (actionKey) {
        case 'home':
          uni.switchTab({ url: '/pages/index/index' })
          break
        case 'retry':
          this.retryOperation()
          break
        case 'service':
          this.contactService()
          break
        case 'status':
          uni.navigateTo({ url: '/pages/apply/status' })
          break
        case 'record':
          uni.navigateTo({ url: '/pages/record/index' })
          break
      }
    },
    
    retryOperation() {
      // 重试逻辑
    },
    
    contactService() {
      // 联系客服逻辑
    }
  }
}
</script>
```

## 设计规范

### 颜色规范

#### 成功状态
- **主色**：#4CAF50（成功绿）
- **背景**：#E8F5E9（浅绿背景）
- **强调**：#1B5E20（深绿强调）

#### 失败状态  
- **主色**：#F44336（错误红）
- **背景**：#FFEBEE（浅红背景）
- **强调**：#C62828（深红强调）

### 使用原则

1. **及时反馈**：操作完成后立即显示结果
2. **清晰明确**：图标和文字要表意清楚
3. **情感化设计**：通过颜色和图形传达情感
4. **引导操作**：提供明确的下一步操作指引

### 动画建议

```css
/* 插画入场动画 */
.result-illustration {
  animation: slideInUp 0.6s ease-out;
}

@keyframes slideInUp {
  from {
    transform: translateY(100rpx);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 成功状态特效 */
.success .result-illustration {
  animation: successPulse 0.8s ease-in-out;
}

@keyframes successPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

## 扩展使用

### 1. 弹窗结果反馈
```vue
<!-- 小型结果弹窗 -->
<uni-popup ref="resultPopup" type="center">
  <view class="result-popup">
    <image :src="resultIcon" class="popup-icon" />
    <text class="popup-title">{{ resultTitle }}</text>
    <text class="popup-desc">{{ resultDesc }}</text>
  </view>
</uni-popup>
```

### 2. Toast 消息
```javascript
// 成功提示
uni.showToast({
  title: '操作成功',
  icon: 'success',
  duration: 2000
})

// 失败提示  
uni.showToast({
  title: '操作失败',
  icon: 'error',
  duration: 2000
})
```

---

**制作者**：Terminal 3 - UI/UX设计师  
**版本**：v1.0  
**创建时间**：2024年8月2日  
**适用项目**：YesLocker台球杆柜管理小程序