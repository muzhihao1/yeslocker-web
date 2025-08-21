import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('admin_token');
  return token ? `Bearer ${token}` : '';
};

// Axios instance with auth header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export interface Locker {
  id: string;
  store_id: string;
  locker_number: string;
  location?: string;
  capacity?: number;
  monthly_rent?: number;
  deposit_amount?: number;
  description?: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  is_available: boolean;
  current_user_id?: string;
  store_name?: string;
  store_address?: string;
  current_user_name?: string;
  current_user_phone?: string;
  created_at: string;
  updated_at: string;
  recent_records?: LockerRecord[];
}

export interface LockerRecord {
  id: string;
  locker_id: string;
  user_id: string;
  action: string;
  user_name?: string;
  user_phone?: string;
  created_at: string;
}

export interface BatchCreateParams {
  store_id: string;
  prefix: string;
  start_number: number;
  end_number: number;
  location?: string;
  capacity?: number;
  monthly_rent?: number;
  deposit_amount?: number;
}

export interface BatchCreateResult {
  created: Array<{ id: string; locker_number: string }>;
  failed: Array<{ locker_number: string; reason: string }>;
  total_created: number;
  total_failed: number;
}

class LockerService {
  // Get all lockers (with optional store filter)
  async getLockers(store_id?: string) {
    try {
      const params = store_id ? { store_id } : {};
      const response = await api.get('/api/admin/lockers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching lockers:', error);
      throw error;
    }
  }

  // Get single locker details
  async getLocker(id: string) {
    try {
      const response = await api.get(`/api/admin/lockers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching locker details:', error);
      throw error;
    }
  }

  // Create new locker
  async createLocker(data: Partial<Locker>) {
    try {
      const response = await api.post('/api/admin/lockers', data);
      return response.data;
    } catch (error) {
      console.error('Error creating locker:', error);
      throw error;
    }
  }

  // Update locker
  async updateLocker(id: string, data: Partial<Locker>) {
    try {
      const response = await api.put(`/api/admin/lockers/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating locker:', error);
      throw error;
    }
  }

  // Delete locker
  async deleteLocker(id: string) {
    try {
      const response = await api.delete(`/api/admin/lockers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting locker:', error);
      throw error;
    }
  }

  // Batch create lockers
  async batchCreateLockers(params: BatchCreateParams) {
    try {
      const response = await api.post('/api/admin/lockers/batch', params);
      return response.data;
    } catch (error) {
      console.error('Error batch creating lockers:', error);
      throw error;
    }
  }

  // Update locker status
  async updateLockerStatus(id: string, status: Locker['status'], is_available: boolean) {
    try {
      const response = await api.put(`/api/admin/lockers/${id}`, {
        status,
        is_available
      });
      return response.data;
    } catch (error) {
      console.error('Error updating locker status:', error);
      throw error;
    }
  }

  // Get lockers by store
  async getLockersByStore(storeId: string) {
    return this.getLockers(storeId);
  }

  // Get available lockers in a store
  async getAvailableLockers(storeId: string) {
    try {
      const response = await this.getLockers(storeId);
      if (response.success) {
        response.data = response.data.filter((locker: Locker) => 
          locker.is_available && locker.status === 'available'
        );
      }
      return response;
    } catch (error) {
      console.error('Error fetching available lockers:', error);
      throw error;
    }
  }

  // Get locker statistics for a store
  async getLockerStats(storeId: string) {
    try {
      const response = await this.getLockers(storeId);
      if (response.success) {
        const lockers = response.data as Locker[];
        const stats = {
          total: lockers.length,
          available: lockers.filter(l => l.status === 'available').length,
          occupied: lockers.filter(l => l.status === 'occupied').length,
          maintenance: lockers.filter(l => l.status === 'maintenance').length,
          reserved: lockers.filter(l => l.status === 'reserved').length
        };
        return { success: true, data: stats };
      }
      return response;
    } catch (error) {
      console.error('Error fetching locker statistics:', error);
      throw error;
    }
  }
}

export default new LockerService();