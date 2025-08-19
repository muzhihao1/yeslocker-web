/**
 * Application Repository - 申请数据访问层
 * Handles all application-related database operations
 */

import { BaseRepository, SearchResult, PaginationOptions } from './BaseRepository';
import { Application } from '../models/Application';

export interface CreateApplicationData {
  userId: string;
  storeId: string;
  lockerType?: string;
  purpose?: string;
  notes?: string;
}

export interface UpdateApplicationData {
  lockerType?: string;
  purpose?: string;
  notes?: string;
  status?: 'pending' | 'approved' | 'rejected';
  assignedLockerId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface ApplicationSearchFilters {
  userId?: string;
  storeId?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApprovalData {
  adminId: string;
  lockerId?: string;
  notes?: string;
}

export interface RejectionData {
  adminId: string;
  reason: string;
}

export class ApplicationRepository extends BaseRepository<Application> {
  constructor() {
    super(Application);
  }

  /**
   * Create new application with validation
   */
  async createApplication(applicationData: CreateApplicationData): Promise<Application | null> {
    try {
      // Check if user already has a pending application
      const existingApplication = await this.findWhere({
        userId: applicationData.userId,
        status: 'pending'
      });

      if (existingApplication.length > 0) {
        throw new Error('User already has a pending application');
      }

      // Check if user already has an assigned locker
      const User = require('../models/User').User;
      const user = await User.query()
        .findById(applicationData.userId)
        .withGraphFetched('assignedLocker');

      if (user?.assignedLocker) {
        throw new Error('User already has an assigned locker');
      }

      return await this.create(applicationData);
    } catch (error) {
      this.handleError('createApplication', error, applicationData);
      return null;
    }
  }

  /**
   * Find application with full details
   */
  async findApplicationWithDetails(applicationId: string): Promise<Application | null> {
    try {
      return await this.findByIdWithRelations(applicationId, [
        'user',
        'store',
        'assignedLocker',
        'approver'
      ]);
    } catch (error) {
      this.handleError('findApplicationWithDetails', error, { applicationId });
      return null;
    }
  }

  /**
   * Find applications by user
   */
  async findByUser(userId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<Application[]> {
    try {
      const conditions: any = { userId };
      
      if (status) {
        conditions.status = status;
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'desc' },
        relations: ['store', 'assignedLocker', 'approver']
      });
    } catch (error) {
      this.handleError('findByUser', error, { userId, status });
      return [];
    }
  }

  /**
   * Find applications by store
   */
  async findByStore(storeId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<Application[]> {
    try {
      const conditions: any = { storeId };
      
      if (status) {
        conditions.status = status;
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'desc' },
        relations: ['user', 'assignedLocker', 'approver']
      });
    } catch (error) {
      this.handleError('findByStore', error, { storeId, status });
      return [];
    }
  }

  /**
   * Find pending applications for approval
   */
  async findPendingApplications(storeId?: string): Promise<Application[]> {
    try {
      const conditions: any = { status: 'pending' };
      
      if (storeId) {
        conditions.storeId = storeId;
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'asc' }, // FIFO for fairness
        relations: ['user', 'store']
      });
    } catch (error) {
      this.handleError('findPendingApplications', error, { storeId });
      return [];
    }
  }

  /**
   * Search applications with filters and pagination
   */
  async searchApplications(
    filters: ApplicationSearchFilters,
    pagination: PaginationOptions
  ): Promise<SearchResult<Application>> {
    try {
      let query = this.createQuery();

      // Apply filters
      if (filters.userId) {
        query = query.where('user_id', filters.userId);
      }

      if (filters.storeId) {
        query = query.where('store_id', filters.storeId);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.approvedBy) {
        query = query.where('approved_by', filters.approvedBy);
      }

      if (filters.dateFrom) {
        query = query.where('created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('created_at', '<=', filters.dateTo);
      }

      // Add relations
      query = query.withGraphFetched('[user, store, assignedLocker, approver]');

      // Apply pagination
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 20, 100);

      const result = await query
        .orderBy('created_at', 'desc')
        .page(page - 1, pageSize);

      return {
        data: result.results as Application[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('searchApplications', error, { filters, pagination });
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
   * Approve application
   */
  async approveApplication(applicationId: string, approvalData: ApprovalData): Promise<Application | null> {
    try {
      const application = await this.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'pending') {
        throw new Error('Application is not pending');
      }

      const updateData: UpdateApplicationData = {
        status: 'approved',
        approvedBy: approvalData.adminId,
        approvedAt: new Date().toISOString()
      };

      if (approvalData.lockerId) {
        updateData.assignedLockerId = approvalData.lockerId;
        
        // Assign locker to user
        const LockerRepository = require('./LockerRepository').LockerRepository;
        const lockerRepo = new LockerRepository();
        
        await lockerRepo.assignLocker(approvalData.lockerId, {
          userId: application.userId,
          notes: approvalData.notes || 'Approved application'
        });
      }

      return await this.update(applicationId, updateData);
    } catch (error) {
      this.handleError('approveApplication', error, { applicationId, approvalData });
      return null;
    }
  }

  /**
   * Reject application
   */
  async rejectApplication(applicationId: string, rejectionData: RejectionData): Promise<Application | null> {
    try {
      const application = await this.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'pending') {
        throw new Error('Application is not pending');
      }

      return await this.update(applicationId, {
        status: 'rejected',
        approvedBy: rejectionData.adminId,
        approvedAt: new Date().toISOString(),
        rejectionReason: rejectionData.reason
      });
    } catch (error) {
      this.handleError('rejectApplication', error, { applicationId, rejectionData });
      return null;
    }
  }

  /**
   * Cancel application (by user)
   */
  async cancelApplication(applicationId: string, userId: string): Promise<Application | null> {
    try {
      const application = await this.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.userId !== userId) {
        throw new Error('Unauthorized to cancel this application');
      }

      if (application.status !== 'pending') {
        throw new Error('Can only cancel pending applications');
      }

      return await this.update(applicationId, {
        status: 'rejected',
        rejectionReason: 'Cancelled by user'
      });
    } catch (error) {
      this.handleError('cancelApplication', error, { applicationId, userId });
      return null;
    }
  }

  /**
   * Add note to application
   */
  async addNote(applicationId: string, note: string): Promise<Application | null> {
    try {
      const application = await this.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      const currentNotes = application.notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;

      return await this.update(applicationId, {
        notes: updatedNotes
      });
    } catch (error) {
      this.handleError('addNote', error, { applicationId, note });
      return null;
    }
  }

  /**
   * Get application statistics
   */
  async getApplicationStats(storeId?: string) {
    try {
      let baseQuery = this.createQuery();
      
      if (storeId) {
        baseQuery = baseQuery.where('store_id', storeId);
      }

      const [
        total,
        pending,
        approved,
        rejected
      ] = await Promise.all([
        baseQuery.clone().resultSize(),
        baseQuery.clone().where('status', 'pending').resultSize(),
        baseQuery.clone().where('status', 'approved').resultSize(),
        baseQuery.clone().where('status', 'rejected').resultSize()
      ]);

      const processed = approved + rejected;
      const approvalRate = processed > 0 ? (approved / processed) * 100 : 0;

      return {
        total,
        pending,
        approved,
        rejected,
        processed,
        approvalRate
      };
    } catch (error) {
      this.handleError('getApplicationStats', error, { storeId });
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        processed: 0,
        approvalRate: 0
      };
    }
  }

  /**
   * Get application processing analytics
   */
  async getProcessingAnalytics(storeId?: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = this.createQuery()
        .where('created_at', '>=', startDate.toISOString())
        .whereIn('status', ['approved', 'rejected']);

      if (storeId) {
        query = query.where('store_id', storeId);
      }

      const processedApplications = await query;

      // Calculate processing times
      const processingTimes = processedApplications
        .filter(app => app.approvedAt)
        .map(app => {
          const submitted = new Date(app.created_at);
          const processed = new Date(app.approvedAt!);
          return processed.getTime() - submitted.getTime();
        });

      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      // Group by day for trend analysis
      const dailyStats: Record<string, { submitted: number; processed: number; approved: number; rejected: number }> = {};
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        dailyStats[dateKey] = { submitted: 0, processed: 0, approved: 0, rejected: 0 };
      }

      // Count submitted applications
      let submittedQuery = this.createQuery()
        .where('created_at', '>=', startDate.toISOString());

      if (storeId) {
        submittedQuery = submittedQuery.where('store_id', storeId);
      }

      const submittedApplications = await submittedQuery;

      submittedApplications.forEach(app => {
        const dateKey = app.created_at.split('T')[0];
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].submitted++;
        }
      });

      processedApplications.forEach(app => {
        if (app.approvedAt) {
          const dateKey = app.approvedAt.split('T')[0];
          if (dailyStats[dateKey]) {
            dailyStats[dateKey].processed++;
            if (app.status === 'approved') {
              dailyStats[dateKey].approved++;
            } else {
              dailyStats[dateKey].rejected++;
            }
          }
        }
      });

      return {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        },
        processing: {
          totalProcessed: processedApplications.length,
          averageProcessingTime,
          averageProcessingDays: averageProcessingTime / (1000 * 60 * 60 * 24),
          approvalRate: processedApplications.length > 0 
            ? (processedApplications.filter(a => a.status === 'approved').length / processedApplications.length) * 100 
            : 0
        },
        trends: {
          daily: dailyStats
        }
      };
    } catch (error) {
      this.handleError('getProcessingAnalytics', error, { storeId, days });
      return null;
    }
  }

  /**
   * Find expired applications (pending for too long)
   */
  async findExpiredApplications(expirationDays = 30): Promise<Application[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - expirationDays);

      return await this.findWhere({
        status: 'pending'
      }, {
        relations: ['user', 'store']
      }).then(applications => 
        applications.filter(app => 
          new Date(app.created_at) < cutoffDate
        )
      );
    } catch (error) {
      this.handleError('findExpiredApplications', error, { expirationDays });
      return [];
    }
  }

  /**
   * Get user's active application
   */
  async getUserActiveApplication(userId: string): Promise<Application | null> {
    try {
      return await this.findOneBy('userId', userId, ['store', 'assignedLocker']);
    } catch (error) {
      this.handleError('getUserActiveApplication', error, { userId });
      return null;
    }
  }

  /**
   * Check if user can apply for locker
   */
  async canUserApply(userId: string): Promise<{ canApply: boolean; reason?: string }> {
    try {
      // Check for existing pending application
      const pendingApplication = await this.findWhere({
        userId,
        status: 'pending'
      });

      if (pendingApplication.length > 0) {
        return {
          canApply: false,
          reason: 'User already has a pending application'
        };
      }

      // Check if user already has assigned locker
      const User = require('../models/User').User;
      const user = await User.query()
        .findById(userId)
        .withGraphFetched('assignedLocker');

      if (user?.assignedLocker) {
        return {
          canApply: false,
          reason: 'User already has an assigned locker'
        };
      }

      return { canApply: true };
    } catch (error) {
      this.handleError('canUserApply', error, { userId });
      return {
        canApply: false,
        reason: 'Error checking application eligibility'
      };
    }
  }

  /**
   * Get admin workload (applications to review)
   */
  async getAdminWorkload(adminId: string) {
    try {
      const Admin = require('../models/Admin').Admin;
      const admin = await Admin.query().findById(adminId).withGraphFetched('store');
      
      if (!admin) {
        return null;
      }

      let pendingApplications;
      
      if (admin.role === 'super_admin') {
        pendingApplications = await this.findPendingApplications();
      } else if (admin.role === 'store_admin' && admin.storeId) {
        pendingApplications = await this.findPendingApplications(admin.storeId);
      } else {
        pendingApplications = [];
      }

      // Calculate urgency (applications older than 7 days are urgent)
      const urgentApplications = pendingApplications.filter(app => {
        const daysSinceSubmitted = (new Date().getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceSubmitted > 7;
      });

      return {
        admin: {
          id: admin.id,
          name: admin.name,
          role: admin.role,
          store: admin.store?.name || null
        },
        workload: {
          pendingApplications: pendingApplications.length,
          urgentApplications: urgentApplications.length,
          applications: pendingApplications.slice(0, 10) // Show first 10
        }
      };
    } catch (error) {
      this.handleError('getAdminWorkload', error, { adminId });
      return null;
    }
  }

  /**
   * Bulk process applications (for admin efficiency)
   */
  async bulkApprove(applicationIds: string[], adminId: string): Promise<number> {
    try {
      const count = await this.bulkUpdate(applicationIds, {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date().toISOString()
      });

      return count;
    } catch (error) {
      this.handleError('bulkApprove', error, { applicationIds, adminId });
      return 0;
    }
  }

  /**
   * Bulk reject applications
   */
  async bulkReject(applicationIds: string[], adminId: string, reason: string): Promise<number> {
    try {
      const count = await this.bulkUpdate(applicationIds, {
        status: 'rejected',
        approvedBy: adminId,
        approvedAt: new Date().toISOString(),
        rejectionReason: reason
      });

      return count;
    } catch (error) {
      this.handleError('bulkReject', error, { applicationIds, adminId, reason });
      return 0;
    }
  }
}