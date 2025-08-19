/**
 * Store Repository - 门店数据访问层
 * Handles all store-related database operations
 */

import { BaseRepository, SearchResult, PaginationOptions } from './BaseRepository';
import { Store } from '../models/Store';

export interface CreateStoreData {
  name: string;
  address?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateStoreData {
  name?: string;
  address?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export interface StoreSearchFilters {
  name?: string;
  status?: 'active' | 'inactive';
  hasUsers?: boolean;
  hasLockers?: boolean;
}

export class StoreRepository extends BaseRepository<Store> {
  constructor() {
    super(Store);
  }

  /**
   * Create new store
   */
  async createStore(storeData: CreateStoreData): Promise<Store | null> {
    try {
      // Check if store name already exists
      const existingStore = await this.findOneBy('name', storeData.name);
      if (existingStore) {
        throw new Error('Store name already exists');
      }

      return await this.create(storeData);
    } catch (error) {
      this.handleError('createStore', error, storeData);
      return null;
    }
  }

  /**
   * Find store with comprehensive details
   */
  async findStoreWithDetails(storeId: string): Promise<Store | null> {
    try {
      return await this.findByIdWithRelations(storeId, [
        'users(active)',
        'lockers',
        'applications(orderByNewest)',
        'admins(active)'
      ]);
    } catch (error) {
      this.handleError('findStoreWithDetails', error, { storeId });
      return null;
    }
  }

  /**
   * Get all active stores
   */
  async getActiveStores(): Promise<Store[]> {
    try {
      return await this.findWhere({ status: 'active' }, {
        sort: { field: 'name', direction: 'asc' },
        relations: ['users(active)', 'lockers']
      });
    } catch (error) {
      this.handleError('getActiveStores', error);
      return [];
    }
  }

  /**
   * Search stores with filters and pagination
   */
  async searchStores(
    filters: StoreSearchFilters,
    pagination: PaginationOptions
  ): Promise<SearchResult<Store>> {
    try {
      let query = this.createQuery();

      // Apply filters
      if (filters.name) {
        query = query.whereILike('name', `%${filters.name}%`);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.hasUsers !== undefined) {
        if (filters.hasUsers) {
          query = query.whereExists(Store.relatedQuery('users'));
        } else {
          query = query.whereNotExists(Store.relatedQuery('users'));
        }
      }

      if (filters.hasLockers !== undefined) {
        if (filters.hasLockers) {
          query = query.whereExists(Store.relatedQuery('lockers'));
        } else {
          query = query.whereNotExists(Store.relatedQuery('lockers'));
        }
      }

      // Add relations for display
      query = query.withGraphFetched('[users(active), lockers, applications(pending)]');

      // Apply pagination
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 20, 100);

      const result = await query
        .orderBy('name', 'asc')
        .page(page - 1, pageSize);

      return {
        data: result.results as Store[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('searchStores', error, { filters, pagination });
      return {
        data: [],
        total: 0,
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 20,
        totalPages: 0
      };
    }
  }

  /**
   * Get store statistics
   */
  async getStoreStats(storeId: string) {
    try {
      const store = await this.findByIdWithRelations(storeId, [
        'users',
        'lockers',
        'applications'
      ]);

      if (!store) {
        return null;
      }

      const stats = {
        storeId,
        name: store.name,
        totalUsers: store.users?.length || 0,
        activeUsers: store.users?.filter(u => u.status === 'active').length || 0,
        totalLockers: store.lockers?.length || 0,
        availableLockers: store.lockers?.filter(l => l.status === 'available').length || 0,
        occupiedLockers: store.lockers?.filter(l => l.status === 'occupied').length || 0,
        maintenanceLockers: store.lockers?.filter(l => l.status === 'maintenance').length || 0,
        totalApplications: store.applications?.length || 0,
        pendingApplications: store.applications?.filter(a => a.status === 'pending').length || 0,
        approvedApplications: store.applications?.filter(a => a.status === 'approved').length || 0,
        utilizationRate: 0
      };

      // Calculate utilization rate
      if (stats.totalLockers > 0) {
        stats.utilizationRate = (stats.occupiedLockers / stats.totalLockers) * 100;
      }

      return stats;
    } catch (error) {
      this.handleError('getStoreStats', error, { storeId });
      return null;
    }
  }

  /**
   * Get comprehensive store analytics
   */
  async getStoreAnalytics(storeId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get basic store info with relations
      const store = await this.findStoreWithDetails(storeId);
      if (!store) {
        return null;
      }

      // Get time-based metrics using raw queries for better performance
      const [
        recentUsers,
        recentApplications,
        recentActivity
      ] = await Promise.all([
        // Users registered in time period
        this.createQuery()
          .where('id', storeId)
          .withGraphFetched('users')
          .modifyGraph('users', builder => {
            builder.where('created_at', '>=', startDate.toISOString());
          }),

        // Applications submitted in time period
        this.createQuery()
          .where('id', storeId)
          .withGraphFetched('applications')
          .modifyGraph('applications', builder => {
            builder.where('created_at', '>=', startDate.toISOString());
          }),

        // Locker records in time period
        Store.relatedQuery('lockers')
          .for(storeId)
          .withGraphFetched('records')
          .modifyGraph('records', builder => {
            builder.where('created_at', '>=', startDate.toISOString());
          })
      ]);

      const analytics = {
        store: {
          id: store.id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          status: store.status
        },
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        },
        users: {
          total: store.users?.length || 0,
          active: store.users?.filter(u => u.status === 'active').length || 0,
          newInPeriod: recentUsers[0]?.users?.length || 0
        },
        lockers: {
          total: store.lockers?.length || 0,
          available: store.lockers?.filter(l => l.status === 'available').length || 0,
          occupied: store.lockers?.filter(l => l.status === 'occupied').length || 0,
          maintenance: store.lockers?.filter(l => l.status === 'maintenance').length || 0
        },
        applications: {
          total: store.applications?.length || 0,
          pending: store.applications?.filter(a => a.status === 'pending').length || 0,
          approved: store.applications?.filter(a => a.status === 'approved').length || 0,
          rejected: store.applications?.filter(a => a.status === 'rejected').length || 0,
          newInPeriod: recentApplications[0]?.applications?.length || 0
        },
        activity: {
          totalRecords: recentActivity.reduce((sum, locker) => 
            sum + (locker.records?.length || 0), 0),
          storeActions: 0,
          retrieveActions: 0
        }
      };

      // Calculate activity details
      recentActivity.forEach(locker => {
        locker.records?.forEach(record => {
          if (record.action === 'store') analytics.activity.storeActions++;
          if (record.action === 'retrieve') analytics.activity.retrieveActions++;
        });
      });

      return analytics;
    } catch (error) {
      this.handleError('getStoreAnalytics', error, { storeId, days });
      return null;
    }
  }

  /**
   * Get stores with available lockers
   */
  async getStoresWithAvailableLockers(): Promise<Store[]> {
    try {
      return await this.createQuery()
        .withGraphFetched('lockers(available)')
        .whereExists(
          Store.relatedQuery('lockers').where('status', 'available')
        )
        .orderBy('name', 'asc') as Store[];
    } catch (error) {
      this.handleError('getStoresWithAvailableLockers', error);
      return [];
    }
  }

  /**
   * Get stores requiring attention (maintenance, high occupancy, etc.)
   */
  async getStoresRequiringAttention() {
    try {
      const stores = await this.getActiveStores();
      const attentionStores = [];

      for (const store of stores) {
        const stats = await this.getStoreStats(store.id);
        if (!stats) continue;

        const issues = [];

        // High occupancy rate (>90%)
        if (stats.utilizationRate > 90) {
          issues.push('High occupancy rate');
        }

        // Many pending applications
        if (stats.pendingApplications > 5) {
          issues.push('Multiple pending applications');
        }

        // Lockers in maintenance
        if (stats.maintenanceLockers > 0) {
          issues.push('Lockers under maintenance');
        }

        // No available lockers
        if (stats.availableLockers === 0 && stats.totalLockers > 0) {
          issues.push('No available lockers');
        }

        if (issues.length > 0) {
          attentionStores.push({
            store,
            stats,
            issues
          });
        }
      }

      return attentionStores;
    } catch (error) {
      this.handleError('getStoresRequiringAttention', error);
      return [];
    }
  }

  /**
   * Update store information
   */
  async updateStore(storeId: string, updateData: UpdateStoreData): Promise<Store | null> {
    try {
      // If updating name, check for duplicates
      if (updateData.name) {
        const existingStore = await this.findOneBy('name', updateData.name);
        if (existingStore && existingStore.id !== storeId) {
          throw new Error('Store name already exists');
        }
      }

      return await this.update(storeId, updateData);
    } catch (error) {
      this.handleError('updateStore', error, { storeId, updateData });
      return null;
    }
  }

  /**
   * Activate/Deactivate store
   */
  async setStoreStatus(storeId: string, status: 'active' | 'inactive'): Promise<Store | null> {
    try {
      return await this.update(storeId, { status });
    } catch (error) {
      this.handleError('setStoreStatus', error, { storeId, status });
      return null;
    }
  }

  /**
   * Get system-wide store statistics
   */
  async getSystemStats() {
    try {
      const stores = await this.getActiveStores();
      
      let totalUsers = 0;
      let totalLockers = 0;
      let totalOccupiedLockers = 0;
      let totalPendingApplications = 0;

      stores.forEach(store => {
        totalUsers += store.users?.length || 0;
        totalLockers += store.lockers?.length || 0;
        totalOccupiedLockers += store.lockers?.filter(l => l.status === 'occupied').length || 0;
        totalPendingApplications += store.applications?.filter(a => a.status === 'pending').length || 0;
      });

      return {
        totalStores: stores.length,
        totalUsers,
        totalLockers,
        totalOccupiedLockers,
        totalAvailableLockers: totalLockers - totalOccupiedLockers,
        totalPendingApplications,
        systemUtilizationRate: totalLockers > 0 ? (totalOccupiedLockers / totalLockers) * 100 : 0
      };
    } catch (error) {
      this.handleError('getSystemStats', error);
      return {
        totalStores: 0,
        totalUsers: 0,
        totalLockers: 0,
        totalOccupiedLockers: 0,
        totalAvailableLockers: 0,
        totalPendingApplications: 0,
        systemUtilizationRate: 0
      };
    }
  }

  /**
   * Find stores by name (for autocomplete/search)
   */
  async findStoresByName(nameQuery: string, limit = 10): Promise<Store[]> {
    try {
      return await this.createQuery()
        .whereILike('name', `%${nameQuery}%`)
        .where('status', 'active')
        .orderBy('name', 'asc')
        .limit(limit) as Store[];
    } catch (error) {
      this.handleError('findStoresByName', error, { nameQuery, limit });
      return [];
    }
  }
}