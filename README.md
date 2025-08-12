# YesLocker - 台球杆柜管理系统

一个现代化的台球杆柜数字化管理系统，支持用户端申请、管理端审核、存取操作记录等完整业务流程。

🌐 **在线访问**: [https://yeslocker-web-production-314a.up.railway.app](https://yeslocker-web-production-314a.up.railway.app)

## 项目概述

- **项目名称**: YesLocker - 台球杆柜管理系统
- **技术架构**: Vue 3 + Express.js + PostgreSQL + Railway
- **部署平台**: Railway
- **目标用户**: 台球厅顾客、门店管理员、总部管理员

## 技术栈

### 前端技术
- **框架**: Vue 3 + TypeScript + Vite
- **状态管理**: Pinia
- **UI组件**: 自定义Vue组件
- **样式**: SCSS + 响应式设计
- **构建工具**: Vite

### 后端技术
- **API框架**: Express.js
- **数据库**: PostgreSQL (Railway托管)
- **认证**: JWT + bcrypt
- **部署**: Railway自动部署

### 开发工具
- **语言**: TypeScript + JavaScript
- **版本控制**: Git + GitHub
- **CI/CD**: Railway自动部署
- **包管理**: npm

## 项目结构

```
yeslocker/
├── src/                    # 用户端应用
│   ├── pages/             # 页面组件
│   ├── components/        # 可复用组件
│   ├── stores/            # Pinia状态管理
│   ├── services/          # API服务层
│   ├── router/            # Vue Router配置
│   └── utils/             # 工具函数
│
├── admin/                 # 管理端应用
│   ├── src/
│   │   ├── pages/         # 管理端页面
│   │   │   ├── dashboard/ # 数据面板 ✅
│   │   │   ├── lockers/   # 杆柜管理 ✅
│   │   │   ├── users/     # 用户管理 ✅
│   │   │   ├── applications/ # 申请审核 ✅
│   │   │   ├── records/   # 操作记录 ✅
│   │   │   └── settings/  # 系统设置 ✅
│   │   ├── stores/        # 状态管理
│   │   ├── services/      # API服务
│   │   └── components/    # 管理端组件
│   ├── package.json
│   └── vite.config.ts
│
├── server/                # Express.js后端
│   ├── index-railway.js   # Railway生产服务器
│   ├── express-server.js  # 本地开发服务器
│   ├── database/          # 数据库配置
│   └── package.json
│
├── docs/                  # 项目文档
├── tests/                 # 测试文件
└── tools/                 # 部署和监控工具
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL (生产环境，Railway提供)

### 本地开发安装

```bash
# 克隆项目
git clone https://github.com/muzhihao1/yeslocker-web.git
cd yeslocker-web-simplified

# 安装根目录依赖
npm install

# 安装管理端依赖
cd admin && npm install && cd ..

# 安装服务端依赖
cd server && npm install && cd ..
```

### 环境配置

创建服务端环境变量文件 `server/.env`:

```env
# 数据库配置
DATABASE_URL=your_postgresql_url

# JWT密钥
JWT_SECRET=your_jwt_secret_key

# 服务端口
PORT=3001

# 环境
NODE_ENV=development
```

### 本地开发

```bash
# 启动所有服务（推荐）
npm run dev:all

# 或单独启动各服务
npm run dev          # 用户端 (端口: 3000)
npm run dev:admin    # 管理端 (端口: 5173)
npm run dev:server   # API服务 (端口: 3001)

# 数据库初始化
npm run db:init
```

## 生产部署 (Railway)

### 自动部署

项目已配置Railway自动部署，推送到main分支即可自动部署：

```bash
git push origin main
```

### Railway配置

**环境变量：**
- `DATABASE_URL`: Railway PostgreSQL连接串 (自动提供)
- `JWT_SECRET`: JWT签名密钥
- `NODE_ENV`: production

**部署命令：**
```json
{
  "build": {
    "command": "npm run build && cd admin && npm run build && cd ../server && npm install"
  },
  "start": {
    "command": "cd server && npm run start:railway"
  }
}
```

## 功能状态

### 用户端功能
- ✅ 用户注册登录 (手机号验证)
- ✅ 杆柜申请流程
- 🔄 存取杆操作 (开发中)
- 📋 历史记录查询 (待开发)
- 🔔 通知系统 (待开发)

### 管理端功能 
- ✅ 管理员登录认证
- ✅ 数据面板统计 (3待审核、2占用、6用户)
- ✅ 杆柜状态管理 (18个杆柜、门店筛选、状态操作)
- ✅ 新增杆柜功能
- ✅ 用户信息管理
- ✅ 申请审核管理
- ✅ 操作记录查询
- ✅ 系统设置管理 (短信、备份、模板)

### API功能
- ✅ 用户认证API (注册、登录)
- ✅ 管理员认证API (JWT + bcrypt)
- ✅ 门店杆柜API (CRUD操作)
- ✅ 申请审核API (GET/POST)
- ✅ 用户管理API (列表、搜索、筛选)
- ✅ 操作记录API (历史查询)
- ✅ 统计数据API (仪表板数据)

## API文档

### 认证相关
```
POST /api/admin-login        # 管理员登录
POST /auth-register          # 用户注册  
POST /auth-login             # 用户登录
```

### 管理端API
```
GET  /api/stores-lockers     # 获取门店和杆柜信息
POST /api/admin-lockers      # 创建新杆柜
PUT  /api/admin-lockers/:id  # 更新杆柜状态
GET  /api/admin-users        # 用户管理列表
GET  /api/admin-applications # 申请审核列表
POST /api/admin-approval     # 审核操作
GET  /api/admin-records      # 操作记录
GET  /api/admin-statistics   # 统计数据
```

### 数据库API
```
GET  /api/db-test            # 数据库连接测试
POST /api/init-db            # 数据库初始化
```

## 数据库设计

### 核心数据表
- `users` - 用户信息 (6条测试数据)
- `stores` - 门店信息 (3个门店: 旗舰店、分店A、分店B)
- `lockers` - 杆柜信息 (18个杆柜，不同状态)
- `locker_records` - 操作记录
- `admins` - 管理员 (3个管理员账户)
- `applications` - 申请记录 (6条申请数据)

### 数据库特性
- PostgreSQL 16.8 (Railway托管)
- 自动备份和恢复
- 连接池优化
- 支持并发访问

## 测试账号

### 管理端测试账号
- **超级管理员**: `13800000001` / `admin123`
- **门店管理员**: `13800000002` / `admin123`
- **管理端访问**: [/admin](https://yeslocker-web-production-314a.up.railway.app/admin)

### 用户端测试
- **测试手机号**: `18669203134` 等
- **验证码**: 开发环境无需验证

## 开发命令

```bash
# 开发相关
npm run dev              # 用户端开发服务器
npm run dev:admin        # 管理端开发服务器  
npm run dev:server       # 后端API开发服务器
npm run dev:all          # 启动所有开发服务器

# 构建相关
npm run build            # 构建所有应用
npm run build:client     # 构建用户端
npm run build:admin      # 构建管理端
npm run build:server     # 准备服务端

# 数据库相关
npm run db:init          # 初始化SQLite数据库
npm run db:migrate       # 数据库迁移

# 代码质量
npm run type-check       # TypeScript类型检查
npm run lint             # ESLint代码规范检查
```

## 部署URL

### 生产环境
- **主应用**: https://yeslocker-web-production-314a.up.railway.app
- **管理端**: https://yeslocker-web-production-314a.up.railway.app/admin
- **API基地址**: https://yeslocker-web-production-314a.up.railway.app/api

### 健康检查
- **服务状态**: https://yeslocker-web-production-314a.up.railway.app/health
- **数据库测试**: https://yeslocker-web-production-314a.up.railway.app/api/db-test

## 技术亮点

1. **三层架构**: 用户端 + 管理端 + API服务端分离
2. **现代技术栈**: Vue 3 Composition API + TypeScript + Vite
3. **自动化部署**: Railway平台自动CI/CD
4. **数据库优化**: PostgreSQL连接池 + 索引优化
5. **完整认证**: JWT + bcrypt密码哈希
6. **响应式设计**: 适配桌面端和移动端
7. **实时数据**: 18个杆柜实时状态管理
8. **权限控制**: 多级管理员权限体系

## 项目状态

**当前版本**: v1.0.0  
**开发状态**: 生产就绪 ✅  
**管理端完成度**: 95% (核心功能全部正常)  
**用户端完成度**: 60% (基础功能已实现)  
**API完成度**: 100% (所有端点已实现)  

## 更新日志

### 最新更新 (2025-01-12)
- ✅ 完成Railway PostgreSQL数据库部署
- ✅ 实现所有管理端API端点
- ✅ 修复JWT认证系统
- ✅ 完善杆柜管理功能 (18个杆柜正常显示)
- ✅ 实现用户管理和申请审核功能
- ✅ 完成数据库种子数据初始化

## 许可证

MIT License

## 联系方式

- **项目仓库**: [GitHub](https://github.com/muzhihao1/yeslocker-web)
- **部署平台**: Railway
- **更新时间**: 2025-01-12

---

**注意**: 这是一个生产就绪的台球杆柜管理系统，核心管理功能已全部实现并正常运行。