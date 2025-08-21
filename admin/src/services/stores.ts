import { adminApi } from './api'

export interface Store {
  id: string
  name: string
  address: string
  phone?: string
  business_hours?: string
  contact_person?: string
  total_lockers?: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at?: string
  // Statistics
  locker_count?: number
  available_lockers?: number
  user_count?: number
  total_applications?: number
  pending_applications?: number
}

export interface CreateStoreData {
  name: string
  address: string
  phone?: string
  business_hours?: string
  contact_person?: string
  total_lockers?: number
}

export interface UpdateStoreData extends Partial<CreateStoreData> {
  status?: 'active' | 'inactive'
}

export const storeApi = {
  // Get all stores (filtered by admin role on backend)
  async getStores(): Promise<{ success: boolean; data?: Store[]; error?: string }> {
    try {
      const response = await adminApi.request('/api/stores', {
        method: 'GET'
      })
      return response
    } catch (error: any) {
      console.error('Get stores error:', error)
      return {
        success: false,
        error: error.message || '获取门店列表失败'
      }
    }
  },

  // Get single store details
  async getStore(id: string): Promise<{ success: boolean; data?: Store; error?: string }> {
    try {
      const response = await adminApi.request(`/api/stores/${id}`, {
        method: 'GET'
      })
      return response
    } catch (error: any) {
      console.error('Get store details error:', error)
      return {
        success: false,
        error: error.message || '获取门店详情失败'
      }
    }
  },

  // Create new store (super_admin and hq_admin only)
  async createStore(data: CreateStoreData): Promise<{ success: boolean; data?: Store; error?: string }> {
    try {
      const response = await adminApi.request('/api/stores', {
        method: 'POST',
        body: data
      })
      return response
    } catch (error: any) {
      console.error('Create store error:', error)
      return {
        success: false,
        error: error.message || '创建门店失败'
      }
    }
  },

  // Update store
  async updateStore(id: string, data: UpdateStoreData): Promise<{ success: boolean; data?: Store; error?: string }> {
    try {
      const response = await adminApi.request(`/api/stores/${id}`, {
        method: 'PUT',
        body: data
      })
      return response
    } catch (error: any) {
      console.error('Update store error:', error)
      return {
        success: false,
        error: error.message || '更新门店失败'
      }
    }
  },

  // Delete store (super_admin only)
  async deleteStore(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await adminApi.request(`/api/stores/${id}`, {
        method: 'DELETE'
      })
      return response
    } catch (error: any) {
      console.error('Delete store error:', error)
      return {
        success: false,
        error: error.message || '删除门店失败'
      }
    }
  },

  // Get store statistics
  async getStoreStats(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await adminApi.request(`/api/stores/${id}/stats`, {
        method: 'GET'
      })
      return response
    } catch (error: any) {
      console.error('Get store stats error:', error)
      return {
        success: false,
        error: error.message || '获取门店统计失败'
      }
    }
  }
}

export default storeApi