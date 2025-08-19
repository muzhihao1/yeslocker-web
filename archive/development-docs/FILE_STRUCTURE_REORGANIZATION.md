# YesLocker 项目文件结构重组说明

## 重组概述

为了提升项目的可维护性和组织性，我们对 YesLocker 项目进行了系统性的文件结构重组。

## 新的目录结构

```
yeslocker/
├── src/                    # 用户端应用 (uni-app) - 保持不变
├── admin/                  # 管理端应用 - 保持不变
├── supabase/              # 后端服务 (Supabase) - 保持不变
├── server/                # 备用服务器 - 保持不变
├── specs/                 # 需求规格文档 - 保持不变
├── tests/                 # 测试相关 (新组织)
│   ├── e2e/              # 端到端测试 (原根目录的test-*.js)
│   ├── integration/      # 集成测试
│   ├── load-testing/     # 负载测试 (原tests/load-testing/)
│   ├── edge-cases/       # 边缘情况测试 (原tests/edge-cases/)
│   └── reports/          # 测试报告目录
├── docs/                  # 文档 (新组织)
│   ├── deployment/       # 部署相关文档
│   ├── development/      # 开发相关文档和测试报告
│   ├── user-guides/      # 用户指南
│   └── api/              # API文档
├── tools/                 # 工具脚本 (新组织)
│   ├── deployment/       # 部署脚本 (原根目录*.sh, scripts/)
│   ├── monitoring/       # 监控工具 (原monitoring/)
│   └── backup/           # 备份工具 (原backup/)
└── configs/               # 配置文件 (新组织)
    ├── deployment/       # 部署配置 (vercel.json, railway.json等)
    └── development/      # 开发配置
```

## 主要变更

### 🧹 清理工作
- **删除临时文件**: 移除所有 `*.log` 日志文件和测试报告 JSON 文件
- **根目录清理**: 显著减少根目录文件数量，提升整洁度

### 📁 文件移动

#### 测试文件
- `test-*.js` → `tests/e2e/`
- `tests/load-testing/` → 保持位置
- `tests/edge-cases/` → 保持位置

#### 工具脚本
- `*.sh` (根目录) → `tools/deployment/`
- `scripts/` → `tools/deployment/`
- `monitoring/` → `tools/monitoring/`
- `backup/` → `tools/backup/`

#### 文档整理
- 部署相关文档 → `docs/deployment/`
- 开发和测试报告 → `docs/development/`
- 用户指南 → `docs/user-guides/`

#### 配置文件
- `nginx/` → `configs/deployment/nginx/`
- 复制 `vercel.json` → `configs/deployment/`
- 复制 `admin/railway.json` → `configs/deployment/railway-admin.json`

### 📋 未改变的核心目录
- `src/` - 用户端代码
- `admin/` - 管理端代码
- `supabase/` - 后端代码和配置
- `server/` - 备用服务器代码
- `specs/` - 需求文档

## 影响评估

### ✅ 无影响的操作
- 所有核心业务代码目录位置未变更
- 构建和部署命令保持不变
- 开发环境启动命令保持不变

### ⚠️ 需要注意的变更
- 测试脚本路径变更: 从根目录移到 `tests/e2e/`
- 部署脚本路径变更: 从根目录移到 `tools/deployment/`
- 文档路径变更: 重新组织到 `docs/` 的子目录中

### 📝 .gitignore 更新
添加了额外的临时文件排除规则:
```
# Temporary files and deployment artifacts
*.tmp
*.temp
deployment-report*.zip
```

## 好处

1. **根目录整洁**: 大幅减少根目录文件数量
2. **逻辑分离**: 按功能域清晰分组 (测试、文档、工具、配置)
3. **可维护性**: 更容易查找和管理相关文件
4. **可扩展性**: 为未来添加更多功能提供清晰的组织结构
5. **团队协作**: 降低新成员理解项目结构的时间成本

## 回滚方案

如果需要回滚，可以使用 git 恢复到重组前的状态：
```bash
git checkout main
```

或者手动将文件移回原位置（主要是测试文件和工具脚本）。

---

*重组日期: 2025-08-08*  
*重组分支: file-structure-reorganization*