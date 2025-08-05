# YesLocker GitHub + Railway 部署指南

## 🚀 部署架构概览

```
GitHub (代码托管)
    ↓
Railway (统一部署平台)
    ├── yeslocker-app (用户端) → app.yes147.net
    ├── yeslocker-admin (管理端) → admin.yes147.net
    ├── yeslocker-api (API服务) → api.yes147.net
    └── yeslocker-db (PostgreSQL数据库)
```

## 📋 部署准备清单

- [ ] GitHub 账号
- [ ] Railway 账号
- [ ] yes147.net 域名（已在 Spaceship 管理）
- [ ] 基础的 Git 知识

## 📦 前置准备

```bash
# 安装依赖
npm install
cd admin && npm install && cd ..
cd server && npm install && cd ..

# 构建项目（可选，Railway会自动构建）
npm run build:h5
npm run build:admin
```

## 🔧 第一步：准备 GitHub 仓库

### 1.1 创建 .gitignore

```gitignore
# 依赖
node_modules/
dist/
admin/dist/

# 环境变量
.env
.env.local
.env.production
*.local

# 日志
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 编辑器
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# 数据文件
server/data/
server/data.json
*.db

# 构建缓存
.cache/
.parcel-cache/
```

### 1.2 创建仓库

```bash
# 初始化 Git
cd /Users/liasiloam/Vibecoding/yeslocker
git init

# 添加所有文件
git add .

# 首次提交
git commit -m "Initial commit: YesLocker billiard cue locker management system"

# 创建 GitHub 仓库后，添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/yeslocker.git
git branch -M main
git push -u origin main
```

## 🚂 第二步：Railway 部署配置

### 2.1 创建 Railway 项目

1. 登录 [Railway](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 Railway 访问你的 GitHub
5. 选择 `yeslocker` 仓库

### 2.2 配置服务

Railway 会自动创建一个服务，但我们需要多个服务。在 Railway 项目中：

#### A. API 服务配置

1. 点击 "+ New" → "GitHub Repo"
2. 选择 yeslocker 仓库
3. 配置服务：
   - **Service Name**: `yeslocker-api`
   - **Root Directory**: `/server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:pg`

#### B. 用户端配置

1. 点击 "+ New" → "GitHub Repo"
2. 选择 yeslocker 仓库
3. 配置服务：
   - **Service Name**: `yeslocker-app`
   - **Root Directory**: `/`
   - **Build Command**: `npm install && npm run build:h5`
   - **Start Command**: `npm start`

#### C. 管理端配置

1. 点击 "+ New" → "GitHub Repo"
2. 选择 yeslocker 仓库
3. 配置服务：
   - **Service Name**: `yeslocker-admin`
   - **Root Directory**: `/admin`
   - **Build Command**: `npm install && npm run build:h5`
   - **Start Command**: `npm start`

#### D. 数据库配置

1. 点击 "+ New" → "Database" → "PostgreSQL"
2. Railway 会自动创建数据库并提供连接信息

### 2.3 Railway 配置文件

创建 `railway.json` 在项目根目录：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2.4 添加静态文件服务

由于前端构建后是静态文件，需要添加 serve 依赖。

在根目录的 `package.json` 添加：

```json
{
  "devDependencies": {
    "serve": "^14.2.0"
  }
}
```

在 `admin/package.json` 也添加同样的依赖。

## 🗄️ 第三步：数据库迁移

### 3.1 创建数据库 Schema

创建 `server/database/schema.sql`：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    id_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- 'super_admin' or 'store_admin'
    store_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 门店表
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    contact VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 杆柜表
CREATE TABLE IF NOT EXISTS lockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'occupied', 'maintenance'
    user_id UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, number)
);

-- 杆柜申请表
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    locker_id UUID REFERENCES lockers(id),
    type VARCHAR(50) NOT NULL, -- 'new' or 'transfer'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reason TEXT,
    admin_id UUID REFERENCES admins(id),
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 杆柜使用记录表
CREATE TABLE IF NOT EXISTS locker_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locker_id UUID NOT NULL REFERENCES lockers(id),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'assign', 'release', 'transfer'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 提醒事项表
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_lockers_store_id ON lockers(store_id);
CREATE INDEX idx_lockers_user_id ON lockers(user_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 安装 PostgreSQL 客户端

在 `server/package.json` 添加依赖：

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "dotenv": "^16.3.1"
  }
}
```

### 3.3 创建数据库连接模块

创建 `server/database/index.js`：

```javascript
const { Pool } = require('pg');
require('dotenv').config();

// Railway 会自动注入 DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 测试连接
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
```

## 🌐 第四步：环境变量配置

### 4.1 Railway 环境变量

在每个 Railway 服务中配置环境变量：

#### API 服务环境变量：
```
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://app.yes147.net,https://admin.yes147.net
```

#### 用户端环境变量：
```
VITE_API_BASE_URL=https://api.yes147.net/api
VITE_APP_TITLE=YesLocker
```

#### 管理端环境变量：
```
VITE_API_BASE_URL=https://api.yes147.net/api
VITE_APP_TITLE=YesLocker管理端
```

### 4.2 更新配置文件

更新 `src/config/index.ts`：

```typescript
const config = {
  development: {
    apiBaseUrl: 'http://localhost:3001/api',
    appTitle: 'YesLocker开发版'
  },
  production: {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.yes147.net/api',
    appTitle: import.meta.env.VITE_APP_TITLE || 'YesLocker'
  }
}

export default config[import.meta.env.MODE] || config.production
```

同样更新 `admin/src/config/index.ts`。

## 🌍 第五步：DNS 配置（Spaceship）

### 5.1 登录 Spaceship

1. 访问 [Spaceship](https://www.spaceship.com)
2. 登录你的账号
3. 找到 `yes147.net` 域名
4. 点击 "Manage" → "DNS Records"

### 5.2 添加 CNAME 记录

添加以下 DNS 记录：

| Type  | Name  | Value                                    | TTL  |
|-------|-------|------------------------------------------|------|
| CNAME | app   | yeslocker-app.up.railway.app           | 3600 |
| CNAME | admin | yeslocker-admin.up.railway.app         | 3600 |
| CNAME | api   | yeslocker-api.up.railway.app           | 3600 |

注意：Railway 会为每个服务提供一个 `.up.railway.app` 域名，在 Railway 服务设置中可以看到。

### 5.3 在 Railway 配置自定义域名

在每个 Railway 服务的设置中：

1. 点击 "Settings" → "Domains"
2. 点击 "Add Domain"
3. 输入对应的域名：
   - API 服务：`api.yes147.net`
   - 用户端：`app.yes147.net`
   - 管理端：`admin.yes147.net`
4. Railway 会自动配置 SSL 证书

## 📝 第六步：部署流程

### 6.1 初始化数据库

在 Railway 的 PostgreSQL 服务中：

1. 点击 "Connect" 获取连接信息
2. 复制 DATABASE_URL 到 API 服务的环境变量
3. 初始化数据库：

```bash
# 方式一：使用数据库客户端
# 使用 pgAdmin 或 TablePlus 连接数据库
# 执行 server/database/schema.sql 创建表结构

# 方式二：使用迁移脚本（推荐）
# 在本地设置 DATABASE_URL 环境变量
export DATABASE_URL="postgresql://..."
cd server
node database/migrate-data.js
```

如果你有现有的 JSON 数据，迁移脚本会自动导入。否则会使用种子数据。

### 6.2 数据迁移

如果你有现有的 JSON 数据需要迁移：

1. 确保 `server/data.json` 文件存在
2. 运行迁移脚本：

```bash
cd server
# 设置 Railway 提供的数据库连接字符串
export DATABASE_URL="postgresql://user:password@host:port/database"
node database/migrate-data.js
```

### 6.3 推送代码触发部署

```bash
# 添加更改
git add .

# 提交
git commit -m "Configure for Railway deployment"

# 推送到 GitHub
git push origin main
```

Railway 会自动检测到代码更新并开始部署。

### 6.4 验证部署

1. 检查 Railway 控制台的部署日志
2. 访问各个服务的 URL：
   - https://app.yes147.net
   - https://admin.yes147.net
   - https://api.yes147.net/health

## 🔍 故障排查

### 常见问题

1. **前端访问显示空白**
   - 检查构建日志是否有错误
   - 确认 `serve` 命令正确
   - 检查 API 地址配置

2. **API 无法连接数据库**
   - 检查 DATABASE_URL 环境变量
   - 确认数据库服务正在运行
   - 检查网络连接

3. **域名无法访问**
   - DNS 记录可能需要时间生效（最多48小时）
   - 检查 Railway 的自定义域名配置
   - 确认 SSL 证书已生成

## 🎉 完成！

恭喜！你的 YesLocker 系统现在已经部署在 Railway 上了。

### 后续优化建议

1. **监控设置**：在 Railway 设置告警和监控
2. **备份策略**：定期备份 PostgreSQL 数据
3. **CI/CD**：配置 GitHub Actions 自动测试
4. **扩展**：根据负载情况增加服务实例

### 有用的链接

- [Railway 文档](https://docs.railway.app)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [uni-app 文档](https://uniapp.dcloud.io)