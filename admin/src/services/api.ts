import axios, { AxiosResponse } from 'axios'

// API基础配置
const isDevelopment = import.meta.env.DEV || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ||
  import.meta.env.MODE === 'development'

const API_BASE_URL = isDevelopment
  ? 'http://localhost:3001/api'
  : 'https://yeslocker-web-production-314a.up.railway.app/api'

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求缓存
const requestCache = new Map()
const CACHE_DURATION = 2 * 60 * 1000 // 2分钟缓存

// 生成缓存键
const generateCacheKey = (config: any) => {
  return `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`
}

// 请求拦截器 - 优化版本
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token并验证有效性
    const token = localStorage.getItem('admin_token')
    if (token) {
      // 验证token是否过期
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        
        if (payload.exp && payload.exp < currentTime) {
          // Token已过期，清除并拒绝请求
          console.log('Token expired in request interceptor, clearing tokens')
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_info')
          window.location.href = '/pages/login/index'
          return Promise.reject(new Error('Token expired'))
        }
        
        config.headers.Authorization = `Bearer ${token}`
      } catch (tokenError) {
        // Token格式无效，清除并拒绝请求
        console.log('Invalid token format in request interceptor, clearing tokens')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
        window.location.href = '/pages/login/index'
        return Promise.reject(new Error('Invalid token format'))
      }
    }
    
    // 为GET请求添加缓存检查
    if (config.method === 'get') {
      const cacheKey = generateCacheKey(config)
      const cachedResponse = requestCache.get(cacheKey)
      
      if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_DURATION)) {
        console.log('使用缓存数据:', cacheKey)
        // 返回cached response，但需要转换为Promise
        config._cached = cachedResponse.data
      }
    }
    
    // 添加请求时间戳
    config._requestStart = Date.now()
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 优化版本
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config
    
    // 性能监控
    if (config._requestStart) {
      const duration = Date.now() - config._requestStart
      console.log(`API请求耗时: ${config.url} - ${duration}ms`)
      
      // 记录慢请求
      if (duration > 1000) {
        console.warn(`慢请求警告: ${config.url} 耗时 ${duration}ms`)
      }
    }
    
    // 检查是否有缓存数据
    if (config._cached) {
      return config._cached
    }
    
    // 为GET请求缓存响应数据
    if (config.method === 'get' && response.data) {
      const cacheKey = generateCacheKey(config)
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      })
      
      // 限制缓存大小，避免内存泄漏
      if (requestCache.size > 50) {
        const firstKey = requestCache.keys().next().value
        requestCache.delete(firstKey)
      }
    }
    
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    
    // 增强错误处理
    const errorResponse = {
      message: '请求失败',
      code: 'UNKNOWN_ERROR',
      status: 0
    }
    
    if (error.response) {
      // 服务器响应错误
      errorResponse.status = error.response.status
      errorResponse.message = error.response.data?.message || `服务器错误 (${error.response.status})`
      
      switch (error.response.status) {
        case 401:
          errorResponse.code = 'UNAUTHORIZED'
          showToast('登录已过期', 'error')
          
          // 清除token并跳转到登录页
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_info')
          window.location.href = '/pages/login/index'
          break
        case 403:
          errorResponse.code = 'FORBIDDEN'
          errorResponse.message = '权限不足'
          
          // 403通常表示token无效或过期，自动清除并重定向
          console.log('403 Forbidden - clearing tokens and redirecting to login')
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_info')
          showToast('登录已过期，请重新登录', 'error')
          
          setTimeout(() => {
            window.location.href = '/pages/login/index'
          }, 1500)
          break
        case 404:
          errorResponse.code = 'NOT_FOUND'
          errorResponse.message = '请求的资源不存在'
          break
        case 500:
          errorResponse.code = 'SERVER_ERROR'
          errorResponse.message = '服务器内部错误'
          break
      }
    } else if (error.request) {
      // 网络错误
      errorResponse.code = 'NETWORK_ERROR'
      errorResponse.message = '网络连接失败，请检查网络设置'
    } else {
      // 其他错误
      errorResponse.message = error.message || '未知错误'
    }
    
    return Promise.reject(errorResponse)
  }
)

// API接口定义
export const adminApi = {
  // 管理员认证
  login: (phone: string, password: string) => {
    return apiClient.post('/admin-login', { phone, password })
  },
  
  // 获取申请列表
  getApplications: (params?: {
    status?: string
    limit?: number
    offset?: number
  }) => {
    return apiClient.get('/admin-approval', { params })
  },
  
  // 审核申请
  approveApplication: (data: {
    application_id: string
    action: 'approve' | 'reject'
    admin_id?: string
    locker_id?: string
    reject_reason?: string
    rejection_reason?: string // Keep for backward compatibility
  }) => {
    // Transform rejection_reason to reject_reason for backend compatibility
    const requestData = { ...data }
    if (data.rejection_reason && !data.reject_reason) {
      requestData.reject_reason = data.rejection_reason
      delete requestData.rejection_reason
    }
    return apiClient.post('/admin-approval', requestData)
  },
  
  // 获取门店和杆柜信息
  getStoresAndLockers: (storeId?: string) => {
    return apiClient.get('/stores-lockers', {
      params: storeId ? { store_id: storeId } : {}
    })
  },
  
  // 创建门店
  createStore: (data: {
    name: string
    code: string
    address: string
    manager_name?: string
    contact_phone?: string
    business_hours?: string
    remark?: string
  }) => {
    return apiClient.post('/stores-lockers', data)
  },

  // 更新门店
  updateStore: (id: string, data: {
    name?: string
    address?: string
    manager_name?: string
    contact_phone?: string
    business_hours?: string
    remark?: string
    is_active?: boolean
  }) => {
    return apiClient.patch(`/admin/stores/${id}`, data)
  },

  // 删除门店
  deleteStore: (id: string) => {
    return apiClient.delete(`/admin/stores/${id}`)
  },

  // 获取杆柜列表
  getLockers: (params?: {
    store_id?: string
    status?: string
    page?: number
    limit?: number
  }) => {
    return apiClient.get('/admin-lockers', { params })
  },

  // 获取单个杆柜详情
  getLockerDetail: (id: string) => {
    return apiClient.get(`/admin-lockers/${id}`)
  },

  // 创建杆柜
  createLocker: (data: {
    store_id: string
    number: string
    status?: string
  }) => {
    return apiClient.post('/admin-lockers', data)
  },

  // 更新杆柜
  updateLocker: (id: string, data: {
    number?: string
    status?: string
    current_user_id?: string | null
  }) => {
    return apiClient.put(`/admin-lockers/${id}`, data)
  },

  // 删除杆柜
  deleteLocker: (id: string) => {
    return apiClient.delete(`/admin-lockers/${id}`)
  },
  
  // 获取用户列表
  getUsers: (params?: {
    store_id?: string
    status?: string
    limit?: number
    offset?: number
  }) => {
    return apiClient.get('/admin-users', { params })
  },
  
  // 获取操作记录
  getRecords: (params?: {
    user_id?: string
    store_id?: string
    action_type?: string
    limit?: number
    offset?: number
  }) => {
    return apiClient.get('/admin-records', { params })
  },
  
  // 获取统计数据
  getStatistics: (params?: {
    store_id?: string
    date_range?: string
  }) => {
    return apiClient.get('/admin-statistics', { params })
  },
  
  // 发送提醒
  sendReminder: (data: {
    user_ids: string[]
    reminder_type: string
    message: string
  }) => {
    return apiClient.post('/admin-reminders', data)
  },
  
  // 导出数据
  exportData: (params: {
    type: 'users' | 'records' | 'statistics'
    store_id?: string
    date_range?: string
  }) => {
    return apiClient.get('/admin-export', { params })
  }
}

// 自定义Toast函数
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // 创建toast元素
  const toast = document.createElement('div')
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
    opacity: 0;
    transition: opacity 0.3s ease;
  `
  
  document.body.appendChild(toast)
  
  // 显示动画
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
  })
  
  // 3秒后移除
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}

// 文件上传API
export const uploadApi = {
  uploadImage: async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }
}

// 通用请求函数
export const request = {
  get: (url: string, params?: any) => apiClient.get(url, { params }),
  post: (url: string, data?: any) => apiClient.post(url, data),
  put: (url: string, data?: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url)
}