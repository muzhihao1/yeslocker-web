/**
 * LockerRecord Repository - 使用记录数据访问层
 * Handles all locker usage record database operations
 */

import { BaseRepository, SearchResult, PaginationOptions } from './BaseRepository';
import { LockerRecord } from '../models/LockerRecord';

export interface CreateRecordData {
  userId: string;
  lockerId: string;
  action: 'assigned' | 'store' | 'retrieve' | 'released';
  notes?: string;
}

export interface RecordSearchFilters {
  userId?: string;
  lockerId?: string;
  storeId?: string;
  action?: 'assigned' | 'store' | 'retrieve' | 'released';
  dateFrom?: string;
  dateTo?: string;
}

export interface UsageStats {
  totalRecords: number;
  storeActions: number;
  retrieveActions: number;
  assignments: number;
  releases: number;
  uniqueUsers?: number;
  uniqueLockers?: number;
  activeDays: number;
}

export class LockerRecordRepository extends BaseRepository<LockerRecord> {
  constructor() {
    super(LockerRecord);
  }

  /**
   * Create new usage record
   */
  async createRecord(recordData: CreateRecordData): Promise<LockerRecord | null> {
    try {
      return await this.create(recordData);
    } catch (error) {
      this.handleError('createRecord', error, recordData);
      return null;
    }
  }

  /**
   * Find records by user
   */
  async findByUser(userId: string, limit?: number): Promise<LockerRecord[]> {
    try {
      const options: any = {
        sort: { field: 'created_at', direction: 'desc' },
        relations: ['locker.store']
      };

      if (limit) {
        options.limit = limit;
      }

      return await this.findWhere({ userId }, options);
    } catch (error) {
      this.handleError('findByUser', error, { userId, limit });
      return [];
    }
  }

  /**
   * Find records by locker
   */
  async findByLocker(lockerId: string, limit?: number): Promise<LockerRecord[]> {
    try {
      const options: any = {
        sort: { field: 'created_at', direction: 'desc' },
        relations: ['user']
      };

      if (limit) {
        options.limit = limit;
      }

      return await this.findWhere({ lockerId }, options);
    } catch (error) {
      this.handleError('findByLocker', error, { lockerId, limit });
      return [];
    }
  }

  /**
   * Find records by store
   */
  async findByStore(storeId: string, limit?: number): Promise<LockerRecord[]> {
    try {
      let query = this.createQuery()
        .withGraphFetched('[user, locker]')
        .whereExists(
          LockerRecord.relatedQuery('locker').where('store_id', storeId)
        )
        .orderBy('created_at', 'desc');

      if (limit) {
        query = query.limit(limit);
      }

      return await query as LockerRecord[];
    } catch (error) {
      this.handleError('findByStore', error, { storeId, limit });
      return [];
    }
  }

  /**
   * Search records with filters and pagination
   */
  async searchRecords(
    filters: RecordSearchFilters,
    pagination: PaginationOptions
  ): Promise<SearchResult<LockerRecord>> {
    try {
      let query = this.createQuery();

      // Apply filters
      if (filters.userId) {
        query = query.where('user_id', filters.userId);
      }

      if (filters.lockerId) {
        query = query.where('locker_id', filters.lockerId);
      }

      if (filters.storeId) {
        query = query.whereExists(
          LockerRecord.relatedQuery('locker').where('store_id', filters.storeId)
        );
      }

      if (filters.action) {
        query = query.where('action', filters.action);
      }

      if (filters.dateFrom) {
        query = query.where('created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('created_at', '<=', filters.dateTo);
      }

      // Add relations
      query = query.withGraphFetched('[user, locker.store]');

      // Apply pagination
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 50, 100);

      const result = await query
        .orderBy('created_at', 'desc')
        .page(page - 1, pageSize);

      return {
        data: result.results as LockerRecord[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('searchRecords', error, { filters, pagination });
      return {
        data: [],
        total: 0,
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 50,
        totalPages: 0
      };
    }
  }

  /**
   * Get user usage statistics
   */
  async getUserUsageStats(userId: string, days = 30): Promise<UsageStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await this.findWhere({
        userId
      }, {
        sort: { field: 'created_at', direction: 'desc' }
      }).then(records => 
        records.filter(r => new Date(r.created_at) >= startDate)
      );

      const stats: UsageStats = {
        totalRecords: records.length,
        storeActions: records.filter(r => r.action === 'store').length,
        retrieveActions: records.filter(r => r.action === 'retrieve').length,
        assignments: records.filter(r => r.action === 'assigned').length,
        releases: records.filter(r => r.action === 'released').length,
        uniqueLockers: new Set(records.map(r => r.lockerId)).size,
        activeDays: new Set(records.map(r => 
          new Date(r.created_at).toDateString()
        )).size
      };

      return stats;
    } catch (error) {
      this.handleError('getUserUsageStats', error, { userId, days });
      return {
        totalRecords: 0,
        storeActions: 0,
        retrieveActions: 0,
        assignments: 0,
        releases: 0,
        uniqueLockers: 0,
        activeDays: 0
      };
    }
  }

  /**
   * Get locker usage statistics
   */
  async getLockerUsageStats(lockerId: string, days = 30): Promise<UsageStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await this.findWhere({
        lockerId
      }, {
        sort: { field: 'created_at', direction: 'desc' }
      }).then(records => 
        records.filter(r => new Date(r.created_at) >= startDate)
      );

      const stats: UsageStats = {
        totalRecords: records.length,
        storeActions: records.filter(r => r.action === 'store').length,
        retrieveActions: records.filter(r => r.action === 'retrieve').length,
        assignments: records.filter(r => r.action === 'assigned').length,
        releases: records.filter(r => r.action === 'released').length,
        uniqueUsers: new Set(records.map(r => r.userId)).size,
        activeDays: new Set(records.map(r => 
          new Date(r.created_at).toDateString()
        )).size
      };

      return stats;
    } catch (error) {
      this.handleError('getLockerUsageStats', error, { lockerId, days });
      return {
        totalRecords: 0,
        storeActions: 0,
        retrieveActions: 0,
        assignments: 0,
        releases: 0,
        uniqueUsers: 0,
        activeDays: 0
      };
    }
  }

  /**
   * Get store usage statistics
   */
  async getStoreUsageStats(storeId: string, days = 30): Promise<UsageStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await this.createQuery()
        .withGraphFetched('locker')
        .where('created_at', '>=', startDate.toISOString())
        .whereExists(
          LockerRecord.relatedQuery('locker').where('store_id', storeId)
        ) as LockerRecord[];

      const stats: UsageStats = {
        totalRecords: records.length,
        storeActions: records.filter(r => r.action === 'store').length,
        retrieveActions: records.filter(r => r.action === 'retrieve').length,
        assignments: records.filter(r => r.action === 'assigned').length,
        releases: records.filter(r => r.action === 'released').length,
        uniqueUsers: new Set(records.map(r => r.userId)).size,
        uniqueLockers: new Set(records.map(r => r.lockerId)).size,
        activeDays: new Set(records.map(r => 
          new Date(r.created_at).toDateString()
        )).size
      };

      return stats;
    } catch (error) {
      this.handleError('getStoreUsageStats', error, { storeId, days });
      return {
        totalRecords: 0,
        storeActions: 0,
        retrieveActions: 0,
        assignments: 0,
        releases: 0,
        uniqueUsers: 0,
        uniqueLockers: 0,
        activeDays: 0
      };
    }
  }

  /**
   * Get daily usage pattern analysis
   */
  async getDailyUsagePattern(storeId?: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = this.createQuery()
        .where('created_at', '>=', startDate.toISOString())
        .whereIn('action', ['store', 'retrieve']);

      if (storeId) {
        query = query.whereExists(
          LockerRecord.relatedQuery('locker').where('store_id', storeId)
        );
      }

      const records = await query as LockerRecord[];

      // Group by hour of day (0-23)
      const hourlyPattern = Array(24).fill(0);
      records.forEach(record => {
        const hour = new Date(record.created_at).getHours();
        hourlyPattern[hour]++;
      });

      // Group by day of week (0=Sunday, 6=Saturday)
      const weeklyPattern = Array(7).fill(0);
      records.forEach(record => {
        const dayOfWeek = new Date(record.created_at).getDay();
        weeklyPattern[dayOfWeek]++;
      });

      // Group by date for daily trend
      const dailyStats: Record<string, number> = {};
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        dailyStats[dateKey] = 0;
      }

      records.forEach(record => {
        const dateKey = record.created_at.split('T')[0];
        if (dailyStats[dateKey] !== undefined) {
          dailyStats[dateKey]++;
        }
      });

      return {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        },
        patterns: {
          hourly: hourlyPattern,
          weekly: weeklyPattern,
          daily: dailyStats
        },
        summary: {
          totalUsage: records.length,
          peakHour: hourlyPattern.indexOf(Math.max(...hourlyPattern)),
          peakDay: weeklyPattern.indexOf(Math.max(...weeklyPattern))
        }
      };
    } catch (error) {
      this.handleError('getDailyUsagePattern', error, { storeId, days });
      return null;
    }
  }

  /**
   * Get recent activity across system or store
   */
  async getRecentActivity(storeId?: string, limit = 100): Promise<LockerRecord[]> {
    try {
      let query = this.createQuery()
        .withGraphFetched('[user, locker.store]')
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (storeId) {
        query = query.whereExists(
          LockerRecord.relatedQuery('locker').where('store_id', storeId)
        );
      }

      return await query as LockerRecord[];
    } catch (error) {
      this.handleError('getRecentActivity', error, { storeId, limit });
      return [];
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId: string, limit = 50): Promise<LockerRecord[]> {
    try {
      return await this.findByUser(userId, limit);
    } catch (error) {
      this.handleError('getUserActivity', error, { userId, limit });
      return [];
    }
  }

  /**
   * Get locker activity history
   */
  async getLockerActivity(lockerId: string, limit = 50): Promise<LockerRecord[]> {
    try {
      return await this.findByLocker(lockerId, limit);
    } catch (error) {
      this.handleError('getLockerActivity', error, { lockerId, limit });
      return [];
    }
  }

  /**
   * Find usage sessions (pairs of store/retrieve actions)
   */
  async findUsageSessions(userId: string, lockerId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await this.findWhere({
        userId,
        lockerId
      }, {
        sort: { field: 'created_at', direction: 'asc' }
      }).then(records => 
        records.filter(r => 
          new Date(r.created_at) >= startDate && 
          ['store', 'retrieve'].includes(r.action)
        )
      );

      // Group store/retrieve pairs into sessions
      const sessions = [];
      let currentSession: { store?: LockerRecord; retrieve?: LockerRecord; duration?: number } = {};

      for (const record of records) {
        if (record.action === 'store') {
          // Start new session
          if (currentSession.store) {
            // Previous session was incomplete (no retrieve)
            sessions.push(currentSession);
          }
          currentSession = { store: record };
        } else if (record.action === 'retrieve' && currentSession.store) {
          // Complete current session
          currentSession.retrieve = record;
          currentSession.duration = new Date(record.created_at).getTime() - 
                                   new Date(currentSession.store.created_at).getTime();
          sessions.push(currentSession);
          currentSession = {};
        }
      }

      // Add incomplete session if exists
      if (currentSession.store) {
        sessions.push(currentSession);
      }

      return sessions;
    } catch (error) {
      this.handleError('findUsageSessions', error, { userId, lockerId, days });
      return [];
    }
  }

  /**
   * Get top active users by usage
   */
  async getTopActiveUsers(storeId?: string, days = 30, limit = 10) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = this.createQuery()
        .where('created_at', '>=', startDate.toISOString())
        .whereIn('action', ['store', 'retrieve'])
        .withGraphFetched('user');

      if (storeId) {
        query = query.whereExists(
          LockerRecord.relatedQuery('locker').where('store_id', storeId)
        );
      }

      const records = await query as LockerRecord[];

      // Group by user and count usage
      const userUsage: Record<string, { user: any; count: number; lastUsage: string }> = {};

      records.forEach(record => {
        if (record.user) {
          const userId = record.user.id;
          if (!userUsage[userId]) {
            userUsage[userId] = {
              user: record.user,
              count: 0,
              lastUsage: record.created_at
            };
          }
          userUsage[userId].count++;
          if (record.created_at > userUsage[userId].lastUsage) {
            userUsage[userId].lastUsage = record.created_at;
          }
        }
      });

      // Sort by usage count and return top users
      return Object.values(userUsage)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      this.handleError('getTopActiveUsers', error, { storeId, days, limit });
      return [];
    }
  }

  /**
   * Get most used lockers
   */
  async getMostUsedLockers(storeId?: string, days = 30, limit = 10) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = this.createQuery()
        .where('created_at', '>=', startDate.toISOString())
        .whereIn('action', ['store', 'retrieve'])
        .withGraphFetched('locker.store');

      if (storeId) {
        query = query.whereExists(
          LockerRecord.relatedQuery('locker').where('store_id', storeId)
        );
      }

      const records = await query as LockerRecord[];

      // Group by locker and count usage
      const lockerUsage: Record<string, { locker: any; count: number; lastUsage: string }> = {};

      records.forEach(record => {
        if (record.locker) {
          const lockerId = record.locker.id;
          if (!lockerUsage[lockerId]) {
            lockerUsage[lockerId] = {
              locker: record.locker,
              count: 0,
              lastUsage: record.created_at
            };
          }
          lockerUsage[lockerId].count++;
          if (record.created_at > lockerUsage[lockerId].lastUsage) {
            lockerUsage[lockerId].lastUsage = record.created_at;
          }
        }
      });

      // Sort by usage count and return top lockers
      return Object.values(lockerUsage)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      this.handleError('getMostUsedLockers', error, { storeId, days, limit });
      return [];
    }
  }

  /**
   * Create bulk records (for data migration or batch operations)
   */
  async createBulkRecords(records: CreateRecordData[]): Promise<LockerRecord[]> {
    try {
      return await this.bulkCreate(records);
    } catch (error) {
      this.handleError('createBulkRecords', error, { count: records.length });
      return [];
    }
  }

  /**
   * Clean up old records (data retention policy)
   */
  async cleanupOldRecords(olderThanDays = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const deletedCount = await this.createQuery()
        .where('created_at', '<', cutoffDate.toISOString())
        .del();

      return deletedCount;
    } catch (error) {
      this.handleError('cleanupOldRecords', error, { olderThanDays });
      return 0;
    }
  }

  /**
   * Export usage data for reporting
   */
  async exportUsageData(filters: RecordSearchFilters, format: 'json' | 'csv' = 'json') {
    try {
      const records = await this.searchRecords(filters, { page: 1, pageSize: 10000 });
      
      if (format === 'csv') {
        // Convert to CSV format
        const headers = ['Date', 'User', 'Locker', 'Store', 'Action', 'Notes'];
        const csvData = records.data.map(record => [
          record.created_at,
          record.user?.name || '',
          record.locker?.number || '',
          record.locker?.store?.name || '',
          record.action,
          record.notes || ''
        ]);

        return {
          headers,
          data: csvData,
          total: records.total
        };
      }

      return records;
    } catch (error) {
      this.handleError('exportUsageData', error, { filters, format });
      return null;
    }
  }
}