/**
 * User Controller - 用户控制器层
 * Handles HTTP requests for user management, registration, profile updates, and user operations
 */

import { Request, Response } from 'express';
import { BaseController, AuthenticatedRequest } from './BaseController';
import { UserService, CreateUserData, UpdateUserData, UserSearchFilters } from '../services/UserService';

export class UserController extends BaseController {
  private userService: UserService;

  constructor() {
    super('UserController');
    this.userService = new UserService();
  }

  /**
   * POST /api/users
   * Create a new user
   */
  public createUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'createUser', { phone: req.body.phone, store_id: req.body.store_id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['phone', 'name', 'store_id'])) {
      return;
    }

    const userData: CreateUserData = {
      phone: req.body.phone,
      name: req.body.name,
      store_id: req.body.store_id,
      status: req.body.status
    };

    const result = await this.userService.createUser(userData);
    this.handleServiceResponse(res, result, 201);
  });

  /**
   * GET /api/users
   * Get users with pagination and filters
   */
  public getUsers = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getUsers', req.query);

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    // Parse filters
    const allowedFilters = ['store_id', 'status', 'search', 'created_after', 'created_before'];
    const filters = this.parseFilters(req, allowedFilters) as UserSearchFilters;

    const result = await this.userService.getUsers(page, pageSize, filters);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/users/:id
   * Get user by ID
   */
  public getUserById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getUserById', { userId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const result = await this.userService.getUserById(req.params.id);
    this.handleServiceResponse(res, result);
  });

  /**
   * PUT /api/users/:id
   * Update user information
   */
  public updateUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'updateUser', { userId: req.params.id, updates: Object.keys(req.body) });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const updateData: UpdateUserData = {
      name: req.body.name,
      store_id: req.body.store_id,
      status: req.body.status,
      notes: req.body.notes
    };

    const result = await this.userService.updateUser(req.params.id, updateData);
    this.handleServiceResponse(res, result);
  });

  /**
   * DELETE /api/users/:id
   * Delete user (soft delete)
   */
  public deleteUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'deleteUser', { userId: req.params.id });

    // Check permissions (only super admin can delete users)
    if (!this.isSuperAdmin(req)) {
      this.sendError(res, '权限不足，只有超级管理员可以删除用户', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const result = await this.userService.deleteUser(req.params.id);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/users/:id/suspend
   * Suspend user account
   */
  public suspendUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'suspendUser', { userId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const { reason } = req.body;
    const result = await this.userService.suspendUser(req.params.id, reason);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/users/:id/activate
   * Activate user account
   */
  public activateUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'activateUser', { userId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const result = await this.userService.activateUser(req.params.id);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/users/statistics
   * Get user statistics
   */
  public getUserStatistics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getUserStatistics', req.query);

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    const { store_id } = req.query;

    // Validate store_id if provided
    if (store_id && typeof store_id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(store_id)) {
        this.sendError(res, '门店ID格式无效', 400);
        return;
      }
    }

    const result = await this.userService.getUserStatistics(store_id as string);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/users/:id/applications
   * Get user's application history
   */
  public getUserApplications = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getUserApplications', { userId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    const result = await this.userService.getUserApplications(req.params.id, page, pageSize);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/users/:id/records
   * Get user's locker usage history
   */
  public getUserRecords = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getUserRecords', { userId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    const result = await this.userService.getUserLockerRecords(req.params.id, page, pageSize);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/users/check-phone/:phone
   * Check if phone number is available for registration
   */
  public checkPhoneAvailability = this.asyncHandler(async (req: Request, res: Response) => {
    this.logRequest(req, 'checkPhoneAvailability', { phone: req.params.phone });

    const phone = req.params.phone;

    // Basic phone format validation
    if (!/^[0-9]{11}$/.test(phone)) {
      this.sendError(res, '手机号格式不正确', 400);
      return;
    }

    const result = await this.userService.isPhoneAvailable(phone);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/users/:id/profile
   * Get user profile with related data
   */
  public getUserProfile = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getUserProfile', { userId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const result = await this.userService.getUserProfile(req.params.id);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/users/search
   * Search users by phone or name
   */
  public searchUsers = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'searchUsers', { query: req.query.q });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    const { q: query } = req.query;
    
    if (!query || typeof query !== 'string') {
      this.sendError(res, '缺少搜索关键词', 400);
      return;
    }

    if (query.length < 2) {
      this.sendError(res, '搜索关键词至少2个字符', 400);
      return;
    }

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    // Search in name and phone
    const filters: UserSearchFilters = {
      search: query
    };

    const result = await this.userService.getUsers(page, pageSize, filters);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/users/batch-update
   * Batch update multiple users
   */
  public batchUpdateUsers = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'batchUpdateUsers', { count: req.body.userIds?.length });

    // Check permissions (only super admin can batch update)
    if (!this.isSuperAdmin(req)) {
      this.sendError(res, '权限不足，只有超级管理员可以批量更新用户', 403);
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['userIds', 'updateData'])) {
      return;
    }

    const { userIds, updateData } = req.body;

    // Validate userIds array
    if (!Array.isArray(userIds) || userIds.length === 0) {
      this.sendError(res, '用户ID列表不能为空', 400);
      return;
    }

    if (userIds.length > 100) {
      this.sendError(res, '批量更新用户数量不能超过100个', 400);
      return;
    }

    // Validate all UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = userIds.filter((id: string) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      this.sendError(res, '存在无效的用户ID格式', 400, { invalidIds });
      return;
    }

    // Process batch update
    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const result = await this.userService.updateUser(userId, updateData);
        if (result.success) {
          results.push({ userId, success: true });
        } else {
          errors.push({ userId, error: result.error });
        }
      } catch (error) {
        errors.push({ userId, error: 'Update failed' });
      }
    }

    this.sendSuccess(res, {
      total: userIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    }, '批量更新完成');
  });
}

export default new UserController();