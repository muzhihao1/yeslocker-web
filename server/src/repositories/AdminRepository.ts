/**
 * Admin Repository - 管理员数据访问层
 * Handles all admin-related database operations
 */

import { BaseRepository, SearchResult, PaginationOptions } from './BaseRepository';
import { Admin } from '../models/Admin';

export interface CreateAdminData {
  phone: string;
  password: string;
  name: string;
  role: 'super_admin' | 'store_admin';
  storeId?: string;
}

export interface UpdateAdminData {
  name?: string;
  role?: 'super_admin' | 'store_admin';
  storeId?: string;
  status?: 'active' | 'inactive';
}

export interface AdminSearchFilters {
  phone?: string;
  name?: string;
  role?: 'super_admin' | 'store_admin';
  storeId?: string;
  status?: 'active' | 'inactive';
}

export class AdminRepository extends BaseRepository<Admin> {
  constructor() {
    super(Admin);
  }

  /**
   * Find admin by phone number (unique identifier)
   */
  async findByPhone(phone: string): Promise<Admin | null> {
    try {
      return await this.findOneBy('phone', phone, ['store']);
    } catch (error) {
      this.handleError('findByPhone', error, { phone });
      return null;
    }
  }

  /**
   * Create new admin with validation
   */
  async createAdmin(adminData: CreateAdminData): Promise<Admin | null> {
    try {
      // Check if phone already exists
      const existingAdmin = await this.findByPhone(adminData.phone);
      if (existingAdmin) {
        throw new Error('Phone number already registered');
      }

      // Validate store assignment for store_admin
      if (adminData.role === 'store_admin' && !adminData.storeId) {
        throw new Error('Store admin must be assigned to a store');
      }

      // Super admin should not be assigned to specific store
      if (adminData.role === 'super_admin' && adminData.storeId) {
        throw new Error('Super admin should not be assigned to a specific store');
      }

      return await this.create(adminData);
    } catch (error) {
      this.handleError('createAdmin', error, adminData);
      return null;
    }
  }

  /**
   * Update admin profile
   */
  async updateProfile(adminId: string, updateData: UpdateAdminData): Promise<Admin | null> {
    try {
      // Validate role and store assignment constraints
      if (updateData.role) {
        const admin = await this.findById(adminId);
        if (!admin) {
          throw new Error('Admin not found');
        }

        if (updateData.role === 'store_admin' && !updateData.storeId && !admin.storeId) {
          throw new Error('Store admin must be assigned to a store');
        }

        if (updateData.role === 'super_admin') {
          updateData.storeId = null; // Remove store assignment for super admin
        }
      }

      return await this.update(adminId, updateData);
    } catch (error) {
      this.handleError('updateProfile', error, { adminId, updateData });
      return null;
    }
  }

  /**
   * Find admins by store
   */
  async findByStore(storeId: string, includeInactive = false): Promise<Admin[]> {
    try {
      const conditions: any = { storeId };
      
      if (!includeInactive) {
        conditions.status = 'active';
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'desc' },
        relations: ['store']
      });
    } catch (error) {
      this.handleError('findByStore', error, { storeId, includeInactive });
      return [];
    }
  }

  /**
   * Find all super admins
   */
  async findSuperAdmins(includeInactive = false): Promise<Admin[]> {
    try {
      const conditions: any = { role: 'super_admin' };
      
      if (!includeInactive) {
        conditions.status = 'active';
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'desc' }
      });
    } catch (error) {
      this.handleError('findSuperAdmins', error, { includeInactive });
      return [];
    }
  }

  /**
   * Find all store admins
   */
  async findStoreAdmins(includeInactive = false): Promise<Admin[]> {
    try {
      const conditions: any = { role: 'store_admin' };
      
      if (!includeInactive) {
        conditions.status = 'active';
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'desc' },
        relations: ['store']
      });
    } catch (error) {
      this.handleError('findStoreAdmins', error, { includeInactive });
      return [];
    }
  }

  /**
   * Search admins with filters and pagination
   */
  async searchAdmins(
    filters: AdminSearchFilters,
    pagination: PaginationOptions
  ): Promise<SearchResult<Admin>> {
    try {
      let query = this.createQuery();

      // Apply filters
      if (filters.phone) {
        query = query.whereILike('phone', `%${filters.phone}%`);
      }

      if (filters.name) {
        query = query.whereILike('name', `%${filters.name}%`);
      }

      if (filters.role) {
        query = query.where('role', filters.role);
      }

      if (filters.storeId) {
        query = query.where('store_id', filters.storeId);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      // Add relations
      query = query.withGraphFetched('[store, approvedApplications(orderByNewest).limit(5)]');

      // Apply pagination
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 20, 100);

      const result = await query
        .orderBy('created_at', 'desc')
        .page(page - 1, pageSize);

      return {
        data: result.results as Admin[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('searchAdmins', error, { filters, pagination });
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
   * Get admin statistics
   */
  async getAdminStats(storeId?: string) {
    try {
      let baseQuery = this.createQuery();
      
      if (storeId) {
        baseQuery = baseQuery.where('store_id', storeId);
      }

      const [
        totalAdmins,
        activeAdmins,
        superAdmins,
        storeAdmins
      ] = await Promise.all([
        baseQuery.clone().resultSize(),
        baseQuery.clone().where('status', 'active').resultSize(),
        baseQuery.clone().where('role', 'super_admin').resultSize(),
        baseQuery.clone().where('role', 'store_admin').resultSize()
      ]);

      return {
        total: totalAdmins,
        active: activeAdmins,
        superAdmins,
        storeAdmins
      };
    } catch (error) {
      this.handleError('getAdminStats', error, { storeId });
      return {
        total: 0,
        active: 0,
        superAdmins: 0,
        storeAdmins: 0
      };
    }
  }

  /**
   * Get admin activity statistics
   */
  async getAdminActivity(adminId: string, days = 30) {
    try {
      const admin = await this.findByIdWithRelations(adminId, [
        'approvedApplications',
        'store'
      ]);

      if (!admin) {
        return null;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Count recent approvals
      const recentApprovals = admin.approvedApplications?.filter(app => 
        new Date(app.approvedAt || '') >= startDate
      ).length || 0;

      return {
        admin: {
          id: admin.id,
          name: admin.name,
          role: admin.role,
          store: admin.store?.name || null
        },
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        },
        activity: {
          totalApprovals: admin.approvedApplications?.length || 0,
          recentApprovals,
          averageApprovalsPerDay: days > 0 ? recentApprovals / days : 0
        }
      };
    } catch (error) {
      this.handleError('getAdminActivity', error, { adminId, days });
      return null;
    }
  }

  /**
   * Check admin permissions for specific actions
   */
  async checkPermissions(adminId: string, action: string, resourceId?: string): Promise<boolean> {
    try {
      const admin = await this.findByIdWithRelations(adminId, ['store']);
      if (!admin || admin.status !== 'active') {
        return false;
      }

      // Super admin has all permissions
      if (admin.role === 'super_admin') {
        return true;
      }

      // Store admin permissions are limited to their store
      if (admin.role === 'store_admin') {
        switch (action) {
          case 'approve_application':
          case 'manage_users':
          case 'manage_lockers':
            // Check if the resource belongs to admin's store
            if (resourceId && admin.storeId) {
              return await this.verifyStoreResource(admin.storeId, action, resourceId);
            }
            return !!admin.storeId;
          
          case 'view_store_stats':
            return !!admin.storeId;
          
          case 'manage_admins':
          case 'system_settings':
            return false; // Store admin cannot manage these
          
          default:
            return false;
        }
      }

      return false;
    } catch (error) {
      this.handleError('checkPermissions', error, { adminId, action, resourceId });
      return false;
    }
  }

  /**
   * Verify that a resource belongs to the admin's store
   */
  private async verifyStoreResource(storeId: string, action: string, resourceId: string): Promise<boolean> {
    try {
      switch (action) {
        case 'approve_application': {
          const Application = require('../models/Application').Application;
          const app = await Application.query().findById(resourceId);
          return app?.storeId === storeId;
        }
        
        case 'manage_users': {
          const User = require('../models/User').User;
          const user = await User.query().findById(resourceId);
          return user?.storeId === storeId;
        }
        
        case 'manage_lockers': {
          const Locker = require('../models/Locker').Locker;
          const locker = await Locker.query().findById(resourceId);
          return locker?.storeId === storeId;
        }
        
        default:
          return false;
      }
    } catch (error) {
      this.handleError('verifyStoreResource', error, { storeId, action, resourceId });
      return false;
    }
  }

  /**
   * Get pending work for admin (applications to review, etc.)
   */
  async getAdminWorkload(adminId: string) {
    try {
      const admin = await this.findByIdWithRelations(adminId, ['store']);
      if (!admin) {
        return null;
      }

      const Application = require('../models/Application').Application;
      
      let pendingApplications;
      
      if (admin.role === 'super_admin') {
        // Super admin sees all pending applications
        pendingApplications = await Application.query()
          .where('status', 'pending')
          .withGraphFetched('[user, store]')
          .orderBy('created_at', 'asc');
      } else if (admin.role === 'store_admin' && admin.storeId) {
        // Store admin sees only their store's applications
        pendingApplications = await Application.query()
          .where('status', 'pending')
          .where('store_id', admin.storeId)
          .withGraphFetched('[user, store]')
          .orderBy('created_at', 'asc');
      } else {
        pendingApplications = [];
      }

      return {
        admin: {
          id: admin.id,
          name: admin.name,
          role: admin.role,
          store: admin.store?.name || null
        },
        workload: {
          pendingApplications: pendingApplications.length,
          applications: pendingApplications.slice(0, 10), // Limit to 10 most urgent
          urgentApplications: pendingApplications.filter(app => {
            const daysSinceSubmitted = (new Date().getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceSubmitted > 7; // Applications older than 7 days
          }).length
        }
      };
    } catch (error) {
      this.handleError('getAdminWorkload', error, { adminId });
      return null;
    }
  }

  /**
   * Suspend admin account
   */
  async suspendAdmin(adminId: string, reason?: string): Promise<Admin | null> {
    try {
      // Cannot suspend the last active super admin
      if (reason !== 'system_check') {
        const activeSuperAdmins = await this.findSuperAdmins();
        const admin = await this.findById(adminId);
        
        if (admin?.role === 'super_admin' && activeSuperAdmins.length === 1) {
          throw new Error('Cannot suspend the last active super admin');
        }
      }

      return await this.update(adminId, { status: 'inactive' });
    } catch (error) {
      this.handleError('suspendAdmin', error, { adminId, reason });
      return null;
    }
  }

  /**
   * Reactivate admin account
   */
  async reactivateAdmin(adminId: string): Promise<Admin | null> {
    try {
      return await this.update(adminId, { status: 'active' });
    } catch (error) {
      this.handleError('reactivateAdmin', error, { adminId });
      return null;
    }
  }

  /**
   * Validate admin login credentials
   */
  async validateCredentials(phone: string, password: string): Promise<Admin | null> {
    try {
      // Find admin by phone (this method should be used only after password verification)
      const admin = await this.findByPhone(phone);
      
      if (!admin || admin.status !== 'active') {
        return null;
      }

      // Note: Password verification should be done in the service layer
      // This method assumes password has already been verified
      return admin;
    } catch (error) {
      this.handleError('validateCredentials', error, { phone });
      return null;
    }
  }

  /**
   * Get recent admin registrations
   */
  async getRecentAdmins(days = 7, limit = 20): Promise<Admin[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.createQuery()
        .where('created_at', '>=', startDate.toISOString())
        .withGraphFetched('[store]')
        .orderBy('created_at', 'desc')
        .limit(limit) as Admin[];
    } catch (error) {
      this.handleError('getRecentAdmins', error, { days, limit });
      return [];
    }
  }
}