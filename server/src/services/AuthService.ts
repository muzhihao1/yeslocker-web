/**
 * Authentication Service - 认证服务层
 * Handles JWT authentication, login, token verification, and user session management
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { BaseService, ServiceResponse } from './BaseService';
import { AdminRepository } from '../repositories/AdminRepository';
import { UserRepository } from '../repositories/UserRepository';

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresIn: string;
  adminId: string;
  phone: string;
  name: string;
  role: string;
}

export interface DecodedToken {
  adminId: string;
  phone: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export interface UserAuthInfo {
  adminId: string;
  phone: string;
  name: string;
  role: string;
}

export class AuthService extends BaseService {
  private adminRepo: AdminRepository;
  private userRepo: UserRepository;
  private jwtSecret: string;
  private tokenExpirationTime: string;

  constructor() {
    super('AuthService');
    this.adminRepo = new AdminRepository();
    this.userRepo = new UserRepository();
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.tokenExpirationTime = process.env.JWT_EXPIRES_IN || '24h';

    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET not set in environment variables, using fallback');
    }
  }

  /**
   * Authenticate admin user with phone and password
   */
  async authenticateAdmin(credentials: LoginCredentials): Promise<ServiceResponse<AuthToken>> {
    return this.executeOperation('authenticateAdmin', async () => {
      // Validate input
      const validation = this.validateRequired(credentials, ['phone', 'password']);
      if (validation) {
        return validation;
      }

      // Validate phone format
      if (!this.validatePhone(credentials.phone)) {
        return this.createErrorResponse('手机号格式不正确', null, 400);
      }

      // Sanitize inputs
      const phone = this.sanitizeString(credentials.phone);
      const password = credentials.password.trim();

      // Find admin by phone
      const admin = await this.adminRepo.findByPhone(phone);
      if (!admin) {
        // Use generic message to prevent phone enumeration
        return this.createErrorResponse('手机号或密码错误', null, 401);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return this.createErrorResponse('手机号或密码错误', null, 401);
      }

      // Check if admin is active
      if (!admin.is_active) {
        return this.createErrorResponse('账号已被禁用，请联系系统管理员', null, 403);
      }

      // Generate JWT token
      const tokenPayload: Omit<UserAuthInfo, never> = {
        adminId: admin.id,
        phone: admin.phone,
        name: admin.name,
        role: admin.role
      };

      const token = jwt.sign(
        tokenPayload,
        this.jwtSecret,
        { 
          expiresIn: this.tokenExpirationTime,
          issuer: 'yeslocker-api',
          audience: 'yeslocker-admin'
        }
      );

      // Update last login time
      await this.adminRepo.updateLastLogin(admin.id);

      const authToken: AuthToken = {
        token,
        expiresIn: this.tokenExpirationTime,
        adminId: admin.id,
        phone: admin.phone,
        name: admin.name,
        role: admin.role
      };

      this.logOperation('authenticateAdmin', { phone }, { success: true });

      return this.createSuccessResponse(authToken, '登录成功');
    }, { phone: credentials.phone });
  }

  /**
   * Verify JWT token and extract user information
   */
  async verifyToken(token: string): Promise<ServiceResponse<UserAuthInfo>> {
    return this.executeOperation('verifyToken', async () => {
      if (!token) {
        return this.createErrorResponse('缺少访问令牌', null, 401);
      }

      try {
        // Remove 'Bearer ' prefix if present
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

        // Verify and decode token
        const decoded = jwt.verify(
          cleanToken,
          this.jwtSecret,
          {
            issuer: 'yeslocker-api',
            audience: 'yeslocker-admin'
          }
        ) as DecodedToken;

        // Validate required fields in token
        if (!decoded.adminId || !decoded.phone || !decoded.role) {
          return this.createErrorResponse('令牌格式无效', null, 401);
        }

        // Check if admin still exists and is active
        const admin = await this.adminRepo.findById(decoded.adminId);
        if (!admin) {
          return this.createErrorResponse('用户不存在', null, 401);
        }

        if (!admin.is_active) {
          return this.createErrorResponse('账号已被禁用', null, 403);
        }

        // Check for role changes (admin role might have been updated)
        if (admin.role !== decoded.role) {
          return this.createErrorResponse('权限已变更，请重新登录', null, 401);
        }

        const userAuthInfo: UserAuthInfo = {
          adminId: decoded.adminId,
          phone: decoded.phone,
          name: decoded.name || admin.name,
          role: decoded.role
        };

        return this.createSuccessResponse(userAuthInfo, '令牌验证成功');

      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return this.createErrorResponse('令牌已过期，请重新登录', null, 401);
        } else if (error instanceof jwt.JsonWebTokenError) {
          return this.createErrorResponse('令牌格式无效', null, 401);
        } else {
          throw error; // Let executeOperation handle other errors
        }
      }
    }, { hasToken: !!token });
  }

  /**
   * Refresh JWT token with new expiration time
   */
  async refreshToken(currentToken: string): Promise<ServiceResponse<AuthToken>> {
    return this.executeOperation('refreshToken', async () => {
      // Verify current token first
      const verificationResult = await this.verifyToken(currentToken);
      if (!this.isSuccess(verificationResult)) {
        return verificationResult;
      }

      const userInfo = verificationResult.data!;

      // Generate new token with same payload
      const tokenPayload: UserAuthInfo = {
        adminId: userInfo.adminId,
        phone: userInfo.phone,
        name: userInfo.name,
        role: userInfo.role
      };

      const newToken = jwt.sign(
        tokenPayload,
        this.jwtSecret,
        { 
          expiresIn: this.tokenExpirationTime,
          issuer: 'yeslocker-api',
          audience: 'yeslocker-admin'
        }
      );

      const authToken: AuthToken = {
        token: newToken,
        expiresIn: this.tokenExpirationTime,
        adminId: userInfo.adminId,
        phone: userInfo.phone,
        name: userInfo.name,
        role: userInfo.role
      };

      return this.createSuccessResponse(authToken, '令牌刷新成功');
    });
  }

  /**
   * Change admin password
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResponse<void>> {
    return this.executeOperation('changePassword', async () => {
      // Validate inputs
      const validation = this.validateRequired(
        { adminId, currentPassword, newPassword },
        ['adminId', 'currentPassword', 'newPassword']
      );
      if (validation) {
        return validation;
      }

      if (!this.validateUUID(adminId)) {
        return this.createErrorResponse('管理员ID格式无效', null, 400);
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return this.createErrorResponse('新密码长度至少6位', null, 400);
      }

      // Find admin
      const admin = await this.adminRepo.findById(adminId);
      if (!admin) {
        return this.createErrorResponse('管理员不存在', null, 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
      if (!isCurrentPasswordValid) {
        return this.createErrorResponse('当前密码错误', null, 400);
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.adminRepo.updatePassword(adminId, hashedNewPassword);

      return this.createSuccessResponse(undefined, '密码修改成功');
    }, { adminId });
  }

  /**
   * Check if user has specific role
   */
  hasRole(userInfo: UserAuthInfo, requiredRole: string): boolean {
    return userInfo.role === requiredRole;
  }

  /**
   * Check if user is super admin
   */
  isSuperAdmin(userInfo: UserAuthInfo): boolean {
    return this.hasRole(userInfo, 'super_admin');
  }

  /**
   * Check if user is store admin
   */
  isStoreAdmin(userInfo: UserAuthInfo): boolean {
    return this.hasRole(userInfo, 'store_admin');
  }

  /**
   * Check if user has permission to access resource
   */
  async hasPermission(
    userInfo: UserAuthInfo,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Super admin has all permissions
    if (this.isSuperAdmin(userInfo)) {
      return true;
    }

    // Store admin permissions (can be extended)
    if (this.isStoreAdmin(userInfo)) {
      const storeAdminPermissions = [
        'users:read',
        'users:update',
        'applications:read',
        'applications:update',
        'lockers:read',
        'lockers:update',
        'records:read',
        'stores:read'
      ];
      
      const permission = `${resource}:${action}`;
      return storeAdminPermissions.includes(permission);
    }

    // Regular admin permissions (minimal)
    const regularPermissions = [
      'dashboard:read',
      'profile:read',
      'profile:update'
    ];

    const permission = `${resource}:${action}`;
    return regularPermissions.includes(permission);
  }

  /**
   * Generate secure password hash
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return { isValid: false, message: '密码长度至少6位' };
    }

    if (password.length > 128) {
      return { isValid: false, message: '密码长度不能超过128位' };
    }

    // Basic strength requirements
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      return { isValid: false, message: '密码必须包含字母和数字' };
    }

    return { isValid: true };
  }

  /**
   * Logout user (invalidate token on client side)
   * Note: JWT tokens are stateless, so we rely on client-side token removal
   */
  async logout(adminId: string): Promise<ServiceResponse<void>> {
    return this.executeOperation('logout', async () => {
      if (!this.validateUUID(adminId)) {
        return this.createErrorResponse('管理员ID格式无效', null, 400);
      }

      // Log logout activity
      this.logOperation('logout', { adminId }, { success: true });

      return this.createSuccessResponse(undefined, '登出成功');
    }, { adminId });
  }

  /**
   * Get current user information from token
   */
  async getCurrentUser(token: string): Promise<ServiceResponse<UserAuthInfo & { lastLogin?: string }>> {
    return this.executeOperation('getCurrentUser', async () => {
      const verificationResult = await this.verifyToken(token);
      if (!this.isSuccess(verificationResult)) {
        return verificationResult;
      }

      const userInfo = verificationResult.data!;

      // Get additional user details
      const admin = await this.adminRepo.findById(userInfo.adminId);
      if (!admin) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      const userDetails = {
        ...userInfo,
        lastLogin: admin.last_login ? this.formatDate(admin.last_login) : undefined
      };

      return this.createSuccessResponse(userDetails, '获取用户信息成功');
    });
  }
}