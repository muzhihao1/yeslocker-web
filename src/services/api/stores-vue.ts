import { apiClient } from './api-client-vue'
import type { Store } from '@/types/user'

export const storesApi = {
  // 获取所有门店
  async getStores(): Promise<Store[]> {
    try {
      const response = await apiClient.get('stores-lockers')
      
      if (!response.success) {
        throw new Error(response.message || '获取门店列表失败')
      }

      // Express后端直接返回门店数据
      return response.data || []
    } catch (error: any) {
      console.error('获取门店列表失败:', error.message)
      throw error
    }
  },

  // 根据ID获取门店
  async getStoreById(storeId: string): Promise<Store | null> {
    try {
      const response = await apiClient.get(`stores/${storeId}`)
      
      if (!response.success) {
        console.error('获取门店详情失败:', response.message)
        return null
      }

      return response.data || null
    } catch (error: any) {
      console.error('获取门店详情失败:', error.message)
      return null
    }
  },

  // 获取门店及其杆柜信息
  async getStoreWithLockers(storeId: string): Promise<any> {
    try {
      const response = await apiClient.get(`stores/${storeId}/with-lockers`)
      
      if (!response.success) {
        throw new Error(response.message || '获取门店杆柜信息失败')
      }

      return response.data
    } catch (error: any) {
      console.error('获取门店杆柜信息失败:', error.message)
      throw error
    }
  }
}