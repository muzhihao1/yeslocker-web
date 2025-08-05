# YesLocker Edge Functions 部署指南

## 概述

本文档详细说明了YesLocker项目中Supabase Edge Functions的部署配置和流程。系统支持多环境部署（开发、测试、生产），确保代码从开发到生产的平滑过渡。

## 目录结构

```
supabase/
├── functions/           # Edge Functions源代码
│   ├── _shared/        # 共享工具和安全模块
│   ├── admin-login/    # 管理员登录
│   ├── auth-login/     # 用户登录
│   ├── auth-register/  # 用户注册
│   └── ...            # 其他函数
├── migrations/         # 数据库迁移文件
├── config.toml        # Supabase本地配置
├── deploy-functions.sh # 部署脚本
├── .env.development   # 开发环境配置
├── .env.staging       # 测试环境配置
├── .env.production    # 生产环境配置
└── DEPLOYMENT.md      # 本文档
```

## 环境配置

### 开发环境 (Development)
- **用途**: 本地开发和调试
- **特点**: 放松的安全限制，详细的日志，Mock SMS服务
- **配置文件**: `.env.development`

### 测试环境 (Staging)
- **用途**: 功能测试和集成测试
- **特点**: 接近生产的配置，真实的SMS服务
- **配置文件**: `.env.staging`

### 生产环境 (Production)
- **用途**: 正式运行环境
- **特点**: 严格的安全配置，完整的监控和日志
- **配置文件**: `.env.production`

## 部署方式

### 1. 本地手动部署

#### 前置条件
```bash
# 安装Supabase CLI
npm install -g supabase

# 登录Supabase
supabase login

# 克隆项目
git clone <repository-url>
cd yeslocker
```

#### 部署步骤

1. **配置环境变量**
   ```bash
   # 复制并编辑环境配置文件
   cp supabase/.env.example supabase/.env.local
   # 编辑.env.local文件，填入真实的配置值
   ```

2. **运行部署脚本**
   ```bash
   # 部署到开发环境
   ./supabase/deploy-functions.sh development

   # 部署到测试环境
   ./supabase/deploy-functions.sh staging

   # 部署到生产环境
   ./supabase/deploy-functions.sh production

   # 部署特定函数
   ./supabase/deploy-functions.sh production auth-login
   ```

3. **验证部署**
   ```bash
   # 检查函数状态
   supabase functions list --project-ref <project-ref>

   # 查看函数日志
   supabase functions logs <function-name> --project-ref <project-ref>
   ```

### 2. GitHub Actions自动部署

#### 配置GitHub Secrets

在GitHub仓库的Settings > Secrets and variables > Actions中添加以下secrets：

**通用配置:**
- `SUPABASE_ACCESS_TOKEN`: Supabase访问令牌

**开发环境:**
- `DEV_PROJECT_REF`: 开发环境项目引用
- `DEV_DB_PASSWORD`: 开发环境数据库密码
- `DEV_JWT_SECRET`: 开发环境JWT密钥
- `DEV_OTP_SALT`: 开发环境OTP盐值
- `DEV_TENCENT_SECRET_ID`: 腾讯云SecretId
- `DEV_TENCENT_SECRET_KEY`: 腾讯云SecretKey
- `DEV_TENCENT_SMS_APP_ID`: SMS应用ID
- `DEV_TENCENT_SMS_SIGN_NAME`: SMS签名
- `DEV_ALLOWED_ORIGINS`: 允许的源域名

**测试环境:**
- `STAGING_PROJECT_REF`: 测试环境项目引用
- `STAGING_DB_PASSWORD`: 测试环境数据库密码
- 其他配置同上，前缀改为`STAGING_`

**生产环境:**
- `PRODUCTION_PROJECT_REF`: 生产环境项目引用
- `PRODUCTION_DB_PASSWORD`: 生产环境数据库密码
- 其他配置同上，前缀改为`PRODUCTION_`

#### 触发部署

1. **自动触发**
   ```bash
   # 推送到对应分支自动部署
   git push origin main        # 部署到生产环境
   git push origin staging     # 部署到测试环境
   git push origin develop     # 部署到开发环境
   ```

2. **手动触发**
   - 在GitHub仓库的Actions页面
   - 选择"Deploy Edge Functions"工作流
   - 点击"Run workflow"
   - 选择环境和要部署的函数

## 安全配置

### JWT配置
```bash
# 生成安全的JWT密钥
openssl rand -base64 64

# 设置环境变量
export JWT_SECRET="your-secure-jwt-secret"
```

### OTP配置
```bash
# 生成安全的OTP盐值
openssl rand -base64 32

# 设置环境变量
export OTP_SALT="your-secure-otp-salt"
```

### 腾讯云SMS配置
1. 登录腾讯云控制台
2. 开通短信服务
3. 获取SecretId和SecretKey
4. 创建短信应用和模板
5. 配置相应的环境变量

## 环境变量详解

### 必需配置
- `SUPABASE_URL`: Supabase项目URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role密钥
- `JWT_SECRET`: JWT签名密钥
- `OTP_SALT`: OTP加密盐值

### 可选配置
- `ENVIRONMENT`: 环境标识
- `ALLOWED_ORIGINS`: CORS允许的源
- `RATE_LIMIT_*`: 频率限制配置
- `TENCENT_*`: 腾讯云SMS配置
- `ENABLE_*`: 功能开关

## 监控和日志

### 查看函数日志
```bash
# 实时查看日志
supabase functions logs <function-name> --project-ref <project-ref> --follow

# 查看特定时间段的日志
supabase functions logs <function-name> --project-ref <project-ref> --since 1h
```

### 性能监控
1. 在Supabase Dashboard中查看函数性能指标
2. 设置警报和通知
3. 监控错误率和响应时间

## 故障排查

### 常见问题

1. **部署失败**
   ```bash
   # 检查环境变量配置
   echo $SUPABASE_ACCESS_TOKEN
   
   # 检查项目链接
   supabase projects list
   
   # 重新链接项目
   supabase link --project-ref <project-ref>
   ```

2. **函数报错**
   ```bash
   # 查看详细错误日志
   supabase functions logs <function-name> --project-ref <project-ref>
   
   # 检查环境变量
   supabase secrets list --project-ref <project-ref>
   ```

3. **认证问题**
   ```bash
   # 重新登录
   supabase logout
   supabase login
   
   # 检查token权限
   supabase projects list
   ```

### 调试技巧

1. **本地测试**
   ```bash
   # 启动本地环境
   supabase start
   
   # 本地运行函数
   supabase functions serve <function-name>
   ```

2. **使用日志调试**
   ```typescript
   // 在函数中添加调试日志
   console.log('Debug info:', { request: req.url, headers: req.headers })
   ```

3. **测试API端点**
   ```bash
   # 使用curl测试
   curl -X POST https://<project-ref>.supabase.co/functions/v1/<function-name> \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

## 部署检查清单

### 部署前检查
- [ ] 所有环境变量已正确配置
- [ ] 数据库迁移已准备就绪
- [ ] 函数代码通过TypeScript检查
- [ ] 安全配置已审查
- [ ] 测试用例全部通过

### 部署后验证
- [ ] 所有函数成功部署
- [ ] API端点响应正常
- [ ] 数据库连接正常
- [ ] SMS服务工作正常
- [ ] 监控和日志正常
- [ ] 性能指标在预期范围内

## 回滚策略

### 自动回滚
```bash
# 如果部署失败，自动回滚到上一个版本
supabase functions deploy <function-name> --project-ref <project-ref> --rollback
```

### 手动回滚
1. 找到上一个稳定版本的commit
2. 重新部署该版本
3. 验证系统功能正常

## 联系和支持

如果在部署过程中遇到问题，请联系：
- 技术负责人：[联系方式]
- 项目经理：[联系方式]
- Supabase支持：https://supabase.com/support

## 附录

### A. 环境变量模板
参考`.env.example`文件获取完整的环境变量模板。

### B. 函数API文档
详细的API文档请参考项目wiki或相关文档。

### C. 数据库schema
数据库结构和迁移信息请参考`migrations/`目录下的文件。