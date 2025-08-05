import { ApiResponse } from '@/types/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

const DEFAULT_TIMEOUT = 30000

export class ApiError extends Error {
  code: number
  data?: any

  constructor(message: string, code: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.data = data
  }
}

export const request = async <T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> => {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = DEFAULT_TIMEOUT
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const responseData: ApiResponse<T> = await response.json()

    if (!response.ok) {
      throw new ApiError(
        responseData.message || 'Request failed',
        responseData.code || response.status,
        responseData.data
      )
    }

    if (responseData.code !== 0 && responseData.code !== 200) {
      throw new ApiError(
        responseData.message || 'Business error',
        responseData.code,
        responseData.data
      )
    }

    return responseData.data as T
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408)
    }
    
    if (error instanceof ApiError) {
      throw error
    }
    
    throw new ApiError(error.message || 'Network error', 0)
  }
}

// Helper methods for common HTTP verbs
export const get = <T = any>(url: string, headers?: Record<string, string>) => 
  request<T>(url, { method: 'GET', headers })

export const post = <T = any>(url: string, body?: any, headers?: Record<string, string>) => 
  request<T>(url, { method: 'POST', body, headers })

export const put = <T = any>(url: string, body?: any, headers?: Record<string, string>) => 
  request<T>(url, { method: 'PUT', body, headers })

export const del = <T = any>(url: string, headers?: Record<string, string>) => 
  request<T>(url, { method: 'DELETE', headers })