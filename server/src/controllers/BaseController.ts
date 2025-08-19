/**
 * Base Controller - 基础控制器层
 * Provides common functionality for all HTTP controllers
 */

import { Request, Response, NextFunction } from 'express';
import { ServiceResponse } from '../services/BaseService';

export interface PaginationQuery {
  page?: string;
  pageSize?: string;
  limit?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    adminId: string;
    phone: string;
    name: string;
    role: string;
  };
}

export abstract class BaseController {
  protected controllerName: string;

  constructor(controllerName: string) {
    this.controllerName = controllerName;
  }

  /**
   * Send successful HTTP response
   */
  protected sendSuccess<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error HTTP response
   */
  protected sendError(
    res: Response,
    error: string,
    statusCode = 500,
    details?: any
  ): void {
    res.status(statusCode).json({
      success: false,
      error,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle service response and send appropriate HTTP response
   */
  protected handleServiceResponse<T>(
    res: Response,
    serviceResponse: ServiceResponse<T>,
    successStatusCode = 200
  ): void {
    if (serviceResponse.success) {
      this.sendSuccess(
        res,
        serviceResponse.data,
        serviceResponse.message,
        successStatusCode
      );
    } else {
      this.sendError(
        res,
        serviceResponse.error || 'Unknown error',
        serviceResponse.statusCode || 500,
        serviceResponse.details
      );
    }
  }

  /**
   * Validate required fields in request body
   */
  protected validateRequiredFields(
    req: Request,
    res: Response,
    requiredFields: string[]
  ): boolean {
    const missingFields = requiredFields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      this.sendError(
        res,
        '缺少必需参数',
        400,
        { missingFields }
      );
      return false;
    }

    return true;
  }

  /**
   * Parse pagination parameters from query string
   */
  protected parsePagination(req: Request): { page: number; pageSize: number } {
    const { page, pageSize, limit } = req.query as PaginationQuery;
    
    // Support both 'pageSize' and 'limit' parameter names
    const size = pageSize || limit;
    
    const parsedPage = Math.max(1, parseInt(page || '1'));
    const parsedPageSize = Math.min(100, Math.max(1, parseInt(size || '20')));
    
    return {
      page: parsedPage,
      pageSize: parsedPageSize
    };
  }

  /**
   * Parse filter parameters from query string
   */
  protected parseFilters(
    req: Request,
    allowedFilters: string[]
  ): Record<string, any> {
    const filters: Record<string, any> = {};
    
    allowedFilters.forEach(filter => {
      const value = req.query[filter];
      if (value !== undefined && value !== null && value !== '') {
        filters[filter] = value;
      }
    });
    
    return filters;
  }

  /**
   * Extract authenticated user from request
   */
  protected getAuthenticatedUser(req: AuthenticatedRequest): {
    adminId: string;
    phone: string;
    name: string;
    role: string;
  } | null {
    return req.user || null;
  }

  /**
   * Check if user has required role
   */
  protected hasRole(req: AuthenticatedRequest, requiredRole: string): boolean {
    const user = this.getAuthenticatedUser(req);
    return user?.role === requiredRole;
  }

  /**
   * Check if user is super admin
   */
  protected isSuperAdmin(req: AuthenticatedRequest): boolean {
    return this.hasRole(req, 'super_admin');
  }

  /**
   * Check if user is store admin
   */
  protected isStoreAdmin(req: AuthenticatedRequest): boolean {
    return this.hasRole(req, 'store_admin');
  }

  /**
   * Log HTTP request
   */
  protected logRequest(
    req: Request,
    action: string,
    params?: any
  ): void {
    console.log(`🌐 Controller [${this.controllerName}.${action}]:`, {
      method: req.method,
      path: req.path,
      params: this.sanitizeLogParams(params),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeLogParams(params: any): any {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sanitized = { ...params };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }

  /**
   * Create async route handler with error catching
   */
  protected asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Validate UUID parameter
   */
  protected validateUUIDParam(
    req: Request,
    res: Response,
    paramName: string
  ): boolean {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!id || !uuidRegex.test(id)) {
      this.sendError(
        res,
        `无效的${paramName}参数`,
        400,
        { paramName, providedValue: id }
      );
      return false;
    }
    
    return true;
  }

  /**
   * Send paginated response
   */
  protected sendPaginatedResponse<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message?: string
  ): void {
    const totalPages = Math.ceil(total / pageSize);
    
    this.sendSuccess(res, {
      list: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    }, message);
  }

  /**
   * Handle async errors in controller methods
   */
  protected handleControllerError(
    res: Response,
    error: any,
    operation: string,
    context?: any
  ): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Controller Error [${this.controllerName}.${operation}]:`, {
      error: errorMessage,
      context,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate HTTP status code
    let statusCode = 500;
    let userMessage = '系统错误，请稍后重试';

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('不存在')) {
        statusCode = 404;
        userMessage = '请求的资源不存在';
      } else if (error.message.includes('already exists') || error.message.includes('已存在')) {
        statusCode = 409;
        userMessage = '资源已存在';
      } else if (error.message.includes('unauthorized') || error.message.includes('无权限')) {
        statusCode = 403;
        userMessage = '权限不足';
      } else if (error.message.includes('invalid') || error.message.includes('无效')) {
        statusCode = 400;
        userMessage = '请求参数无效';
      }
    }

    this.sendError(res, userMessage, statusCode, {
      operation,
      timestamp: new Date().toISOString(),
      // Only include technical details in development
      technical: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }

  /**
   * Extract request IP address
   */
  protected getClientIP(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection as any).socket?.remoteAddress ||
           'unknown';
  }

  /**
   * Check if request is from trusted source
   */
  protected isTrustedRequest(req: Request): boolean {
    // Add your trusted IP ranges or authentication checks here
    return true; // Placeholder - implement based on your security requirements
  }

  /**
   * Rate limiting helper (placeholder for future implementation)
   */
  protected checkRateLimit(req: Request, key: string): boolean {
    // Implement rate limiting logic here
    // This is a placeholder for future rate limiting implementation
    return true;
  }

  /**
   * Extract and validate sort parameters
   */
  protected parseSortParams(
    req: Request,
    allowedFields: string[]
  ): { field: string; direction: 'asc' | 'desc' } | null {
    const { sortBy, sortOrder } = req.query;
    
    if (!sortBy || !allowedFields.includes(sortBy as string)) {
      return null;
    }
    
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    
    return {
      field: sortBy as string,
      direction
    };
  }
}