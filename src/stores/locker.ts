import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { lockersApi, type ApplyLockerRequest, type ApplyLockerResponse, type LockerRecord } from '@/services/api/lockers-vue'
import type { Locker } from '@/types/user'

/**
 * 柜子相关错误类型枚举
 */
export enum LockerErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR', 
  LOCKER_NOT_FOUND = 'LOCKER_NOT_FOUND',
  LOCKER_OCCUPIED = 'LOCKER_OCCUPIED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 结构化错误信息
 */
export interface LockerError {
  type: LockerErrorType
  message: string
  code?: string
  retryable: boolean
  timestamp: number
  context?: Record<string, any>
}

/**
 * 缓存配置常量
 */
const CACHE_CONFIG = {
  LOCKERS_CACHE_KEY: 'yeslocker_lockers_cache',
  USER_LOCKER_CACHE_KEY: 'yeslocker_user_locker_cache',
  RECORDS_CACHE_KEY: 'yeslocker_records_cache',
  CACHE_DURATION: 5 * 60 * 1000, // 5分钟缓存
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 1000, // 1秒基础延迟
  BATCH_SIZE: 10, // 批量操作大小
  ENCRYPTION_KEY: 'yeslocker_locker_cache_v1'
} as const

/**
 * 缓存数据接口
 */
interface CacheData<T> {
  data: T
  timestamp: number
  expiresAt: number
}

/**
 * 简单加密/解密工具（支持UTF-8/中文字符，与auth store保持一致）
 */
const crypto = {
  encrypt(data: string): string {
    try {
      const timestamp = Date.now()
      const payload = JSON.stringify({ data, timestamp })
      
      // 使用encodeURIComponent + btoa来支持UTF-8字符（包括中文）
      // encodeURIComponent将中文字符转换为%xx格式，然后btoa进行Base64编码
      return btoa(encodeURIComponent(payload))
    } catch (err) {
      console.error('Locker data encryption failed:', err)
      // 降级处理：如果加密失败，返回空字符串
      return ''
    }
  },
  
  decrypt(encryptedData: string): string | null {
    try {
      // 先用atob解码Base64，然后用decodeURIComponent还原UTF-8字符串
      const payload = JSON.parse(decodeURIComponent(atob(encryptedData)))
      
      // 验证数据是否过期（24小时）
      if (Date.now() - payload.timestamp > 24 * 60 * 60 * 1000) {
        return null
      }
      return payload.data
    } catch (err) {
      console.warn('Locker data decryption failed, may be old version or corrupted:', err)
      return null
    }
  }
}

/**
 * 输入验证工具
 */
const validation = {
  storeId(storeId: string): boolean {
    // 允许任何非空的storeId，实际验证由后端处理
    return storeId !== null && storeId !== undefined && String(storeId).length > 0
  },
  
  lockerId(lockerId: string): boolean {
    return lockerId.length > 0 && lockerId.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(lockerId)
  },
  
  actionType(actionType: string): boolean {
    return ['store', 'retrieve', 'assigned'].includes(actionType)
  },
  
  lockerNumber(lockerNumber: string): boolean {
    return /^[A-Z0-9]{1,10}$/.test(lockerNumber)
  }
}

/**
 * 安全的柜子数据缓存管理
 */
class SecureLockerCache {
  private static instance: SecureLockerCache
  
  static getInstance(): SecureLockerCache {
    if (!SecureLockerCache.instance) {
      SecureLockerCache.instance = new SecureLockerCache()
    }
    return SecureLockerCache.instance
  }
  
  private getCacheKey(baseKey: string, identifier?: string): string {
    return identifier ? `${baseKey}_${identifier}` : baseKey
  }
  
  set<T>(key: string, data: T, duration = CACHE_CONFIG.CACHE_DURATION): void {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration
      }
      
      const encrypted = crypto.encrypt(JSON.stringify(cacheData))
      localStorage.setItem(key, encrypted)
    } catch (err) {
      console.warn('缓存设置失败:', err)
    }
  }
  
  get<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      
      const decrypted = crypto.decrypt(encrypted)
      if (!decrypted) return null
      
      const cacheData: CacheData<T> = JSON.parse(decrypted)
      
      // 检查缓存是否过期
      if (Date.now() > cacheData.expiresAt) {
        localStorage.removeItem(key)
        return null
      }
      
      return cacheData.data
    } catch {
      localStorage.removeItem(key)
      return null
    }
  }
  
  remove(key: string): void {
    localStorage.removeItem(key)
  }
  
  clear(): void {
    // 清除所有locker相关缓存
    Object.values(CACHE_CONFIG).forEach(key => {
      if (typeof key === 'string' && key.endsWith('_KEY')) {
        localStorage.removeItem(CACHE_CONFIG[key as keyof typeof CACHE_CONFIG] as string)
      }
    })
  }
  
  // 批量设置缓存
  setBatch<T>(entries: Array<{ key: string; data: T; duration?: number }>): void {
    entries.forEach(({ key, data, duration }) => {
      this.set(key, data, duration)
    })
  }
}

export const useLockerStore = defineStore('locker', () => {
  // 响应式状态
  const lockers = ref<Locker[]>([])
  const userLocker = ref<Locker | null>(null)
  const lockerRecords = ref<LockerRecord[]>([])
  const loading = ref(false)
  const error = ref<LockerError | null>(null)
  const retryCount = ref(0)
  const lastUpdateTime = ref(0)
  
  const secureCache = SecureLockerCache.getInstance()
  
  // 计算属性
  const availableLockers = computed(() => 
    lockers.value.filter(locker => locker.status === 'available')
  )
  
  const occupiedLockers = computed(() => 
    lockers.value.filter(locker => locker.status === 'occupied')
  )
  
  const hasUserLocker = computed(() => !!userLocker.value)
  
  const recentRecords = computed(() => 
    lockerRecords.value.slice(0, 5)
  )
  
  /**
   * 错误处理工具函数
   */
  const createError = (
    type: LockerErrorType, 
    message: string, 
    retryable = false, 
    code?: string,
    context?: Record<string, any>
  ): LockerError => ({
    type,
    message,
    code,
    retryable,
    timestamp: Date.now(),
    context
  })
  
  const handleApiError = (err: any, context?: Record<string, any>): LockerError => {
    // 网络错误
    if (!navigator.onLine) {
      return createError(LockerErrorType.NETWORK_ERROR, '网络连接不可用，请检查网络设置', true, undefined, context)
    }
    
    // 根据HTTP状态码分类错误
    const status = err.status || err.response?.status
    const message = err.message || err.response?.data?.message || '未知错误'
    const code = err.code || err.response?.data?.error
    
    switch (status) {
      case 400:
        return createError(LockerErrorType.VALIDATION_ERROR, message, false, code, context)
      case 403:
        return createError(LockerErrorType.PERMISSION_DENIED, '无权限执行此操作', false, code, context)
      case 404:
        return createError(LockerErrorType.LOCKER_NOT_FOUND, '杆柜不存在', false, code, context)
      case 409:
        return createError(LockerErrorType.LOCKER_OCCUPIED, '杆柜已被占用', false, code, context)
      case 429:
        return createError(LockerErrorType.RATE_LIMITED, '请求过于频繁，请稍后重试', true, code, context)
      case 500:
      case 502:
      case 503:
      case 504:
        return createError(LockerErrorType.SERVER_ERROR, '服务器暂时不可用，请稍后重试', true, code, context)
      default:
        return createError(LockerErrorType.UNKNOWN_ERROR, message, true, code, context)
    }
  }
  
  /**
   * 重试机制（指数退避）
   */
  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxAttempts = CACHE_CONFIG.MAX_RETRY_ATTEMPTS,
    context?: Record<string, any>
  ): Promise<T> => {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        retryCount.value = attempt - 1
        return await operation()
      } catch (err) {
        lastError = err
        const lockerError = handleApiError(err, context)
        
        // 如果错误不可重试，直接抛出
        if (!lockerError.retryable || attempt === maxAttempts) {
          error.value = lockerError
          throw err
        }
        
        // 指数退避延迟
        const delay = CACHE_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
  
  /**
   * 输入验证
   */
  const validateInput = (data: any, type: 'apply' | 'record' | 'storeId'): void => {
    switch (type) {
      case 'apply':
        if (!data.storeId || !validation.storeId(data.storeId)) {
          throw createError(LockerErrorType.VALIDATION_ERROR, '请选择有效的门店', false)
        }
        if (data.lockerId && !validation.lockerId(data.lockerId)) {
          throw createError(LockerErrorType.VALIDATION_ERROR, '杆柜ID格式不正确', false)
        }
        break
      case 'record':
        if (!data.lockerId || !validation.lockerId(data.lockerId)) {
          throw createError(LockerErrorType.VALIDATION_ERROR, '杆柜ID不能为空', false)
        }
        if (!data.actionType || !validation.actionType(data.actionType)) {
          throw createError(LockerErrorType.VALIDATION_ERROR, '操作类型无效', false)
        }
        break
      case 'storeId':
        if (!data.storeId || !validation.storeId(data.storeId)) {
          throw createError(LockerErrorType.VALIDATION_ERROR, '门店ID无效', false)
        }
        break
    }
  }
  
  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = null
    retryCount.value = 0
  }
  
  /**
   * 获取门店的杆柜列表（带缓存）
   */
  const fetchLockersByStore = async (storeId: string, useCache = true) => {
    try {
      loading.value = true
      clearError()
      
      validateInput({ storeId }, 'storeId')
      
      // 检查缓存
      if (useCache) {
        const cacheKey = secureCache.getCacheKey(CACHE_CONFIG.LOCKERS_CACHE_KEY, storeId)
        const cached = secureCache.get<Locker[]>(cacheKey)
        if (cached) {
          lockers.value = cached
          return cached
        }
      }
      
      return await withRetry(async () => {
        const data = await lockersApi.getLockersByStore(storeId)
        lockers.value = data
        lastUpdateTime.value = Date.now()
        
        // 缓存结果
        const cacheKey = secureCache.getCacheKey(CACHE_CONFIG.LOCKERS_CACHE_KEY, storeId)
        secureCache.set(cacheKey, data)
        
        return data
      }, CACHE_CONFIG.MAX_RETRY_ATTEMPTS, { storeId })
      
    } catch (err) {
      const lockerError = handleApiError(err, { storeId })
      error.value = lockerError
      throw lockerError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }
  
  /**
   * 申请杆柜
   */
  const applyForLocker = async (data: ApplyLockerRequest): Promise<ApplyLockerResponse> => {
    try {
      loading.value = true
      clearError()
      
      validateInput(data, 'apply')
      
      return await withRetry(async () => {
        const response = await lockersApi.applyLocker(data)
        
        // 清除相关缓存，强制刷新数据
        const cacheKey = secureCache.getCacheKey(CACHE_CONFIG.LOCKERS_CACHE_KEY, data.storeId)
        secureCache.remove(cacheKey)
        
        console.log('杆柜申请成功:', response.application_id)
        return response
      }, CACHE_CONFIG.MAX_RETRY_ATTEMPTS, data)
      
    } catch (err) {
      const lockerError = handleApiError(err, data)
      error.value = lockerError
      throw lockerError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }
  
  /**
   * 获取用户的杆柜（带缓存）
   */
  const fetchUserLocker = async (userId: string, useCache = true) => {
    try {
      loading.value = true
      clearError()
      
      // 检查缓存
      if (useCache) {
        const cacheKey = secureCache.getCacheKey(CACHE_CONFIG.USER_LOCKER_CACHE_KEY, userId)
        const cached = secureCache.get<Locker | null>(cacheKey)
        if (cached !== undefined) {
          userLocker.value = cached
          return cached
        }
      }
      
      return await withRetry(async () => {
        const data = await lockersApi.getUserLocker(userId)
        userLocker.value = data
        
        // 缓存结果
        const cacheKey = secureCache.getCacheKey(CACHE_CONFIG.USER_LOCKER_CACHE_KEY, userId)
        secureCache.set(cacheKey, data)
        
        return data
      }, CACHE_CONFIG.MAX_RETRY_ATTEMPTS, { userId })
      
    } catch (err) {
      const lockerError = handleApiError(err, { userId })
      error.value = lockerError
      return null
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }
  
  /**
   * 获取用户的杆柜使用记录（带缓存和分页）
   */
  const fetchUserLockerRecords = async (userId: string, limit = 10, useCache = true) => {
    try {
      loading.value = true
      clearError()
      
      // 检查缓存
      if (useCache) {
        const cacheKey = secureCache.getCacheKey(CACHE_CONFIG.RECORDS_CACHE_KEY, `${userId}_${limit}`)
        const cached = secureCache.get<LockerRecord[]>(cacheKey)
        if (cached) {
          lockerRecords.value = cached
          return cached
        }
      }
      
      return await withRetry(async () => {
        const data = await lockersApi.getUserLockerRecords(userId, limit)
        lockerRecords.value = data
        
        // 缓存结果
        const cacheKey = secureCache.getCacheKey(CACHE_CONFIG.RECORDS_CACHE_KEY, `${userId}_${limit}`)
        secureCache.set(cacheKey, data)
        
        return data
      }, CACHE_CONFIG.MAX_RETRY_ATTEMPTS, { userId, limit })
      
    } catch (err) {
      const lockerError = handleApiError(err, { userId, limit })
      error.value = lockerError
      throw lockerError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }
  
  /**
   * 记录杆柜操作
   */
  const recordLockerOperation = async (data: {
    lockerId: string
    actionType: 'store' | 'retrieve'
    lockerNumber?: string
    storeName?: string
  }) => {
    try {
      loading.value = true
      clearError()
      
      validateInput(data, 'record')
      
      return await withRetry(async () => {
        const response = await lockersApi.recordOperation(data)
        
        // 清除用户记录缓存，强制刷新数据
        const recordCachePattern = CACHE_CONFIG.RECORDS_CACHE_KEY
        // 简单的缓存清理 - 实际场景中可以更精确地清理特定用户的缓存
        secureCache.clear()
        
        console.log('杆柜操作记录成功:', data.actionType)
        return response
      }, CACHE_CONFIG.MAX_RETRY_ATTEMPTS, data)
      
    } catch (err) {
      const lockerError = handleApiError(err, data)
      error.value = lockerError
      throw lockerError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }
  
  /**
   * 获取杆柜二维码
   */
  const getLockerQRCode = async (lockerId: string) => {
    try {
      loading.value = true
      clearError()
      
      validateInput({ lockerId }, 'record')
      
      return await withRetry(async () => {
        const response = await lockersApi.getLockerQRCode(lockerId)
        return response
      }, CACHE_CONFIG.MAX_RETRY_ATTEMPTS, { lockerId })
      
    } catch (err) {
      const lockerError = handleApiError(err, { lockerId })
      error.value = lockerError
      throw lockerError
    } finally {
      loading.value = false
      retryCount.value = 0
    }
  }
  
  /**
   * 刷新所有缓存数据
   */
  const refreshAllData = async (userId: string, storeId?: string) => {
    try {
      loading.value = true
      clearError()
      
      const promises: Promise<any>[] = []
      
      // 刷新用户杆柜
      promises.push(fetchUserLocker(userId, false))
      
      // 刷新用户记录
      promises.push(fetchUserLockerRecords(userId, 10, false))
      
      // 如果有storeId，刷新门店杆柜列表
      if (storeId) {
        promises.push(fetchLockersByStore(storeId, false))
      }
      
      await Promise.all(promises)
      
      console.log('数据刷新完成')
    } catch (err) {
      console.error('数据刷新失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 清除所有缓存
   */
  const clearCache = () => {
    secureCache.clear()
    console.log('缓存已清除')
  }
  
  return {
    // 响应式状态
    lockers: readonly(lockers),
    userLocker: readonly(userLocker),
    lockerRecords: readonly(lockerRecords),
    loading: readonly(loading),
    error: readonly(error),
    retryCount: readonly(retryCount),
    lastUpdateTime: readonly(lastUpdateTime),
    
    // 计算属性
    availableLockers,
    occupiedLockers,
    hasUserLocker,
    recentRecords,
    
    // 数据获取方法
    fetchLockersByStore,
    fetchUserLocker,
    fetchUserLockerRecords,
    refreshAllData,
    
    // 操作方法
    applyForLocker,
    recordLockerOperation,
    getLockerQRCode,
    
    // 工具方法
    clearError,
    clearCache,
    validateInput,
    handleApiError,
    
    // 类型定义导出（用于TypeScript类型检查）
    LockerErrorType,
    createError
  }
})