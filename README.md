# YesLocker - 台球杆柜管理小程序

一个现代化的台球杆柜数字化管理系统，支持用户端申请、管理端审核、存取操作记录等完整业务流程。

## 项目概述

- **项目名称**: YesLocker - 台球杆柜管理小程序
- **技术架构**: uni-app (H5) + Supabase + Vercel + 腾讯云SMS
- **开发模式**: 三终端协作开发
- **目标用户**: 台球厅顾客、门店管理员、总部管理员

## 技术栈

### 前端
- **框架**: uni-app + Vue 3 + TypeScript
- **状态管理**: Pinia
- **UI组件**: uni-ui + 自定义组件
- **样式**: SCSS + 响应式设计
- **部署**: Vercel

### 后端
- **数据库**: Supabase (PostgreSQL)
- **API**: Supabase Edge Functions
- **认证**: Supabase Auth + JWT
- **文件存储**: Supabase Storage
- **短信服务**: 腾讯云SMS

## 项目结构

```
yeslocker/
├── src/                    # 用户端源码 (Terminal 1)
│   ├── pages/             # 页面组件
│   ├── stores/            # Pinia状态管理
│   ├── utils/             # 工具函数
│   └── static/            # 静态资源
├── admin/                  # 管理端源码 (Terminal 2)
│   ├── pages/             # 管理端页面
│   │   ├── login/         # 登录页面 ✅
│   │   ├── dashboard/     # 数据面板 ✅
│   │   ├── applications/  # 申请审核 🔄
│   │   ├── users/         # 用户管理 🔄
│   │   ├── lockers/       # 杆柜管理 🔄
│   │   └── statistics/    # 数据统计 🔄
│   ├── stores/            # 状态管理 ✅
│   ├── services/          # API服务层 ✅
│   └── styles/            # 样式系统 ✅
├── supabase/              # 后端配置 (Terminal 2)
│   ├── config.toml        # Supabase配置 ✅
│   ├── migrations/        # 数据库迁移文件 ✅
│   │   ├── 20240301000001_initial_schema.sql
│   │   ├── 20240301000002_sms_tables.sql
│   │   ├── 20240301000003_admin_logs.sql
│   │   └── 20240301000004_approval_function.sql
│   └── functions/         # Edge Functions ✅
│       ├── auth-register/
│       ├── auth-login/
│       ├── admin-login/
│       ├── sms-send/
│       ├── lockers-apply/
│       ├── stores-lockers/
│       ├── locker-operations/
│       └── admin-approval/
├── specs/                 # 需求文档
├── DEVELOPMENT_PLAN.md    # 开发计划 (含Terminal 2进度)
├── vercel.json            # 部署配置 ✅
└── README.md             # 项目说明 (本文档)
```

## 快速开始

### 环境要求

- Node.js >= 16
- npm >= 8
- Supabase CLI
- Vercel CLI (可选)

### 安装依赖

```bash
# 安装主项目依赖
npm install

# 安装管理端依赖
cd admin && npm install
```

### 环境配置

1. **Supabase配置**
   ```bash
   # 初始化Supabase项目
   supabase init
   
   # 启动本地开发环境
   supabase start
   
   # 运行数据库迁移
   supabase db push
   ```

2. **环境变量配置**
   
   创建 `.env.local` 文件：
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # 腾讯云SMS配置
   TENCENT_SECRET_ID=your_secret_id
   TENCENT_SECRET_KEY=your_secret_key
   TENCENT_SMS_APP_ID=your_app_id
   TENCENT_SMS_SIGN_NAME=your_sign_name
   ```

### 本地开发

```bash
# 启动用户端开发服务器
npm run dev

# 启动管理端开发服务器
npm run dev:admin

# 启动Supabase Edge Functions
npm run functions:serve
```

## 部署指南

### Vercel部署

1. **连接GitHub仓库**
   ```bash
   vercel --prod
   ```

2. **配置环境变量**
   在Vercel Dashboard中配置所有必要的环境变量

3. **域名配置**
   - 用户端: https://your-domain.com
   - 管理端: https://your-domain.com/admin

### Supabase部署

```bash
# 部署Edge Functions
supabase functions deploy

# 部署数据库迁移
supabase db push --linked
```

## 功能模块

### 用户端功能 (Terminal 1)
- ✅ 用户注册登录 (手机号+短信验证)
- ✅ 杆柜申请流程
- 🔄 存取杆操作记录 (进行中)
- 📋 电子凭证展示 (待开发)
- 📱 历史记录查询 (待开发)
- 🔔 通知消息系统 (待开发)

### 管理端功能 (Terminal 2)
- ✅ 管理员登录认证
- ✅ 数据面板统计
- ✅ 申请审核管理
- ✅ 杆柜状态管理
- ✅ 用户信息管理
- ✅ 操作记录查询
- 📊 数据统计导出 (需补充页面)
- 🔔 提醒管理功能 (需补充页面)

### 后端API (Terminal 2)
- ✅ 用户认证API (`auth-register`, `auth-login`)
- ✅ 管理员认证API (`admin-login`)
- ✅ 业务核心API (`lockers-apply`, `stores-lockers`, `locker-operations`)
- ✅ 管理功能API (`admin-approval`)
- ✅ 短信服务API (`sms-send`)
- 🔄 第三方集成 (腾讯云SMS真实对接)

## 数据库设计

### 核心数据表
- `users` - 用户信息表
- `stores` - 门店信息表
- `lockers` - 杆柜信息表
- `locker_records` - 操作记录表
- `admins` - 管理员表
- `applications` - 申请记录表
- `reminders` - 提醒记录表

### 权限控制
- 采用Supabase RLS (Row Level Security)
- 多级权限：超级管理员、门店管理员、普通用户
- JWT认证 + 行级数据安全策略

## API文档

### 认证相关
- `POST /auth-register` - 用户注册
- `POST /auth-login` - 用户登录
- `POST /admin-login` - 管理员登录
- `POST /sms-send` - 发送短信验证码

### 业务相关
- `POST /lockers-apply` - 申请杆柜
- `GET /stores-lockers` - 获取门店和杆柜信息
- `POST /locker-operations` - 存取杆操作
- `GET/POST /admin-approval` - 管理员审核

## 开发进度 (更新时间: 2024-08-02)

### Terminal 2 最新进展

#### 已完成 ✅ (90%)
**后端API体系 (100%完成)**
- [x] 完整的PostgreSQL数据库架构设计 (7个核心表)
- [x] RLS (Row Level Security) 安全策略配置
- [x] 数据库索引优化和性能调优
- [x] 8个核心Edge Functions API实现
  - `auth-register` - 用户注册 ✅
  - `auth-login` - 用户登录 ✅
  - `admin-login` - 管理员登录 ✅
  - `sms-send` - 短信发送 ✅
  - `lockers-apply` - 杆柜申请 ✅
  - `stores-lockers` - 门店和杆柜管理 ✅
  - `locker-operations` - 存取杆操作 ✅
  - `admin-approval` - 管理员审核 ✅

**管理端前端架构 (85%完成)**
- [x] uni-app + Vue 3 + TypeScript框架搭建
- [x] Pinia状态管理配置完成
- [x] 路由结构和页面架构设计 (14个核心页面)
- [x] 管理员认证系统 (登录页面、状态管理、权限验证)
- [x] 数据面板页面 (dashboard统计展示)
- [x] API服务层 (统一请求封装、错误处理)
- [x] 台球主题UI样式系统

**项目基础设施 (100%完成)**
- [x] Supabase项目配置 (config.toml)
- [x] 数据库迁移文件 (4个迁移文件)
- [x] Vercel部署配置
- [x] 开发文档和README

### Terminal 1 进展
- [x] 用户端基础架构搭建
- [x] 用户注册流程实现
- [x] 登录功能开发
- [x] 杆柜申请页面
- [ ] 存取杆操作功能
- [ ] 电子凭证展示
- [ ] 历史记录查询

### 进行中 🔄
- [ ] 腾讯云SMS真实集成 (Terminal 2) - 占位符实现已完成
- [ ] 管理端剩余页面开发 (Terminal 2)
  - [ ] 申请审核页面 (applications/index.vue)
  - [ ] 用户管理页面 (users/index.vue)
  - [ ] 杆柜管理页面 (lockers/index.vue)
  - [ ] 数据统计页面 (statistics/index.vue)
- [ ] 用户端完整业务流程 (Terminal 1)
- [ ] 文件上传功能集成

### 待开发 📋
- [ ] 生产环境部署和配置
- [ ] 集成测试和性能优化
- [ ] API文档自动生成
- [ ] 运维监控系统配置

## 协作开发

### 三终端分工
- **Terminal 1**: 前端用户端开发
- **Terminal 2**: 管理端+后端开发 (本终端)
- **Terminal 3**: 素材收集+UI设计

### 代码管理
- 使用Git分支管理
- 代码审查制度
- 统一代码规范

## 测试账号 (开发环境)

### 管理员账号
- 超级管理员: `13800000001` / `admin123`
- 门店管理员: `13800000002` / `admin123`

### 短信验证码
- 开发环境统一验证码: `123456`

## 项目里程碑

### Phase 1: 基础架构 ✅ (第1-3天)
- [x] 项目环境搭建
- [x] 数据库设计和实现
- [x] 基础API开发
- [x] 认证系统实现

### Phase 2: 核心功能 🔄 (第4-12天)
- [x] 用户端注册登录 (Terminal 1)
- [x] 杆柜申请API (Terminal 2)
- [x] 管理端框架搭建 (Terminal 2)
- [ ] 完整用户端流程 (Terminal 1)
- [ ] 完整管理端页面 (Terminal 2)

### Phase 3: 集成优化 📋 (第13-17天)
- [ ] 第三方服务集成
- [ ] 性能优化
- [ ] 集成测试
- [ ] 安全审计

### Phase 4: 部署上线 📋 (第18-20天)
- [ ] 生产环境配置
- [ ] 部署流程
- [ ] 运维监控
- [ ] 用户培训文档

## 技术亮点

1. **无服务器架构**: 基于Supabase Edge Functions，自动扩缩容
2. **行级安全**: PostgreSQL RLS策略，数据隔离安全
3. **统一技术栈**: uni-app多端复用，降低维护成本
4. **现代化开发**: TypeScript + Vue 3组合式API
5. **完整的认证体系**: JWT + 多级权限管理

## 联系方式

- **Terminal 2负责人**: Full Stack Developer
- **项目文档**: `/DEVELOPMENT_PLAN.md`
- **需求文档**: `/specs/PRD.md`
- **更新时间**: 2024-08-02

## 许可证

MIT License

---

**注意**: 这是一个三终端协作开发的项目，当前文档反映了最新的开发进度。Terminal 2已完成90%的任务，包括完整的后端API体系和管理端基础架构。