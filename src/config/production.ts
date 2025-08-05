// 用户端生产环境配置
export default {
  // API基础地址
  apiBaseUrl: 'https://api.yeslocker.com/api',
  
  // 应用标题
  appTitle: 'YesLocker',
  
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
  
  // 图片上传限制（MB）
  maxImageSize: 5,
  
  // 分页配置
  pageSize: 20,
  
  // 缓存过期时间（分钟）
  cacheExpiry: 60,
  
  // 微信小程序配置（如需要）
  wechat: {
    appId: '', // 需要配置
    scope: 'snsapi_userinfo'
  }
}