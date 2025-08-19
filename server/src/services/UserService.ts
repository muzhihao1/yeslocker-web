/**
 * User Service - 用户服务层
 * Handles business logic for user management, registration, profile updates, and user operations
 */

import { BaseService, ServiceResponse } from './BaseService';
import { UserRepository } from '../models/UserRepository';
import { ApplicationRepository } from '../models/ApplicationRepository';
import { LockerRecordRepository } from '../models/LockerRecordRepository';

export interface CreateUserData {
  phone: string;
  name: string;
  store_id: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateUserData {
  name?: string;
  store_id?: string;
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

export interface UserSearchFilters {
  store_id?: string;
  status?: string;
  search?: string; // Search in name or phone
  created_after?: string;
  created_before?: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  usersThisMonth: number;
  usersToday: number;
}

export class UserService extends BaseService {
  private userRepo: UserRepository;
  private applicationRepo: ApplicationRepository;
  private recordRepo: LockerRecordRepository;

  constructor() {
    super('UserService');
    this.userRepo = new UserRepository();
    this.applicationRepo = new ApplicationRepository();
    this.recordRepo = new LockerRecordRepository();
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<ServiceResponse<any>> {
    return this.executeOperation('createUser', async () => {
      // Validate required fields
      const validation = this.validateRequired(userData, ['phone', 'name', 'store_id']);
      if (validation) {
        return validation;
      }

      // Validate phone format
      if (!this.validatePhone(userData.phone)) {
        return this.createErrorResponse('手机号格式不正确', null, 400);
      }

      // Validate store_id format
      if (!this.validateUUID(userData.store_id)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if phone already exists
      const existingUser = await this.userRepo.findByPhone(userData.phone);
      if (existingUser) {
        return this.createErrorResponse('手机号已被注册', null, 409);
      }

      // Sanitize input data
      const sanitizedData = {
        phone: this.sanitizeString(userData.phone),
        name: this.sanitizeString(userData.name, 50),
        store_id: userData.store_id,
        status: userData.status || 'active'
      };

      // Create user
      const user = await this.userRepo.create(sanitizedData);

      return this.createSuccessResponse(user, '用户创建成功');
    }, { phone: userData.phone, store_id: userData.store_id });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('getUserById', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      const user = await this.userRepo.findById(userId);
      if (!user) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      return this.createSuccessResponse(user, '获取用户信息成功');
    }, { userId });
  }

  /**
   * Get user by phone number
   */
  async getUserByPhone(phone: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('getUserByPhone', async () => {
      if (!this.validatePhone(phone)) {
        return this.createErrorResponse('手机号格式不正确', null, 400);
      }

      const user = await this.userRepo.findByPhone(phone);
      if (!user) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      return this.createSuccessResponse(user, '获取用户信息成功');
    }, { phone });
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateData: UpdateUserData): Promise<ServiceResponse<any>> {
    return this.executeOperation('updateUser', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Check if user exists
      const existingUser = await this.userRepo.findById(userId);
      if (!existingUser) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      // Validate store_id if provided
      if (updateData.store_id && !this.validateUUID(updateData.store_id)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Validate status if provided
      if (updateData.status && !['active', 'inactive', 'suspended'].includes(updateData.status)) {
        return this.createErrorResponse('用户状态无效', null, 400);
      }

      // Sanitize update data
      const sanitizedData: any = {};
      if (updateData.name) {
        sanitizedData.name = this.sanitizeString(updateData.name, 50);
      }
      if (updateData.store_id) {
        sanitizedData.store_id = updateData.store_id;
      }
      if (updateData.status) {
        sanitizedData.status = updateData.status;
      }
      if (updateData.notes !== undefined) {
        sanitizedData.notes = this.sanitizeString(updateData.notes, 500);
      }

      // Update user
      const updatedUser = await this.userRepo.update(userId, sanitizedData);

      return this.createSuccessResponse(updatedUser, '用户信息更新成功');
    }, { userId, updateFields: Object.keys(updateData) });
  }

  /**
   * Get users with pagination and filters
   */
  async getUsers(
    page: number = 1,
    pageSize: number = 20,
    filters: UserSearchFilters = {}
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getUsers', async () => {
      // Parse and validate pagination
      const pagination = this.parsePaginationParams(page, pageSize);

      // Validate UUID filters
      if (filters.store_id && !this.validateUUID(filters.store_id)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Validate status filter
      if (filters.status && !['active', 'inactive', 'suspended'].includes(filters.status)) {
        return this.createErrorResponse('用户状态无效', null, 400);
      }

      // Sanitize search filter
      if (filters.search) {
        filters.search = this.sanitizeString(filters.search, 100);
      }

      // Get users with filters
      const { users, total } = await this.userRepo.findWithFilters(
        pagination.page,
        pagination.pageSize,
        filters
      );

      return this.createPaginatedResponse(
        users,
        total,
        pagination.page,
        pagination.pageSize,
        '获取用户列表成功'
      );
    }, { page, pageSize, filters });
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<ServiceResponse<void>> {
    return this.executeOperation('deleteUser', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Check if user exists
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      // Check if user has active applications
      const activeApplications = await this.applicationRepo.findByUserId(userId, { status: 'pending' });
      if (activeApplications && activeApplications.length > 0) {
        return this.createErrorResponse('用户有待审核的申请，无法删除', null, 409);
      }

      // Check if user has active locker records
      const activeRecords = await this.recordRepo.findByUserId(userId, { status: 'checked_in' });
      if (activeRecords && activeRecords.length > 0) {
        return this.createErrorResponse('用户有未归还的物品，无法删除', null, 409);
      }

      // Soft delete user
      await this.userRepo.softDelete(userId);

      return this.createSuccessResponse(undefined, '用户删除成功');
    }, { userId });
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string, reason?: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('suspendUser', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      const updateData: UpdateUserData = {
        status: 'suspended',
        notes: reason ? this.sanitizeString(reason, 500) : undefined
      };

      return await this.updateUser(userId, updateData);
    }, { userId, reason });
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('activateUser', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      const updateData: UpdateUserData = {
        status: 'active'
      };

      return await this.updateUser(userId, updateData);
    }, { userId });
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(storeId?: string): Promise<ServiceResponse<UserStatistics>> {
    return this.executeOperation('getUserStatistics', async () => {
      // Validate store_id if provided
      if (storeId && !this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      const stats = await this.userRepo.getUserStatistics(storeId);

      return this.createSuccessResponse(stats, '获取用户统计成功');
    }, { storeId });
  }

  /**
   * Get user's application history
   */
  async getUserApplications(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getUserApplications', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Check if user exists
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      const pagination = this.parsePaginationParams(page, pageSize);

      const { applications, total } = await this.applicationRepo.findByUserIdWithPagination(
        userId,
        pagination.page,
        pagination.pageSize
      );

      return this.createPaginatedResponse(
        applications,
        total,
        pagination.page,
        pagination.pageSize,
        '获取用户申请记录成功'
      );
    }, { userId, page, pageSize });
  }

  /**
   * Get user's locker usage history
   */
  async getUserLockerRecords(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getUserLockerRecords', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Check if user exists
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      const pagination = this.parsePaginationParams(page, pageSize);

      const { records, total } = await this.recordRepo.findByUserIdWithPagination(
        userId,
        pagination.page,
        pagination.pageSize
      );

      return this.createPaginatedResponse(
        records,
        total,
        pagination.page,
        pagination.pageSize,
        '获取用户使用记录成功'
      );
    }, { userId, page, pageSize });
  }

  /**
   * Check if phone number is available for registration
   */
  async isPhoneAvailable(phone: string): Promise<ServiceResponse<{ available: boolean }>> {
    return this.executeOperation('isPhoneAvailable', async () => {
      if (!this.validatePhone(phone)) {
        return this.createErrorResponse('手机号格式不正确', null, 400);
      }

      const existingUser = await this.userRepo.findByPhone(phone);
      const available = !existingUser;

      return this.createSuccessResponse(
        { available },
        available ? '手机号可用' : '手机号已被注册'
      );
    }, { phone });
  }

  /**
   * Get user profile with related data
   */
  async getUserProfile(userId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('getUserProfile', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Get user details
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      // Get user's latest application
      const latestApplication = await this.applicationRepo.findLatestByUserId(userId);

      // Get user's active locker record
      const activeRecord = await this.recordRepo.findActiveByUserId(userId);

      // Get summary statistics
      const applicationCount = await this.applicationRepo.countByUserId(userId);
      const recordCount = await this.recordRepo.countByUserId(userId);

      const profile = {
        ...user,
        latestApplication,
        activeRecord,
        statistics: {
          totalApplications: applicationCount,
          totalRecords: recordCount
        }
      };

      return this.createSuccessResponse(profile, '获取用户档案成功');
    }, { userId });
  }
}