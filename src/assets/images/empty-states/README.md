# 空状态插画使用指南

## 插画清单

### 1. empty-locker.svg - 无杆柜数据
- **尺寸**：160×160px
- **用途**：当用户还没有申请任何杆柜时显示
- **设计元素**：空杆柜 + 虚线台球杆轮廓
- **使用场景**：
  - 我的杆柜页面无数据时
  - 新用户首次访问
  - 数据加载失败后的降级显示

### 2. empty-apply.svg - 无申请记录  
- **尺寸**：160×160px
- **用途**：当用户没有任何申请记录时显示
- **设计元素**：申请表单 + 8号球装饰
- **使用场景**：
  - 申请记录列表为空
  - 申请历史页面无数据
  - 筛选后无符合条件的申请

### 3. empty-record.svg - 无使用记录
- **尺寸**：160×160px  
- **用途**：当杆柜没有使用记录时显示
- **设计元素**：日历 + 时钟 + 台球杆装饰
- **使用场景**：
  - 使用记录页面无数据
  - 新申请的杆柜尚未使用
  - 特定时间段内无使用记录

### 4. empty-notification.svg - 无通知消息
- **尺寸**：160×160px
- **用途**：当没有通知消息时显示  
- **设计元素**：静音铃铛 + 睡眠符号 + 消息气泡
- **使用场景**：
  - 通知中心无消息
  - 消息列表为空
  - 清空所有通知后

### 5. empty-search.svg - 无搜索结果
- **尺寸**：160×160px
- **用途**：当搜索无结果时显示
- **设计元素**：放大镜 + 问号 + 台球装饰
- **使用场景**：
  - 搜索门店无结果
  - 搜索杆柜无结果  
  - 任何搜索功能无匹配项

## 使用示例

### 在uni-app中使用

```vue
<template>
  <!-- 空杆柜状态 -->
  <view class="empty-state" v-if="lockerList.length === 0">
    <image 
      src="@/assets/images/empty-states/empty-locker.svg" 
      class="empty-image"
      mode="aspectFit"
    />
    <text class="empty-title">还没有杆柜</text>
    <text class="empty-desc">立即申请专属杆柜，安全存放您的爱杆</text>
    <button class="primary-button" @click="goToApply">申请杆柜</button>
  </view>

  <!-- 无搜索结果 -->
  <view class="empty-state" v-if="searchResults.length === 0 && hasSearched">
    <image 
      src="@/assets/images/empty-states/empty-search.svg" 
      class="empty-image"
      mode="aspectFit"
    />
    <text class="empty-title">未找到相关结果</text>
    <text class="empty-desc">试试其他关键词或查看全部门店</text>
  </view>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  min-height: 600rpx;
}

.empty-image {
  width: 320rpx;
  height: 320rpx;
  margin-bottom: 32rpx;
}

.empty-title {
  font-size: 34rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 28rpx;
  color: #666;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 48rpx;
}

.primary-button {
  background: #1B5E20;
  color: #FFFFFF;
  padding: 24rpx 48rpx;
  border-radius: 8rpx;
  font-size: 30rpx;
}
</style>
```

### 空状态组件封装

```vue
<!-- EmptyState.vue -->
<template>
  <view class="empty-state-container">
    <image 
      :src="imageSrc" 
      class="empty-state-image"
      mode="aspectFit"
    />
    <text class="empty-state-title">{{ title }}</text>
    <text class="empty-state-description" v-if="description">
      {{ description }}
    </text>
    <slot name="action"></slot>
  </view>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    type: {
      type: String,
      required: true,
      validator: (value) => [
        'locker', 
        'apply', 
        'record', 
        'notification', 
        'search'
      ].includes(value)
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  },
  computed: {
    imageSrc() {
      return require(`@/assets/images/empty-states/empty-${this.type}.svg`)
    }
  }
}
</script>

<style scoped>
.empty-state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 40rpx;
  text-align: center;
}

.empty-state-image {
  width: 320rpx;
  height: 320rpx;
  margin-bottom: 40rpx;
  opacity: 0.9;
}

.empty-state-title {
  font-size: 32rpx;
  color: #333333;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.empty-state-description {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
  max-width: 500rpx;
  margin-bottom: 40rpx;
}
</style>
```

### 使用空状态组件

```vue
<template>
  <view class="page">
    <!-- 无申请记录 -->
    <empty-state 
      v-if="applyList.length === 0"
      type="apply"
      title="还没有申请记录"
      description="申请杆柜，开启您的专属球杆管理服务"
    >
      <template #action>
        <button class="action-button" @click="startApply">
          立即申请
        </button>
      </template>
    </empty-state>

    <!-- 无通知消息 -->
    <empty-state 
      v-if="notifications.length === 0"
      type="notification"
      title="暂无新消息"
      description="有重要通知时我们会第一时间告知您"
    />
  </view>
</template>

<script>
import EmptyState from '@/components/EmptyState.vue'

export default {
  components: {
    EmptyState
  },
  // ...
}
</script>
```

## 设计规范

### 视觉风格
- **主色调**：灰色系（#E0E0E0, #BDBDBD, #9E9E9E）
- **背景色**：#FAFAFA（浅灰）
- **线条风格**：简洁线条 + 虚线装饰
- **图形风格**：扁平化 + 轻拟物

### 文案建议
- **标题**：简短明了，4-6个字
- **描述**：友好亲切，提供引导
- **按钮**：动作明确，积极正向

### 使用原则
1. **适时展示**：只在真正无数据时显示
2. **提供引导**：告诉用户下一步该做什么
3. **保持一致**：同类场景使用相同插画
4. **避免频繁**：减少空状态出现频率

## 配套颜色方案

```css
/* 空状态相关颜色 */
.empty-state {
  --empty-bg: #FAFAFA;
  --empty-border: #E0E0E0;
  --empty-text-primary: #333333;
  --empty-text-secondary: #666666;
  --empty-text-tertiary: #9E9E9E;
  --empty-icon-stroke: #E0E0E0;
  --empty-icon-fill: #BDBDBD;
}
```

---

**制作者**：Terminal 3 - UI/UX设计师  
**版本**：v1.0  
**创建时间**：2024年8月2日  
**适用项目**：YesLocker台球杆柜管理小程序