/**
 * Locker Repository - 杆柜数据访问层
 * Handles all locker-related database operations
 */

import { BaseRepository, SearchResult, PaginationOptions } from './BaseRepository';
import { Locker } from '../models/Locker';

export interface CreateLockerData {
  storeId: string;
  number: string;
  status?: 'available' | 'occupied' | 'maintenance';
}

export interface UpdateLockerData {
  number?: string;
  status?: 'available' | 'occupied' | 'maintenance';
  currentUserId?: string | null;
  assignedAt?: string | null;
}

export interface LockerSearchFilters {
  storeId?: string;
  status?: 'available' | 'occupied' | 'maintenance';
  currentUserId?: string;
  number?: string;
}

export interface LockerAssignmentData {
  userId: string;
  notes?: string;
}

export class LockerRepository extends BaseRepository<Locker> {
  constructor() {
    super(Locker);
  }

  /**
   * Create new locker with validation
   */
  async createLocker(lockerData: CreateLockerData): Promise<Locker | null> {
    try {
      // Check if locker number already exists in the store
      const existingLocker = await this.findOneBy('number', lockerData.number);
      if (existingLocker && existingLocker.storeId === lockerData.storeId) {
        throw new Error('Locker number already exists in this store');
      }

      return await this.create({
        ...lockerData,
        status: lockerData.status || 'available'
      });
    } catch (error) {
      this.handleError('createLocker', error, lockerData);
      return null;
    }
  }

  /**
   * Find locker with full details
   */
  async findLockerWithDetails(lockerId: string): Promise<Locker | null> {
    try {
      return await this.findByIdWithRelations(lockerId, [
        'store',
        'currentUser',
        'records(orderByNewest).user',
        'applications'
      ]);
    } catch (error) {
      this.handleError('findLockerWithDetails', error, { lockerId });
      return null;
    }
  }

  /**
   * Find lockers by store
   */
  async findByStore(storeId: string, status?: 'available' | 'occupied' | 'maintenance'): Promise<Locker[]> {
    try {
      const conditions: any = { storeId };
      
      if (status) {
        conditions.status = status;
      }

      return await this.findWhere(conditions, {
        sort: { field: 'number', direction: 'asc' },
        relations: ['currentUser']
      });
    } catch (error) {
      this.handleError('findByStore', error, { storeId, status });
      return [];
    }
  }

  /**
   * Find available lockers in store
   */
  async findAvailableInStore(storeId: string, limit?: number): Promise<Locker[]> {
    try {
      const options: any = {
        sort: { field: 'number', direction: 'asc' }
      };

      if (limit) {
        options.limit = limit;
      }

      return await this.findWhere(
        { storeId, status: 'available' },
        options
      );
    } catch (error) {
      this.handleError('findAvailableInStore', error, { storeId, limit });
      return [];
    }
  }

  /**
   * Find occupied lockers in store
   */
  async findOccupiedInStore(storeId: string): Promise<Locker[]> {
    try {
      return await this.findWhere({ storeId, status: 'occupied' }, {
        sort: { field: 'number', direction: 'asc' },
        relations: ['currentUser', 'store']
      });
    } catch (error) {
      this.handleError('findOccupiedInStore', error, { storeId });
      return [];
    }
  }

  /**
   * Search lockers with filters and pagination
   */
  async searchLockers(
    filters: LockerSearchFilters,
    pagination: PaginationOptions
  ): Promise<SearchResult<Locker>> {
    try {
      let query = this.createQuery();

      // Apply filters
      if (filters.storeId) {
        query = query.where('store_id', filters.storeId);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.currentUserId) {
        query = query.where('current_user_id', filters.currentUserId);
      }

      if (filters.number) {
        query = query.whereILike('number', `%${filters.number}%`);
      }

      // Add relations
      query = query.withGraphFetched('[store, currentUser, records(orderByNewest).limit(5)]');

      // Apply pagination
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 20, 100);

      const result = await query
        .orderBy('number', 'asc')
        .page(page - 1, pageSize);

      return {
        data: result.results as Locker[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('searchLockers', error, { filters, pagination });
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
   * Assign locker to user
   */
  async assignLocker(lockerId: string, assignmentData: LockerAssignmentData): Promise<Locker | null> {
    try {
      const locker = await this.findById(lockerId);
      if (!locker) {
        throw new Error('Locker not found');
      }

      if (locker.status !== 'available') {
        throw new Error('Locker is not available for assignment');
      }

      // Update locker status
      const updatedLocker = await this.update(lockerId, {
        status: 'occupied',
        currentUserId: assignmentData.userId,
        assignedAt: new Date().toISOString()
      });

      // Create assignment record
      if (updatedLocker) {
        const LockerRecord = require('../models/LockerRecord').LockerRecord;
        await LockerRecord.query().insert({
          userId: assignmentData.userId,
          lockerId,
          action: 'assigned',
          notes: assignmentData.notes
        });
      }

      return updatedLocker;
    } catch (error) {
      this.handleError('assignLocker', error, { lockerId, assignmentData });
      return null;
    }
  }

  /**
   * Release locker from user
   */
  async releaseLocker(lockerId: string, notes?: string): Promise<Locker | null> {
    try {
      const locker = await this.findById(lockerId);
      if (!locker) {
        throw new Error('Locker not found');
      }

      if (locker.status !== 'occupied' || !locker.currentUserId) {
        throw new Error('Locker is not currently assigned');
      }

      const userId = locker.currentUserId;

      // Update locker status
      const updatedLocker = await this.update(lockerId, {
        status: 'available',
        currentUserId: null,
        assignedAt: null
      });

      // Create release record
      if (updatedLocker) {
        const LockerRecord = require('../models/LockerRecord').LockerRecord;
        await LockerRecord.query().insert({
          userId,
          lockerId,
          action: 'released',
          notes
        });
      }

      return updatedLocker;
    } catch (error) {
      this.handleError('releaseLocker', error, { lockerId, notes });
      return null;
    }
  }

  /**
   * Set locker to maintenance mode
   */
  async setMaintenance(lockerId: string, notes?: string): Promise<Locker | null> {
    try {
      const locker = await this.findById(lockerId);
      if (!locker) {
        throw new Error('Locker not found');
      }

      const previousUserId = locker.currentUserId;

      // Update locker status
      const updatedLocker = await this.update(lockerId, {
        status: 'maintenance',
        currentUserId: null,
        assignedAt: null
      });

      // Create maintenance record if user was assigned
      if (updatedLocker && previousUserId) {
        const LockerRecord = require('../models/LockerRecord').LockerRecord;
        await LockerRecord.query().insert({
          userId: previousUserId,
          lockerId,
          action: 'released',
          notes: `Maintenance: ${notes || 'Locker taken offline for maintenance'}`
        });
      }

      return updatedLocker;
    } catch (error) {
      this.handleError('setMaintenance', error, { lockerId, notes });
      return null;
    }
  }

  /**
   * Return locker to service from maintenance
   */
  async returnToService(lockerId: string, notes?: string): Promise<Locker | null> {
    try {
      const locker = await this.findById(lockerId);
      if (!locker) {
        throw new Error('Locker not found');
      }

      if (locker.status !== 'maintenance') {
        throw new Error('Locker is not in maintenance mode');
      }

      return await this.update(lockerId, {
        status: 'available'
      });
    } catch (error) {
      this.handleError('returnToService', error, { lockerId, notes });
      return null;
    }
  }

  /**
   * Record locker usage (store/retrieve)
   */
  async recordUsage(
    lockerId: string, 
    action: 'store' | 'retrieve', 
    notes?: string
  ): Promise<boolean> {
    try {
      const locker = await this.findById(lockerId);
      if (!locker || locker.status !== 'occupied' || !locker.currentUserId) {
        throw new Error('Cannot record usage for unassigned locker');
      }

      const LockerRecord = require('../models/LockerRecord').LockerRecord;
      const record = await LockerRecord.query().insert({
        userId: locker.currentUserId,
        lockerId,
        action,
        notes
      });

      return !!record;
    } catch (error) {
      this.handleError('recordUsage', error, { lockerId, action, notes });
      return false;
    }
  }

  /**
   * Get locker statistics for a store
   */
  async getStoreLockerStats(storeId: string) {
    try {
      const lockers = await this.findByStore(storeId);

      const stats = {
        total: lockers.length,
        available: lockers.filter(l => l.status === 'available').length,
        occupied: lockers.filter(l => l.status === 'occupied').length,
        maintenance: lockers.filter(l => l.status === 'maintenance').length,
        utilizationRate: 0
      };

      if (stats.total > 0) {
        stats.utilizationRate = (stats.occupied / stats.total) * 100;
      }

      return stats;
    } catch (error) {
      this.handleError('getStoreLockerStats', error, { storeId });
      return {
        total: 0,
        available: 0,
        occupied: 0,
        maintenance: 0,
        utilizationRate: 0
      };
    }
  }

  /**
   * Get locker usage analytics
   */
  async getLockerUsageAnalytics(lockerId: string, days = 30) {
    try {
      const locker = await this.findLockerWithDetails(lockerId);
      if (!locker) {
        return null;
      }

      const LockerRecord = require('../models/LockerRecord').LockerRecord;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await LockerRecord.query()
        .where('locker_id', lockerId)
        .where('created_at', '>=', startDate.toISOString())
        .orderBy('created_at', 'desc');

      const analytics = {
        locker: {
          id: locker.id,
          number: locker.number,
          status: locker.status,
          store: locker.store?.name
        },
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        },
        usage: {
          totalRecords: records.length,
          storeActions: records.filter(r => r.action === 'store').length,
          retrieveActions: records.filter(r => r.action === 'retrieve').length,
          assignments: records.filter(r => r.action === 'assigned').length,
          releases: records.filter(r => r.action === 'released').length,
          uniqueUsers: new Set(records.map(r => r.userId)).size
        },
        currentUser: locker.currentUser ? {
          id: locker.currentUser.id,
          name: locker.currentUser.name,
          phone: locker.currentUser.phone,
          assignedSince: locker.assignedAt
        } : null
      };

      return analytics;
    } catch (error) {
      this.handleError('getLockerUsageAnalytics', error, { lockerId, days });
      return null;
    }
  }

  /**
   * Find lockers requiring attention (long-term assignments, maintenance, etc.)
   */
  async findLockersRequiringAttention(storeId?: string) {
    try {
      let query = this.createQuery().withGraphFetched('[store, currentUser]');
      
      if (storeId) {
        query = query.where('store_id', storeId);
      }

      const lockers = await query as Locker[];
      const attentionLockers = [];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      for (const locker of lockers) {
        const issues = [];

        // Locker in maintenance
        if (locker.status === 'maintenance') {
          issues.push('Under maintenance');
        }

        // Long-term assignment (>30 days)
        if (locker.status === 'occupied' && locker.assignedAt) {
          const assignedDate = new Date(locker.assignedAt);
          if (assignedDate < thirtyDaysAgo) {
            const daysSinceAssigned = Math.floor((now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
            issues.push(`Long-term assignment (${daysSinceAssigned} days)`);
          }
        }

        if (issues.length > 0) {
          attentionLockers.push({
            locker,
            issues
          });
        }
      }

      return attentionLockers;
    } catch (error) {
      this.handleError('findLockersRequiringAttention', error, { storeId });
      return [];
    }
  }

  /**
   * Bulk create lockers for a store
   */
  async bulkCreateLockers(storeId: string, startNumber: number, count: number): Promise<Locker[]> {
    try {
      const lockerData = [];
      
      for (let i = 0; i < count; i++) {
        const number = (startNumber + i).toString().padStart(2, '0');
        lockerData.push({
          storeId,
          number,
          status: 'available' as const
        });
      }

      // Check for existing locker numbers
      const existingNumbers = await this.createQuery()
        .where('store_id', storeId)
        .whereIn('number', lockerData.map(l => l.number))
        .select('number');

      if (existingNumbers.length > 0) {
        const existingNumbersList = existingNumbers.map(l => l.number).join(', ');
        throw new Error(`Locker numbers already exist: ${existingNumbersList}`);
      }

      return await this.bulkCreate(lockerData);
    } catch (error) {
      this.handleError('bulkCreateLockers', error, { storeId, startNumber, count });
      return [];
    }
  }

  /**
   * Update locker number
   */
  async updateLockerNumber(lockerId: string, newNumber: string): Promise<Locker | null> {
    try {
      const locker = await this.findById(lockerId);
      if (!locker) {
        throw new Error('Locker not found');
      }

      // Check if new number already exists in the store
      const existingLocker = await this.findWhere({
        storeId: locker.storeId,
        number: newNumber
      });

      if (existingLocker.length > 0 && existingLocker[0].id !== lockerId) {
        throw new Error('Locker number already exists in this store');
      }

      return await this.update(lockerId, { number: newNumber });
    } catch (error) {
      this.handleError('updateLockerNumber', error, { lockerId, newNumber });
      return null;
    }
  }

  /**
   * Get system-wide locker statistics
   */
  async getSystemLockerStats() {
    try {
      const [
        total,
        available,
        occupied,
        maintenance
      ] = await Promise.all([
        this.count(),
        this.count({ status: 'available' }),
        this.count({ status: 'occupied' }),
        this.count({ status: 'maintenance' })
      ]);

      return {
        total,
        available,
        occupied,
        maintenance,
        utilizationRate: total > 0 ? (occupied / total) * 100 : 0
      };
    } catch (error) {
      this.handleError('getSystemLockerStats', error);
      return {
        total: 0,
        available: 0,
        occupied: 0,
        maintenance: 0,
        utilizationRate: 0
      };
    }
  }
}