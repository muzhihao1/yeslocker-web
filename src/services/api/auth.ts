import { supabase } from '../supabase/client'
import { apiClient } from './api-client'
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  SendSmsRequest 
} from '@/types/api'
import type { User } from '@/types/user'


export const authApi = {

  // User registration
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await apiClient.post('auth-register', {
      phone: data.phone,
      name: data.name,
      avatar_url: data.avatarUrl,
      store_id: data.storeId
    })

    if (!response.success) {
      throw new Error(response.message || '注册失败')
    }

    // Auto-login after registration in dev mode
    if (import.meta.env.DEV) {
      return this.login({ phone: data.phone })
    }

    return {
      user: response.data.user,
      token: response.data.token || '',
      expiresIn: 3600
    }
  },

  // User login
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post('auth-login', {
      phone: data.phone,
      code: '123456' // Test code for development
    })

    if (!response.success) {
      throw new Error(response.message || '登录失败')
    }

    return {
      user: response.data.user,
      token: response.data.token || '',
      expiresIn: 3600
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return profile
  },

  // Update user profile
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const { data: profile, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error('更新用户信息失败')
    }

    return profile
  },

  // Logout
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error('退出登录失败')
    }
  }
}