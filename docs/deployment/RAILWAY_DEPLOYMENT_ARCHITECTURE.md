# YesLocker Railway 部署架构文档

## 🏗️ 整体架构设计

YesLocker 采用微服务架构，在 Railway 上部署多个独立服务：

```
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   用户端 H5     │  │    管理端面板    │  │   后端 API      │
│  yeslocker-web  │  │  generous-wisdom │  │   Supabase      │
│   (Railway)     │  │   (Railway)      │  │  (External)     │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

## 📦 Railway Services 配置

### 1️⃣ yeslocker-web (用户端 H5 应用)

**用途**: 用户端台球杆柜管理 H5 应用
**技术栈**: uni-app + Vue 3 + TypeScript + Vite
**部署类型**: 静态资源 + Express 服务器

#### 配置文件

**nixpacks.toml**
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.build]
cmds = ["npm ci --omit=dev", "NODE_ENV=production npm run build:h5"]

[phases.start]
cmd = "npm start"
```

**start-app.js** (极简静态服务器)
```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 智能路径探测: dist/build/h5 -> dist/h5 -> dist
const candidates = ['dist/build/h5', 'dist/h5', 'dist'];
const root = candidates
  .map(p => path.resolve(__dirname, p))
  .find(p => require('fs').existsSync(p));

app.use(express.static(root, { maxAge: '1y' }));
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('*', (req, res) => res.sendFile(path.join(root, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ YesLocker H5 serving ${root} on :${PORT}`);
});
```

**部署流程**:
1. Install: `npm ci --omit=dev` (排除开发依赖)
2. Build: `vite build` (生成静态资源到 dist/)
3. Start: Express 服务器托管静态文件

### 2️⃣ generous-wisdom (管理端面板)

**用途**: 管理员后台面板
**技术栈**: Vue 3 + TypeScript + Vite  
**部署类型**: 静态资源部署

#### 预期配置
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.build]
cmds = ["cd admin", "npm ci --omit=dev", "npm run build"]

[phases.start]
cmd = "cd admin && npm run start"
```

## 🔧 部署策略详解

### 前后端分离架构

```
用户请求 → Railway (H5/管理端) → Supabase Edge Functions → PostgreSQL
```

#### 数据流向
1. **前端请求**: H5/管理端 → Railway Express Server
2. **API调用**: Railway Services → Supabase Edge Functions
3. **数据存储**: Edge Functions → PostgreSQL + 文件存储

### 环境隔离

| 环境 | 用户端 | 管理端 | 后端API |
|------|--------|--------|---------|
| 开发 | localhost:3000 | localhost:5173 | localhost:54321 |
| 生产 | yeslocker-web-production.up.railway.app | generous-wisdom-production.up.railway.app | Supabase Cloud |

## ⚡ 性能优化策略

### 1. 静态资源优化
- **压缩**: 启用 gzip/brotli 压缩
- **缓存**: 设置 1 年缓存 `maxAge: '1y'`
- **CDN**: Railway 边缘缓存加速

### 2. 构建优化  
- **依赖分离**: `--omit=dev` 排除开发依赖
- **代码分割**: Vite 自动 code splitting
- **资源压缩**: 生产构建自动压缩 JS/CSS

### 3. 日志管理
- **最小化输出**: 启动日志仅1行，避免日志洪水
- **健康检查**: 轻量级 `/health` 端点
- **错误监控**: 集中化错误日志收集

## 🚨 已解决的关键问题

### 问题1: Railway 自动检测错误
**现象**: Railway 误判 `admin/src/utils/index.ts` 需要 deno 执行
**解决**: 创建 `.railwayignore` 排除 admin 目录

### 问题2: 日志洪水导致 502
**现象**: 大量日志输出触发 Railway 限流 (>500 logs/sec)
**解决**: 极简化启动日志，排除 devDependencies

### 问题3: 端口配置冲突  
**现象**: 硬编码 8080 与 Railway 动态端口冲突
**解决**: 使用 `process.env.PORT || 3000`

### 问题4: 构建产物缺失
**现象**: `dist` 目录不存在导致应用崩溃
**解决**: 完善构建流程，添加智能路径探测

## 📋 运维清单

### 部署前检查
- [ ] 环境变量配置完整
- [ ] 构建脚本测试通过  
- [ ] 健康检查端点可访问
- [ ] 日志输出符合限制

### 监控指标
- **响应时间**: < 200ms
- **可用性**: > 99.9%
- **日志频率**: < 100 logs/sec
- **内存使用**: < 512MB

### 故障排除
1. **502 错误**: 检查启动日志和端口配置
2. **构建失败**: 验证依赖和环境变量
3. **自动重启**: 分析日志洪水和内存泄漏

## 🔮 未来优化方向

1. **容器化**: Docker 部署提高一致性
2. **CI/CD**: GitHub Actions 自动化部署
3. **监控**: Prometheus + Grafana 可观测性
4. **缓存**: Redis 缓存层优化性能
5. **安全**: SSL 证书和安全头配置

---

*此文档记录了 YesLocker 在 Railway 的完整部署架构和设计思路*