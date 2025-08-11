import { apiClient } from './api-client'
import type { Locker } from '@/types/user'

export interface ApplyLockerRequest {
  storeId: string
  lockerId: string
  reason?: string
}

export interface ApplyLockerResponse {
  application_id: string
  status: string
}

export const lockersApi = {
  // Get lockers by store
  async getLockersByStore(storeId: string): Promise<Locker[]> {
    const response = await apiClient.get(`lockers/${storeId}`)
    
    if (!response.success) {
      throw new Error(response.message || '获取杆柜列表失败')
    }

    // Transform API response to match frontend interface
    return response.data.map((locker: any) => ({
      id: locker.id,
      storeId: locker.store_id,
      number: locker.number,
      status: locker.status,
      userId: locker.user_id,
      createdAt: locker.created_at
    }))
  },

  // Apply for a locker
  async applyLocker(data: ApplyLockerRequest): Promise<ApplyLockerResponse> {
    // Get current user from auth store
    const authStore = (await import('@/stores/auth-vue')).useAuthStore()
    const user = authStore.user
    
    if (!user) {
      throw new Error('请先登录')
    }

    const response = await apiClient.post('lockers-apply', {
      store_id: data.storeId,
      locker_id: data.lockerId,
      user_id: user.id,
      reason: data.reason
    })

    if (!response.success) {
      throw new Error(response.message || '申请失败')
    }

    return response.data
  },

  // Get user's locker
  async getUserLocker(userId: string): Promise<Locker | null> {
    const response = await apiClient.get(`users/${userId}/locker`)
    
    if (!response.success) {
      throw new Error(response.message || '获取我的杆柜失败')
    }

    if (!response.data) {
      return null
    }

    // Transform API response to match frontend interface
    return {
      id: response.data.id,
      number: response.data.number,
      storeId: response.data.store_id,
      storeName: response.data.store_name,
      status: response.data.status,
      userId: userId,
      createdAt: response.data.created_at,
      lastUseTime: response.data.last_use_time
    }
  },

  // Get user's locker records
  async getUserLockerRecords(userId: string, limit = 10): Promise<any[]> {
    const response = await apiClient.get(`users/${userId}/locker-records`, {
      params: { limit }
    })
    
    if (!response.success) {
      throw new Error(response.message || '获取使用记录失败')
    }

    return response.data.map((record: any) => ({
      id: record.id,
      actionType: record.action_type,
      lockerNumber: record.locker_number,
      storeName: record.store_name,
      createdAt: record.created_at,
      note: record.note
    }))
  },

  // Get locker details
  async getLockerDetails(lockerId: string): Promise<Locker> {
    const response = await apiClient.get(`lockers/details/${lockerId}`)
    
    if (!response.success) {
      throw new Error(response.message || '获取杆柜详情失败')
    }

    return response.data
  },

  // Record locker operation (store/retrieve)
  async recordOperation(data: {
    lockerId: string
    actionType: 'store' | 'retrieve'
    lockerNumber?: string
    storeName?: string
  }): Promise<any> {
    // Get current user from auth store
    const authStore = (await import('@/stores/auth-vue')).useAuthStore()
    const user = authStore.user
    
    if (!user) {
      throw new Error('请先登录')
    }

    const response = await apiClient.post('locker-operations', {
      user_id: user.id,
      locker_id: data.lockerId,
      action_type: data.actionType,
      locker_number: data.lockerNumber,
      store_name: data.storeName
    })

    if (!response.success) {
      throw new Error(response.message || '操作记录失败')
    }

    return response.data
  },

  // Get locker QR code data
  async getLockerQRCode(lockerId: string): Promise<any> {
    const response = await apiClient.get(`lockers/${lockerId}/qrcode`)
    
    if (!response.success) {
      throw new Error(response.message || '获取二维码失败')
    }

    return response.data
  }
}