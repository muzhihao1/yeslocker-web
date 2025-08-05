# 状态图标使用指南

## 图标清单

### 1. success.svg - 成功状态
- **用途**：操作成功、验证通过、提交完成
- **颜色**：#4CAF50（绿色）
- **场景**：
  - 杆柜申请成功
  - 存取操作完成
  - 登录成功提示

### 2. error.svg - 错误状态  
- **用途**：操作失败、验证错误、异常提示
- **颜色**：#F44336（红色）
- **场景**：
  - 登录失败
  - 申请被拒绝
  - 网络错误

### 3. warning.svg - 警告状态
- **用途**：重要提醒、注意事项、风险提示
- **颜色**：#FF9800（橙色）
- **场景**：
  - 3个月未使用提醒
  - 杆柜即将到期
  - 输入验证警告

### 4. loading.svg - 加载状态
- **用途**：数据加载、异步操作、等待状态
- **颜色**：#1B5E20（主绿色）
- **特性**：包含旋转动画
- **场景**：
  - 页面加载
  - 提交处理中
  - 数据获取中

### 5. empty.svg - 空状态
- **用途**：无数据、空列表、占位提示
- **颜色**：#BDBDBD（灰色）
- **场景**：
  - 无申请记录
  - 无使用历史
  - 搜索无结果

## 使用示例

### 在uni-app中使用

```vue
<template>
  <!-- 成功提示 -->
  <view class="status-message success">
    <image 
      src="@/assets/icons/status/success.svg" 
      class="status-icon"
    />
    <text>操作成功！</text>
  </view>

  <!-- 错误提示 -->
  <view class="status-message error">
    <image 
      src="@/assets/icons/status/error.svg" 
      class="status-icon"
    />
    <text>操作失败，请重试</text>
  </view>

  <!-- 加载状态 -->
  <view class="loading-container" v-if="isLoading">
    <image 
      src="@/assets/icons/status/loading.svg" 
      class="loading-icon"
    />
    <text>加载中...</text>
  </view>
</template>

<style scoped>
.status-message {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-radius: 8rpx;
  margin: 16rpx 0;
}

.status-icon {
  width: 48rpx;
  height: 48rpx;
  margin-right: 16rpx;
}

.success {
  background: #E8F5E9;
  color: #2E7D32;
}

.error {
  background: #FFEBEE;
  color: #C62828;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.loading-icon {
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 16rpx;
}
</style>
```

### 状态组件封装

```vue
<!-- StatusMessage.vue -->
<template>
  <view 
    class="status-message" 
    :class="type"
    v-if="visible"
  >
    <image 
      :src="iconSrc" 
      class="status-icon"
    />
    <text class="status-text">{{ message }}</text>
  </view>
</template>

<script>
export default {
  name: 'StatusMessage',
  props: {
    type: {
      type: String,
      default: 'info',
      validator: (value) => ['success', 'error', 'warning', 'loading', 'empty'].includes(value)
    },
    message: {
      type: String,
      required: true
    },
    visible: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    iconSrc() {
      return require(`@/assets/icons/status/${this.type}.svg`)
    }
  }
}
</script>

<style scoped>
.status-message {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-radius: 12rpx;
  margin: 16rpx 0;
  transition: all 0.3s ease;
}

.status-icon {
  width: 48rpx;
  height: 48rpx;
  margin-right: 16rpx;
}

.status-text {
  font-size: 28rpx;
  flex: 1;
}

/* 不同状态的样式 */
.success {
  background: #E8F5E9;
  color: #2E7D32;
}

.error {
  background: #FFEBEE;
  color: #C62828;
}

.warning {
  background: #FFF3E0;
  color: #E65100;
}

.loading {
  background: #F5F5F5;
  color: #616161;
}

.empty {
  background: #FAFAFA;
  color: #9E9E9E;
}
</style>
```

### 使用状态组件

```vue
<template>
  <view class="page">
    <!-- 成功状态 -->
    <status-message 
      type="success" 
      message="杆柜申请已提交成功！"
    />

    <!-- 错误状态 -->
    <status-message 
      type="error" 
      message="网络连接失败，请检查网络设置"
    />

    <!-- 警告状态 -->
    <status-message 
      type="warning" 
      message="您的杆柜已3个月未使用"
    />

    <!-- 加载状态 -->
    <status-message 
      type="loading" 
      message="正在加载数据..."
      v-if="isLoading"
    />

    <!-- 空状态 -->
    <status-message 
      type="empty" 
      message="暂无相关记录"
      v-if="isEmpty"
    />
  </view>
</template>

<script>
import StatusMessage from '@/components/StatusMessage.vue'

export default {
  components: {
    StatusMessage
  },
  data() {
    return {
      isLoading: false,
      isEmpty: false
    }
  }
}
</script>
```

## 设计规范

### 尺寸规范
- **标准尺寸**：24×24px
- **小尺寸**：16×16px（用于行内提示）
- **大尺寸**：32×32px（用于页面中心）

### 颜色规范
- **成功**：#4CAF50
- **错误**：#F44336
- **警告**：#FF9800
- **加载**：#1B5E20（主题色）
- **空状态**：#BDBDBD

### 使用原则
1. **一致性**：同类状态使用相同图标
2. **可识别**：图标含义清晰明确
3. **适度使用**：避免过多状态提示干扰用户
4. **配合文字**：重要状态需配合文字说明

## 响应式适配

```css
/* 不同屏幕尺寸的适配 */
/* 小屏幕 */
@media (max-width: 375px) {
  .status-icon {
    width: 40rpx;
    height: 40rpx;
  }
}

/* 大屏幕 */
@media (min-width: 768px) {
  .status-icon {
    width: 56rpx;
    height: 56rpx;
  }
}
```

---

**制作者**：Terminal 3 - UI/UX设计师  
**版本**：v1.0  
**创建时间**：2024年8月2日  
**适用项目**：YesLocker台球杆柜管理小程序