# YesLocker 素材资源库

这里包含了YesLocker台球杆柜管理小程序的所有设计素材和资源文件。

## 目录结构

```
assets/
├── logos/              # Logo文件
│   ├── yeslocker-logo.svg
│   ├── yeslocker-logo-horizontal.svg
│   └── yeslocker-logo-icon.svg
├── icons/              # 图标素材
│   ├── functional/     # 功能图标
│   │   ├── store-cue.svg       # 存杆
│   │   ├── retrieve-cue.svg    # 取杆  
│   │   ├── apply.svg           # 申请
│   │   ├── login.svg           # 登录
│   │   ├── settings.svg        # 设置
│   │   ├── history.svg         # 历史记录
│   │   └── notification.svg    # 通知
│   ├── decorative/     # 装饰图标
│   │   ├── billiard-ball.svg   # 台球
│   │   ├── cue-stick.svg       # 台球杆
│   │   └── trophy.svg          # 奖杯
│   └── status/         # 状态图标
│       ├── success.svg         # 成功
│       ├── error.svg           # 错误
│       ├── warning.svg         # 警告
│       └── pending.svg         # 待处理
├── images/             # 图片素材
│   ├── illustrations/  # 插画
│   │   ├── empty-state.svg     # 空状态
│   │   ├── welcome.svg         # 欢迎页
│   │   ├── error-404.svg       # 404错误
│   │   └── success-check.svg   # 成功确认
│   ├── photos/         # 实拍图片
│   │   ├── billiard-hall.jpg   # 台球厅
│   │   ├── cue-locker.jpg      # 杆柜
│   │   └── cue-sticks.jpg      # 台球杆
│   └── backgrounds/    # 背景图片
│       ├── gradient-green.jpg  # 渐变绿色
│       └── texture-felt.jpg    # 台毡纹理
├── fonts/              # 字体文件
│   ├── PingFang-SC-Regular.ttf # 苹方常规
│   └── PingFang-SC-Medium.ttf  # 苹方中粗
├── components/         # UI组件设计
│   ├── buttons.md      # 按钮组件规范
│   ├── cards.md        # 卡片组件规范
│   ├── forms.md        # 表单组件规范
│   └── modals.md       # 弹窗组件规范
└── references/         # 参考资料
    ├── competitor-analysis.md  # 竞品分析
    ├── color-palette.md        # 色彩搭配
    └── design-guidelines.md    # 设计指南
```

## 文件命名规范

### 图标文件
- 功能图标：`功能名称.svg` (如：store-cue.svg)
- 装饰图标：`物品名称.svg` (如：billiard-ball.svg)
- 状态图标：`状态名称.svg` (如：success.svg)

### 图片文件
- 插画：`用途描述.svg` (如：empty-state.svg)
- 照片：`内容描述.jpg` (如：billiard-hall.jpg)
- 背景：`样式描述.jpg` (如：gradient-green.jpg)

### 尺寸规范
- 图标：24x24, 32x32, 48x48px（@1x, @2x, @3x）
- Logo：支持多种尺寸适配
- 插画：最大宽度750px（适配移动端）
- 照片：压缩后不超过500KB

## 色彩规范
- 主色调：台球绿 #1B5E20
- 辅助色：台球黄 #FFA000  
- 中性色：文字灰 #757575
- 背景色：浅灰 #F5F5F5

## 使用说明

### 导入图标
```javascript
// uni-app中使用
<image src="@/assets/icons/functional/store-cue.svg" />

// 在组件中使用
import storeCueIcon from '@/assets/icons/functional/store-cue.svg'
```

### 导入图片
```javascript
// 背景图片
<view class="bg" :style="{backgroundImage: 'url(' + require('@/assets/images/backgrounds/gradient-green.jpg') + ')'}">
</view>
```

## 注意事项
1. 所有SVG图标需要优化，移除不必要的代码
2. 图片需要压缩，控制文件大小
3. 保持视觉风格统一
4. 遵循设计规范文档

---
**维护者**: Terminal 3 - UI/UX设计师
**最后更新**: 2024年8月