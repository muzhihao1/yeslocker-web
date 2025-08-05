export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
  timestamp: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LoginRequest {
  phone: string
}

export interface LoginResponse {
  user: any
  token: string
  expiresIn: number
}

export interface RegisterRequest {
  phone: string
  name: string
  avatarUrl?: string
  storeId: string
}

export interface SendSmsRequest {
  phone: string
  type: 'login' | 'register'
}

export interface LockerApplyRequest {
  storeId: string
  lockerId: string
  reason?: string
}

export interface LockerActionRequest {
  lockerId: string
  actionType: 'store' | 'retrieve'
  note?: string
}