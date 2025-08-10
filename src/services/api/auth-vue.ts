import { apiClient } from './api-client-vue'
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest
} from '@/types/api'
import type { User } from '@/types/user'

export const authApi = {
  
  // 用户注册
  async register(data: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post('auth-register', {
        phone: data.phone,
        name: data.name,
        avatar_url: data.avatarUrl,
        store_id: data.storeId
      })

      if (!response.success) {
        throw new Error(response.message || '注册失败')
      }

      return {
        user: {
          id: response.data.user_id,
          phone: response.data.phone,
          name: response.data.name,
          store: response.data.store
        },
        token: response.data.token || '',
        expiresIn: 3600 * 24 * 7 // 7天
      }
    } catch (error: any) {
      console.error('注册失败:', error.message)
      throw error
    }
  },

  // 用户登录  
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post('auth-login', {
        phone: data.phone
      })

      if (!response.success) {
        throw new Error(response.message || '登录失败')
      }

      // 存储token到localStorage
      if (response.data.token) {
        localStorage.setItem('yeslocker_token', response.data.token)
      }

      return {
        user: response.data.user,
        token: response.data.token || '',
        expiresIn: 3600 * 24 * 7 // 7天
      }
    } catch (error: any) {
      console.error('登录失败:', error.message)
      throw error
    }
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('yeslocker_token')
      if (!token) {
        return null
      }

      const response = await apiClient.get('auth/me')
      
      if (!response.success) {
        return null
      }

      return response.data
    } catch (error: any) {
      console.error('获取用户信息失败:', error.message)
      // 如果token无效，清除本地存储
      if (error.status === 401) {
        localStorage.removeItem('yeslocker_token')
      }
      return null
    }
  },

  // 更新用户信息
  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put('auth/profile', data)

      if (!response.success) {
        throw new Error(response.message || '更新用户信息失败')
      }

      return response.data
    } catch (error: any) {
      console.error('更新用户信息失败:', error.message)
      throw error
    }
  },

  // 退出登录
  async logout(): Promise<void> {
    try {
      // 清除本地存储的token
      localStorage.removeItem('yeslocker_token')
      
      // 可选：通知服务器用户已退出
      await apiClient.post('auth/logout').catch(() => {
        // 忽略退出接口的错误，因为本地已经清除token
      })
      
      console.log('用户已退出登录')
    } catch (error: any) {
      console.error('退出登录时发生错误:', error.message)
      // 确保本地token被清除
      localStorage.removeItem('yeslocker_token')
    }
  },

  // 检查token是否有效
  isLoggedIn(): boolean {
    const token = localStorage.getItem('yeslocker_token')
    return !!token
  },

  // 获取存储的token
  getToken(): string | null {
    return localStorage.getItem('yeslocker_token')
  }
}