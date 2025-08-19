# YesLocker Railway部署指南

## 部署状态概览

### 当前架构状态 (2025-08-19)

✅ **已完成**:
- 多阶段Docker构建配置（前端构建 + 后端准备 + 生产运行时）
- TypeScript架构基础框架（Service-Controller-Repository模式）
- API兼容性层确保前后端正常通信
- 安全的Docker配置（非root用户、健康检查、信号处理）

🔄 **当前状态**:
- 使用稳定的legacy服务器 (`index-railway.js`) 进行生产部署
- TypeScript架构已集成，等待类型错误修复后切换

⏳ **待处理**:
- 修复TypeScript编译错误以启用新架构
- 完成Railway环境变量配置
- 生产部署验证和监控

## Railway部署配置

### 1. 核心环境变量

```bash
# 数据库配置 (Railway自动提供)
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_PUBLIC_URL=postgresql://username:password@public-host:port/database

# JWT认证
JWT_SECRET=your-production-jwt-secret-key-min-32-chars
JWT_EXPIRES_IN=24h

# 服务器配置
NODE_ENV=production
PORT=3001  # Railway会自动覆盖

# 应用程序URL
FRONTEND_URL=https://your-app.railway.app
API_BASE_URL=https://your-app.railway.app/api

# 安全配置
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-app.railway.app

# 文件上传 (可选)
UPLOAD_MAX_SIZE=5242880  # 5MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json
```

### 2. Railway项目设置

#### 构建配置
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "version": "2025-08-13-full-app-deployment",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 构建过程
1. **前端构建阶段**: 编译用户应用和管理面板
2. **后端准备阶段**: 安装生产依赖
3. **生产运行时**: 优化的Alpine镜像，非root用户执行

### 3. 部署验证清单

#### 部署前检查
- [ ] 确认所有环境变量已设置
- [ ] 验证数据库连接字符串
- [ ] 检查JWT密钥长度和复杂性
- [ ] 确认CORS域名配置正确

#### 部署后验证
- [ ] 健康检查端点: `GET /api/health`
- [ ] API信息端点: `GET /api/info`
- [ ] 数据库连接状态: 检查日志中的连接确认
- [ ] 前端应用加载: 访问主域名
- [ ] 管理面板访问: 访问 `/admin`
- [ ] 用户认证流程: 测试登录/注册

#### 性能监控
- [ ] 响应时间: API调用应在1-2秒内完成
- [ ] 内存使用: 监控容器内存消耗
- [ ] 数据库性能: 查询响应时间
- [ ] 错误率: 监控4xx/5xx错误

## 当前服务器架构

### Legacy服务器 (生产环境)
```
server/index-railway.js
├── 完整的Express.js应用
├── JWT认证和中间件
├── PostgreSQL数据库连接
├── 所有API端点实现
└── 静态文件服务
```

### TypeScript架构 (开发准备)
```
server/src/
├── server.ts          # 主服务器类
├── index.ts           # 入口点
├── controllers/       # 控制器层
├── services/          # 业务逻辑层
├── repositories/      # 数据访问层
├── models/            # 数据模型
├── routes/            # 路由定义
└── middleware/        # 中间件
```

## API端点映射

### 认证相关
- `POST /admin-login` → `/api/auth/login`
- `POST /auth-register` → `/api/auth/register`
- `POST /auth-login` → `/api/auth/login`

### 用户管理
- `GET /admin-users` → `/api/users`
- `POST /check-user` → `/api/users/check-phone/:phone`
- `GET /users/:id/locker` → `/api/users/:id/locker`
- `GET /users/:id/locker-records` → `/api/users/:id/records`

### 申请和审批
- `POST /lockers-apply` → `/api/applications`
- `GET /admin-approval` → `/api/applications?status=pending`
- `POST /admin-approval` → `/api/applications/:id/approve|reject`

### 门店和储物柜
- `GET /stores` → `/api/stores/active`
- `GET /stores-lockers` → `/api/stores`
- `GET /lockers/:storeId` → `/api/stores/:storeId/lockers`

### 记录和统计
- `POST /locker-operations` → `/api/records`
- `GET /admin-records` → `/api/records`
- `GET /admin/statistics` → `/api/applications/statistics`

## 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查环境变量
echo $DATABASE_URL

# 测试数据库连接
node -e "const pg = require('pg'); const client = new pg.Client(process.env.DATABASE_URL); client.connect().then(() => console.log('Connected')).catch(err => console.error(err));"
```

#### 2. JWT认证问题
```bash
# 验证JWT密钥长度
echo $JWT_SECRET | wc -c  # 应该 >= 32

# 测试JWT生成
curl -X POST https://your-app.railway.app/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800000002", "password": "admin123"}'
```

#### 3. 前端资源加载失败
- 检查构建输出目录: `/app/public` 和 `/app/admin/dist`
- 验证静态文件中间件配置
- 确认CORS设置允许前端域名

#### 4. 外键约束错误
```sql
-- 检查数据完整性
SELECT a.id, a.user_id, a.store_id, a.assigned_locker_id 
FROM applications a 
LEFT JOIN users u ON a.user_id = u.id 
LEFT JOIN stores s ON a.store_id = s.id 
LEFT JOIN lockers l ON a.assigned_locker_id = l.id 
WHERE u.id IS NULL OR s.id IS NULL OR l.id IS NULL;
```

### 日志查看
```bash
# Railway CLI
railway logs --tail

# 或者通过Railway仪表板查看实时日志
```

### 性能优化建议

1. **数据库连接池**: 已配置，监控连接数
2. **静态资源缓存**: 设置适当的Cache-Control headers
3. **API响应缓存**: 对静态数据实施缓存策略
4. **数据库索引**: 确保查询频繁的字段有索引
5. **监控告警**: 设置响应时间和错误率告警

## 下一步计划

### Phase 1: TypeScript架构修复
- [ ] 修复ServiceResponse接口类型错误
- [ ] 统一Repository层方法签名
- [ ] 解决Objection.js ORM类型冲突
- [ ] 重新启用Controller层

### Phase 2: 渐进式迁移
- [ ] A/B测试新旧API端点
- [ ] 逐步切换到TypeScript服务器
- [ ] 性能对比和优化

### Phase 3: 高级功能
- [ ] API版本控制
- [ ] 自动化测试集成
- [ ] 监控和告警系统
- [ ] 蓝绿部署策略

---

**部署状态**: 🟢 生产就绪 (使用legacy服务器)  
**架构升级**: 🟡 准备中 (TypeScript架构需要类型修复)  
**最后更新**: 2025-08-19  
**维护者**: Claude Code Integration