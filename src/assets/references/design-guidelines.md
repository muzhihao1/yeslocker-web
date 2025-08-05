# YesLocker 品牌设计规范

## 品牌定位

YesLocker是一款专业的台球杆柜管理小程序，致力于为台球爱好者和台球厅提供便捷、安全、智能的杆柜管理服务。品牌体现专业性、可靠性和现代感。

## 色彩系统

### 主色调 - 台球绿
```css
/* 主绿色 - 灵感来源于台球桌台毡 */
--primary: #1B5E20;          /* 深绿 - 主要操作、重要信息 */
--primary-light: #4CAF50;    /* 中绿 - 悬停状态、次要操作 */
--primary-lighter: #81C784;  /* 浅绿 - 背景、装饰元素 */
--primary-dark: #0D2818;     /* 极深绿 - 文字、边框 */
```

### 辅助色调 - 台球黄
```css
/* 辅助黄色 - 灵感来源于台球 */
--secondary: #FFA000;        /* 主黄 - 警告、提醒信息 */
--secondary-light: #FFB74D;  /* 浅黄 - 背景提示 */
--secondary-dark: #F57C00;   /* 深黄 - 强调、高亮 */
```

### 中性色系
```css
/* 文字颜色 */
--text-primary: #212121;     /* 主要文字 */
--text-secondary: #757575;   /* 次要文字 */
--text-disabled: #BDBDBD;    /* 禁用文字 */
--text-white: #FFFFFF;       /* 白色文字 */

/* 背景颜色 */
--bg-primary: #FFFFFF;       /* 主背景 */
--bg-secondary: #F5F5F5;     /* 次背景 */
--bg-light: #FAFAFA;         /* 浅背景 */
--bg-dark: #EEEEEE;          /* 深背景 */

/* 边框颜色 */
--border-light: #E0E0E0;     /* 浅边框 */
--border-medium: #BDBDBD;    /* 中边框 */
--border-dark: #757575;      /* 深边框 */
```

### 状态色系
```css
/* 成功状态 */
--success: #4CAF50;
--success-light: #81C784;
--success-dark: #388E3C;

/* 错误状态 */
--error: #F44336;
--error-light: #E57373;
--error-dark: #D32F2F;

/* 警告状态 */
--warning: #FF9800;
--warning-light: #FFB74D;
--warning-dark: #F57C00;

/* 信息状态 */
--info: #2196F3;
--info-light: #64B5F6;
--info-dark: #1976D2;
```

## 字体系统

### 中文字体
```css
/* 主字体 - 苹方 */
font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, "Hiragino Sans GB", "Microsoft YaHei", sans-serif;

/* 字体重量 */
--font-thin: 100;       /* 极细 */
--font-light: 300;      /* 细体 */
--font-regular: 400;    /* 常规 */
--font-medium: 500;     /* 中粗 */
--font-semibold: 600;   /* 半粗 */
--font-bold: 700;       /* 粗体 */
```

### 英文/数字字体
```css
/* 英文数字 - SF Pro */
font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
```

### 字体大小系统
```css
/* 标题字体 */
--font-size-h1: 32px;   /* 主标题 */
--font-size-h2: 28px;   /* 二级标题 */
--font-size-h3: 24px;   /* 三级标题 */
--font-size-h4: 20px;   /* 四级标题 */
--font-size-h5: 18px;   /* 五级标题 */

/* 正文字体 */
--font-size-lg: 16px;   /* 大正文 */
--font-size-md: 14px;   /* 中正文 */
--font-size-sm: 12px;   /* 小正文 */
--font-size-xs: 10px;   /* 极小文字 */

/* 行高 */
--line-height-tight: 1.2;   /* 紧密 */
--line-height-normal: 1.5;  /* 正常 */
--line-height-loose: 1.8;   /* 宽松 */
```

## 间距系统

### 基础间距单位
```css
/* 基础单位：8px */
--space-unit: 8px;

/* 间距系列 */
--space-xs: 4px;    /* 0.5 × unit */
--space-sm: 8px;    /* 1 × unit */
--space-md: 16px;   /* 2 × unit */
--space-lg: 24px;   /* 3 × unit */
--space-xl: 32px;   /* 4 × unit */
--space-2xl: 48px;  /* 6 × unit */
--space-3xl: 64px;  /* 8 × unit */
```

### 组件内边距
```css
/* 按钮内边距 */
--padding-btn-sm: 8px 16px;     /* 小按钮 */
--padding-btn-md: 12px 24px;    /* 中按钮 */
--padding-btn-lg: 16px 32px;    /* 大按钮 */

/* 卡片内边距 */
--padding-card: 16px;           /* 卡片内边距 */
--padding-card-lg: 24px;        /* 大卡片内边距 */

/* 页面边距 */
--padding-page: 16px;           /* 页面水平边距 */
--padding-section: 24px 16px;   /* 区块边距 */
```

## 圆角系统

```css
/* 圆角半径 */
--radius-none: 0px;         /* 无圆角 */
--radius-sm: 4px;           /* 小圆角 - 按钮、输入框 */
--radius-md: 8px;           /* 中圆角 - 卡片、面板 */
--radius-lg: 12px;          /* 大圆角 - 对话框 */
--radius-xl: 16px;          /* 超大圆角 - 图片、头像 */
--radius-full: 50%;         /* 圆形 - 图标按钮 */
```

## 阴影系统

```css
/* 阴影深度 */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.1);           /* 轻微阴影 */
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);           /* 中等阴影 */
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);         /* 深度阴影 */
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);        /* 超深阴影 */

/* 特殊阴影 */
--shadow-inner: inset 0 2px 4px rgba(0,0,0,0.1);  /* 内阴影 */
--shadow-green: 0 4px 12px rgba(27,94,32,0.2);    /* 绿色阴影 */
--shadow-yellow: 0 4px 12px rgba(255,160,0,0.2);  /* 黄色阴影 */
```

## 动画系统

### 缓动函数
```css
/* 标准缓动 */
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-decelerated: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-accelerated: cubic-bezier(0.4, 0.0, 1, 1);

/* 时间长度 */
--duration-fast: 150ms;     /* 快速动画 */
--duration-normal: 250ms;   /* 标准动画 */
--duration-slow: 350ms;     /* 慢速动画 */
```

### 常用动画
```css
/* 淡入淡出 */
.fade-enter {
  opacity: 0;
  transform: translateY(10px);
  transition: all var(--duration-normal) var(--ease-standard);
}

.fade-enter-active {
  opacity: 1;
  transform: translateY(0);
}

/* 按钮点击反馈 */
.btn-feedback {
  transform: scale(0.98);
  transition: transform var(--duration-fast) var(--ease-standard);
}
```

## 图标规范

### 图标尺寸
```css
--icon-xs: 16px;    /* 极小图标 */
--icon-sm: 20px;    /* 小图标 */
--icon-md: 24px;    /* 标准图标 */
--icon-lg: 32px;    /* 大图标 */
--icon-xl: 48px;    /* 超大图标 */
```

### 图标风格
- **线条粗细**: 2px
- **端点样式**: 圆形端点（round cap）
- **连接样式**: 圆形连接（round join）
- **填充风格**: 优先使用线性图标，重要操作使用填充图标

## 台球主题元素

### 视觉隐喻
- **台球桌绿毡**: 主色调来源，体现专业性
- **台球**: 圆形元素、点状装饰
- **台球杆**: 线性元素、方向指示
- **杆柜**: 网格布局、收纳概念

### 装饰图案
- 使用简化的台球图案作为背景装饰
- 台球杆轮廓用于分割线或装饰元素
- 网格图案体现杆柜的收纳属性

## 品牌标识

### Logo使用规范
- **主Logo**: 完整的YesLocker标识，用于品牌展示
- **图标Logo**: 简化版本，用于应用图标、小尺寸场景
- **水平Logo**: 横版布局，用于页眉、页脚

### Logo保护区域
- Logo周围至少保留Logo高度的1/2作为保护区域
- 不得在Logo上叠加其他元素
- 不得改变Logo的颜色、比例和形状

## 应用指南

### 移动端适配
- 最小点击区域：44px × 44px
- 文字最小尺寸：12px
- 重要信息优先级排列
- 适配深色模式

### 无障碍设计
- 色彩对比度符合WCAG 2.1 AA标准
- 重要信息不仅依赖颜色传达
- 提供明确的交互反馈
- 支持屏幕阅读器

### 国际化考虑
- 支持中英文字体回退
- 考虑文字长度变化对布局的影响
- 保持视觉层次的一致性

---

**制定者**: Terminal 3 - UI/UX设计师  
**版本**: v1.0  
**最后更新**: 2024年8月2日  
**下次审查**: 第一阶段结束后