/**
 * Locker Model - 杆柜实体
 * Manages individual locker units and their status
 */

import { Model, RelationMappings } from 'objection';
import { BaseModel } from './BaseModel';

export class Locker extends BaseModel {
  static tableName = 'lockers';

  // Locker properties
  storeId!: string;
  number!: string;
  status!: 'available' | 'occupied' | 'maintenance';
  currentUserId?: string;
  assignedAt?: string;

  // Navigation properties
  store?: Store;
  currentUser?: User;
  records?: LockerRecord[];
  applications?: Application[];

  /**
   * JSON Schema for validation
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['storeId', 'number'],
      properties: {
        ...this.commonJsonSchema.properties,
        storeId: { type: 'string', format: 'uuid' },
        number: { type: 'string', minLength: 1, maxLength: 10 },
        status: { 
          type: 'string', 
          enum: ['available', 'occupied', 'maintenance'], 
          default: 'available' 
        },
        currentUserId: { type: ['string', 'null'], format: 'uuid' },
        assignedAt: { type: ['string', 'null'], format: 'date-time' }
      }
    };
  }

  /**
   * Define relationships with other models
   */
  static get relationMappings(): RelationMappings {
    const Store = require('./Store').Store;
    const User = require('./User').User;
    const LockerRecord = require('./LockerRecord').LockerRecord;
    const Application = require('./Application').Application;

    return {
      store: {
        relation: Model.BelongsToOneRelation,
        modelClass: Store,
        join: {
          from: 'lockers.store_id',
          to: 'stores.id'
        }
      },

      currentUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'lockers.current_user_id',
          to: 'users.id'
        }
      },

      records: {
        relation: Model.HasManyRelation,
        modelClass: LockerRecord,
        join: {
          from: 'lockers.id',
          to: 'locker_records.locker_id'
        }
      },

      applications: {
        relation: Model.HasManyRelation,
        modelClass: Application,
        join: {
          from: 'lockers.id',
          to: 'applications.assigned_locker_id'
        }
      }
    };
  }

  /**
   * Locker-specific query modifiers
   */
  static get modifiers() {
    return {
      ...super.modifiers,
      
      available(builder: any) {
        builder.where('status', 'available');
      },

      occupied(builder: any) {
        builder.where('status', 'occupied');
      },

      maintenance(builder: any) {
        builder.where('status', 'maintenance');
      },

      byStore(builder: any, storeId: string) {
        builder.where('store_id', storeId);
      },

      byNumber(builder: any, number: string) {
        builder.where('number', number);
      },

      withStore(builder: any) {
        builder.withGraphFetched('store');
      },

      withCurrentUser(builder: any) {
        builder.withGraphFetched('currentUser');
      },

      withUsageHistory(builder: any) {
        builder.withGraphFetched('records(orderByNewest).user');
      },

      withFullDetails(builder: any) {
        builder.withGraphFetched(`[
          store,
          currentUser,
          records(orderByNewest).[user]
        ]`);
      }
    };
  }

  /**
   * Override toJSON to include computed properties
   */
  toJSON() {
    const json = super.toJSON();
    
    // Add computed properties
    json.isAvailable = this.status === 'available';
    json.isOccupied = this.status === 'occupied';
    json.isInMaintenance = this.status === 'maintenance';
    
    if (this.records) {
      json.usageCount = this.records.length;
      json.lastUsed = this.records[0]?.created_at;
    }

    if (this.currentUser) {
      json.currentUserName = this.currentUser.name;
      json.currentUserPhone = this.currentUser.phone;
    }

    // Duration calculations
    if (this.assignedAt) {
      const assignedDate = new Date(this.assignedAt);
      const now = new Date();
      json.assignedDuration = now.getTime() - assignedDate.getTime();
      json.assignedDays = Math.floor(json.assignedDuration / (1000 * 60 * 60 * 24));
    }

    return json;
  }

  /**
   * Custom methods for locker operations
   */
  async assignToUser(userId: string, notes?: string): Promise<LockerRecord> {
    const LockerRecord = require('./LockerRecord').LockerRecord;
    
    // Update locker status
    await this.$query().patch({
      status: 'occupied',
      currentUserId: userId,
      assignedAt: new Date().toISOString()
    });

    // Create assignment record
    return LockerRecord.query().insert({
      userId,
      lockerId: this.id,
      action: 'assigned',
      notes
    });
  }

  async releaseFromUser(notes?: string): Promise<LockerRecord | null> {
    if (!this.currentUserId) {
      return null;
    }

    const LockerRecord = require('./LockerRecord').LockerRecord;
    const userId = this.currentUserId;

    // Update locker status
    await this.$query().patch({
      status: 'available',
      currentUserId: null,
      assignedAt: null
    });

    // Create release record
    return LockerRecord.query().insert({
      userId,
      lockerId: this.id,
      action: 'released',
      notes
    });
  }

  async recordUsage(action: 'store' | 'retrieve', notes?: string): Promise<LockerRecord | null> {
    if (!this.currentUserId) {
      throw new Error('Cannot record usage for unassigned locker');
    }

    const LockerRecord = require('./LockerRecord').LockerRecord;

    return LockerRecord.query().insert({
      userId: this.currentUserId,
      lockerId: this.id,
      action,
      notes
    });
  }

  async setMaintenance(notes?: string): Promise<LockerRecord | null> {
    const previousUserId = this.currentUserId;

    // Update locker status
    await this.$query().patch({
      status: 'maintenance',
      currentUserId: null,
      assignedAt: null
    });

    // Create maintenance record if user was assigned
    if (previousUserId) {
      const LockerRecord = require('./LockerRecord').LockerRecord;
      
      return LockerRecord.query().insert({
        userId: previousUserId,
        lockerId: this.id,
        action: 'released',
        notes: `Maintenance: ${notes || 'Locker taken offline for maintenance'}`
      });
    }

    return null;
  }

  async getUsageStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await this.$relatedQuery('records')
      .where('created_at', '>=', startDate.toISOString())
      .orderBy('created_at', 'desc');

    const stats = {
      totalUsage: records.length,
      storeActions: records.filter(r => r.action === 'store').length,
      retrieveActions: records.filter(r => r.action === 'retrieve').length,
      assignments: records.filter(r => r.action === 'assigned').length,
      releases: records.filter(r => r.action === 'released').length,
      uniqueUsers: new Set(records.map(r => r.userId)).size
    };

    return stats;
  }

  async getRecentActivity(limit = 10) {
    return this.$relatedQuery('records')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .withGraphFetched('user');
  }

  /**
   * Static methods for locker management
   */
  static async findAvailableInStore(storeId: string, limit?: number) {
    let query = this.query()
      .modify('available')
      .modify('byStore', storeId)
      .orderBy('number');

    if (limit) {
      query = query.limit(limit);
    }

    return query;
  }

  static async getStoreStats(storeId: string) {
    const lockers = await this.query()
      .modify('byStore', storeId)
      .withGraphFetched('currentUser');

    const total = lockers.length;
    const available = lockers.filter(l => l.status === 'available').length;
    const occupied = lockers.filter(l => l.status === 'occupied').length;
    const maintenance = lockers.filter(l => l.status === 'maintenance').length;

    return {
      total,
      available,
      occupied,
      maintenance,
      utilizationRate: total > 0 ? (occupied / total) * 100 : 0
    };
  }
}

// Import types for TypeScript (avoid circular import issues)
import type { Store } from './Store';
import type { User } from './User';
import type { LockerRecord } from './LockerRecord';
import type { Application } from './Application';