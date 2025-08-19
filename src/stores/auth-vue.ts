import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { authApi } from '@/services/api/auth-vue'
import type { User } from '@/types/user'
import type { LoginRequest, RegisterRequest } from '@/types/api'

/**
 * 错误类型枚举
 */
export enum AuthErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_DISABLED = 'USER_DISABLED',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 结构化错误信息
 */
export interface AuthError {
  type: AuthErrorType
  message: string
  code?: string
  retryable: boolean
  timestamp: number
}

/**
 * Token 信息结构
 */
export interface TokenInfo {
  token: string
  expiresAt: number
  issuedAt: number
  refreshToken?: string
}

/**
 * 安全配置常量
 */
const SECURITY_CONFIG = {
  TOKEN_STORAGE_KEY: 'yeslocker_auth_token',
  USER_STORAGE_KEY: 'yeslocker_user_data',
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5分钟内到期时刷新
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // 1秒基础延迟
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30分钟无活动超时
  ENCRYPTION_KEY: 'yeslocker_encryption_v1'
} as const

/**
 * 简单加密/解密工具（支持UTF-8/中文字符，生产环境应使用更强的加密）
 */
const crypto = {
  encrypt(data: string): string {
    try {
      // 简单的Base64编码 + 时间戳（生产环境应使用AES等）
      const timestamp = Date.now()
      const payload = JSON.stringify({ data, timestamp })
      
      // 使用encodeURIComponent + btoa来支持UTF-8字符（包括中文）
      // encodeURIComponent将中文字符转换为%xx格式，然后btoa进行Base64编码
      return btoa(encodeURIComponent(payload))
    } catch (err) {
      console.error('数据加密失败:', err)
      // 降级处理：如果加密失败，返回空字符串
      return ''
    }
  },
  
  decrypt(encryptedData: string): string | null {
    try {
      // 先用atob解码Base64，然后用decodeURIComponent还原UTF-8字符串
      const payload = JSON.parse(decodeURIComponent(atob(encryptedData)))
      
      // 验证数据是否过期（7天）
      if (Date.now() - payload.timestamp > 7 * 24 * 60 * 60 * 1000) {
        return null
      }
      return payload.data
    } catch (err) {
      console.warn('数据解密失败，可能是旧版本数据或已损坏:', err)
      return null
    }
  }
}

/**
 * 输入验证工具
 */
const validation = {
  phone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone)
  },
  
  name(name: string): boolean {
    return name.length > 0 && name.length <= 50 && /^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/.test(name)
  },
  
  storeId(storeId: string): boolean {
    // 允许任何非空的storeId，实际验证由后端处理
    return storeId !== null && storeId !== undefined && String(storeId).length > 0
  }
}

/**
 * 安全的认证存储管理
 */
class SecureAuthStorage {
  private static instance: SecureAuthStorage
  private lastActivity: number = Date.now()
  
  static getInstance(): SecureAuthStorage {
    if (!SecureAuthStorage.instance) {
      SecureAuthStorage.instance = new SecureAuthStorage()
    }
    return SecureAuthStorage.instance
  }
  
  updateActivity(): void {
    this.lastActivity = Date.now()
  }
  
  isSessionExpired(): boolean {
    return Date.now() - this.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT
  }
  
  setToken(tokenInfo: TokenInfo): void {
    this.updateActivity()
    const encrypted = crypto.encrypt(JSON.stringify(tokenInfo))
    localStorage.setItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY, encrypted)
  }
  
  getToken(): TokenInfo | null {
    if (this.isSessionExpired()) {
      this.clearAuth()
      return null
    }
    
    const encrypted = localStorage.getItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY)
    if (!encrypted) return null
    
    const decrypted = crypto.decrypt(encrypted)
    if (!decrypted) return null
    
    try {
      const tokenInfo: TokenInfo = JSON.parse(decrypted)
      // 检查token是否过期
      if (Date.now() > tokenInfo.expiresAt) {
        this.clearAuth()
        return null
      }
      
      this.updateActivity()
      return tokenInfo
    } catch {
      this.clearAuth()
      return null
    }
  }
  
  setUser(user: User): void {
    this.updateActivity()
    const encrypted = crypto.encrypt(JSON.stringify(user))
    localStorage.setItem(SECURITY_CONFIG.USER_STORAGE_KEY, encrypted)
  }
  
  getUser(): User | null {
    if (this.isSessionExpired()) {
      this.clearAuth()
      return null
    }
    
    const encrypted = localStorage.getItem(SECURITY_CONFIG.USER_STORAGE_KEY)
    if (!encrypted) return null
    
    const decrypted = crypto.decrypt(encrypted)
    if (!decrypted) return null
    
    try {
      this.updateActivity()
      return JSON.parse(decrypted)
    } catch {
      this.clearAuth()
      return null
    }
  }
  
  clearAuth(): void {
    localStorage.removeItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY)
    localStorage.removeItem(SECURITY_CONFIG.USER_STORAGE_KEY)
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const tokenInfo = ref<TokenInfo | null>(null)
  const loading = ref(false)
  const error = ref<AuthError | null>(null)
  const retryCount = ref(0)
  const lastAuthCheck = ref(0)
  
  const secureStorage = SecureAuthStorage.getInstance()
  
  // 计算属性
  const isLoggedIn = computed(() => {
    return !!tokenInfo.value && 
           !!user.value && 
           Date.now() < tokenInfo.value.expiresAt &&
           !secureStorage.isSessionExpired()
  })
  
  const token = computed(() => tokenInfo.value?.token || '')
  
  const needsTokenRefresh = computed(() => {
    if (!tokenInfo.value) return false
    return (tokenInfo.value.expiresAt - Date.now()) < SECURITY_CONFIG.TOKEN_REFRESH_THRESHOLD
  })

  /**
   * 错误处理工具函数
   */
  const createError = (type: AuthErrorType, message: string, retryable = false, code?: string): AuthError => ({
    type,
    message,
    code,
    retryable,
    timestamp: Date.now()
  })
  
  const handleApiError = (err: any): AuthError => {
    // 网络错误
    if (!navigator.onLine) {
      return createError(AuthErrorType.NETWORK_ERROR, '网络连接不可用，请检查网络设置', true)
    }
    
    // 根据HTTP状态码分类错误
    const status = err.status || err.response?.status
    const message = err.message || err.response?.data?.message || '未知错误'
    const code = err.code || err.response?.data?.error
    
    switch (status) {
      case 400:
        return createError(AuthErrorType.VALIDATION_ERROR, message, false, code)
      case 401:
        return createError(AuthErrorType.AUTH_FAILED, '身份验证失败，请重新登录', false, code)
      case 403:
        return createError(AuthErrorType.USER_DISABLED, '账户已被禁用，请联系管理员', false, code)
      case 409:
        return createError(AuthErrorType.VALIDATION_ERROR, message, false, code)
      case 429:
        return createError(AuthErrorType.RATE_LIMITED, '请求过于频繁，请稍后重试', true, code)
      case 500:
      case 502:
      case 503:
      case 504:
        return createError(AuthErrorType.SERVER_ERROR, '服务器暂时不可用，请稍后重试', true, code)
      default:
        return createError(AuthErrorType.UNKNOWN_ERROR, message, true, code)
    }
  }
  
  /**
   * 重试机制
   */
  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxAttempts = SECURITY_CONFIG.MAX_RETRY_ATTEMPTS
  ): Promise<T> => {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        retryCount.value = attempt - 1
        return await operation()
      } catch (err) {
        lastError = err
        const authError = handleApiError(err)
        
        // 如果错误不可重试，直接抛出
        if (!authError.retryable || attempt === maxAttempts) {
          error.value = authError
          throw err
        }
        
        // 指数退避延迟
        const delay = SECURITY_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
  
  /**
   * 输入验证
   */
  const validateInput = (data: any, type: 'login' | 'register'): void => {
    if (type === 'login') {
      if (!data.phone || !validation.phone(data.phone)) {
        throw createError(AuthErrorType.VALIDATION_ERROR, '请输入有效的手机号码', false)
      }
    } else if (type === 'register') {
      if (!data.phone || !validation.phone(data.phone)) {
        throw createError(AuthErrorType.VALIDATION_ERROR, '请输入有效的手机号码', false)
      }
      if (!data.name || !validation.name(data.name)) {
        throw createError(AuthErrorType.VALIDATION_ERROR, '姓名长度必须在1-50字符之间，只能包含中文、英文、数字和空格', false)
      }
      if (!data.storeId || !validation.storeId(data.storeId)) {
        throw createError(AuthErrorType.VALIDATION_ERROR, '请选择有效的门店', false)
      }
    }
  }
  
  /**
   * 安全设置用户信息
   */
  const setUser = (userData: User) => {
    user.value = userData
    secureStorage.setUser(userData)
  }

  /**
   * 安全设置认证令牌
   */
  const setTokenInfo = (token: string, expiresIn = 7 * 24 * 60 * 60 * 1000) => {
    const now = Date.now()
    const tokenData: TokenInfo = {
      token,
      expiresAt: now + expiresIn,
      issuedAt: now
    }
    
    tokenInfo.value = tokenData
    secureStorage.setToken(tokenData)
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
    retryCount.value = 0
  }

  /**
   * 安全加载存储的认证信息
   */
  const loadStoredAuth = async () => {
    try {
      clearError()
      
      // 安全加载token和用户信息
      const storedTokenInfo = secureStorage.getToken()
      const storedUser = secureStorage.getUser()
      
      if (storedTokenInfo && storedUser) {
        tokenInfo.value = storedTokenInfo
        user.value = storedUser
        
        // 检查是否需要刷新token
        if (needsTokenRefresh.value) {
          await refreshUserInfo()
        }
      } else if (storedTokenInfo && !storedUser) {
        // 有token但没有用户信息，尝试获取用户信息
        tokenInfo.value = storedTokenInfo
        await refreshUserInfo()
      } else {
        // 清理无效数据
        await logout()
      }
    } catch (err) {
      const authError = handleApiError(err)
      error.value = authError
      await logout()
    }
  }

  /**
   * 刷新用户信息
   */
  const refreshUserInfo = async () => {
    try {
      clearError()
      
      return await withRetry(async () => {
        const userData = await authApi.getCurrentUser()
        if (userData) {
          setUser(userData)
          secureStorage.updateActivity()
        } else {
          // 如果无法获取用户信息，清除认证状态
          await logout()
        }
        return userData
      })
    } catch (err) {
      const authError = handleApiError(err)
      error.value = authError
      console.error('刷新用户信息失败:', authError.message)
      await logout()
    }
  }

  /**
   * 安全用户注册
   */
  const register = async (data: RegisterRequest) => {
    try {
      loading.value = true
      clearError()
      
      // 输入验证
      validateInput(data, 'register')
      
      return await withRetry(async () => {
        const response = await authApi.register(data)
        
        // 使用安全的token设置
        setTokenInfo(response.token, response.expiresIn * 1000)
        setUser(response.user)
        
        secureStorage.updateActivity()
        
        console.log('注册成功:', response.user.name)
        return response
      })
    } catch (err) {
      const authError = handleApiError(err)
      error.value = authError
      console.error('注册失败:', authError.message)
      throw authError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }

  /**
   * 安全用户登录
   */
  const login = async (data: LoginRequest) => {
    try {
      loading.value = true
      clearError()
      
      // 输入验证
      validateInput(data, 'login')
      
      return await withRetry(async () => {
        const response = await authApi.login(data)
        
        // 使用安全的token设置
        setTokenInfo(response.token, response.expiresIn * 1000)
        setUser(response.user)
        
        secureStorage.updateActivity()
        lastAuthCheck.value = Date.now()
        
        console.log('登录成功:', response.user.name)
        return response
      })
    } catch (err) {
      const authError = handleApiError(err)
      error.value = authError
      console.error('登录失败:', authError.message)
      throw authError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }

  /**
   * 安全更新用户资料
   */
  const updateProfile = async (data: Partial<User>) => {
    try {
      loading.value = true
      clearError()
      
      // 验证必须字段
      if (data.name && !validation.name(data.name)) {
        throw createError(AuthErrorType.VALIDATION_ERROR, '姓名格式不正确', false)
      }
      
      return await withRetry(async () => {
        const updatedUser = await authApi.updateProfile(data)
        setUser(updatedUser)
        
        secureStorage.updateActivity()
        
        console.log('用户资料更新成功')
        return updatedUser
      })
    } catch (err) {
      const authError = handleApiError(err)
      error.value = authError
      console.error('更新用户资料失败:', authError.message)
      throw authError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }

  /**
   * 安全退出登录
   */
  const logout = async () => {
    try {
      // 尝试调用API退出（不重试，因为本地状态需要立即清除）
      await authApi.logout()
    } catch (err) {
      console.warn('调用退出API失败，继续清除本地状态:', err)
    } finally {
      // 无论API调用是否成功，都清除所有状态
      user.value = null
      tokenInfo.value = null
      loading.value = false
      error.value = null
      retryCount.value = 0
      lastAuthCheck.value = 0
      
      // 使用安全存储清除认证信息
      secureStorage.clearAuth()
      
      // 清除可能存在的旧版本localStorage数据
      localStorage.removeItem('yeslocker_token')
      localStorage.removeItem('yeslocker_user')
      
      console.log('用户已安全退出登录')
    }
  }

  /**
   * 安全检查认证状态
   */
  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      // 检查本地token是否有效
      if (!isLoggedIn.value) {
        return false
      }
      
      // 定期验证服务端token状态（避免频繁请求）
      const now = Date.now()
      if (now - lastAuthCheck.value > 5 * 60 * 1000) { // 5分钟检查一次
        const isValid = authApi.isLoggedIn()
        if (!isValid && tokenInfo.value) {
          // Token在服务端无效，清除本地状态
          await logout()
          return false
        }
        lastAuthCheck.value = now
      }
      
      secureStorage.updateActivity()
      return isLoggedIn.value
    } catch (err) {
      console.warn('检查认证状态失败:', err)
      return false
    }
  }

  return {
    // 响应式状态
    user: readonly(user),
    token,
    loading: readonly(loading),
    error: readonly(error),
    isLoggedIn,
    retryCount: readonly(retryCount),
    needsTokenRefresh,
    
    // 内部状态管理方法
    setUser,
    setTokenInfo,
    clearError,
    
    // 认证操作方法
    loadStoredAuth,
    refreshUserInfo,
    register,
    login,
    updateProfile,
    logout,
    checkAuthStatus,
    
    // 工具方法
    validateInput,
    handleApiError,
    
    // 类型定义导出（用于TypeScript类型检查）
    AuthErrorType,
    createError
  }
})