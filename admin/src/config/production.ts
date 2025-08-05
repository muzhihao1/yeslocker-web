// 管理端生产环境配置
export default {
  // API基础地址
  apiBaseUrl: 'https://api.yeslocker.com/api',
  
  // 应用标题
  appTitle: 'YesLocker管理端',
  
  // 版本号
  version: '1.0.0',
  
  // 环境标识
  env: 'production',
  
  // 超时设置（毫秒）
  timeout: 30000,
  
  // 重试次数
  maxRetries: 3,
  
  // 是否启用日志
  enableLogging: false,
  
  // 是否启用调试模式
  debug: false,
  
  // 文件上传限制（MB）
  maxFileSize: 10,
  
  // 分页配置
  pageSize: 20,
  
  // 会话过期时间（分钟）
  sessionExpiry: 120,
  
  // 自动保存间隔（秒）
  autoSaveInterval: 30,
  
  // 数据刷新间隔（秒）
  refreshInterval: 60,
  
  // 管理员权限等级
  adminLevels: {
    SUPER_ADMIN: 1,
    STORE_ADMIN: 2,
    OPERATOR: 3
  }
}