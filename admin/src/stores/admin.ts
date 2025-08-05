import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { adminApi } from '../services/api'

export interface AdminInfo {
  id: string
  phone: string
  name: string
  role: 'super_admin' | 'store_admin'
  store?: {
    id: string
    name: string
    address: string
  }
}

export const useAdminStore = defineStore('admin', () => {
  // State
  const adminInfo = ref<AdminInfo | null>(null)
  const token = ref<string>('')
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!adminInfo.value)
  const isSuperAdmin = computed(() => adminInfo.value?.role === 'super_admin')
  const isStoreAdmin = computed(() => adminInfo.value?.role === 'store_admin')
  const currentStoreId = computed(() => adminInfo.value?.store?.id)

  // Actions
  const login = async (phone: string, password: string) => {
    isLoading.value = true
    try {
      const response = await adminApi.login(phone, password)
      
      if (response.success) {
        token.value = response.data.token
        
        // 适配服务器返回的数据格式
        const adminData = response.data.admin
        adminInfo.value = {
          id: adminData.id,
          phone: adminData.phone,
          name: adminData.name,
          role: adminData.role,
          store: adminData.store_id ? {
            id: adminData.store_id,
            name: adminData.store_name || '',
            address: '' // 服务器没有返回地址，暂时置空
          } : undefined
        }
        
        // 存储到本地
        uni.setStorageSync('admin_token', token.value)
        uni.setStorageSync('admin_info', adminInfo.value)
        
        return response
      } else {
        throw new Error(response.message)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // 清除状态
      token.value = ''
      adminInfo.value = null
      
      // 清除本地存储
      uni.removeStorageSync('admin_token')
      uni.removeStorageSync('admin_info')
      
      // 跳转到登录页
      uni.reLaunch({
        url: '/pages/login/index'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const checkAuthStatus = async () => {
    try {
      // 从本地存储读取
      const storedToken = uni.getStorageSync('admin_token')
      const storedAdminInfo = uni.getStorageSync('admin_info')
      
      if (storedToken && storedAdminInfo) {
        token.value = storedToken
        adminInfo.value = storedAdminInfo
        
        // TODO: 验证token是否仍然有效
        // const isValid = await adminApi.validateToken(storedToken)
        // if (!isValid) {
        //   await logout()
        //   return false
        // }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Check auth status error:', error)
      return false
    }
  }

  const updateAdminInfo = (newInfo: Partial<AdminInfo>) => {
    if (adminInfo.value) {
      adminInfo.value = { ...adminInfo.value, ...newInfo }
      uni.setStorageSync('admin_info', adminInfo.value)
    }
  }

  return {
    // State
    adminInfo: readonly(adminInfo),
    token: readonly(token),
    isLoading: readonly(isLoading),
    
    // Getters
    isAuthenticated,
    isSuperAdmin,
    isStoreAdmin,
    currentStoreId,
    
    // Actions
    login,
    logout,
    checkAuthStatus,
    updateAdminInfo
  }
})