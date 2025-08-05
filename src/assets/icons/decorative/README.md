# 装饰图标使用指南

## 图标清单

### 1. billiard-ball.svg - 台球图标
- **尺寸**：24×24px
- **颜色**：深绿色球体 (#1B5E20) + 白色条纹
- **设计**：经典8号球设计
- **用途**：
  - 页面装饰元素
  - 加载动画元素
  - 特色功能标识
  - 活动标记

### 2. cue-stick.svg - 球杆图标  
- **尺寸**：24×24px
- **颜色**：木纹色杆身 (#8D6E63) + 绿色杆尖 (#1B5E20)
- **设计**：45度倾斜展示的专业球杆
- **用途**：
  - 存取杆功能装饰
  - 用户等级标识
  - 功能引导元素
  - 列表项装饰

### 3. store.svg - 门店图标
- **尺寸**：24×24px
- **颜色**：绿色屋顶 (#1B5E20) + 黄色招牌 (#FFA000)
- **设计**：友好的店面形象
- **用途**：
  - 门店列表标识
  - 地图标记图标
  - 门店选择装饰
  - 导航菜单图标

### 4. locker.svg - 杆柜图标
- **尺寸**：24×24px  
- **颜色**：绿色边框 (#1B5E20) + 黄色锁具 (#FFA000)
- **设计**：双层储物柜样式
- **用途**：
  - 杆柜状态展示
  - 功能模块标识
  - 列表项前缀
  - 统计图表元素

## 使用示例

### 基础使用

```vue
<template>
  <!-- 作为装饰元素 -->
  <view class="feature-card">
    <image 
      src="@/assets/icons/decorative/billiard-ball.svg" 
      class="decoration-icon"
    />
    <text class="feature-title">专业球杆管理</text>
  </view>

  <!-- 列表项装饰 -->
  <view class="store-item">
    <image 
      src="@/assets/icons/decorative/store.svg" 
      class="item-icon"
    />
    <text>望京SOHO店</text>
  </view>
</template>

<style scoped>
.decoration-icon {
  width: 48rpx;
  height: 48rpx;
  margin-right: 16rpx;
}

.item-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
}
</style>
```

### 动画效果

```vue
<template>
  <!-- 旋转的台球 -->
  <view class="loading-container">
    <image 
      src="@/assets/icons/decorative/billiard-ball.svg" 
      class="rotating-ball"
    />
    <text>加载中...</text>
  </view>
</template>

<style scoped>
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.rotating-ball {
  width: 60rpx;
  height: 60rpx;
  animation: rotate 2s linear infinite;
}
</style>
```

### 组合使用

```vue
<template>
  <!-- 功能入口卡片 -->
  <view class="function-grid">
    <view class="function-item">
      <view class="icon-wrapper green">
        <image src="@/assets/icons/decorative/cue-stick.svg" />
      </view>
      <text>我的球杆</text>
    </view>
    
    <view class="function-item">
      <view class="icon-wrapper orange">
        <image src="@/assets/icons/decorative/locker.svg" />
      </view>
      <text>杆柜管理</text>
    </view>
    
    <view class="function-item">
      <view class="icon-wrapper blue">
        <image src="@/assets/icons/decorative/store.svg" />
      </view>
      <text>附近门店</text>
    </view>
  </view>
</template>

<style scoped>
.function-grid {
  display: flex;
  justify-content: space-around;
  padding: 32rpx;
}

.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon-wrapper {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.icon-wrapper.green {
  background: #E8F5E9;
}

.icon-wrapper.orange {
  background: #FFF3E0;
}

.icon-wrapper.blue {
  background: #E3F2FD;
}

.icon-wrapper image {
  width: 48rpx;
  height: 48rpx;
}
</style>
```

### 背景装饰

```vue
<template>
  <view class="hero-section">
    <!-- 背景装饰图标 -->
    <image 
      src="@/assets/icons/decorative/billiard-ball.svg" 
      class="bg-decoration ball-1"
    />
    <image 
      src="@/assets/icons/decorative/cue-stick.svg" 
      class="bg-decoration cue-1"
    />
    
    <!-- 主要内容 -->
    <view class="hero-content">
      <text class="hero-title">欢迎使用YesLocker</text>
      <text class="hero-subtitle">您的专属球杆管家</text>
    </view>
  </view>
</template>

<style scoped>
.hero-section {
  position: relative;
  padding: 80rpx 32rpx;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  opacity: 0.1;
}

.ball-1 {
  width: 120rpx;
  height: 120rpx;
  top: 20rpx;
  right: -40rpx;
  transform: rotate(15deg);
}

.cue-1 {
  width: 160rpx;
  height: 160rpx;
  bottom: -40rpx;
  left: -20rpx;
  transform: rotate(-30deg);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}
</style>
```

## 设计规范

### 使用原则
1. **主题一致**：保持台球运动主题的视觉连贯性
2. **适度使用**：避免过度装饰影响信息传达
3. **层次分明**：装饰图标不应喧宾夺主
4. **响应适配**：根据屏幕大小调整图标尺寸

### 颜色搭配
- **主色调**：#1B5E20（深绿）
- **辅助色**：#4CAF50（中绿）、#FFA000（橙黄）
- **中性色**：#F5F5F5（浅灰）、#E0E0E0（灰）

### 尺寸建议
- **小尺寸**：16×16px（行内装饰）
- **标准尺寸**：24×24px（列表、按钮）
- **大尺寸**：48×48px（卡片、功能入口）
- **特大尺寸**：80×80px（空状态、引导页）

## 扩展应用

### 1. 加载动画组件
```javascript
// 使用台球图标创建加载动画
const BilliardLoader = {
  template: `
    <view class="billiard-loader">
      <image 
        v-for="i in 3" 
        :key="i"
        :src="ballIcon"
        :class="['ball', 'ball-' + i]"
        :style="{ animationDelay: (i * 0.2) + 's' }"
      />
    </view>
  `,
  data() {
    return {
      ballIcon: '@/assets/icons/decorative/billiard-ball.svg'
    }
  }
}
```

### 2. 等级徽章
```javascript
// 使用球杆图标表示用户等级
const UserLevel = {
  props: ['level'],
  computed: {
    cueCount() {
      return Math.min(Math.floor(this.level / 10), 5)
    }
  }
}
```

---

**制作者**：Terminal 3 - UI/UX设计师  
**版本**：v1.0  
**创建时间**：2024年8月2日  
**适用项目**：YesLocker台球杆柜管理小程序