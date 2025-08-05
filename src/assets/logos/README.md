# YesLocker Logo 使用指南

## Logo文件说明

### 1. yeslocker-logo.svg - 主Logo
- **用途**：首页、登录页、关于页面等主要品牌展示
- **尺寸**：200×60px（可等比缩放）
- **特点**：包含完整图标和文字，带有中文标语
- **最小宽度**：120px（保证可读性）

### 2. yeslocker-logo-icon.svg - 图标Logo  
- **用途**：应用图标、导航图标、小尺寸场景
- **尺寸**：48×48px（可等比缩放）
- **特点**：纯图标版本，包含简化的"Y"标识
- **最小尺寸**：24×24px

### 3. yeslocker-logo-horizontal.svg - 水平Logo
- **用途**：页眉、页脚、横幅、名片等横向布局
- **尺寸**：280×48px（可等比缩放）  
- **特点**：水平排列，适合宽屏显示
- **最小宽度**：160px

## 设计理念

### 视觉元素说明
1. **杆柜网格**：体现收纳和管理功能
2. **台球装饰**：黄色圆点代表台球，体现行业特色
3. **锁图标**：表示安全可靠的存储
4. **色彩渐变**：从浅绿到深绿，体现专业感和科技感

### 色彩规范
- **主绿色**：#1B5E20（深绿）
- **渐变绿**：#4CAF50 → #1B5E20
- **台球黄**：#FFA000 → #F57C00
- **白色**：#FFFFFF（高亮元素）

## 技术实现

### uni-app中使用Logo

#### 1. 在页面中使用
```vue
<template>
  <view class="logo-container">
    <!-- 主Logo -->
    <image 
      src="@/assets/logos/yeslocker-logo.svg" 
      class="main-logo"
      mode="widthFix"
    />
    
    <!-- 图标Logo -->
    <image 
      src="@/assets/logos/yeslocker-logo-icon.svg"
      class="icon-logo"  
      mode="aspectFit"
    />
    
    <!-- 水平Logo -->
    <image 
      src="@/assets/logos/yeslocker-logo-horizontal.svg"
      class="horizontal-logo"
      mode="widthFix" 
    />
  </view>
</template>

<style scoped>
.main-logo {
  width: 200rpx;
  height: auto;
}

.icon-logo {
  width: 96rpx;
  height: 96rpx;
}

.horizontal-logo {
  width: 400rpx;
  height: auto;
}
</style>
```

#### 2. 在组件中动态导入
```javascript
// 导入Logo
import mainLogo from '@/assets/logos/yeslocker-logo.svg'
import iconLogo from '@/assets/logos/yeslocker-logo-icon.svg'  
import horizontalLogo from '@/assets/logos/yeslocker-logo-horizontal.svg'

export default {
  data() {
    return {
      logos: {
        main: mainLogo,
        icon: iconLogo,
        horizontal: horizontalLogo
      }
    }
  }
}
```

#### 3. 响应式适配
```css
/* 不同屏幕尺寸的Logo适配 */
.logo-responsive {
  width: 160px;
  height: auto;
}

/* 小屏幕 */
@media (max-width: 375px) {
  .logo-responsive {
    width: 120px;
  }
}

/* 大屏幕 */
@media (min-width: 768px) {
  .logo-responsive {
    width: 200px;
  }
}
```

## 使用规范

### ✅ 正确使用
- 保持Logo完整性，不要拉伸变形
- 为Logo预留足够的保护区域（至少Logo高度的1/2）
- 在深色背景上使用时确保对比度足够
- 使用标准色彩，不要随意更改颜色

### ❌ 禁止操作
- 不得改变Logo的颜色、比例和形状
- 不得在Logo上叠加其他元素
- 不得将Logo作为文字或图案的一部分
- 不得将Logo用作背景图案

### 背景适配
```css
/* 浅色背景 */
.logo-on-light {
  /* 使用原始颜色 */
}

/* 深色背景 */
.logo-on-dark {
  filter: brightness(1.2) contrast(1.1);
}

/* 绿色背景 */
.logo-on-green {
  /* 建议使用白色版本或调整透明度 */
  opacity: 0.9;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}
```

## 文件格式说明

### SVG格式优势
- **可无限缩放**：矢量格式，任意尺寸都清晰
- **文件小**：比PNG/JPG文件更小
- **可编辑**：可以通过CSS修改颜色和样式
- **支持动画**：可以添加CSS动画效果

### 导出其他格式
如需要PNG格式，建议尺寸：
- **标准版**：400×120px (@2x), 600×180px (@3x)
- **图标版**：96×96px (@2x), 144×144px (@3x)  
- **水平版**：560×96px (@2x), 840×144px (@3x)

## 品牌应用场景

### 移动端应用
- **启动页**：使用主Logo，居中显示
- **导航栏**：使用图标Logo，左上角位置
- **登录页**：使用主Logo，页面顶部
- **关于页**：使用水平Logo，介绍部分

### 管理端应用  
- **后台首页**：使用水平Logo，页面头部
- **侧边栏**：使用图标Logo，收起状态
- **报表页**：使用小尺寸主Logo，页眉位置

### 宣传物料
- **海报设计**：根据版面选择合适版本
- **名片制作**：优先使用水平Logo
- **展示屏幕**：使用主Logo或水平Logo

## 技术支持

### 遇到问题时
1. **显示模糊**：检查是否设置了正确的mode属性
2. **颜色异常**：确认SVG文件完整性
3. **尺寸问题**：使用widthFix或aspectFit模式
4. **加载失败**：检查文件路径和文件权限

### 联系Terminal 3
如需要其他尺寸、格式或有设计相关问题，请联系Terminal 3设计师。

---

**制作者**：Terminal 3 - UI/UX设计师  
**版本**：v1.0  
**创建时间**：2024年8月2日  
**更新记录**：初始版本创建