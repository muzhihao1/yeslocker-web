import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api/auth-vue'
import type { User } from '@/types/user'
import type { LoginRequest, RegisterRequest } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const loading = ref(false)
  const error = ref<string>('')
  
  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  /**
   * 设置用户信息
   */
  const setUser = (userData: User) => {
    user.value = userData
    // 使用localStorage持久化用户数据
    localStorage.setItem('yeslocker_user', JSON.stringify(userData))
    console.log('用户信息已设置:', userData)
  }

  /**
   * 设置认证令牌
   */
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('yeslocker_token', newToken)
    console.log('令牌已设置')
  }

  /**
   * 设置错误信息
   */
  const setError = (errorMessage: string) => {
    error.value = errorMessage
    console.error('认证错误:', errorMessage)
  }

  /**
   * 清除错误信息
   */
  const clearError = () => {
    error.value = ''
  }

  /**
   * 加载存储的认证信息
   */
  const loadStoredAuth = async () => {
    try {
      // 加载存储的token
      const storedToken = localStorage.getItem('yeslocker_token')
      if (storedToken) {
        token.value = storedToken
      }
      
      // 加载存储的用户数据
      const storedUser = localStorage.getItem('yeslocker_user')
      if (storedUser) {
        try {
          user.value = JSON.parse(storedUser)
        } catch (error) {
          console.error('解析存储的用户数据失败:', error)
          localStorage.removeItem('yeslocker_user')
        }
      }

      // 如果有token，验证用户信息
      if (storedToken && !user.value) {
        await refreshUserInfo()
      }
    } catch (error) {
      console.error('加载存储的认证信息失败:', error)
      await logout()
    }
  }

  /**
   * 刷新用户信息
   */
  const refreshUserInfo = async () => {
    try {
      const userData = await authApi.getCurrentUser()
      if (userData) {
        user.value = userData
        localStorage.setItem('yeslocker_user', JSON.stringify(userData))
      } else {
        // 如果无法获取用户信息，清除认证状态
        await logout()
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      await logout()
    }
  }

  /**
   * 用户注册
   */
  const register = async (data: RegisterRequest) => {
    try {
      loading.value = true
      clearError()
      
      const response = await authApi.register(data)
      
      setToken(response.token)
      setUser(response.user)
      
      console.log('注册成功:', response.user)
      return response
    } catch (err: any) {
      const errorMessage = err.message || '注册失败'
      setError(errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户登录
   */
  const login = async (data: LoginRequest) => {
    try {
      loading.value = true
      clearError()
      
      const response = await authApi.login(data)
      
      setToken(response.token)
      setUser(response.user)
      
      console.log('登录成功:', response.user)
      return response
    } catch (err: any) {
      const errorMessage = err.message || '登录失败'
      setError(errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新用户资料
   */
  const updateProfile = async (data: Partial<User>) => {
    try {
      loading.value = true
      clearError()
      
      const updatedUser = await authApi.updateProfile(data)
      setUser(updatedUser)
      
      console.log('用户资料更新成功')
      return updatedUser
    } catch (err: any) {
      const errorMessage = err.message || '更新用户资料失败'
      setError(errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 退出登录
   */
  const logout = async () => {
    try {
      // 调用API退出
      await authApi.logout()
    } catch (error) {
      console.error('调用退出API失败:', error)
    } finally {
      // 无论API调用是否成功，都清除本地状态
      user.value = null
      token.value = ''
      error.value = ''
      
      // 清除localStorage
      localStorage.removeItem('yeslocker_token')
      localStorage.removeItem('yeslocker_user')
      
      console.log('用户已退出登录')
    }
  }

  /**
   * 检查是否已登录
   */
  const checkAuthStatus = () => {
    return authApi.isLoggedIn()
  }

  return {
    // 状态
    user,
    token,
    loading,
    error,
    isLoggedIn,
    
    // 操作方法
    setUser,
    setToken,
    setError,
    clearError,
    loadStoredAuth,
    refreshUserInfo,
    register,
    login,
    updateProfile,
    logout,
    checkAuthStatus
  }
})