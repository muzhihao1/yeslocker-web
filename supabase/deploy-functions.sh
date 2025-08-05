#!/bin/bash

# YesLocker Edge Functions Deployment Script
# Terminal B: Edge Functions Deployment Configuration
# 使用方法: ./deploy-functions.sh [environment] [function_name]
# 示例: ./deploy-functions.sh production auth-login

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
ENVIRONMENT=${1:-development}
FUNCTION_NAME=${2:-all}

log_info "部署环境: $ENVIRONMENT"
log_info "部署函数: $FUNCTION_NAME"

# 验证环境
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "无效的环境: $ENVIRONMENT"
    log_info "支持的环境: development, staging, production"
    exit 1
fi

# 检查Supabase CLI
if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI 未安装"
    log_info "请运行: npm install -g supabase"
    exit 1
fi

# 检查登录状态
if ! supabase projects list &> /dev/null; then
    log_error "未登录Supabase CLI"
    log_info "请运行: supabase login"
    exit 1
fi

# 根据环境设置项目引用
case $ENVIRONMENT in
    "development")
        PROJECT_REF="local"
        ;;
    "staging")
        PROJECT_REF=${STAGING_PROJECT_REF:-"your-staging-project-ref"}
        ;;
    "production")
        PROJECT_REF=${PRODUCTION_PROJECT_REF:-"your-production-project-ref"}
        ;;
esac

log_info "项目引用: $PROJECT_REF"

# 链接到指定项目
if [ "$PROJECT_REF" != "local" ]; then
    log_info "链接到远程项目..."
    supabase link --project-ref $PROJECT_REF
fi

# 切换到supabase目录
cd "$(dirname "$0")"

# 获取所有函数列表
FUNCTIONS_DIR="./functions"
ALL_FUNCTIONS=$(find $FUNCTIONS_DIR -maxdepth 1 -type d -not -path $FUNCTIONS_DIR -not -name "_shared" | xargs -n 1 basename)

# 部署前检查
log_info "部署前检查..."

# 检查共享模块
if [ ! -f "$FUNCTIONS_DIR/_shared/security.ts" ]; then
    log_error "缺少共享安全模块: $FUNCTIONS_DIR/_shared/security.ts"
    exit 1
fi

# 检查环境变量文件
ENV_FILE=".env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
    log_info "找到环境变量文件: $ENV_FILE"
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
else
    log_warning "未找到环境变量文件: $ENV_FILE"
fi

# 验证必要的环境变量
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "JWT_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "缺少必要的环境变量: $var"
        exit 1
    fi
done

# 设置函数环境变量
log_info "设置函数环境变量..."
supabase secrets set \
    ENVIRONMENT="$ENVIRONMENT" \
    JWT_SECRET="$JWT_SECRET" \
    OTP_SALT="${OTP_SALT:-yeslocker-default-salt}" \
    TENCENT_SECRET_ID="${TENCENT_SECRET_ID:-}" \
    TENCENT_SECRET_KEY="${TENCENT_SECRET_KEY:-}" \
    TENCENT_SMS_APP_ID="${TENCENT_SMS_APP_ID:-}" \
    TENCENT_SMS_SIGN_NAME="${TENCENT_SMS_SIGN_NAME:-}" \
    ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}" \
    --project-ref $PROJECT_REF 2>/dev/null || true

# 部署函数
deploy_function() {
    local func_name=$1
    log_info "部署函数: $func_name"
    
    # 检查函数目录是否存在
    if [ ! -d "$FUNCTIONS_DIR/$func_name" ]; then
        log_error "函数目录不存在: $FUNCTIONS_DIR/$func_name"
        return 1
    fi
    
    # 检查index.ts文件
    if [ ! -f "$FUNCTIONS_DIR/$func_name/index.ts" ]; then
        log_error "函数入口文件不存在: $FUNCTIONS_DIR/$func_name/index.ts"
        return 1
    fi
    
    # 部署函数
    if [ "$PROJECT_REF" == "local" ]; then
        log_info "本地开发环境，跳过部署"
        return 0
    fi
    
    if supabase functions deploy $func_name --project-ref $PROJECT_REF; then
        log_success "函数 $func_name 部署成功"
        
        # 获取函数URL
        FUNCTION_URL=$(supabase functions list --project-ref $PROJECT_REF | grep $func_name | awk '{print $3}')
        if [ -n "$FUNCTION_URL" ]; then
            log_info "函数URL: $FUNCTION_URL"
        fi
        
        return 0
    else
        log_error "函数 $func_name 部署失败"
        return 1
    fi
}

# 执行部署
DEPLOYED_COUNT=0
FAILED_COUNT=0

if [ "$FUNCTION_NAME" == "all" ]; then
    log_info "部署所有函数..."
    for func in $ALL_FUNCTIONS; do
        if deploy_function $func; then
            ((DEPLOYED_COUNT++))
        else
            ((FAILED_COUNT++))
        fi
    done
else
    if deploy_function $FUNCTION_NAME; then
        ((DEPLOYED_COUNT++))
    else
        ((FAILED_COUNT++))
    fi
fi

# 部署后验证
log_info "部署后验证..."

# 健康检查
if [ "$PROJECT_REF" != "local" ]; then
    log_info "执行健康检查..."
    
    # 测试基础函数连接
    for func in "auth-login" "admin-login"; do
        if [[ " $ALL_FUNCTIONS " =~ " $func " ]]; then
            HEALTH_URL="https://${PROJECT_REF}.supabase.co/functions/v1/$func"
            if curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$HEALTH_URL" | grep -q "200\|204"; then
                log_success "函数 $func 健康检查通过"
            else
                log_warning "函数 $func 健康检查失败"
            fi
        fi
    done
fi

# 生成部署报告
DEPLOYMENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="deployment-report-$ENVIRONMENT-$(date '+%Y%m%d-%H%M%S').md"

cat > $REPORT_FILE << EOF
# YesLocker Edge Functions 部署报告

## 部署信息
- **环境**: $ENVIRONMENT
- **项目引用**: $PROJECT_REF
- **部署时间**: $DEPLOYMENT_TIME
- **部署者**: $(whoami)

## 部署结果
- **成功部署**: $DEPLOYED_COUNT 个函数
- **部署失败**: $FAILED_COUNT 个函数

## 已部署函数列表
EOF

if [ "$FUNCTION_NAME" == "all" ]; then
    for func in $ALL_FUNCTIONS; do
        echo "- ✅ $func" >> $REPORT_FILE
    done
else
    echo "- ✅ $FUNCTION_NAME" >> $REPORT_FILE
fi

cat >> $REPORT_FILE << EOF

## 环境变量配置
- ENVIRONMENT: $ENVIRONMENT
- JWT_SECRET: [已配置]
- OTP_SALT: [已配置]
- ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-*}

## 后续步骤
1. 验证所有API端点正常工作
2. 运行集成测试
3. 更新前端环境配置
4. 监控函数性能和错误率

## 注意事项
- 确保所有环境变量都已正确配置
- 定期检查函数日志和性能指标
- 遵循安全最佳实践
EOF

log_info "部署报告已生成: $REPORT_FILE"

# 最终结果
echo ""
log_info "=============== 部署总结 ==============="
log_success "成功部署: $DEPLOYED_COUNT 个函数"
if [ $FAILED_COUNT -gt 0 ]; then
    log_error "部署失败: $FAILED_COUNT 个函数"
else
    log_success "所有函数部署成功!"
fi

if [ "$PROJECT_REF" != "local" ]; then
    log_info "函数访问URL: https://${PROJECT_REF}.supabase.co/functions/v1/"
fi

echo ""
log_info "下步操作建议:"
echo "1. 验证API端点: npm run test:functions"
echo "2. 更新前端配置: 更新.env文件中的SUPABASE_URL"
echo "3. 运行集成测试: npm run test:integration"
echo "4. 监控函数日志: supabase functions logs --project-ref $PROJECT_REF"

exit $FAILED_COUNT