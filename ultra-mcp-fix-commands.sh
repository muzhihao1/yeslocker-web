#!/bin/bash

# Ultra MCP 超时问题解决方案

echo "=== 方案 1: 降低复杂度 ==="
# 将 comprehensive 改为 standard，6 步改为 3 步
echo "使用更小的 scope："
echo '/ultra-mcp ultra-plan --task "Complete YesLocker voucher system" --scope standard --totalSteps 3'

echo ""
echo "=== 方案 2: 使用 Gemini（更稳定）==="
echo '/ultra-mcp ultra-plan --provider gemini --task "Complete YesLocker voucher system" --scope comprehensive'

echo ""
echo "=== 方案 3: 分解为多个小任务 ==="
echo "步骤 1："
echo '/ultra-mcp plan-feature --task "Implement voucher auto-expiry mechanism" --scope minimal'
echo ""
echo "步骤 2："
echo '/ultra-mcp plan-feature --task "Create reminders table structure" --scope minimal'
echo ""
echo "步骤 3："
echo '/ultra-mcp plan-feature --task "Build voucher statistics dashboard" --scope minimal'

echo ""
echo "=== 方案 4: 使用简单的深度推理替代 ultra-plan ==="
echo '/ultra-mcp deep-reasoning --prompt "Plan implementation for YesLocker voucher: auto-expiry, reminders table, statistics dashboard" --provider gemini'

echo ""
echo "=== 方案 5: 直接使用 GPT-5 分步规划 ==="
echo "# 不使用 ultra-plan，直接调用："
echo '/ultra-mcp deep-reasoning --prompt "Step 1: Design voucher auto-expiry mechanism" --provider openai --model gpt-5'
echo '/ultra-mcp deep-reasoning --prompt "Step 2: Design reminders table structure" --provider openai --model gpt-5'
echo '/ultra-mcp deep-reasoning --prompt "Step 3: Design statistics dashboard" --provider openai --model gpt-5'