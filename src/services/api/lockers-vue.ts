import { apiClient } from './api-client-vue'
import type { Locker } from '@/types/user'

export interface ApplyLockerRequest {
  storeId: string
  lockerId?: string
  lockerType?: string
  purpose?: string
  reason?: string
}

export interface ApplyLockerResponse {
  application_id: string
  status: string
}

export interface LockerRecord {
  id: string
  actionType: 'store' | 'retrieve' | 'assigned'
  lockerNumber: string
  storeName: string
  createdAt: string
  note?: string
}

export const lockersApi = {
  // 获取门店的杆柜列表
  async getLockersByStore(storeId: string): Promise<Locker[]> {
    try {
      const response = await apiClient.get(`lockers/${storeId}`)
      
      if (!response.success) {
        throw new Error(response.message || '获取杆柜列表失败')
      }

      // 转换API响应格式以匹配前端接口
      return response.data.map((locker: any) => ({
        id: locker.id,
        storeId: locker.store_id,
        number: locker.number,
        status: locker.status,
        userId: locker.user_id,
        createdAt: locker.created_at
      }))
    } catch (error: any) {
      console.error('获取杆柜列表失败:', error.message)
      throw error
    }
  },

  // 申请杆柜
  async applyLocker(data: ApplyLockerRequest): Promise<ApplyLockerResponse> {
    try {
      // 从auth store获取当前用户
      const authStore = (await import('@/stores/auth')).useAuthStore()
      const user = authStore.user
      
      if (!user) {
        throw new Error('请先登录')
      }

      const response = await apiClient.post('lockers-apply', {
        store_id: data.storeId,
        locker_id: data.lockerId,
        user_id: user.id,
        locker_type: data.lockerType || '标准杆柜',
        purpose: data.purpose || '存放球杆',
        reason: data.reason
      })

      if (!response.success) {
        throw new Error(response.message || '申请失败')
      }

      return response.data
    } catch (error: any) {
      console.error('申请杆柜失败:', error.message)
      throw error
    }
  },

  // 获取用户的杆柜
  async getUserLocker(userId: string): Promise<Locker | null> {
    try {
      const response = await apiClient.get(`users/${userId}/locker`)
      
      if (!response.success) {
        return null // 用户可能没有杆柜
      }

      if (!response.data) {
        return null
      }

      // 转换API响应格式
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
    } catch (error: any) {
      console.error('获取用户杆柜失败:', error.message)
      return null
    }
  },

  // 获取用户的杆柜使用记录
  async getUserLockerRecords(userId: string, limit = 10): Promise<LockerRecord[]> {
    try {
      const response = await apiClient.get(`users/${userId}/locker-records?limit=${limit}`)
      
      if (!response.success) {
        throw new Error(response.message || '获取使用记录失败')
      }

      return response.data.map((record: any) => ({
        id: record.id,
        actionType: record.action_type,
        lockerNumber: record.locker_number,
        storeName: record.store_name,
        createdAt: record.created_at,
        note: record.note || ''
      }))
    } catch (error: any) {
      console.error('获取使用记录失败:', error.message)
      throw error
    }
  },

  // 记录杆柜操作（存杆/取杆）
  async recordOperation(data: {
    lockerId: string
    actionType: 'store' | 'retrieve'
    lockerNumber?: string
    storeName?: string
  }): Promise<any> {
    try {
      // 获取当前用户
      const authStore = (await import('@/stores/auth')).useAuthStore()
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
    } catch (error: any) {
      console.error('记录杆柜操作失败:', error.message)
      throw error
    }
  },

  // 获取杆柜二维码数据
  async getLockerQRCode(lockerId: string): Promise<any> {
    try {
      const response = await apiClient.get(`lockers/${lockerId}/qrcode`)
      
      if (!response.success) {
        throw new Error(response.message || '获取二维码失败')
      }

      return response.data
    } catch (error: any) {
      console.error('获取二维码失败:', error.message)
      throw error
    }
  }
}