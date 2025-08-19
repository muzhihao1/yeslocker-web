# 修复 Ultra MCP ECONNRESET 连接错误

## 问题诊断

错误信息：`Cannot connect to API: read ECONNRESET`

这表示网络连接被重置，通常是 API 密钥或网络配置问题。

## 解决步骤

### 1. 更新 OpenAI API Key

访问 [OpenAI Platform](https://platform.openai.com/api-keys) 生成新的 API key：

```bash
# 编辑配置文件
nano ~/Library/Preferences/ultra-mcp-nodejs/config.json

# 更新 openai.apiKey 字段
"apiKey": "your-new-api-key-here"
```

### 2. 测试网络连接

```bash
# 测试 OpenAI API 连接
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# 测试 Google API 连接  
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

### 3. 配置代理（如果需要）

如果使用代理，添加代理配置：

```json
{
  "openai": {
    "preferredModel": "gpt-5",
    "apiKey": "your-api-key",
    "trackUsage": true,
    "proxy": {
      "host": "your-proxy-host",
      "port": 8080
    }
  }
}
```

### 4. 使用备用模型

如果 OpenAI 连接失败，可以切换到其他模型：

```json
{
  "defaultProvider": "gemini",  // 切换到 Gemini
  "fallbackProvider": "openaiCompatible"  // 使用本地模型作为备用
}
```

### 5. 添加重试机制

在配置中添加重试和超时设置：

```json
{
  "requestOptions": {
    "timeout": 30000,  // 30秒超时
    "retries": 3,      // 重试3次
    "retryDelay": 1000 // 重试延迟1秒
  }
}
```

### 6. 检查 API 限制

确认你的 API 账户：
- 有足够的额度
- 没有超过速率限制
- API key 有正确的权限

### 7. 临时解决方案

使用本地模型避免网络问题：

```bash
# 安装 Ollama
brew install ollama

# 下载模型
ollama pull llama3.1:8b
ollama pull qwen2.5:7b

# 启动 Ollama 服务
ollama serve
```

然后在 ultra-mcp 中使用本地模型：

```json
{
  "openaiCompatible": {
    "baseURL": "http://localhost:11434/v1",
    "providerName": "ollama",
    "preferredModel": "llama3.1:8b"
  }
}
```

## 验证修复

重启 Claude Desktop 后测试：

```markdown
/ultra-mcp list-ai-models
```

如果仍有问题，检查日志：

```bash
# 查看 ultra-mcp 日志
tail -f ~/.config/ultra-mcp/token-usage.log

# 查看 Claude 日志
tail -f ~/Library/Logs/Claude/mcp.log
```

## 常见错误代码

- `ECONNRESET`: 连接被重置
- `ETIMEDOUT`: 连接超时
- `ENOTFOUND`: DNS 解析失败
- `401 Unauthorized`: API key 无效
- `429 Too Many Requests`: 请求过于频繁

## 联系支持

如果问题持续，可以：
1. 检查 OpenAI 服务状态：https://status.openai.com
2. 查看 Ultra MCP 问题跟踪：GitHub Issues
3. 使用备用提供商（Gemini/本地模型）继续工作