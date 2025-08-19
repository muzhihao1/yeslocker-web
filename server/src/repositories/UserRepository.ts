/**
 * User Repository - 用户数据访问层
 * Handles all user-related database operations
 */

import { BaseRepository, SearchResult, PaginationOptions } from './BaseRepository';
import { User } from '../models/User';

export interface CreateUserData {
  phone: string;
  name: string;
  password: string;
  avatarUrl?: string;
  storeId?: string;
}

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
  storeId?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UserSearchFilters {
  phone?: string;
  name?: string;
  storeId?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  /**
   * Find user by phone number (unique identifier)
   */
  async findByPhone(phone: string): Promise<User | null> {
    try {
      return await this.findOneBy('phone', phone);
    } catch (error) {
      this.handleError('findByPhone', error, { phone });
      return null;
    }
  }

  /**
   * Find user by phone with full profile
   */
  async findByPhoneWithProfile(phone: string): Promise<User | null> {
    try {
      return await this.findOneBy('phone', phone, [
        'store',
        'assignedLocker.store',
        'applications(orderByNewest)',
        'lockerRecords(orderByNewest).locker'
      ]);
    } catch (error) {
      this.handleError('findByPhoneWithProfile', error, { phone });
      return null;
    }
  }

  /**
   * Create new user with validation
   */
  async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      // Check if phone already exists
      const existingUser = await this.findByPhone(userData.phone);
      if (existingUser) {
        throw new Error('Phone number already registered');
      }

      return await this.create(userData);
    } catch (error) {
      this.handleError('createUser', error, userData);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      return await this.update(userId, updateData);
    } catch (error) {
      this.handleError('updateProfile', error, { userId, updateData });
      return null;
    }
  }

  /**
   * Find users by store
   */
  async findByStore(storeId: string, options?: { includeInactive?: boolean }): Promise<User[]> {
    try {
      const conditions: any = { storeId };
      
      if (!options?.includeInactive) {
        conditions.status = 'active';
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'desc' },
        relations: ['assignedLocker']
      });
    } catch (error) {
      this.handleError('findByStore', error, { storeId, options });
      return [];
    }
  }

  /**
   * Search users with filters and pagination
   */
  async searchUsers(
    filters: UserSearchFilters,
    pagination: PaginationOptions
  ): Promise<SearchResult<User>> {
    try {
      let query = this.createQuery();

      // Apply filters
      if (filters.phone) {
        query = query.whereILike('phone', `%${filters.phone}%`);
      }

      if (filters.name) {
        query = query.whereILike('name', `%${filters.name}%`);
      }

      if (filters.storeId) {
        query = query.where('store_id', filters.storeId);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      // Add relations
      query = query.withGraphFetched('[store, assignedLocker]');

      // Apply pagination
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 20, 100);

      const result = await query
        .orderBy('created_at', 'desc')
        .page(page - 1, pageSize);

      return {
        data: result.results as User[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('searchUsers', error, { filters, pagination });
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
   * Get active users with locker assignments
   */
  async getActiveUsersWithLockers(): Promise<User[]> {
    try {
      return await this.findWhere({ status: 'active' }, {
        relations: ['assignedLocker.store', 'store']
      });
    } catch (error) {
      this.handleError('getActiveUsersWithLockers', error);
      return [];
    }
  }

  /**
   * Get users with pending applications
   */
  async getUsersWithPendingApplications(): Promise<User[]> {
    try {
      const query = this.createQuery()
        .withGraphFetched('[applications(pending), store]')
        .whereExists(
          User.relatedQuery('applications').where('status', 'pending')
        );

      return await query as User[];
    } catch (error) {
      this.handleError('getUsersWithPendingApplications', error);
      return [];
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(storeId?: string) {
    try {
      let baseQuery = this.createQuery();
      
      if (storeId) {
        baseQuery = baseQuery.where('store_id', storeId);
      }

      const [
        totalUsers,
        activeUsers,
        usersWithLockers,
        usersWithPendingApps
      ] = await Promise.all([
        baseQuery.clone().resultSize(),
        baseQuery.clone().where('status', 'active').resultSize(),
        baseQuery.clone().whereNotNull('id').whereExists(
          User.relatedQuery('assignedLocker')
        ).resultSize(),
        baseQuery.clone().whereExists(
          User.relatedQuery('applications').where('status', 'pending')
        ).resultSize()
      ]);

      return {
        total: totalUsers,
        active: activeUsers,
        withLockers: usersWithLockers,
        withPendingApplications: usersWithPendingApps,
        utilizationRate: totalUsers > 0 ? (usersWithLockers / totalUsers) * 100 : 0
      };
    } catch (error) {
      this.handleError('getUserStats', error, { storeId });
      return {
        total: 0,
        active: 0,
        withLockers: 0,
        withPendingApplications: 0,
        utilizationRate: 0
      };
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<boolean> {
    try {
      const result = await this.update(userId, {
        lastActiveAt: new Date().toISOString()
      } as UpdateUserData);
      return !!result;
    } catch (error) {
      this.handleError('updateLastActive', error, { userId });
      return false;
    }
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string, reason?: string): Promise<User | null> {
    try {
      // TODO: Log suspension reason in a separate audit table
      return await this.update(userId, { status: 'suspended' });
    } catch (error) {
      this.handleError('suspendUser', error, { userId, reason });
      return null;
    }
  }

  /**
   * Reactivate suspended user
   */
  async reactivateUser(userId: string): Promise<User | null> {
    try {
      return await this.update(userId, { status: 'active' });
    } catch (error) {
      this.handleError('reactivateUser', error, { userId });
      return null;
    }
  }

  /**
   * Find inactive users (for cleanup)
   */
  async findInactiveUsers(daysSinceLastActive = 90): Promise<User[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActive);

      return await this.createQuery()
        .where('last_active_at', '<', cutoffDate.toISOString())
        .where('status', 'active')
        .orderBy('last_active_at', 'asc') as User[];
    } catch (error) {
      this.handleError('findInactiveUsers', error, { daysSinceLastActive });
      return [];
    }
  }

  /**
   * Get recently registered users
   */
  async getRecentUsers(days = 7, limit = 20): Promise<User[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.createQuery()
        .where('created_at', '>=', startDate.toISOString())
        .withGraphFetched('[store]')
        .orderBy('created_at', 'desc')
        .limit(limit) as User[];
    } catch (error) {
      this.handleError('getRecentUsers', error, { days, limit });
      return [];
    }
  }

  /**
   * Validate user ownership (for security)
   */
  async validateUserAccess(userId: string, phone: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      return user?.phone === phone;
    } catch (error) {
      this.handleError('validateUserAccess', error, { userId, phone });
      return false;
    }
  }

  /**
   * Check if user can apply for locker
   */
  async canApplyForLocker(userId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user || user.status !== 'active') {
        return false;
      }

      // Check for existing pending application
      const hasActiveApplication = await User.relatedQuery('applications')
        .for(userId)
        .where('status', 'pending')
        .resultSize();

      // Check if already has assigned locker
      const hasAssignedLocker = await User.relatedQuery('assignedLocker')
        .for(userId)
        .resultSize();

      return hasActiveApplication === 0 && hasAssignedLocker === 0;
    } catch (error) {
      this.handleError('canApplyForLocker', error, { userId });
      return false;
    }
  }
}