/**
 * Authentication Controller - 认证控制器层
 * Handles HTTP requests for authentication, login, token verification, and user management
 */

import { Request, Response } from 'express';
import { BaseController, AuthenticatedRequest } from './BaseController';
import { AuthService, LoginCredentials } from '../services/AuthService';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super('AuthController');
    this.authService = new AuthService();
  }

  /**
   * POST /api/auth/login
   * Admin login with phone and password
   */
  public login = this.asyncHandler(async (req: Request, res: Response) => {
    this.logRequest(req, 'login', { phone: req.body.phone });

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['phone', 'password'])) {
      return;
    }

    const credentials: LoginCredentials = {
      phone: req.body.phone,
      password: req.body.password
    };

    const result = await this.authService.authenticateAdmin(credentials);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/auth/refresh
   * Refresh JWT token
   */
  public refreshToken = this.asyncHandler(async (req: Request, res: Response) => {
    this.logRequest(req, 'refreshToken');

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      this.sendError(res, '缺少认证头', 401);
      return;
    }

    const result = await this.authService.refreshToken(authHeader);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/auth/logout
   * Logout current user
   */
  public logout = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'logout');

    const user = this.getAuthenticatedUser(req);
    if (!user) {
      this.sendError(res, '用户未认证', 401);
      return;
    }

    const result = await this.authService.logout(user.adminId);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/auth/me
   * Get current user information
   */
  public getCurrentUser = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getCurrentUser');

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      this.sendError(res, '缺少认证头', 401);
      return;
    }

    const result = await this.authService.getCurrentUser(authHeader);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/auth/change-password
   * Change current user's password
   */
  public changePassword = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'changePassword');

    const user = this.getAuthenticatedUser(req);
    if (!user) {
      this.sendError(res, '用户未认证', 401);
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['currentPassword', 'newPassword'])) {
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      this.sendError(res, '新密码与确认密码不匹配', 400);
      return;
    }

    const result = await this.authService.changePassword(
      user.adminId,
      currentPassword,
      newPassword
    );

    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/auth/verify-token
   * Verify JWT token validity (for middleware use)
   */
  public verifyToken = this.asyncHandler(async (req: Request, res: Response) => {
    this.logRequest(req, 'verifyToken');

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      this.sendError(res, '缺少认证头', 401);
      return;
    }

    const result = await this.authService.verifyToken(authHeader);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/auth/check-permissions
   * Check if user has specific permissions
   */
  public checkPermissions = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'checkPermissions', req.query);

    const user = this.getAuthenticatedUser(req);
    if (!user) {
      this.sendError(res, '用户未认证', 401);
      return;
    }

    const { resource, action } = req.query;

    if (!resource || !action) {
      this.sendError(res, '缺少权限检查参数', 400, {
        required: ['resource', 'action']
      });
      return;
    }

    const hasPermission = await this.authService.hasPermission(
      user,
      resource as string,
      action as string
    );

    this.sendSuccess(res, {
      hasPermission,
      resource,
      action,
      userRole: user.role
    }, '权限检查完成');
  });

  /**
   * GET /api/auth/roles
   * Get available roles and their permissions
   */
  public getRoles = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getRoles');

    const user = this.getAuthenticatedUser(req);
    if (!user) {
      this.sendError(res, '用户未认证', 401);
      return;
    }

    // Only super admin can view role information
    if (!this.authService.isSuperAdmin(user)) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    const roles = [
      {
        role: 'super_admin',
        name: '超级管理员',
        description: '拥有所有权限，可以管理系统的所有功能',
        permissions: ['*']
      },
      {
        role: 'store_admin',
        name: '门店管理员',
        description: '可以管理门店相关的用户、申请、储物柜等',
        permissions: [
          'users:read',
          'users:update',
          'applications:read',
          'applications:update',
          'lockers:read',
          'lockers:update',
          'records:read',
          'stores:read'
        ]
      },
      {
        role: 'admin',
        name: '普通管理员',
        description: '基础权限，只能查看自己的信息和仪表板',
        permissions: [
          'dashboard:read',
          'profile:read',
          'profile:update'
        ]
      }
    ];

    this.sendSuccess(res, { roles }, '获取角色列表成功');
  });

  /**
   * POST /api/auth/validate-password
   * Validate password strength (utility endpoint)
   */
  public validatePassword = this.asyncHandler(async (req: Request, res: Response) => {
    this.logRequest(req, 'validatePassword');

    if (!this.validateRequiredFields(req, res, ['password'])) {
      return;
    }

    const { password } = req.body;
    const validation = this.authService.validatePasswordStrength(password);

    this.sendSuccess(res, validation, '密码强度验证完成');
  });

  /**
   * GET /api/auth/session-info
   * Get session information for debugging
   */
  public getSessionInfo = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getSessionInfo');

    const user = this.getAuthenticatedUser(req);
    if (!user) {
      this.sendError(res, '用户未认证', 401);
      return;
    }

    const sessionInfo = {
      user: {
        adminId: user.adminId,
        phone: user.phone,
        name: user.name,
        role: user.role
      },
      session: {
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      },
      permissions: {
        isSuperAdmin: this.authService.isSuperAdmin(user),
        isStoreAdmin: this.authService.isStoreAdmin(user)
      }
    };

    this.sendSuccess(res, sessionInfo, '获取会话信息成功');
  });
}

export default new AuthController();