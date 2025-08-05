module.exports = {
  apps: [{
    name: 'yeslocker-api',
    script: './index-unified.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    
    // 崩溃自动重启
    min_uptime: '10s',
    max_restarts: 10,
    
    // 优雅关闭
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000
  }]
};