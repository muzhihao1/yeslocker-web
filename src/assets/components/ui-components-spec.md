# YesLocker UI组件设计规范

## 目录

1. [设计原则](#设计原则)
2. [颜色系统](#颜色系统)
3. [字体规范](#字体规范)
4. [间距系统](#间距系统)
5. [按钮组件](#按钮组件)
6. [输入框组件](#输入框组件)
7. [卡片组件](#卡片组件)
8. [弹窗组件](#弹窗组件)
9. [导航组件](#导航组件)
10. [列表组件](#列表组件)
11. [表单组件](#表单组件)
12. [反馈组件](#反馈组件)

---

## 设计原则

### 核心理念
- **简洁直观**：界面简洁，操作直观
- **台球主题**：融入台球运动元素
- **一致性**：保持视觉和交互一致
- **响应式**：适配不同屏幕尺寸

### 设计价值观
1. **用户第一**：以用户体验为中心
2. **功能导向**：设计服务于功能
3. **品质感**：体现专业和品质
4. **亲和力**：友好易用的界面

---

## 颜色系统

### 主要颜色

```css
:root {
  /* 主色调 - 台球绿 */
  --primary: #1B5E20;          /* 深绿 - 主要操作、重要信息 */
  --primary-light: #4CAF50;    /* 中绿 - 悬停状态、次要操作 */
  --primary-lighter: #E8F5E9;  /* 浅绿 - 背景、标签 */
  
  /* 辅助色 */
  --secondary: #FFA000;        /* 主黄 - 警告、提醒信息 */
  --secondary-light: #FFD54F;  /* 浅黄 - 悬停状态 */
  --secondary-lighter: #FFF3E0; /* 极浅黄 - 背景 */
  
  /* 功能色 */
  --success: #4CAF50;          /* 成功 */
  --warning: #FF9800;          /* 警告 */
  --error: #F44336;            /* 错误 */
  --info: #2196F3;             /* 信息 */
  
  /* 中性色 */
  --text-primary: #212121;     /* 主要文字 */
  --text-secondary: #757575;   /* 次要文字 */
  --text-tertiary: #BDBDBD;    /* 辅助文字 */
  --text-disabled: #E0E0E0;    /* 禁用文字 */
  
  /* 背景色 */
  --bg-primary: #FFFFFF;       /* 主背景 */
  --bg-secondary: #FAFAFA;     /* 次背景 */
  --bg-tertiary: #F5F5F5;      /* 三级背景 */
  
  /* 边框色 */
  --border-light: #E0E0E0;     /* 浅边框 */
  --border-medium: #BDBDBD;    /* 中边框 */
  --border-dark: #757575;      /* 深边框 */
}
```

### 颜色使用指南

| 颜色 | 使用场景 | 避免使用 |
|------|----------|----------|
| 主绿色 | 主要按钮、重要状态、品牌标识 | 大面积背景、警告信息 |
| 辅助黄 | 警告提示、重要标记、装饰元素 | 错误信息、成功状态 |
| 功能色 | 对应功能的反馈和状态 | 装饰性元素 |
| 中性色 | 文字、边框、背景 | 强调元素 |

---

## 字体规范

### 字体族
```css
font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif;
```

### 字体尺寸系统

```css
:root {
  /* 标题字体 */
  --font-size-h1: 48rpx;       /* 主标题 */
  --font-size-h2: 40rpx;       /* 二级标题 */
  --font-size-h3: 36rpx;       /* 三级标题 */
  --font-size-h4: 32rpx;       /* 四级标题 */
  
  /* 正文字体 */
  --font-size-large: 32rpx;    /* 大号正文 */
  --font-size-base: 28rpx;     /* 基础正文 */
  --font-size-small: 24rpx;    /* 小号正文 */
  --font-size-xs: 20rpx;       /* 辅助信息 */
  
  /* 字重 */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 600;
  --font-weight-heavy: 700;
}
```

### 行高规范
- **标题行高**：1.2-1.3
- **正文行高**：1.4-1.6
- **辅助文字行高**：1.3-1.4

---

## 间距系统

### 间距单位
```css
:root {
  --spacing-xs: 8rpx;          /* 超小间距 */
  --spacing-sm: 16rpx;         /* 小间距 */
  --spacing-md: 24rpx;         /* 中等间距 */
  --spacing-lg: 32rpx;         /* 大间距 */
  --spacing-xl: 48rpx;         /* 超大间距 */
  --spacing-xxl: 64rpx;        /* 特大间距 */
}
```

### 间距使用指南
- **组件内部**：xs-sm (8-16rpx)
- **组件之间**：md-lg (24-32rpx)
- **区块之间**：xl-xxl (48-64rpx)
- **页面边距**：lg-xl (32-48rpx)

---

## 按钮组件

### 按钮类型

#### 1. 主要按钮 (Primary Button)
```css
.btn-primary {
  background-color: var(--primary);
  color: #FFFFFF;
  border: none;
  border-radius: 12rpx;
  padding: 28rpx 48rpx;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background-color: var(--primary-light);
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 24rpx rgba(27, 94, 32, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 4rpx 12rpx rgba(27, 94, 32, 0.3);
}
```

#### 2. 次要按钮 (Secondary Button)
```css
.btn-secondary {
  background-color: transparent;
  color: var(--primary);
  border: 2rpx solid var(--primary);
  border-radius: 12rpx;
  padding: 26rpx 46rpx;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background-color: var(--primary-lighter);
  border-color: var(--primary-light);
}
```

#### 3. 文字按钮 (Text Button)
```css
.btn-text {
  background-color: transparent;
  color: var(--primary);
  border: none;
  padding: 16rpx 24rpx;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  transition: all 0.3s ease;
}

.btn-text:hover {
  color: var(--primary-light);
  background-color: var(--primary-lighter);
  border-radius: 8rpx;
}
```

### 按钮尺寸

```css
/* 大按钮 */
.btn-large {
  padding: 32rpx 64rpx;
  font-size: var(--font-size-large);
  border-radius: 16rpx;
}

/* 中按钮（默认） */
.btn-medium {
  padding: 28rpx 48rpx;
  font-size: var(--font-size-base);
  border-radius: 12rpx;
}

/* 小按钮 */
.btn-small {
  padding: 20rpx 32rpx;
  font-size: var(--font-size-small);
  border-radius: 8rpx;
}

/* 迷你按钮 */
.btn-mini {
  padding: 16rpx 24rpx;
  font-size: var(--font-size-xs);
  border-radius: 6rpx;
}
```

### 特殊按钮

#### 悬浮按钮 (Floating Button)
```css
.btn-floating {
  position: fixed;
  bottom: 120rpx;
  right: 48rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: var(--primary);
  color: #FFFFFF;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(27, 94, 32, 0.4);
  z-index: 999;
}
```

#### 图标按钮 (Icon Button)
```css
.btn-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon image {
  width: 40rpx;
  height: 40rpx;
}
```

---

## 输入框组件

### 基础输入框

```css
.input-wrapper {
  position: relative;
  margin-bottom: var(--spacing-md);
}

.input-field {
  width: 100%;
  padding: 28rpx 32rpx;
  border: 2rpx solid var(--border-light);
  border-radius: 12rpx;
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background-color: var(--bg-primary);
  transition: all 0.3s ease;
}

.input-field:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4rpx var(--primary-lighter);
  outline: none;
}

.input-field::placeholder {
  color: var(--text-tertiary);
}
```

### 输入框状态

#### 错误状态
```css
.input-field.error {
  border-color: var(--error);
  background-color: #FFEBEE;
}

.input-field.error:focus {
  box-shadow: 0 0 0 4rpx rgba(244, 67, 54, 0.1);
}

.input-error-message {
  color: var(--error);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-xs);
}
```

#### 成功状态
```css
.input-field.success {
  border-color: var(--success);
  background-color: #E8F5E9;
}
```

### 输入框变体

#### 带标签输入框
```css
.input-label {
  display: block;
  color: var(--text-secondary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-xs);
}

.input-required::after {
  content: '*';
  color: var(--error);
  margin-left: 4rpx;
}
```

#### 带图标输入框
```css
.input-with-icon {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 40rpx;
  height: 40rpx;
  opacity: 0.6;
}

.input-with-icon .input-field {
  padding-left: 96rpx;
}
```

---

## 卡片组件

### 基础卡片

```css
.card {
  background-color: var(--bg-primary);
  border-radius: 16rpx;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}
```

### 卡片变体

#### 杆柜卡片
```css
.locker-card {
  border: 2rpx solid var(--border-light);
  border-radius: 16rpx;
  padding: var(--spacing-lg);
  position: relative;
  overflow: hidden;
}

.locker-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 8rpx;
  height: 100%;
  background-color: var(--primary);
}

.locker-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.locker-card-title {
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.locker-card-status {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.status-active {
  background-color: var(--primary-lighter);
  color: var(--primary);
}

.status-expired {
  background-color: #FFEBEE;
  color: var(--error);
}
```

#### 门店卡片
```css
.store-card {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  border: 2rpx solid var(--border-light);
  border-radius: 12rpx;
  margin-bottom: var(--spacing-sm);
}

.store-card-icon {
  width: 80rpx;
  height: 80rpx;
  margin-right: var(--spacing-md);
  border-radius: 8rpx;
  background-color: var(--primary-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
}

.store-card-info {
  flex: 1;
}

.store-card-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: 4rpx;
}

.store-card-address {
  font-size: var(--font-size-small);
  color: var(--text-secondary);
}
```

---

## 弹窗组件

### 基础弹窗

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background-color: var(--bg-primary);
  border-radius: 20rpx;
  padding: var(--spacing-xl);
  margin: var(--spacing-lg);
  max-width: 640rpx;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.modal-title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.modal-body {
  margin-bottom: var(--spacing-lg);
}

.modal-footer {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-footer .btn {
  flex: 1;
}
```

### 弹窗动画

```css
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-container {
  animation: modalFadeIn 0.3s ease-out;
}
```

### 操作确认弹窗

```css
.confirm-modal {
  text-align: center;
}

.confirm-modal-icon {
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto var(--spacing-lg);
}

.confirm-modal-title {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.confirm-modal-content {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--spacing-xl);
}
```

---

## 导航组件

### 顶部导航栏

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  background-color: var(--bg-primary);
  border-bottom: 2rpx solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  z-index: 100;
}

.navbar-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navbar-title {
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.navbar-action {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 底部标签栏

```css
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background-color: var(--bg-primary);
  border-top: 2rpx solid var(--border-light);
  display: flex;
  z-index: 100;
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-xs);
}

.tabbar-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 8rpx;
}

.tabbar-text {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.tabbar-item.active .tabbar-text {
  color: var(--primary);
}
```

---

## 列表组件

### 基础列表

```css
.list {
  background-color: var(--bg-primary);
}

.list-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2rpx solid var(--border-light);
  transition: background-color 0.2s ease;
}

.list-item:hover {
  background-color: var(--bg-secondary);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item-icon {
  width: 80rpx;
  height: 80rpx;
  margin-right: var(--spacing-md);
  border-radius: 8rpx;
  background-color: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-item-content {
  flex: 1;
}

.list-item-title {
  font-size: var(--font-size-base);
  color: var(--text-primary);
  margin-bottom: 4rpx;
}

.list-item-subtitle {
  font-size: var(--font-size-small);
  color: var(--text-secondary);
}

.list-item-action {
  margin-left: var(--spacing-sm);
}
```

### 使用记录列表

```css
.record-list-item {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2rpx solid var(--border-light);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
}

.record-type {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.record-time {
  font-size: var(--font-size-small);
  color: var(--text-tertiary);
}

.record-details {
  font-size: var(--font-size-small);
  color: var(--text-secondary);
  line-height: 1.4;
}
```

---

## 表单组件

### 表单容器

```css
.form {
  padding: var(--spacing-lg);
}

.form-section {
  margin-bottom: var(--spacing-xl);
}

.form-section-title {
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-xs);
  border-bottom: 2rpx solid var(--border-light);
}
```

### 单选/多选组件

```css
.checkbox-group,
.radio-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.checkbox-item,
.radio-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm);
  border: 2rpx solid var(--border-light);
  border-radius: 12rpx;
  transition: all 0.2s ease;
}

.checkbox-item.checked,
.radio-item.checked {
  border-color: var(--primary);
  background-color: var(--primary-lighter);
}

.checkbox-icon,
.radio-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: var(--spacing-sm);
}

.checkbox-label,
.radio-label {
  flex: 1;
  font-size: var(--font-size-base);
  color: var(--text-primary);
}
```

---

## 反馈组件

### Toast 提示

```css
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: #FFFFFF;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: 12rpx;
  font-size: var(--font-size-base);
  z-index: 9999;
  animation: toastFadeIn 0.3s ease-out;
}

@keyframes toastFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

### 加载组件

```css
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: var(--spacing-md);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
}
```

---

## 响应式设计

### 断点系统

```css
/* 小屏幕手机 */
@media (max-width: 375px) {
  :root {
    --spacing-lg: 24rpx;
    --spacing-xl: 40rpx;
  }
  
  .btn-medium {
    padding: 24rpx 40rpx;
    font-size: 26rpx;
  }
}

/* 大屏幕手机 */
@media (min-width: 414px) {
  :root {
    --spacing-lg: 40rpx;
    --spacing-xl: 56rpx;
  }
}

/* 平板 */
@media (min-width: 768px) {
  .modal-container {
    max-width: 480px;
  }
  
  .card {
    max-width: 400px;
  }
}
```

---

## 使用指南

### 组件引入示例

```vue
<template>
  <view class="page">
    <!-- 使用按钮组件 -->
    <button class="btn btn-primary btn-large">申请杆柜</button>
    
    <!-- 使用输入框组件 -->
    <view class="input-wrapper">
      <label class="input-label input-required">手机号</label>
      <input 
        class="input-field" 
        type="tel" 
        placeholder="请输入手机号"
        maxlength="11"
      />
    </view>
    
    <!-- 使用卡片组件 -->
    <view class="locker-card">
      <view class="locker-card-header">
        <text class="locker-card-title">08号杆柜</text>
        <view class="locker-card-status status-active">使用中</view>
      </view>
      <text class="locker-card-content">望京SOHO店 · A区</text>
    </view>
  </view>
</template>

<style>
@import url('./src/assets/components/ui-components.css');
</style>
```

### 主题定制

```css
/* 深色主题示例 */
.theme-dark {
  --bg-primary: #121212;
  --bg-secondary: #1E1E1E;
  --bg-tertiary: #2D2D2D;
  
  --text-primary: #FFFFFF;
  --text-secondary: #AAAAAA;
  --text-tertiary: #666666;
  
  --border-light: #2D2D2D;
  --border-medium: #444444;
}
```

---

**制作者**：Terminal 3 - UI/UX设计师  
**版本**：v1.0  
**创建时间**：2024年8月2日  
**适用项目**：YesLocker台球杆柜管理小程序

## 更新日志

### v1.0.0 (2024-08-02)
- 建立完整的UI组件设计规范
- 定义颜色系统和字体规范
- 创建按钮、输入框、卡片等基础组件
- 建立响应式设计指南