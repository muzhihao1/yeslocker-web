import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { adminApi } from '../services/api'

export interface AdminInfo {
  id: string
  phone: string
  name: string
  role: 'super_admin' | 'hq_admin' | 'store_admin'
  store_id?: string
  store_name?: string
  store_address?: string
  permissions: string[]
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
  const isHQAdmin = computed(() => adminInfo.value?.role === 'hq_admin')
  const isStoreAdmin = computed(() => adminInfo.value?.role === 'store_admin')
  const currentStoreId = computed(() => adminInfo.value?.store_id || adminInfo.value?.store?.id)
  
  // Permission helpers
  const hasPermission = (permission: string) => {
    if (!adminInfo.value) return false
    return adminInfo.value.permissions.includes('all') || 
           adminInfo.value.permissions.includes(permission)
  }
  
  const canManageAllStores = computed(() => hasPermission('manage_all_stores'))
  const canManageOwnStore = computed(() => hasPermission('manage_own_store'))
  const canManageAllApplications = computed(() => hasPermission('manage_all_applications'))
  const canManageStoreApplications = computed(() => hasPermission('manage_store_applications'))

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
          store_id: adminData.store_id,
          store_name: adminData.store_name,
          store_address: adminData.store_address,
          permissions: adminData.permissions || [],
          store: adminData.store_id ? {
            id: adminData.store_id,
            name: adminData.store_name || '',
            address: adminData.store_address || ''
          } : undefined
        }
        
        // 存储到本地
        localStorage.setItem('admin_token', token.value)
        localStorage.setItem('admin_info', JSON.stringify(adminInfo.value))
        
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
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
      
      // 跳转到登录页
      window.location.href = '/pages/login/index'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const checkAuthStatus = async () => {
    try {
      // 从本地存储读取
      const storedToken = localStorage.getItem('admin_token')
      const storedAdminInfoStr = localStorage.getItem('admin_info')
      
      if (storedToken && storedAdminInfoStr) {
        // 验证token是否过期
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]))
          const currentTime = Math.floor(Date.now() / 1000)
          
          if (payload.exp && payload.exp < currentTime) {
            console.log('Token expired, logging out automatically')
            await logout()
            return false
          }
          
          // Token有效，设置状态
          token.value = storedToken
          adminInfo.value = JSON.parse(storedAdminInfoStr)
          
          return true
        } catch (tokenError) {
          console.log('Invalid token format, logging out')
          await logout()
          return false
        }
      }
      
      return false
    } catch (error) {
      console.error('Check auth status error:', error)
      await logout()
      return false
    }
  }

  const updateAdminInfo = (newInfo: Partial<AdminInfo>) => {
    if (adminInfo.value) {
      adminInfo.value = { ...adminInfo.value, ...newInfo }
      localStorage.setItem('admin_info', JSON.stringify(adminInfo.value))
    }
  }

  // 验证当前token是否有效（用于API调用前检查）
  const validateCurrentToken = () => {
    if (!token.value) return false
    
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      
      return payload.exp && payload.exp > currentTime
    } catch {
      return false
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
    isHQAdmin,
    isStoreAdmin,
    currentStoreId,
    
    // Permission helpers
    hasPermission,
    canManageAllStores,
    canManageOwnStore,
    canManageAllApplications,
    canManageStoreApplications,
    
    // Actions
    login,
    logout,
    checkAuthStatus,
    updateAdminInfo,
    validateCurrentToken
  }
})