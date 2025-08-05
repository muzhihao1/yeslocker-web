# YesLocker 部署计划

## 1. 系统架构概览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   用户端 H5     │     │   管理端 H5     │     │   API 服务器    │
│  (用户小程序)   │────▶│  (管理后台)     │────▶│  (Express.js)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
      ▲                       ▲                         │
      │                       │                         ▼
      │                       │                  ┌─────────────────┐
      └───────────────────────┴──────────────────│   数据存储      │
                                                 │  (JSON/数据库)   │
                                                 └─────────────────┘
```

## 2. 部署方案

### 2.1 部署架构选择

**推荐方案A：云服务器 + CDN**
- API服务器：阿里云ECS/腾讯云CVM（2核4G起步）
- 前端静态资源：阿里云OSS/腾讯云COS + CDN加速
- 域名：需要备案（国内服务器）

**备选方案B：Vercel + 云服务器**
- API服务器：阿里云ECS/腾讯云CVM
- 前端应用：Vercel（免费，自动部署）
- 优点：前端部署简单，支持自动构建

### 2.2 域名规划

```
主域名：yeslocker.com
├── www.yeslocker.com    # 用户端H5应用
├── admin.yeslocker.com  # 管理端H5应用
└── api.yeslocker.com    # API服务器
```

## 3. 后端API服务器部署

### 3.1 服务器环境准备

```bash
# Ubuntu 20.04 LTS 推荐
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装必要软件
sudo apt install -y git curl wget vim

# 3. 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. 安装 PM2
sudo npm install -g pm2

# 5. 安装 Nginx
sudo apt-get install -y nginx

# 6. 创建应用目录
sudo mkdir -p /var/www/yeslocker
sudo chown -R $USER:$USER /var/www/yeslocker
```

### 3.2 部署代码

```bash
# 1. 克隆代码
cd /var/www/yeslocker
git clone https://github.com/yourusername/yeslocker.git .

# 2. 安装依赖
cd server
npm install --production

# 3. 创建生产环境配置
cp .env.example .env.production
vim .env.production
```

### 3.3 环境变量配置 (.env.production)

```env
# 服务器配置
NODE_ENV=production
PORT=3001

# CORS配置
CORS_ORIGIN=https://www.yeslocker.com,https://admin.yeslocker.com

# JWT密钥（生产环境请使用强密码）
JWT_SECRET=your-production-jwt-secret-here

# 数据存储路径
DATA_FILE_PATH=/var/www/yeslocker/server/data/production.json

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/yeslocker/app.log
```

### 3.4 PM2 配置

创建 `/var/www/yeslocker/server/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'yeslocker-api',
    script: './index.js',
    instances: 2,
    exec_mode: 'cluster',
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
```

启动服务：
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 4. 前端应用部署

### 4.1 用户端构建配置

修改 `/src/config/index.ts`:

```typescript
const config = {
  development: {
    apiBaseUrl: 'http://localhost:3001/api',
    appTitle: 'YesLocker开发版'
  },
  production: {
    apiBaseUrl: 'https://api.yeslocker.com/api',
    appTitle: 'YesLocker'
  }
}

export default config[import.meta.env.MODE] || config.production
```

构建命令：
```bash
npm run build
# 输出目录: dist/build/h5
```

### 4.2 管理端构建配置

修改 `/admin/src/config/index.ts`:

```typescript
const config = {
  development: {
    apiBaseUrl: 'http://localhost:3001/api',
    appTitle: 'YesLocker管理端-开发版'
  },
  production: {
    apiBaseUrl: 'https://api.yeslocker.com/api',
    appTitle: 'YesLocker管理端'
  }
}

export default config[import.meta.env.MODE] || config.production
```

构建命令：
```bash
npm run build:admin
# 输出目录: admin/dist/build/h5
```

### 4.3 静态资源部署（OSS方案）

```bash
# 安装阿里云CLI工具
npm install -g @alicloud/fun

# 配置OSS
aliyun configure

# 上传用户端
ossutil cp -r dist/build/h5/ oss://yeslocker-static/user/ --update

# 上传管理端
ossutil cp -r admin/dist/build/h5/ oss://yeslocker-static/admin/ --update
```

## 5. Nginx 配置

### 5.1 API服务器反向代理

创建 `/etc/nginx/sites-available/api.yeslocker.com`:

```nginx
server {
    listen 80;
    server_name api.yeslocker.com;
    
    # 强制HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yeslocker.com;
    
    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/yeslocker.com.pem;
    ssl_certificate_key /etc/nginx/ssl/yeslocker.com.key;
    
    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 日志
    access_log /var/log/nginx/api.yeslocker.access.log;
    error_log /var/log/nginx/api.yeslocker.error.log;
    
    # API代理
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 5.2 前端静态资源配置（本地部署方案）

创建 `/etc/nginx/sites-available/www.yeslocker.com`:

```nginx
server {
    listen 80;
    server_name www.yeslocker.com yeslocker.com;
    return 301 https://www.yeslocker.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.yeslocker.com;
    
    ssl_certificate /etc/nginx/ssl/yeslocker.com.pem;
    ssl_certificate_key /etc/nginx/ssl/yeslocker.com.key;
    
    root /var/www/yeslocker/user;
    index index.html;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 缓存策略
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA路由
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/api.yeslocker.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/www.yeslocker.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.yeslocker.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL证书配置

### 6.1 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yeslocker.com -d www.yeslocker.com -d admin.yeslocker.com -d api.yeslocker.com

# 自动续期
sudo certbot renew --dry-run
```

### 6.2 使用商业证书

1. 购买SSL证书（阿里云、腾讯云等）
2. 下载证书文件
3. 上传到服务器 `/etc/nginx/ssl/` 目录
4. 配置Nginx使用证书

## 7. 数据安全与备份

### 7.1 数据备份脚本

创建 `/var/www/yeslocker/scripts/backup.sh`:

```bash
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

# 上传到云存储（可选）
# ossutil cp $BACKUP_FILE oss://yeslocker-backup/

# 删除旧备份
find $BACKUP_DIR -name "backup-*.tar.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: $BACKUP_FILE"
```

### 7.2 定时任务

```bash
# 编辑crontab
crontab -e

# 每天凌晨2点备份
0 2 * * * /var/www/yeslocker/scripts/backup.sh >> /var/log/yeslocker/backup.log 2>&1
```

## 8. 监控与运维

### 8.1 PM2监控

```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs yeslocker-api

# 监控面板
pm2 monit
```

### 8.2 系统监控

```bash
# 安装监控工具
sudo apt install -y htop iotop nethogs

# 磁盘空间监控
df -h

# 内存使用
free -h

# CPU使用
top
```

### 8.3 日志管理

```bash
# 配置日志轮转
sudo vim /etc/logrotate.d/yeslocker

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
```

## 9. 安全配置

### 9.1 防火墙设置

```bash
# 配置UFW防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 9.2 API限流配置

在Nginx配置中添加：

```nginx
# 限制请求频率
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        # ... 其他配置
    }
}
```

## 10. 部署检查清单

### 部署前检查
- [ ] 所有代码已提交到Git仓库
- [ ] 生产环境配置文件已准备
- [ ] SSL证书已获取
- [ ] 域名已备案（国内服务器）
- [ ] 服务器安全组/防火墙已配置

### 部署中检查
- [ ] Node.js环境已安装
- [ ] PM2已配置并启动
- [ ] Nginx已配置并启动
- [ ] 前端资源已上传
- [ ] API服务正常响应

### 部署后检查
- [ ] 用户端可正常访问
- [ ] 管理端可正常访问
- [ ] API接口正常工作
- [ ] 数据持久化正常
- [ ] 备份任务已配置
- [ ] 监控告警已设置

## 11. 故障处理

### 常见问题及解决方案

1. **502 Bad Gateway**
   ```bash
   # 检查API服务是否运行
   pm2 status
   # 查看错误日志
   pm2 logs --error
   ```

2. **跨域问题**
   - 检查CORS配置是否包含所有域名
   - 确认Nginx转发头设置正确

3. **性能问题**
   - 启用Nginx缓存
   - 使用CDN加速静态资源
   - 优化数据库查询

## 12. 升级维护流程

```bash
# 1. 备份当前版本
./scripts/backup.sh

# 2. 拉取最新代码
git pull origin main

# 3. 安装依赖
npm install --production

# 4. 重启服务
pm2 reload yeslocker-api

# 5. 验证服务
curl https://api.yeslocker.com/api/health
```

## 结语

本部署计划提供了YesLocker系统的完整部署方案。根据实际情况选择合适的部署方式，并确保遵循安全最佳实践。建议先在测试环境验证部署流程，再部署到生产环境。