/**
 * Store Model - 门店实体
 * Manages billiard hall store information
 */

import { Model, RelationMappings } from 'objection';
import { BaseModel } from './BaseModel';

export class Store extends BaseModel {
  static tableName = 'stores';

  // Store properties
  name!: string;
  address?: string;
  phone?: string;
  status!: 'active' | 'inactive';

  // Navigation properties
  users?: User[];
  admins?: Admin[];
  lockers?: Locker[];
  applications?: Application[];

  /**
   * JSON Schema for validation
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        ...this.commonJsonSchema.properties,
        name: { type: 'string', minLength: 1, maxLength: 100 },
        address: { type: ['string', 'null'], maxLength: 500 },
        phone: { type: ['string', 'null'], maxLength: 20 },
        status: { type: 'string', enum: ['active', 'inactive'], default: 'active' }
      }
    };
  }

  /**
   * Define relationships with other models
   */
  static get relationMappings(): RelationMappings {
    // Import here to avoid circular dependencies
    const User = require('./User').User;
    const Admin = require('./Admin').Admin;
    const Locker = require('./Locker').Locker;
    const Application = require('./Application').Application;

    return {
      users: {
        relation: Model.HasManyRelation,
        modelClass: User,
        join: {
          from: 'stores.id',
          to: 'users.store_id'
        }
      },

      admins: {
        relation: Model.HasManyRelation,
        modelClass: Admin,
        join: {
          from: 'stores.id',
          to: 'admins.store_id'
        }
      },

      lockers: {
        relation: Model.HasManyRelation,
        modelClass: Locker,
        join: {
          from: 'stores.id',
          to: 'lockers.store_id'
        }
      },

      applications: {
        relation: Model.HasManyRelation,
        modelClass: Application,
        join: {
          from: 'stores.id',
          to: 'applications.store_id'
        }
      }
    };
  }

  /**
   * Store-specific query modifiers
   */
  static get modifiers() {
    return {
      ...super.modifiers,
      
      withUsers(builder: any) {
        builder.withGraphFetched('users');
      },

      withLockers(builder: any) {
        builder.withGraphFetched('lockers');
      },

      withStats(builder: any) {
        builder.withGraphFetched('[users(orderByNewest), lockers, applications(orderByNewest)]');
      }
    };
  }

  /**
   * Custom methods for store operations
   */
  async getActiveUsers() {
    return this.$relatedQuery('users').modify('active');
  }

  async getAvailableLockers() {
    return this.$relatedQuery('lockers').where('status', 'available');
  }

  async getPendingApplications() {
    return this.$relatedQuery('applications').where('status', 'pending');
  }

  /**
   * Override toJSON to include computed properties
   */
  toJSON() {
    const json = super.toJSON();
    
    // Add computed properties for API responses
    if (this.users) {
      json.userCount = this.users.length;
    }
    
    if (this.lockers) {
      json.lockerCount = this.lockers.length;
      json.availableLockers = this.lockers.filter(l => l.status === 'available').length;
    }

    return json;
  }
}

// Import types for TypeScript (avoid circular import issues)
import type { User } from './User';
import type { Admin } from './Admin';
import type { Locker } from './Locker';
import type { Application } from './Application';