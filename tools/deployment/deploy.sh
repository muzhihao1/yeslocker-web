#!/bin/bash

# YesLocker 部署脚本
# 使用方法: ./scripts/deploy.sh [user|admin|all]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查环境
check_environment() {
    print_info "检查部署环境..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        print_error "未找到 Node.js，请先安装 Node.js 16.x 或以上版本"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        print_error "未找到 npm，请先安装 npm"
        exit 1
    fi
    
    # 检查 Vercel CLI（可选）
    if command -v vercel &> /dev/null; then
        print_info "检测到 Vercel CLI，可以使用命令行部署"
    else
        print_warning "未安装 Vercel CLI，需要通过网页界面部署"
    fi
    
    print_info "环境检查通过 ✓"
}

# 构建项目
build_project() {
    local project=$1
    print_info "构建 $project..."
    
    cd $project
    
    # 安装依赖
    print_info "安装依赖..."
    npm install
    
    # 运行构建
    print_info "运行构建..."
    npm run build
    
    # 检查构建结果
    if [ -d "dist" ]; then
        print_info "$project 构建成功 ✓"
        # 显示构建大小
        du -sh dist
    else
        print_error "$project 构建失败"
        exit 1
    fi
    
    cd ..
}

# 部署到 Vercel（如果安装了 CLI）
deploy_to_vercel() {
    local project=$1
    local domain=$2
    
    if command -v vercel &> /dev/null; then
        print_info "使用 Vercel CLI 部署 $project..."
        cd $project
        
        # 部署
        vercel --prod --yes
        
        # 设置域名
        if [ ! -z "$domain" ]; then
            vercel domains add $domain
        fi
        
        cd ..
    else
        print_warning "请手动在 Vercel 网页界面部署 $project"
        print_info "1. 访问 https://vercel.com"
        print_info "2. 导入仓库：$project"
        print_info "3. 设置域名：$domain"
    fi
}

# 创建环境变量文件模板
create_env_template() {
    print_info "创建环境变量模板..."
    
    cat > .env.production.template << EOF
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 应用配置
VITE_APP_TITLE=YesLocker

# 腾讯云 SMS（后端使用）
TENCENT_SMS_APP_ID=your-app-id
TENCENT_SMS_APP_KEY=your-app-key
TENCENT_SMS_TEMPLATE_ID=your-template-id
EOF

    print_info "环境变量模板已创建：.env.production.template"
    print_warning "请复制此文件为 .env.production 并填入实际值"
}

# 生成部署报告
generate_deploy_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="deploy-report-$(date '+%Y%m%d-%H%M%S').md"
    
    cat > $report_file << EOF
# 部署报告

**部署时间**: $timestamp
**部署版本**: $(git rev-parse --short HEAD)
**部署分支**: $(git branch --show-current)

## 构建结果

### 用户端 (yeslocker-user-miniapp)
- 构建状态: ✓
- 构建大小: $(du -sh yeslocker-user-miniapp/dist 2>/dev/null | cut -f1 || echo "N/A")
- 目标域名: app.yeslocker.com

### 管理端 (yeslocker-admin)
- 构建状态: ✓
- 构建大小: $(du -sh yeslocker-admin/dist 2>/dev/null | cut -f1 || echo "N/A")
- 目标域名: admin.yeslocker.com

## 待办事项
- [ ] 在 Vercel 完成部署
- [ ] 配置自定义域名
- [ ] 设置环境变量
- [ ] 执行功能测试
- [ ] 配置监控

## 注意事项
1. 确保环境变量已正确设置
2. 等待 DNS 生效（可能需要 0-48 小时）
3. 测试所有核心功能
4. 准备回滚方案

---
*此报告由部署脚本自动生成*
EOF

    print_info "部署报告已生成：$report_file"
}

# 主函数
main() {
    print_info "=== YesLocker 部署脚本 ==="
    
    # 检查参数
    target=${1:-all}
    
    # 检查环境
    check_environment
    
    # 创建环境变量模板
    if [ ! -f ".env.production.template" ]; then
        create_env_template
    fi
    
    # 根据参数执行部署
    case $target in
        user)
            print_info "部署用户端..."
            build_project "yeslocker-user-miniapp"
            deploy_to_vercel "yeslocker-user-miniapp" "app.yeslocker.com"
            ;;
        admin)
            print_info "部署管理端..."
            build_project "yeslocker-admin"
            deploy_to_vercel "yeslocker-admin" "admin.yeslocker.com"
            ;;
        all)
            print_info "部署所有项目..."
            build_project "yeslocker-user-miniapp"
            build_project "yeslocker-admin"
            deploy_to_vercel "yeslocker-user-miniapp" "app.yeslocker.com"
            deploy_to_vercel "yeslocker-admin" "admin.yeslocker.com"
            ;;
        *)
            print_error "无效的参数: $target"
            print_info "使用方法: ./scripts/deploy.sh [user|admin|all]"
            exit 1
            ;;
    esac
    
    # 生成部署报告
    generate_deploy_report
    
    print_info "=== 部署准备完成 ==="
    print_warning "请按照部署指南完成后续步骤"
}

# 执行主函数
main "$@"