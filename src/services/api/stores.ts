import { supabase } from '../supabase/client'
import { apiClient } from './api-client'
import type { Store } from '@/types/user'

export const storesApi = {
  // Get all stores
  async getStores(): Promise<Store[]> {
    if (import.meta.env.DEV) {
      // Use local API in dev mode
      const response = await apiClient.get('stores-lockers')
      if (!response.success) {
        throw new Error(response.message || '获取门店列表失败')
      }
      return response.data || []
    }

    // Use Supabase directly in production
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw new Error('获取门店列表失败')
    }

    return data || []
  },

  // Get store by ID
  async getStoreById(storeId: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single()

    if (error) {
      console.error('Error fetching store:', error)
      return null
    }

    return data
  },

  // Create mock stores for development
  async createMockStores(): Promise<void> {
    const mockStores = [
      { name: '望京店', address: '北京市朝阳区望京街道' },
      { name: '三里屯店', address: '北京市朝阳区三里屯路' },
      { name: '国贸店', address: '北京市朝阳区建国门外大街' },
      { name: '中关村店', address: '北京市海淀区中关村大街' },
      { name: '五道口店', address: '北京市海淀区成府路' }
    ]

    const { error } = await supabase
      .from('stores')
      .insert(mockStores)

    if (error) {
      console.error('Error creating mock stores:', error)
    }
  }
}