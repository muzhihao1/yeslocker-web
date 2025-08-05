# YesLocker 功能图标库

## 图标清单

### 存取操作图标

#### 1. store-cue.svg - 存杆图标
- **用途**：存放台球杆操作按钮、存杆功能入口
- **设计元素**：杆柜+台球杆插入+绿色锁（安全性）
- **使用场景**：首页快捷操作、杆柜管理页面
- **颜色**：主绿色#1B5E20 + 台球黄#FFA000

#### 2. retrieve-cue.svg - 取杆图标  
- **用途**：取出台球杆操作按钮、取杆功能入口
- **设计元素**：杆柜+台球杆取出+开锁状态+箭头方向
- **使用场景**：首页快捷操作、杆柜管理页面
- **颜色**：主绿色#1B5E20 + 台球黄#FFA000

### 用户操作图标

#### 3. apply.svg - 申请图标
- **用途**：杆柜申请功能、申请页面入口
- **设计元素**：申请表单+笔+用户头像+台球+勾选
- **使用场景**：首页申请按钮、导航菜单
- **颜色**：主绿色#1B5E20 + 台球黄#FFA000

#### 4. login.svg - 登录图标
- **用途**：用户登录按钮、认证页面
- **设计元素**：用户头像+箭头进入+手机+安全锁
- **使用场景**：登录页面、用户中心
- **颜色**：主绿色#1B5E20 + 绿色锁#4CAF50

### 系统功能图标

#### 5. settings.svg - 设置图标
- **用途**：系统设置、个人设置、配置页面
- **设计元素**：简化齿轮+台球装饰
- **使用场景**：个人中心、系统配置页面
- **颜色**：主绿色#1B5E20 + 台球黄#FFA000

#### 6. history.svg - 历史记录图标
- **用途**：存取记录查询、历史操作记录
- **设计元素**：时钟+记录列表+台球杆+存取箭头
- **使用场景**：历史记录页面、统计页面
- **颜色**：主绿色#1B5E20 + 台球黄#FFA000

#### 7. notification.svg - 通知图标
- **用途**：消息通知、系统提醒、推送消息
- **设计元素**：铃铛+红色数字提醒+声波+台球装饰
- **使用场景**：消息中心、通知列表、页面右上角
- **颜色**：主绿色#1B5E20 + 红色提醒#F44336

## 技术实现

### uni-app中使用图标

#### 1. 基础使用方法
```vue
<template>
  <view class="icon-container">
    <!-- 方法1：直接使用image标签 -->
    <image 
      src="@/assets/icons/functional/store-cue.svg" 
      class="icon-md"
      mode="aspectFit"
    />
    
    <!-- 方法2：作为背景图使用 -->
    <view class="icon-bg icon-retrieve"></view>
    
    <!-- 方法3：结合文字使用 -->
    <view class="action-button">
      <image 
        src="@/assets/icons/functional/apply.svg" 
        class="icon-sm"
      />
      <text>申请杆柜</text>
    </view>
  </view>
</template>

<style scoped>
/* 图标尺寸规范 */
.icon-xs { width: 32rpx; height: 32rpx; }    /* 16px */
.icon-sm { width: 40rpx; height: 40rpx; }    /* 20px */
.icon-md { width: 48rpx; height: 48rpx; }    /* 24px - 标准尺寸 */
.icon-lg { width: 64rpx; height: 64rpx; }    /* 32px */
.icon-xl { width: 96rpx; height: 96rpx; }    /* 48px */

/* 背景图标样式 */
.icon-bg {
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.icon-retrieve {
  background-image: url('@/assets/icons/functional/retrieve-cue.svg');
}

/* 组合按钮样式 */
.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
</style>
```

#### 2. 动态图标组件
```vue
<!-- IconButton.vue -->
<template>
  <view 
    class="icon-button" 
    :class="[size, type]"
    @click="handleClick"
  >
    <image 
      :src="iconSrc" 
      class="icon"
      mode="aspectFit"
    />
    <text v-if="label" class="label">{{ label }}</text>
  </view>
</template>

<script>
export default {
  name: 'IconButton',
  props: {
    name: {
      type: String,
      required: true,
      validator: (value) => [
        'store-cue', 'retrieve-cue', 'apply', 
        'login', 'settings', 'history', 'notification'
      ].includes(value)
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    },
    type: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'primary', 'accent'].includes(value)
    },
    label: String
  },
  computed: {
    iconSrc() {
      return require(`@/assets/icons/functional/${this.name}.svg`)
    }
  },
  methods: {
    handleClick() {
      this.$emit('click')
    }
  }
}
</script>

<style scoped>
.icon-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.icon-button.xs .icon { width: 32rpx; height: 32rpx; }
.icon-button.sm .icon { width: 40rpx; height: 40rpx; }
.icon-button.md .icon { width: 48rpx; height: 48rpx; }
.icon-button.lg .icon { width: 64rpx; height: 64rpx; }
.icon-button.xl .icon { width: 96rpx; height: 96rpx; }

.icon-button:active {
  transform: scale(0.95);
}

.label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #757575;
}
</style>
```

#### 3. 使用动态组件
```vue
<template>
  <view class="home-actions">
    <icon-button 
      name="store-cue" 
      label="存杆" 
      size="lg"
      @click="storeCue"
    />
    <icon-button 
      name="retrieve-cue" 
      label="取杆" 
      size="lg"
      @click="retrieveCue"
    />
    <icon-button 
      name="apply" 
      label="申请" 
      size="lg"
      @click="applyLocker"
    />
  </view>
</template>

<script>
import IconButton from '@/components/IconButton.vue'

export default {
  components: {
    IconButton
  },
  methods: {
    storeCue() {
      uni.navigateTo({ url: '/pages/store/store' })
    },
    retrieveCue() {
      uni.navigateTo({ url: '/pages/retrieve/retrieve' })  
    },
    applyLocker() {
      uni.navigateTo({ url: '/pages/apply/apply' })
    }
  }
}
</script>
```

## 设计规范

### 尺寸规范
- **基础尺寸**：24×24px（标准触摸目标）
- **最小尺寸**：16×16px（保证清晰度）
- **推荐尺寸**：
  - 导航图标：20px
  - 操作按钮：24px  
  - 功能入口：32px
  - 首页快捷：48px

### 颜色使用
- **默认状态**：#1B5E20（主绿色）
- **悬停状态**：#4CAF50（浅绿色）
- **激活状态**：#0D2818（深绿色）
- **禁用状态**：#BDBDBD（灰色）
- **装饰元素**：#FFA000（台球黄）

### 交互状态
```css
/* 默认状态 */
.icon-default {
  opacity: 1;
  transform: scale(1);
  transition: all 0.3s ease;
}

/* 悬停状态 */
.icon-default:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

/* 激活状态 */
.icon-default:active {
  opacity: 0.6;
  transform: scale(0.95);
}

/* 禁用状态 */
.icon-disabled {
  opacity: 0.4;
  pointer-events: none;
}
```

## 使用场景指南

### 首页快捷操作
```vue
<view class="quick-actions">
  <icon-button name="store-cue" label="存杆" size="xl" />
  <icon-button name="retrieve-cue" label="取杆" size="xl" />
  <icon-button name="apply" label="申请" size="xl" />
</view>
```

### 底部导航栏
```vue
<view class="tab-bar">
  <icon-button name="history" label="记录" size="md" />
  <icon-button name="notification" label="消息" size="md" />
  <icon-button name="settings" label="设置" size="md" />
</view>
```

### 功能按钮
```vue
<button class="primary-btn">
  <image src="@/assets/icons/functional/login.svg" class="icon-sm" />
  <text>登录</text>
</button>
```

## 注意事项

### ✅ 正确使用
- 保持图标的原始比例，不要拉伸变形
- 使用合适的尺寸，确保点击目标不小于44rpx×44rpx
- 在深色背景上适当调整透明度或使用白色版本
- 为图标提供必要的文字标签，提高可访问性

### ❌ 避免错误
- 不要改变SVG文件的内部结构和颜色定义
- 不要在小尺寸下使用复杂图标
- 不要在同一页面混用不同风格的图标
- 不要忽略图标的语义，避免混淆用户

### 性能优化
- SVG图标会被打包到应用中，注意控制总体积
- 对于频繁使用的图标，考虑预加载
- 在列表中大量使用时，考虑图标的渲染性能

---

**创建者**：Terminal 3 - UI/UX设计师  
**版本**：v1.0  
**创建时间**：2024年8月2日  
**适用平台**：uni-app H5 + 小程序