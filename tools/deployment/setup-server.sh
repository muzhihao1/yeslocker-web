#!/bin/bash

# YesLocker服务器环境配置脚本
# 适用于Ubuntu 20.04 LTS

set -e

echo "========================================="
echo "YesLocker服务器环境自动配置脚本"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印成功消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 函数：打印错误消息
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 函数：打印警告消息
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用sudo运行此脚本"
    exit 1
fi

# 更新系统
echo "1. 更新系统包..."
apt update && apt upgrade -y
print_success "系统更新完成"

# 安装基础工具
echo "2. 安装基础工具..."
apt install -y git curl wget vim htop iotop nethogs build-essential
print_success "基础工具安装完成"

# 安装Node.js 18.x
echo "3. 安装Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
print_success "Node.js $(node -v) 安装完成"

# 安装PM2
echo "4. 安装PM2..."
npm install -g pm2
print_success "PM2 $(pm2 -v) 安装完成"

# 安装Nginx
echo "5. 安装Nginx..."
apt-get install -y nginx
print_success "Nginx 安装完成"

# 创建应用目录
echo "6. 创建应用目录..."
mkdir -p /var/www/yeslocker
mkdir -p /var/www/yeslocker/server/data
mkdir -p /var/www/yeslocker/user
mkdir -p /var/www/yeslocker/admin
mkdir -p /var/log/yeslocker
mkdir -p /var/backups/yeslocker
mkdir -p /etc/nginx/ssl

# 设置目录权限
chown -R www-data:www-data /var/www/yeslocker
chown -R www-data:www-data /var/log/yeslocker
print_success "应用目录创建完成"

# 配置防火墙
echo "7. 配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_success "防火墙配置完成"

# 创建PM2启动脚本
echo "8. 创建PM2配置..."
cat > /var/www/yeslocker/server/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'yeslocker-api',
    script: './index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/yeslocker/error.log',
    out_file: '/var/log/yeslocker/out.log',
    log_file: '/var/log/yeslocker/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false
  }]
}
EOF
print_success "PM2配置创建完成"

# 创建环境变量模板
echo "9. 创建环境变量模板..."
cat > /var/www/yeslocker/server/.env.example << 'EOF'
# 服务器配置
NODE_ENV=production
PORT=3001

# CORS配置（请修改为实际域名）
CORS_ORIGIN=https://www.yeslocker.com,https://admin.yeslocker.com

# JWT密钥（请修改为强密码）
JWT_SECRET=your-production-jwt-secret-here

# 数据存储路径
DATA_FILE_PATH=/var/www/yeslocker/server/data/production.json

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/yeslocker/app.log
EOF
print_success "环境变量模板创建完成"

# 创建备份脚本
echo "10. 创建备份脚本..."
cat > /var/www/yeslocker/scripts/backup.sh << 'EOF'
#!/bin/bash

# 配置
BACKUP_DIR="/var/backups/yeslocker"
DATA_DIR="/var/www/yeslocker/server/data"
KEEP_DAYS=7

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份文件名
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"

# 执行备份
tar -czf $BACKUP_FILE $DATA_DIR

# 删除旧备份
find $BACKUP_DIR -name "backup-*.tar.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /var/www/yeslocker/scripts/backup.sh
print_success "备份脚本创建完成"

# 配置日志轮转
echo "11. 配置日志轮转..."
cat > /etc/logrotate.d/yeslocker << 'EOF'
/var/log/yeslocker/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
print_success "日志轮转配置完成"

# 创建系统服务
echo "12. 创建系统服务..."
cat > /etc/systemd/system/yeslocker.service << 'EOF'
[Unit]
Description=YesLocker API Service
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/yeslocker/server
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload yeslocker-api
ExecStop=/usr/bin/pm2 stop yeslocker-api
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
print_success "系统服务创建完成"

# 设置定时任务
echo "13. 设置定时任务..."
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/yeslocker/scripts/backup.sh >> /var/log/yeslocker/backup.log 2>&1") | crontab -
print_success "定时任务设置完成"

# 创建部署脚本
echo "14. 创建部署脚本..."
cat > /var/www/yeslocker/scripts/deploy.sh << 'EOF'
#!/bin/bash

# YesLocker部署脚本

set -e

echo "开始部署YesLocker..."

# 备份当前版本
echo "1. 备份当前版本..."
/var/www/yeslocker/scripts/backup.sh

# 拉取最新代码
echo "2. 拉取最新代码..."
cd /var/www/yeslocker
git pull origin main

# 安装依赖
echo "3. 安装依赖..."
cd /var/www/yeslocker/server
npm install --production

# 构建前端
echo "4. 构建前端应用..."
cd /var/www/yeslocker
npm run build
cp -r dist/build/h5/* /var/www/yeslocker/user/

npm run build:admin
cp -r admin/dist/build/h5/* /var/www/yeslocker/admin/

# 重启服务
echo "5. 重启服务..."
pm2 reload yeslocker-api

echo "部署完成！"
EOF

chmod +x /var/www/yeslocker/scripts/deploy.sh
print_success "部署脚本创建完成"

# 输出总结
echo ""
echo "========================================="
echo "服务器环境配置完成！"
echo "========================================="
echo ""
echo "后续步骤："
echo "1. 克隆代码到 /var/www/yeslocker"
echo "   git clone [你的仓库地址] /var/www/yeslocker"
echo ""
echo "2. 配置环境变量"
echo "   cd /var/www/yeslocker/server"
echo "   cp .env.example .env.production"
echo "   vim .env.production"
echo ""
echo "3. 配置Nginx"
echo "   参考部署文档配置域名和SSL证书"
echo ""
echo "4. 启动服务"
echo "   cd /var/www/yeslocker/server"
echo "   pm2 start ecosystem.config.js --env production"
echo ""
echo "5. 设置开机自启"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
print_success "祝部署顺利！"