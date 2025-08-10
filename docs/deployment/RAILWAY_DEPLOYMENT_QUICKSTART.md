# YesLocker Railway 部署快速指南

本指南将帮助您将YesLocker应用部署到Railway平台。

## 🏗️ 架构概览

- **前端**: Vue 3 + Vite (端口3000)
- **后端**: Express.js + Node.js (端口3001)  
- **数据库**: Railway PostgreSQL
- **部署平台**: Railway

## 📋 部署前准备

### 1. 环境要求

```bash
# 确保安装以下工具
node -v        # >= 18.0.0
npm -v         # >= 8.0.0
git --version  # 任意版本
```

### 2. 安装Railway CLI

```bash
# 使用npm安装
npm install -g @railway/cli

# 或使用Homebrew (macOS)
brew install railway
```

### 3. 登录Railway

```bash
railway login
```

## 🚀 部署步骤

### 步骤 1: 初始化Railway项目

```bash
# 运行设置脚本
./tools/deployment/railway-setup-v2.sh
```

这个脚本将：
- 初始化Railway项目
- 创建基本配置文件
- 设置构建和启动命令

### 步骤 2: 添加PostgreSQL数据库

1. 打开 [Railway Dashboard](https://railway.app/dashboard)
2. 选择您的项目
3. 点击 "New Service" → "Database" → "PostgreSQL"
4. 等待数据库初始化完成

### 步骤 3: 配置环境变量

```bash
# 运行环境配置脚本
./tools/deployment/railway-env-config-v2.sh
```

这会设置以下环境变量：
- `NODE_ENV=production`
- `PORT=3000`
- `VITE_API_BASE_URL=<your-railway-domain>`
- `DATABASE_URL` (自动设置)

### 步骤 4: 初始化数据库

```bash
# 初始化PostgreSQL数据库结构和种子数据
railway run node server/database/init-pg.js
```

### 步骤 5: 部署应用

```bash
# 部署到Railway
railway up
```

### 步骤 6: 验证部署

```bash
# 运行验证脚本
./tools/deployment/railway-deploy-verify.sh
```

## 🔧 手动配置 (如果脚本失败)

### 1. 手动设置环境变量

```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set VITE_API_BASE_URL=https://your-app.railway.app
```

### 2. 手动部署

```bash
# 构建前端
npm install
npm run build

# 构建后端
cd server
npm install
cd ..

# 部署
railway up
```

## 📊 部署后验证

部署成功后，您可以访问以下端点验证：

### 前端应用
- **主页**: `https://your-app.railway.app`
- **登录页**: `https://your-app.railway.app/auth/login`

### API端点
- **健康检查**: `https://your-app.railway.app/health`
- **门店列表**: `https://your-app.railway.app/stores-lockers`

### 数据库测试
```bash
# 测试数据库连接
railway run node -e "
const { Pool } = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});
pool.query('SELECT COUNT(*) FROM stores', (err, res) => {
  console.log(err ? err : 'Stores count:', res.rows[0].count);
  pool.end();
});
"
```

## 🛠️ 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 检查构建日志
railway logs

# 本地验证构建
npm run build
```

#### 2. 数据库连接失败
- 确保PostgreSQL插件已添加
- 检查`DATABASE_URL`环境变量是否设置
- 运行`railway variables`查看所有变量

#### 3. 404错误
- 确保前端路由配置正确
- 检查`dist/`目录是否包含构建文件

#### 4. API错误
```bash
# 检查后端日志
railway logs --service backend

# 测试本地API
cd server && npm run start:pg
```

### 重新部署

```bash
# 强制重新部署
railway up --detach

# 或清理并重新构建
railway service delete
./tools/deployment/railway-setup-v2.sh
```

## 🌐 自定义域名 (可选)

1. 在Railway Dashboard中选择项目
2. 进入Settings → Domains  
3. 添加您的自定义域名
4. 按照提示配置DNS记录

## 📈 监控和维护

### 查看应用日志
```bash
railway logs
railway logs --follow  # 实时日志
```

### 查看应用状态
```bash
railway status
```

### 更新应用
```bash
# 推送代码更新后自动部署
git push origin main

# 或手动触发部署
railway up
```

## 🔑 环境变量参考

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 应用端口 | `3000` |
| `DATABASE_URL` | PostgreSQL连接字符串 | 自动生成 |
| `VITE_API_BASE_URL` | API基础URL | `https://your-app.railway.app` |

## 📞 支持

如果遇到问题：

1. 查看 [Railway文档](https://docs.railway.app/)
2. 检查项目的GitHub Issues
3. 联系开发团队

---

**部署完成后记得更新域名和API地址！** 🎉