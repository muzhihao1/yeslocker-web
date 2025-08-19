# YesLocker 生产部署清单

在部署到生产环境之前，请按照此清单逐项检查。

## 📋 部署前检查 (Pre-deployment)

### ✅ 代码准备
- [ ] 所有代码已提交并推送到主分支
- [ ] 本地构建成功 (`npm run build`)
- [ ] 本地测试通过 (`npm run dev`)
- [ ] 移除了所有调试代码和console.log
- [ ] 移除了test/demo数据和注释

### ✅ 环境配置
- [ ] 创建了 `.env.local` 文件 (基于 `.env.example`)
- [ ] 设置了安全的 `JWT_SECRET`
- [ ] 配置了SMS服务参数 (如果需要)
- [ ] 验证了数据库配置

### ✅ 依赖检查
- [ ] `package.json` 包含所有必要依赖
- [ ] `server/package.json` 包含后端依赖
- [ ] 移除了未使用的依赖项
- [ ] 版本号已更新

## 🚀 Railway部署步骤

### Step 1: Railway环境准备
- [ ] 安装Railway CLI: `npm install -g @railway/cli`
- [ ] 登录Railway: `railway login`
- [ ] 验证登录状态: `railway whoami`

### Step 2: 项目初始化
- [ ] 运行设置脚本: `./tools/deployment/railway-setup-v2.sh`
- [ ] 确认项目在Railway Dashboard中创建成功
- [ ] 记录项目URL和ID

### Step 3: 数据库设置
- [ ] 在Railway Dashboard中添加PostgreSQL插件
- [ ] 等待数据库初始化完成 (通常1-2分钟)
- [ ] 验证 `DATABASE_URL` 环境变量已自动设置

### Step 4: 环境变量配置
- [ ] 运行环境配置脚本: `./tools/deployment/railway-env-config-v2.sh`
- [ ] 手动验证关键环境变量:
  ```bash
  railway variables | grep -E "(NODE_ENV|PORT|DATABASE_URL)"
  ```
- [ ] 如需要SMS功能，设置Tencent相关变量

### Step 5: 数据库初始化
- [ ] 运行数据库初始化: `railway run node server/database/init-pg.js`
- [ ] 确认表结构创建成功
- [ ] 验证种子数据导入完成

### Step 6: 应用部署
- [ ] 执行部署命令: `railway up`
- [ ] 监控部署进度和日志
- [ ] 记录分配的生产URL

## 🔍 部署后验证

### Step 1: 自动化验证
- [ ] 运行验证脚本: `./tools/deployment/railway-deploy-verify.sh`
- [ ] 所有自动化测试通过

### Step 2: 手动功能测试
- [ ] **前端访问**: 访问主页，确保正常加载
- [ ] **路由测试**: 测试登录、注册页面访问
- [ ] **API测试**: 验证 `/health` 端点返回正常
- [ ] **数据库连接**: 验证 `/stores-lockers` 返回数据

### Step 3: 核心功能测试
- [ ] **用户注册**: 创建新用户账号
- [ ] **用户登录**: 使用测试账号登录
- [ ] **门店浏览**: 查看门店和杆柜列表
- [ ] **申请功能**: 提交杆柜申请
- [ ] **管理员登录**: 使用管理员账号登录
- [ ] **审批功能**: 处理用户申请

### Step 4: 性能和稳定性
- [ ] 页面加载速度 < 3秒
- [ ] API响应时间 < 2秒
- [ ] 移动设备兼容性测试
- [ ] 不同浏览器测试 (Chrome, Safari, Firefox)

## 🛡️ 安全检查

### 应用安全
- [ ] HTTPS连接正常工作
- [ ] 敏感信息不在前端暴露
- [ ] API端点有适当的错误处理
- [ ] 输入验证正确实施

### 数据库安全
- [ ] 数据库连接使用SSL
- [ ] 密码已正确hash存储
- [ ] 没有硬编码的敏感信息

## 📊 监控设置

### Railway监控
- [ ] 设置应用监控告警
- [ ] 配置日志查看访问权限
- [ ] 设置资源使用监控

### 应用监控
- [ ] 健康检查端点工作正常
- [ ] 日志级别设置为 `info` 或 `warn`
- [ ] 错误追踪正常工作

## 🎯 性能优化

### 前端优化
- [ ] 静态资源压缩启用
- [ ] 图片资源优化
- [ ] CDN配置 (如果适用)
- [ ] 缓存策略设置

### 后端优化
- [ ] 数据库查询优化
- [ ] API响应缓存
- [ ] 连接池配置合理

## 📝 文档和备份

### 文档更新
- [ ] 更新README.md中的部署URL
- [ ] 更新API文档 (如果有变化)
- [ ] 记录部署配置和重要决策

### 备份策略
- [ ] 数据库自动备份设置 (Railway提供)
- [ ] 代码仓库备份
- [ ] 环境变量安全备份

## 🚨 应急计划

### 回滚准备
- [ ] 记录当前部署版本和时间
- [ ] 准备回滚命令和步骤
- [ ] 确保团队了解应急联系方式

### 故障处理
- [ ] 监控告警设置正确
- [ ] 故障处理文档就位
- [ ] 团队联系方式更新

## ✅ 最终确认

- [ ] **所有测试通过**: 自动化测试 + 手动测试全部成功
- [ ] **性能达标**: 加载速度和响应时间符合要求
- [ ] **安全检查完成**: 没有明显的安全风险
- [ ] **监控正常**: 所有监控指标正常
- [ ] **文档完整**: 部署文档和操作手册完整
- [ ] **团队知情**: 相关团队成员了解部署情况

## 🎉 部署完成

**恭喜！YesLocker应用已成功部署到生产环境。**

### 生产环境信息
- **应用URL**: `https://your-app.railway.app`
- **API Health Check**: `https://your-app.railway.app/health`
- **管理员登录**: 使用测试账号 `13800000001` / `admin123`
- **Railway Dashboard**: [https://railway.app/dashboard](https://railway.app/dashboard)

### 下一步
- [ ] 通知相关团队部署完成
- [ ] 开始用户验收测试 (UAT)
- [ ] 制定上线推广计划
- [ ] 安排生产监控值守

---

**注意**: 请妥善保管Railway账号信息和数据库访问凭据！