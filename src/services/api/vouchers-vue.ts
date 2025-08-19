import { apiClient } from './api-client-vue'

export interface VoucherRequest {
  user_id: string
  locker_id: string
  operation_type: 'store' | 'retrieve'
}

export interface Voucher {
  id: string
  code: string
  qr_data: string // Base64 encoded QR code image
  operation_type: 'store' | 'retrieve'
  status: 'issued' | 'used' | 'expired' | 'cancelled'
  user_info: {
    name: string
    phone: string
    avatar_url?: string
  }
  locker_info: {
    number: string
    store_name: string
  }
  issued_at: string
  expires_at: string
  used_at?: string
  time_remaining?: number // seconds
}

export interface VoucherHistory {
  vouchers: Voucher[]
  total: number
}

export const vouchersApi = {
  // Request a new voucher for operation
  async requestVoucher(data: VoucherRequest): Promise<Voucher> {
    try {
      const response = await apiClient.post('vouchers/request', data)
      
      if (!response.success) {
        throw new Error(response.message || '申请凭证失败')
      }

      return response.voucher
    } catch (error: any) {
      console.error('申请凭证失败:', error.message)
      throw error
    }
  },

  // Get user's voucher history
  async getMyHistory(filters?: {
    status?: string
    operation_type?: string
    start_date?: string
    end_date?: string
    limit?: number
  }): Promise<VoucherHistory> {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value))
          }
        })
      }

      const queryString = params.toString()
      const url = queryString ? `vouchers/my-history?${queryString}` : 'vouchers/my-history'
      const response = await apiClient.get(url)
      
      if (!response.success) {
        throw new Error(response.message || '获取凭证历史失败')
      }

      return response.data
    } catch (error: any) {
      console.error('获取凭证历史失败:', error.message)
      throw error
    }
  },

  // Check voucher status by code
  async checkVoucherStatus(code: string): Promise<Voucher> {
    try {
      const response = await apiClient.get(`vouchers/status/${code}`)
      
      if (!response.success) {
        throw new Error(response.message || '查询凭证状态失败')
      }

      return response.data
    } catch (error: any) {
      console.error('查询凭证状态失败:', error.message)
      throw error
    }
  },

  // Cancel an unused voucher
  async cancelVoucher(voucherId: string, reason?: string): Promise<void> {
    try {
      const response = await apiClient.post(`vouchers/${voucherId}/cancel`, {
        reason: reason || '用户取消'
      })
      
      if (!response.success) {
        throw new Error(response.message || '取消凭证失败')
      }
    } catch (error: any) {
      console.error('取消凭证失败:', error.message)
      throw error
    }
  },

  // Calculate time remaining for a voucher
  calculateTimeRemaining(expiresAt: string): number {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
    return remaining
  },

  // Format time remaining as MM:SS
  formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}