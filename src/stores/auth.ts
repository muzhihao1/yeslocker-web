import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  const setUser = (userData: User) => {
    user.value = userData
    // 持久化用户数据
    uni.setStorageSync('user', JSON.stringify(userData))
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    uni.setStorageSync('token', newToken)
  }

  const loadStoredAuth = () => {
    // 加载存储的token
    const storedToken = uni.getStorageSync('token')
    if (storedToken) {
      token.value = storedToken
    }
    
    // 加载存储的用户数据
    const storedUser = uni.getStorageSync('user')
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
        uni.removeStorageSync('user')
      }
    }
  }

  const logout = () => {
    user.value = null
    token.value = ''
    uni.removeStorageSync('token')
    uni.removeStorageSync('user')
    uni.reLaunch({
      url: '/pages/auth/login'
    })
  }

  return {
    user,
    token,
    isLoggedIn,
    setUser,
    setToken,
    loadStoredAuth,
    logout
  }
})