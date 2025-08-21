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

export interface StatisticsOverview {
  users: {
    active: number;
    growth: number;
  };
  lockers: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    occupancy_rate: number;
  };
  applications: {
    pending: number;
    today: number;
  };
  vouchers: {
    total: number;
    used: number;
    active: number;
  };
  stores: {
    total: number;
  };
}

export interface TrendData {
  date: string;
  checkIns: number;
  checkOuts: number;
  uniqueUsers: number;
}

export interface TopStore {
  id: string;
  name: string;
  address: string;
  totalLockers: number;
  occupiedLockers: number;
  totalOperations: number;
  approvedApplications: number;
}

export interface RecentActivity {
  type: string;
  id: string;
  createdAt: string;
  userName: string;
  storeName: string;
  status: string;
}

export interface StatisticsResponse {
  overview: StatisticsOverview;
  trends: TrendData[];
  topStores: TopStore[];
  recentActivities: RecentActivity[];
  period: string;
  role: string;
  storeId?: string;
}

class StatisticsService {
  // Get comprehensive statistics
  async getStatistics(params?: {
    store_id?: string;
    period?: '7d' | '30d' | '90d' | '1y';
  }) {
    try {
      const response = await api.get('/api/admin-statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  // Get voucher statistics
  async getVoucherStatistics(params?: {
    start_date?: string;
    end_date?: string;
    group_by?: 'hour' | 'day' | 'week' | 'month';
  }) {
    try {
      const response = await api.get('/api/vouchers/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching voucher statistics:', error);
      throw error;
    }
  }

  // Export statistics data
  async exportStatistics(params: {
    type: 'overview' | 'trends' | 'stores' | 'users';
    format: 'csv' | 'excel';
    period?: string;
    store_id?: string;
  }) {
    try {
      const response = await api.get('/api/admin-statistics/export', {
        params,
        responseType: 'blob'
      });
      
      // Create download link
      const contentType = params.format === 'csv' 
        ? 'text/csv' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = params.format === 'csv' ? 'csv' : 'xlsx';
      link.download = `statistics_${params.type}_${timestamp}.${extension}`;
      
      link.click();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting statistics:', error);
      throw error;
    }
  }

  // Calculate growth percentage
  calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // Format number with commas
  formatNumber(num: number): string {
    return num.toLocaleString('zh-CN');
  }

  // Get trend summary
  getTrendSummary(trends: TrendData[]): {
    totalCheckIns: number;
    totalCheckOuts: number;
    averageDailyUsers: number;
    peakDay: string | null;
  } {
    if (!trends || trends.length === 0) {
      return {
        totalCheckIns: 0,
        totalCheckOuts: 0,
        averageDailyUsers: 0,
        peakDay: null
      };
    }

    const totalCheckIns = trends.reduce((sum, t) => sum + t.checkIns, 0);
    const totalCheckOuts = trends.reduce((sum, t) => sum + t.checkOuts, 0);
    const averageDailyUsers = Math.round(
      trends.reduce((sum, t) => sum + t.uniqueUsers, 0) / trends.length
    );
    
    const peakDayData = trends.reduce((max, t) => 
      (t.checkIns + t.checkOuts) > (max.checkIns + max.checkOuts) ? t : max
    );
    
    return {
      totalCheckIns,
      totalCheckOuts,
      averageDailyUsers,
      peakDay: peakDayData.date
    };
  }

  // Get performance metrics
  getPerformanceMetrics(overview: StatisticsOverview): {
    utilizationRate: number;
    conversionRate: number;
    voucherUsageRate: number;
  } {
    const utilizationRate = overview.lockers.total > 0
      ? Math.round((overview.lockers.occupied / overview.lockers.total) * 100)
      : 0;
    
    const conversionRate = overview.applications.today > 0
      ? Math.round((overview.applications.pending / overview.applications.today) * 100)
      : 0;
    
    const voucherUsageRate = overview.vouchers.total > 0
      ? Math.round((overview.vouchers.used / overview.vouchers.total) * 100)
      : 0;
    
    return {
      utilizationRate,
      conversionRate,
      voucherUsageRate
    };
  }
}

export default new StatisticsService();