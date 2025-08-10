// Vue应用的API客户端 - 连接Express后端
const isDev = import.meta.env.DEV
// 生产环境使用相同域名，开发环境使用localhost:3001
const API_BASE_URL = isDev ? 'http://localhost:3001' : window.location.origin

interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

class ApiError extends Error {
  public status: number
  public response?: any

  constructor(message: string, status: number, response?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.response = response
  }
}

export const apiClient = {
  // 默认请求配置
  defaultTimeout: 10000,

  // 请求拦截器 - 添加认证令牌
  getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('yeslocker_token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  },

  // 通用请求方法
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    // 构建完整URL，去掉开头的斜杠避免重复
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = `${API_BASE_URL}/${cleanEndpoint}`
    
    // 设置默认选项
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers
      },
      ...(options.body && { body: JSON.stringify(options.body) })
    }

    try {
      console.log(`🌐 API请求: ${config.method} ${url}`, options.body || '')
      
      // 设置超时
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultTimeout)
      config.signal = controller.signal

      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      // 解析响应
      let data: ApiResponse<T>
      try {
        data = await response.json()
      } catch (e) {
        throw new ApiError('Invalid JSON response', response.status)
      }

      if (!response.ok) {
        console.error(`❌ API错误 ${response.status}:`, data.message || data.error)
        throw new ApiError(
          data.message || data.error || `HTTP ${response.status}`,
          response.status,
          data
        )
      }

      console.log(`✅ API响应:`, data.success ? 'SUCCESS' : 'FAILED')
      return data

    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('请求超时', 408)
        }
        console.error(`❌ 网络错误:`, error.message)
        throw new ApiError('网络连接失败', 0, error)
      }

      throw new ApiError('未知错误', 0, error)
    }
  },

  // GET请求
  get<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers })
  },

  // POST请求
  post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'POST', body, headers })
  },

  // PUT请求
  put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'PUT', body, headers })
  },

  // DELETE请求
  delete<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers })
  },

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, { 
        method: 'GET',
        timeout: 5000 
      } as RequestInit)
      return response.ok
    } catch {
      return false
    }
  }
}