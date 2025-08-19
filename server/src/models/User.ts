/**
 * User Model - 用户实体
 * Manages end-user accounts and authentication
 */

import { Model, RelationMappings } from 'objection';
import { BaseModel } from './BaseModel';

export class User extends BaseModel {
  static tableName = 'users';

  // User properties
  phone!: string;
  name!: string;
  password!: string;
  avatarUrl?: string;
  storeId?: string;
  status!: 'active' | 'inactive' | 'suspended';
  lastActiveAt!: string;

  // Navigation properties
  store?: Store;
  applications?: Application[];
  lockerRecords?: LockerRecord[];
  assignedLocker?: Locker;

  /**
   * JSON Schema for validation
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['phone', 'name', 'password'],
      properties: {
        ...this.commonJsonSchema.properties,
        phone: { 
          type: 'string', 
          pattern: '^[0-9]{11}$',  // Chinese mobile number format
          minLength: 11,
          maxLength: 11
        },
        name: { type: 'string', minLength: 1, maxLength: 50 },
        password: { type: 'string', minLength: 6, maxLength: 255 },
        avatarUrl: { type: ['string', 'null'], format: 'uri' },
        storeId: { type: ['string', 'null'], format: 'uuid' },
        status: { 
          type: 'string', 
          enum: ['active', 'inactive', 'suspended'], 
          default: 'active' 
        },
        lastActiveAt: { type: 'string', format: 'date-time' }
      }
    };
  }

  /**
   * Define relationships with other models
   */
  static get relationMappings(): RelationMappings {
    const Store = require('./Store').Store;
    const Application = require('./Application').Application;
    const LockerRecord = require('./LockerRecord').LockerRecord;
    const Locker = require('./Locker').Locker;

    return {
      store: {
        relation: Model.BelongsToOneRelation,
        modelClass: Store,
        join: {
          from: 'users.store_id',
          to: 'stores.id'
        }
      },

      applications: {
        relation: Model.HasManyRelation,
        modelClass: Application,
        join: {
          from: 'users.id',
          to: 'applications.user_id'
        }
      },

      lockerRecords: {
        relation: Model.HasManyRelation,
        modelClass: LockerRecord,
        join: {
          from: 'users.id',
          to: 'locker_records.user_id'
        }
      },

      assignedLocker: {
        relation: Model.HasOneRelation,
        modelClass: Locker,
        join: {
          from: 'users.id',
          to: 'lockers.current_user_id'
        }
      }
    };
  }

  /**
   * User-specific query modifiers
   */
  static get modifiers() {
    return {
      ...super.modifiers,
      
      byPhone(builder: any, phone: string) {
        builder.where('phone', phone);
      },

      withStore(builder: any) {
        builder.withGraphFetched('store');
      },

      withApplications(builder: any) {
        builder.withGraphFetched('applications(orderByNewest)');
      },

      withLockerHistory(builder: any) {
        builder.withGraphFetched('lockerRecords(orderByNewest)');
      },

      withCurrentLocker(builder: any) {
        builder.withGraphFetched('assignedLocker.store');
      },

      withFullProfile(builder: any) {
        builder.withGraphFetched(`[
          store,
          assignedLocker.store,
          applications(orderByNewest).[store],
          lockerRecords(orderByNewest).locker
        ]`);
      }
    };
  }

  /**
   * Hash password before insert
   */
  async $beforeInsert() {
    super.$beforeInsert();
    
    // Update last active time
    this.lastActiveAt = new Date().toISOString();
    
    // Password hashing will be handled by AuthService
    // to keep model layer clean
  }

  /**
   * Update last active time before update
   */
  async $beforeUpdate() {
    super.$beforeUpdate();
    this.lastActiveAt = new Date().toISOString();
  }

  /**
   * Override toJSON to exclude sensitive data
   */
  toJSON() {
    const json = super.toJSON();
    
    // Remove sensitive fields
    delete json.password;
    
    // Add computed properties
    if (this.applications) {
      json.applicationCount = this.applications.length;
      json.pendingApplications = this.applications.filter(a => a.status === 'pending').length;
    }
    
    if (this.lockerRecords) {
      json.usageCount = this.lockerRecords.length;
      json.lastUsage = this.lockerRecords[0]?.created_at;
    }

    // Add status indicators
    json.hasActiveLocker = !!this.assignedLocker;
    json.isActive = this.status === 'active';

    return json;
  }

  /**
   * Custom methods for user operations
   */
  async getCurrentApplication() {
    return this.$relatedQuery('applications')
      .where('status', 'pending')
      .orderBy('created_at', 'desc')
      .first();
  }

  async getRecentActivity(limit = 10) {
    return this.$relatedQuery('lockerRecords')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .withGraphFetched('locker.store');
  }

  async hasActiveApplication(): Promise<boolean> {
    const count = await this.$relatedQuery('applications')
      .where('status', 'pending')
      .resultSize();
    return count > 0;
  }

  async updateLastActive() {
    return this.$query().patch({
      lastActiveAt: new Date().toISOString()
    });
  }
}

// Import types for TypeScript (avoid circular import issues)
import type { Store } from './Store';
import type { Application } from './Application';
import type { LockerRecord } from './LockerRecord';
import type { Locker } from './Locker';