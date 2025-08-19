# YesLocker Railway 部署执行指南

**当前状态**: 所有代码和脚本已准备就绪，开始实际部署流程

## 🔥 立即执行步骤

### Step 1: Railway 登录
```bash
# 在终端中执行（需要浏览器交互）
railway login
```
- 会自动打开浏览器进行OAuth登录
- 使用您的GitHub账号登录Railway
- 登录完成后终端会显示成功信息

### Step 2: 验证登录状态
```bash
railway whoami
```
应该看到您的用户名，表示登录成功。

### Step 3: 执行项目初始化
```bash
# 运行我们准备好的初始化脚本
./tools/deployment/railway-setup-v2.sh
```

**这个脚本会自动：**
- 初始化Railway项目
- 创建railway.toml配置
- 设置基本环境变量

### Step 4: 手动添加PostgreSQL数据库
1. 打开 https://railway.app/dashboard
2. 选择刚创建的项目
3. 点击 "New Service" → "Database" → "PostgreSQL"
4. 等待数据库初始化（约1-2分钟）

### Step 5: 配置环境变量
```bash
# 运行环境配置脚本
./tools/deployment/railway-env-config-v2.sh
```

### Step 6: 初始化生产数据库
```bash
# 运行数据库初始化脚本
railway run node server/database/init-pg.js
```

### Step 7: 部署应用
```bash
# 部署到Railway
railway up
```

### Step 8: 验证部署
```bash
# 运行自动验证脚本
./tools/deployment/railway-deploy-verify.sh
```

## 📋 执行检查清单

在每个步骤后检查：

- [ ] **Step 1 完成**: `railway whoami` 显示用户名
- [ ] **Step 3 完成**: Railway Dashboard显示新项目
- [ ] **Step 4 完成**: 项目中有PostgreSQL服务
- [ ] **Step 5 完成**: 环境变量已设置（`railway variables`）
- [ ] **Step 6 完成**: 数据库表已创建并有种子数据
- [ ] **Step 7 完成**: 应用成功部署，有可访问的URL
- [ ] **Step 8 完成**: 所有验证测试通过

## 🚨 如果遇到问题

### 常见问题解决：

**问题1: 登录失败**
```bash
# 清除本地认证并重新登录
railway logout
railway login
```

**问题2: 项目创建失败**
- 检查Railway账号是否有创建项目权限
- 确保项目名称唯一

**问题3: 数据库连接失败**
- 确认PostgreSQL插件已添加并显示为"Active"
- 检查DATABASE_URL环境变量：`railway variables | grep DATABASE_URL`

**问题4: 部署失败**
```bash
# 检查部署日志
railway logs

# 检查本地构建
npm run build
cd server && npm install
```

**问题5: 验证测试失败**
```bash
# 手动检查关键端点
curl https://your-app.railway.app/health
curl https://your-app.railway.app/stores-lockers
```

## 📞 获取帮助

如果执行过程中遇到任何问题，请：

1. 记录具体的错误信息
2. 记录执行到哪个步骤失败
3. 运行 `railway logs` 查看详细日志
4. 检查Railway Dashboard中的服务状态

## 🎯 期望结果

执行完成后，您应该有：

✅ 一个运行在Railway上的YesLocker应用  
✅ 可访问的前端界面（用户端）  
✅ 正常工作的API端点  
✅ 连接的PostgreSQL数据库  
✅ 完整的测试数据  

**预计总执行时间**: 15-20分钟

---

**准备好了吗？从Step 1开始！** 🚀