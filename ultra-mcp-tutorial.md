# Ultra MCP 完整使用教程

## 目录

1. [简介](#简介)
2. [安装与配置](#安装与配置)
3. [核心功能模块](#核心功能模块)
4. [实战案例](#实战案例)
5. [最佳实践](#最佳实践)
6. [常见问题](#常见问题)

## 简介

Ultra MCP 是一个强大的 AI 多模型协作工具，集成了多个顶级 AI 模型（GPT-5、Gemini 2.5 Pro、DeepSeek R1 等），专门为软件开发、代码审查、问题调试和文档生成等任务设计。

### 主要特性

- **多模型支持**: OpenAI (GPT-5, O3)、Google (Gemini 2.5 Pro)、本地模型 (Ollama)
- **深度推理**: 支持复杂问题的深度分析和推理
- **代码智能**: 代码审查、调试、重构、文档生成
- **向量搜索**: 基于语义的代码和文档搜索
- **协作决策**: 多模型共识机制，获取不同 AI 的观点

## 安装与配置

### 1. 前置要求

- Node.js 18+ 
- Claude Desktop 或支持 MCP 的客户端
- API Keys (OpenAI/Google)

### 2. 安装步骤

```bash
# 克隆或下载 ultra-mcp
git clone https://github.com/yourusername/ultra-mcp.git
cd ultra-mcp

# 安装依赖
npm install

# 构建项目
npm run build
```

### 3. 配置 API Keys

编辑配置文件 `~/Library/Preferences/ultra-mcp-nodejs/config.json`:

```json
{
  "openai": {
    "preferredModel": "gpt-5",
    "apiKey": "your-openai-api-key",
    "trackUsage": true
  },
  "google": {
    "apiKey": "your-google-api-key",
    "trackUsage": true
  },
  "openaiCompatible": {
    "baseURL": "http://localhost:11434/v1",
    "providerName": "ollama"
  },
  "tokenTracking": {
    "enabled": true,
    "displayInUI": true,
    "logToFile": true,
    "logPath": "~/.config/ultra-mcp/token-usage.log"
  }
}
```

### 4. 在 Claude Desktop 中配置

编辑 Claude 配置文件 `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ultra-mcp": {
      "command": "node",
      "args": ["/path/to/ultra-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## 核心功能模块

### 1. 深度推理 (deep-reasoning)

用于解决复杂问题和深度分析。

```markdown
使用示例：
/ultra-mcp deep-reasoning "分析这个递归算法的时间复杂度，并提出优化方案"
```

**参数说明**:
- `prompt`: 问题描述（必需）
- `provider`: 选择模型提供商 (openai/gemini/azure)
- `reasoningEffort`: 推理深度 (low/medium/high)
- `temperature`: 创造性程度 (0-2)

### 2. 代码审查 (review-code)

全面审查代码质量、安全性和性能。

```markdown
使用示例：
/ultra-mcp review-code --task "审查用户认证模块" --focus security
```

**审查维度**:
- `bugs`: 查找潜在错误
- `security`: 安全漏洞检测
- `performance`: 性能优化建议
- `style`: 代码风格规范
- `all`: 全面审查

### 3. 调试助手 (debug-issue)

系统化的问题诊断和调试。

```markdown
使用示例：
/ultra-mcp debug-issue --task "用户登录返回500错误" --symptoms "JWT验证失败"
```

**调试流程**:
1. 症状分析
2. 根因定位
3. 解决方案生成
4. 修复验证

### 4. 功能规划 (plan-feature)

分步骤规划新功能实现。

```markdown
使用示例：
/ultra-mcp plan-feature --task "实现电子优惠券系统" --scope comprehensive
```

**规划范围**:
- `minimal`: 最小可行实现
- `standard`: 标准功能集
- `comprehensive`: 完整功能规划

### 5. 文档生成 (generate-docs)

自动生成各类技术文档。

```markdown
使用示例：
/ultra-mcp generate-docs --task "API接口文档" --format markdown
```

**文档格式**:
- `markdown`: Markdown 格式
- `comments`: 代码注释
- `api-docs`: API 文档
- `readme`: README 文件

### 6. 安全审计 (secaudit)

全面的安全漏洞扫描。

```markdown
使用示例：
/ultra-mcp secaudit --task "OWASP Top 10审查" --focus owasp
```

**审计类型**:
- `owasp`: OWASP Top 10 检查
- `compliance`: 合规性检查
- `infrastructure`: 基础设施安全
- `dependencies`: 依赖项漏洞

### 7. 预提交检查 (precommit)

代码提交前的自动化检查。

```markdown
使用示例：
/ultra-mcp precommit --task "检查即将提交的更改" --focus all
```

### 8. 执行流追踪 (tracer)

追踪代码执行流程和依赖关系。

```markdown
使用示例：
/ultra-mcp tracer --task "追踪User.login()执行流程" --traceMode precision
```

### 9. 多模型共识 (consensus)

获取多个 AI 模型的共识意见。

```markdown
使用示例：
/ultra-mcp consensus --proposal "采用微服务架构重构单体应用" --models '[{"model":"gpt-5"},{"model":"gemini-pro"}]'
```

### 10. 向量搜索 (search-vectors)

基于语义的智能代码搜索。

```markdown
# 首先建立索引
/ultra-mcp index-vectors --path /your/project

# 然后搜索
/ultra-mcp search-vectors --query "处理用户认证的代码" --limit 10
```

## 实战案例

### 案例 1: 调试生产环境 500 错误

```markdown
步骤 1: 使用调试助手分析问题
/ultra-mcp debug-issue --task "用户注册接口返回500错误" --symptoms "数据库插入失败，foreign key constraint"

步骤 2: 使用追踪器定位代码
/ultra-mcp tracer --task "追踪用户注册流程" --targetDescription "UserService.createUser"

步骤 3: 生成修复方案
/ultra-mcp deep-reasoning "基于外键约束错误，生成数据库迁移脚本修复方案"
```

### 案例 2: 实现新功能 - 优惠券系统

```markdown
步骤 1: 功能规划
/ultra-mcp plan-feature --task "设计优惠券系统" --scope comprehensive --requirements "支持多种优惠类型、有效期管理、使用限制"

步骤 2: 代码实现后审查
/ultra-mcp review-code --task "审查优惠券核心模块" --focus all

步骤 3: 生成文档
/ultra-mcp generate-docs --task "优惠券API文档" --format api-docs

步骤 4: 安全审计
/ultra-mcp secaudit --task "审查优惠券系统安全性" --focus comprehensive
```

### 案例 3: 性能优化

```markdown
步骤 1: 分析性能问题
/ultra-mcp analyze-code --task "分析数据库查询性能" --focus performance

步骤 2: 获取优化建议
/ultra-mcp consensus --proposal "添加数据库索引优化查询" --models '[{"model":"gpt-5"},{"model":"gemini-pro"}]'

步骤 3: 实施优化并验证
/ultra-mcp precommit --task "验证性能优化更改" --focus performance
```

## 最佳实践

### 1. 选择合适的模型

- **GPT-5**: 复杂推理、架构设计、代码生成
- **Gemini 2.5 Pro**: 实时搜索、文档分析、多模态任务
- **本地模型 (Ollama)**: 隐私敏感数据、离线开发

### 2. 优化 Token 使用

```json
{
  "tokenTracking": {
    "enabled": true,
    "alertThreshold": 10000,  // 超过阈值时警告
    "dailyLimit": 100000      // 每日限额
  }
}
```

### 3. 工作流自动化

创建脚本串联多个命令：

```bash
#!/bin/bash
# review-and-commit.sh

# 1. 代码审查
ultra-mcp review-code --task "审查所有更改" --focus all

# 2. 运行测试
npm test

# 3. 预提交检查
ultra-mcp precommit --task "最终检查" --severity high

# 4. 提交代码
git commit -m "feat: reviewed and tested changes"
```

### 4. 向量搜索优化

```json
{
  "vectorConfig": {
    "chunkSize": 1500,      // 适中的块大小
    "chunkOverlap": 200,    // 重叠以保持上下文
    "batchSize": 10,        // 批处理大小
    "updateInterval": 3600  // 每小时更新索引
  }
}
```

## 常见问题

### Q1: Token 使用量显示为 0？

**解决方案**: 确保配置中启用了 token tracking:
```json
{
  "openai": { "trackUsage": true },
  "google": { "trackUsage": true },
  "tokenTracking": { "enabled": true }
}
```

### Q2: 如何降低 API 成本？

**建议**:
1. 使用本地模型处理非关键任务
2. 设置合理的 `maxOutputTokens` 限制
3. 使用缓存避免重复查询
4. 批量处理相似任务

### Q3: 向量搜索速度慢？

**优化方法**:
1. 减少 `chunkSize` 提高索引效率
2. 使用文件过滤器限制索引范围
3. 定期清理和重建索引

### Q4: 多模型共识结果不一致？

**处理策略**:
1. 增加更多模型参与投票
2. 为不同模型设置权重
3. 使用 `stance` 参数获取不同视角

### Q5: 如何处理敏感数据？

**安全建议**:
1. 使用本地模型处理敏感信息
2. 配置数据脱敏规则
3. 启用日志加密
4. 定期轮换 API Keys

## 高级配置

### 自定义模型参数

```json
{
  "modelOverrides": {
    "gpt-5": {
      "temperature": 0.7,
      "maxTokens": 4000,
      "topP": 0.95
    },
    "gemini-pro": {
      "temperature": 0.8,
      "candidateCount": 1,
      "safetySettings": "BLOCK_NONE"
    }
  }
}
```

### 集成 CI/CD

```yaml
# .github/workflows/code-review.yml
name: AI Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Ultra MCP
        run: npm install -g ultra-mcp
      - name: Run AI Review
        run: |
          ultra-mcp review-code --task "PR review" --focus all
          ultra-mcp secaudit --task "Security check" --severity high
```

## 总结

Ultra MCP 是一个功能强大的 AI 辅助开发工具，通过合理配置和使用，可以显著提升开发效率和代码质量。记住以下要点：

1. **选择合适的工具**: 不同任务使用不同的功能模块
2. **优化配置**: 根据项目需求调整参数
3. **监控使用**: 跟踪 token 使用和成本
4. **持续学习**: 随着使用积累最佳实践

## 相关资源

- [官方文档](https://github.com/ultra-mcp/docs)
- [API 参考](https://api.ultra-mcp.dev)
- [社区论坛](https://community.ultra-mcp.dev)
- [示例项目](https://github.com/ultra-mcp/examples)

---

*最后更新: 2025年1月*