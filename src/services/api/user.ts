import { apiClient } from './api-client'

export interface HistoryParams {
  user_id: string
  type?: 'all' | 'applications' | 'operations' | 'vouchers'
  page?: number
  limit?: number
}

export interface HistoryResponse {
  success: boolean
  data?: {
    items: any[]
    total: number
    page: number
    limit: number
  }
  error?: string
}

export const userApi = {
  // 获取用户历史记录
  async getUserHistory(params: HistoryParams): Promise<HistoryResponse> {
    const queryParams = new URLSearchParams({
      user_id: params.user_id,
      type: params.type || 'all',
      page: String(params.page || 1),
      limit: String(params.limit || 20)
    })

    return apiClient.get(`api/user/history?${queryParams}`)
  },

  // 获取用户信息
  async getUserInfo(userId: string) {
    return apiClient.get(`api/users/${userId}`)
  },

  // 更新用户信息
  async updateUserInfo(userId: string, data: any) {
    return apiClient.put(`api/users/${userId}`, data)
  },

  // 更新用户头像
  async updateAvatar(userId: string, avatarBase64: string) {
    return apiClient.post(`api/users/${userId}/avatar`, {
      avatar_base64: avatarBase64
    })
  }
}