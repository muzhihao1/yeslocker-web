/**
 * LockerRecord Model - 使用记录实体
 * Manages locker usage history and activity tracking
 */

import { Model, RelationMappings } from 'objection';
import { BaseModel } from './BaseModel';

export class LockerRecord extends BaseModel {
  static tableName = 'locker_records';

  // Record properties
  userId!: string;
  lockerId!: string;
  action!: 'assigned' | 'store' | 'retrieve' | 'released';
  notes?: string;

  // Navigation properties
  user?: User;
  locker?: Locker;

  /**
   * JSON Schema for validation
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'lockerId', 'action'],
      properties: {
        ...this.commonJsonSchema.properties,
        userId: { type: 'string', format: 'uuid' },
        lockerId: { type: 'string', format: 'uuid' },
        action: { 
          type: 'string', 
          enum: ['assigned', 'store', 'retrieve', 'released']
        },
        notes: { type: ['string', 'null'], maxLength: 1000 }
      }
    };
  }

  /**
   * Define relationships with other models
   */
  static get relationMappings(): RelationMappings {
    const User = require('./User').User;
    const Locker = require('./Locker').Locker;

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'locker_records.user_id',
          to: 'users.id'
        }
      },

      locker: {
        relation: Model.BelongsToOneRelation,
        modelClass: Locker,
        join: {
          from: 'locker_records.locker_id',
          to: 'lockers.id'
        }
      }
    };
  }

  /**
   * Record-specific query modifiers
   */
  static get modifiers() {
    return {
      ...super.modifiers,
      
      byUser(builder: any, userId: string) {
        builder.where('user_id', userId);
      },

      byLocker(builder: any, lockerId: string) {
        builder.where('locker_id', lockerId);
      },

      byAction(builder: any, action: 'assigned' | 'store' | 'retrieve' | 'released') {
        builder.where('action', action);
      },

      assignments(builder: any) {
        builder.where('action', 'assigned');
      },

      releases(builder: any) {
        builder.where('action', 'released');
      },

      storage(builder: any) {
        builder.where('action', 'store');
      },

      retrieval(builder: any) {
        builder.where('action', 'retrieve');
      },

      usage(builder: any) {
        builder.whereIn('action', ['store', 'retrieve']);
      },

      withUser(builder: any) {
        builder.withGraphFetched('user');
      },

      withLocker(builder: any) {
        builder.withGraphFetched('locker.store');
      },

      withFullDetails(builder: any) {
        builder.withGraphFetched('[user, locker.store]');
      },

      recentFirst(builder: any) {
        builder.orderBy('created_at', 'desc');
      },

      byDateRange(builder: any, startDate: string, endDate: string) {
        builder.whereBetween('created_at', [startDate, endDate]);
      },

      today(builder: any) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        builder.whereBetween('created_at', [
          startOfDay.toISOString(),
          endOfDay.toISOString()
        ]);
      },

      thisWeek(builder: any) {
        const now = new Date();
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        builder.where('created_at', '>=', startOfWeek.toISOString());
      },

      thisMonth(builder: any) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        builder.where('created_at', '>=', startOfMonth.toISOString());
      }
    };
  }

  /**
   * Override toJSON to include computed properties
   */
  toJSON() {
    const json = super.toJSON();
    
    // Add action type indicators
    json.isAssignment = this.action === 'assigned';
    json.isRelease = this.action === 'released';
    json.isStore = this.action === 'store';
    json.isRetrieve = this.action === 'retrieve';
    json.isUsage = ['store', 'retrieve'].includes(this.action);
    
    // Add human-readable action descriptions
    const actionDescriptions = {
      assigned: '分配杆柜',
      store: '存放球杆',
      retrieve: '取出球杆',
      released: '释放杆柜'
    };
    json.actionDescription = actionDescriptions[this.action];

    // User information (if populated)
    if (this.user) {
      json.userName = this.user.name;
      json.userPhone = this.user.phone;
    }

    // Locker information (if populated)
    if (this.locker) {
      json.lockerNumber = this.locker.number;
      if (this.locker.store) {
        json.storeName = this.locker.store.name;
      }
    }

    // Time formatting
    json.formattedTime = new Date(this.created_at).toLocaleString('zh-CN');

    return json;
  }

  /**
   * Static methods for record analysis
   */
  static async getUserUsageStats(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await this.query()
      .modify('byUser', userId)
      .where('created_at', '>=', startDate.toISOString())
      .orderBy('created_at', 'desc');

    const stats = {
      totalRecords: records.length,
      storeActions: records.filter(r => r.action === 'store').length,
      retrieveActions: records.filter(r => r.action === 'retrieve').length,
      assignments: records.filter(r => r.action === 'assigned').length,
      releases: records.filter(r => r.action === 'released').length,
      activeDays: new Set(records.map(r => 
        new Date(r.created_at).toDateString()
      )).size,
      uniqueLockers: new Set(records.map(r => r.lockerId)).size
    };

    return stats;
  }

  static async getLockerUsageStats(lockerId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await this.query()
      .modify('byLocker', lockerId)
      .where('created_at', '>=', startDate.toISOString())
      .orderBy('created_at', 'desc');

    const stats = {
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
  }

  static async getStoreUsageStats(storeId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await this.query()
      .withGraphFetched('locker')
      .where('created_at', '>=', startDate.toISOString())
      .where('locker.store_id', storeId);

    const stats = {
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
  }

  static async getDailyUsagePattern(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await this.query()
      .where('created_at', '>=', startDate.toISOString())
      .modify('usage'); // Only store and retrieve actions

    // Group by hour of day
    const hourlyPattern = Array(24).fill(0);
    records.forEach(record => {
      const hour = new Date(record.created_at).getHours();
      hourlyPattern[hour]++;
    });

    // Group by day of week
    const weeklyPattern = Array(7).fill(0);
    records.forEach(record => {
      const dayOfWeek = new Date(record.created_at).getDay();
      weeklyPattern[dayOfWeek]++;
    });

    return {
      hourlyPattern,
      weeklyPattern,
      totalUsage: records.length
    };
  }

  static async getUserActivity(userId: string, limit = 50) {
    return this.query()
      .modify('byUser', userId)
      .modify('recentFirst')
      .limit(limit)
      .modify('withLocker');
  }

  static async getLockerActivity(lockerId: string, limit = 50) {
    return this.query()
      .modify('byLocker', lockerId)
      .modify('recentFirst')
      .limit(limit)
      .modify('withUser');
  }

  static async getRecentActivity(limit = 100) {
    return this.query()
      .modify('recentFirst')
      .limit(limit)
      .modify('withFullDetails');
  }

  static async createUsageRecord(
    userId: string, 
    lockerId: string, 
    action: 'assigned' | 'store' | 'retrieve' | 'released',
    notes?: string
  ) {
    return this.query().insert({
      userId,
      lockerId,
      action,
      notes
    });
  }

  /**
   * Instance methods
   */
  getTimeSinceAction(): number {
    return new Date().getTime() - new Date(this.created_at).getTime();
  }

  isRecent(minutes = 30): boolean {
    const timeDiff = this.getTimeSinceAction();
    return timeDiff <= (minutes * 60 * 1000);
  }
}

// Import types for TypeScript (avoid circular import issues)
import type { User } from './User';
import type { Locker } from './Locker';