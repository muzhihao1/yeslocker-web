/**
 * Admin Model - 管理员实体
 * Manages administrative users and their permissions
 */

import { Model, RelationMappings } from 'objection';
import { BaseModel } from './BaseModel';

export class Admin extends BaseModel {
  static tableName = 'admins';

  // Admin properties
  phone!: string;
  password!: string;
  name!: string;
  role!: 'super_admin' | 'store_admin';
  storeId?: string;
  status!: 'active' | 'inactive';

  // Navigation properties
  store?: Store;
  approvedApplications?: Application[];

  /**
   * JSON Schema for validation
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['phone', 'password', 'name', 'role'],
      properties: {
        ...this.commonJsonSchema.properties,
        phone: { 
          type: 'string', 
          pattern: '^[0-9]{11}$',  // Chinese mobile number format
          minLength: 11,
          maxLength: 11
        },
        password: { type: 'string', minLength: 6, maxLength: 255 },
        name: { type: 'string', minLength: 1, maxLength: 50 },
        role: { 
          type: 'string', 
          enum: ['super_admin', 'store_admin'] 
        },
        storeId: { type: ['string', 'null'], format: 'uuid' },
        status: { 
          type: 'string', 
          enum: ['active', 'inactive'], 
          default: 'active' 
        }
      }
    };
  }

  /**
   * Define relationships with other models
   */
  static get relationMappings(): RelationMappings {
    const Store = require('./Store').Store;
    const Application = require('./Application').Application;

    return {
      store: {
        relation: Model.BelongsToOneRelation,
        modelClass: Store,
        join: {
          from: 'admins.store_id',
          to: 'stores.id'
        }
      },

      approvedApplications: {
        relation: Model.HasManyRelation,
        modelClass: Application,
        join: {
          from: 'admins.id',
          to: 'applications.approved_by'
        }
      }
    };
  }

  /**
   * Admin-specific query modifiers
   */
  static get modifiers() {
    return {
      ...super.modifiers,
      
      byPhone(builder: any, phone: string) {
        builder.where('phone', phone);
      },

      byRole(builder: any, role: 'super_admin' | 'store_admin') {
        builder.where('role', role);
      },

      superAdmins(builder: any) {
        builder.where('role', 'super_admin');
      },

      storeAdmins(builder: any) {
        builder.where('role', 'store_admin');
      },

      withStore(builder: any) {
        builder.withGraphFetched('store');
      },

      withApprovedApplications(builder: any) {
        builder.withGraphFetched('approvedApplications(orderByNewest)');
      },

      forStore(builder: any, storeId: string) {
        builder.where('store_id', storeId);
      }
    };
  }

  /**
   * Override toJSON to exclude sensitive data
   */
  toJSON() {
    const json = super.toJSON();
    
    // Remove sensitive fields
    delete json.password;
    
    // Add computed properties
    if (this.approvedApplications) {
      json.approvedCount = this.approvedApplications.length;
    }

    // Add permission indicators
    json.isSuperAdmin = this.role === 'super_admin';
    json.isStoreAdmin = this.role === 'store_admin';
    json.isActive = this.status === 'active';

    return json;
  }

  /**
   * Permission checking methods
   */
  canManageStore(storeId: string): boolean {
    if (this.role === 'super_admin') return true;
    if (this.role === 'store_admin' && this.storeId === storeId) return true;
    return false;
  }

  canApproveApplications(): boolean {
    return this.status === 'active' && ['super_admin', 'store_admin'].includes(this.role);
  }

  canManageUsers(): boolean {
    return this.status === 'active' && ['super_admin', 'store_admin'].includes(this.role);
  }

  canManageLockers(): boolean {
    return this.status === 'active' && ['super_admin', 'store_admin'].includes(this.role);
  }

  canAccessAllStores(): boolean {
    return this.role === 'super_admin';
  }

  /**
   * Custom methods for admin operations
   */
  async getAccessibleStores() {
    if (this.role === 'super_admin') {
      // Super admin can access all stores
      const Store = require('./Store').Store;
      return Store.query().modify('active');
    } else if (this.role === 'store_admin' && this.storeId) {
      // Store admin can only access their assigned store
      return this.$relatedQuery('store');
    }
    return [];
  }

  async getRecentApprovals(limit = 10) {
    return this.$relatedQuery('approvedApplications')
      .orderBy('approved_at', 'desc')
      .limit(limit)
      .withGraphFetched('[user, store, assignedLocker]');
  }

  async getPendingApplicationsForReview() {
    const Application = require('./Application').Application;
    
    if (this.role === 'super_admin') {
      // Super admin can see all pending applications
      return Application.query()
        .where('status', 'pending')
        .orderBy('created_at', 'asc')
        .withGraphFetched('[user, store]');
    } else if (this.role === 'store_admin' && this.storeId) {
      // Store admin can only see applications for their store
      return Application.query()
        .where('status', 'pending')
        .where('store_id', this.storeId)
        .orderBy('created_at', 'asc')
        .withGraphFetched('[user, store]');
    }
    return [];
  }

  async getManagementStats() {
    if (this.role === 'super_admin') {
      const Application = require('./Application').Application;
      const User = require('./User').User;
      const Store = require('./Store').Store;
      
      const [totalApplications, totalUsers, totalStores] = await Promise.all([
        Application.query().resultSize(),
        User.query().modify('active').resultSize(),
        Store.query().modify('active').resultSize()
      ]);

      return {
        totalApplications,
        totalUsers,
        totalStores,
        scope: 'all'
      };
    } else if (this.storeId) {
      const Application = require('./Application').Application;
      const User = require('./User').User;
      
      const [storeApplications, storeUsers] = await Promise.all([
        Application.query().where('store_id', this.storeId).resultSize(),
        User.query().where('store_id', this.storeId).modify('active').resultSize()
      ]);

      return {
        storeApplications,
        storeUsers,
        scope: 'store'
      };
    }
    
    return { scope: 'none' };
  }
}

// Import types for TypeScript (avoid circular import issues)
import type { Store } from './Store';
import type { Application } from './Application';