/**
 * Application Model - 申请实体
 * Manages locker rental applications and approval workflow
 */

import { Model, RelationMappings } from 'objection';
import { BaseModel } from './BaseModel';

export class Application extends BaseModel {
  static tableName = 'applications';

  // Application properties
  userId!: string;
  storeId!: string;
  lockerType?: string;
  purpose?: string;
  notes?: string;
  status!: 'pending' | 'approved' | 'rejected';
  assignedLockerId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;

  // Navigation properties
  user?: User;
  store?: Store;
  assignedLocker?: Locker;
  approver?: Admin;

  /**
   * JSON Schema for validation
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'storeId'],
      properties: {
        ...this.commonJsonSchema.properties,
        userId: { type: 'string', format: 'uuid' },
        storeId: { type: 'string', format: 'uuid' },
        lockerType: { type: ['string', 'null'], maxLength: 50 },
        purpose: { type: ['string', 'null'], maxLength: 1000 },
        notes: { type: ['string', 'null'], maxLength: 1000 },
        status: { 
          type: 'string', 
          enum: ['pending', 'approved', 'rejected'], 
          default: 'pending' 
        },
        assignedLockerId: { type: ['string', 'null'], format: 'uuid' },
        approvedBy: { type: ['string', 'null'], format: 'uuid' },
        approvedAt: { type: ['string', 'null'], format: 'date-time' },
        rejectionReason: { type: ['string', 'null'], maxLength: 500 }
      }
    };
  }

  /**
   * Define relationships with other models
   */
  static get relationMappings(): RelationMappings {
    const User = require('./User').User;
    const Store = require('./Store').Store;
    const Locker = require('./Locker').Locker;
    const Admin = require('./Admin').Admin;

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'applications.user_id',
          to: 'users.id'
        }
      },

      store: {
        relation: Model.BelongsToOneRelation,
        modelClass: Store,
        join: {
          from: 'applications.store_id',
          to: 'stores.id'
        }
      },

      assignedLocker: {
        relation: Model.BelongsToOneRelation,
        modelClass: Locker,
        join: {
          from: 'applications.assigned_locker_id',
          to: 'lockers.id'
        }
      },

      approver: {
        relation: Model.BelongsToOneRelation,
        modelClass: Admin,
        join: {
          from: 'applications.approved_by',
          to: 'admins.id'
        }
      }
    };
  }

  /**
   * Application-specific query modifiers
   */
  static get modifiers() {
    return {
      ...super.modifiers,
      
      pending(builder: any) {
        builder.where('status', 'pending');
      },

      approved(builder: any) {
        builder.where('status', 'approved');
      },

      rejected(builder: any) {
        builder.where('status', 'rejected');
      },

      byUser(builder: any, userId: string) {
        builder.where('user_id', userId);
      },

      byStore(builder: any, storeId: string) {
        builder.where('store_id', storeId);
      },

      byStatus(builder: any, status: 'pending' | 'approved' | 'rejected') {
        builder.where('status', status);
      },

      withUser(builder: any) {
        builder.withGraphFetched('user');
      },

      withStore(builder: any) {
        builder.withGraphFetched('store');
      },

      withLocker(builder: any) {
        builder.withGraphFetched('assignedLocker');
      },

      withApprover(builder: any) {
        builder.withGraphFetched('approver');
      },

      withFullDetails(builder: any) {
        builder.withGraphFetched(`[
          user,
          store,
          assignedLocker,
          approver
        ]`);
      },

      recentFirst(builder: any) {
        builder.orderBy('created_at', 'desc');
      },

      oldestFirst(builder: any) {
        builder.orderBy('created_at', 'asc');
      }
    };
  }

  /**
   * Override toJSON to include computed properties
   */
  toJSON() {
    const json = super.toJSON();
    
    // Add status indicators
    json.isPending = this.status === 'pending';
    json.isApproved = this.status === 'approved';
    json.isRejected = this.status === 'rejected';
    
    // Processing time calculations
    if (this.approvedAt) {
      const submittedDate = new Date(this.created_at);
      const approvedDate = new Date(this.approvedAt);
      json.processingTime = approvedDate.getTime() - submittedDate.getTime();
      json.processingDays = Math.floor(json.processingTime / (1000 * 60 * 60 * 24));
    } else if (this.status === 'pending') {
      const submittedDate = new Date(this.created_at);
      const now = new Date();
      json.waitingTime = now.getTime() - submittedDate.getTime();
      json.waitingDays = Math.floor(json.waitingTime / (1000 * 60 * 60 * 24));
    }

    // User information (if populated)
    if (this.user) {
      json.userName = this.user.name;
      json.userPhone = this.user.phone;
    }

    // Store information (if populated)
    if (this.store) {
      json.storeName = this.store.name;
    }

    // Locker information (if populated)
    if (this.assignedLocker) {
      json.lockerNumber = this.assignedLocker.number;
    }

    // Approver information (if populated)
    if (this.approver) {
      json.approverName = this.approver.name;
    }

    return json;
  }

  /**
   * Application workflow methods
   */
  async approve(adminId: string, lockerId?: string, notes?: string): Promise<Application> {
    const updateData: any = {
      status: 'approved',
      approvedBy: adminId,
      approvedAt: new Date().toISOString()
    };

    if (lockerId) {
      updateData.assignedLockerId = lockerId;
      
      // Assign locker to user
      const Locker = require('./Locker').Locker;
      const locker = await Locker.query().findById(lockerId);
      if (locker) {
        await locker.assignToUser(this.userId, notes || 'Approved application');
      }
    }

    return this.$query().patchAndFetch(updateData);
  }

  async reject(adminId: string, reason: string): Promise<Application> {
    return this.$query().patchAndFetch({
      status: 'rejected',
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason
    });
  }

  async cancel(): Promise<Application> {
    if (this.status !== 'pending') {
      throw new Error('Can only cancel pending applications');
    }

    return this.$query().patchAndFetch({
      status: 'rejected',
      rejectionReason: 'Cancelled by user'
    });
  }

  async addNote(note: string): Promise<Application> {
    const currentNotes = this.notes || '';
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${note}`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;

    return this.$query().patchAndFetch({
      notes: updatedNotes
    });
  }

  /**
   * Validation methods
   */
  canBeApproved(): boolean {
    return this.status === 'pending';
  }

  canBeRejected(): boolean {
    return this.status === 'pending';
  }

  canBeCancelled(): boolean {
    return this.status === 'pending';
  }

  isExpired(expirationDays = 30): boolean {
    if (this.status !== 'pending') return false;
    
    const submittedDate = new Date(this.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff > expirationDays;
  }

  /**
   * Static methods for application management
   */
  static async findPendingForStore(storeId: string) {
    return this.query()
      .modify('pending')
      .modify('byStore', storeId)
      .modify('oldestFirst')
      .withGraphFetched('[user, store]');
  }

  static async findUserActiveApplication(userId: string) {
    return this.query()
      .modify('byUser', userId)
      .modify('pending')
      .first();
  }

  static async getApplicationStats(storeId?: string) {
    let query = this.query();
    
    if (storeId) {
      query = query.modify('byStore', storeId);
    }

    const applications = await query;

    const stats = {
      total: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      approved: applications.filter(a => a.status === 'approved').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      approvalRate: 0,
      averageProcessingTime: 0
    };

    const processedApps = applications.filter(a => a.status !== 'pending');
    if (processedApps.length > 0) {
      stats.approvalRate = (stats.approved / processedApps.length) * 100;
      
      const processedWithTime = processedApps.filter(a => a.approvedAt);
      if (processedWithTime.length > 0) {
        const totalTime = processedWithTime.reduce((sum, app) => {
          const submitted = new Date(app.created_at);
          const processed = new Date(app.approvedAt!);
          return sum + (processed.getTime() - submitted.getTime());
        }, 0);
        stats.averageProcessingTime = totalTime / processedWithTime.length;
      }
    }

    return stats;
  }

  static async findExpiredApplications(expirationDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - expirationDays);

    return this.query()
      .modify('pending')
      .where('created_at', '<', cutoffDate.toISOString())
      .withGraphFetched('[user, store]');
  }
}

// Import types for TypeScript (avoid circular import issues)
import type { User } from './User';
import type { Store } from './Store';
import type { Locker } from './Locker';
import type { Admin } from './Admin';