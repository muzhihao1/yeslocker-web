/**
 * Authentication Middleware - 认证中间件
 * Provides JWT token verification and user authentication for protected routes
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthenticatedRequest } from '../controllers/BaseController';

const authService = new AuthService();

/**
 * Verify JWT token and authenticate user
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: '缺少认证令牌',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify token using AuthService
    const verificationResult = await authService.verifyToken(authHeader);
    
    if (!verificationResult.success) {
      res.status(verificationResult.statusCode || 401).json({
        success: false,
        error: verificationResult.error,
        details: verificationResult.details,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Attach user info to request
    req.user = verificationResult.data!;
    
    // Log authentication
    console.log(`🔐 Authenticated user: ${req.user.phone} (${req.user.role}) - ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: '认证服务错误',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Check if user has required role
 */
export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '用户未认证',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (req.user.role !== requiredRole) {
      res.status(403).json({
        success: false,
        error: '权限不足',
        details: { required: requiredRole, current: req.user.role },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Check if user is super admin
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Check if user is store admin or super admin
 */
export const requireStoreAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: '用户未认证',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const allowedRoles = ['super_admin', 'store_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: '权限不足',
      details: { required: allowedRoles, current: req.user.role },
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Check if user has any admin role
 */
export const requireAnyAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: '用户未认证',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const allowedRoles = ['super_admin', 'store_admin', 'admin'];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: '需要管理员权限',
      details: { required: allowedRoles, current: req.user.role },
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Optional authentication - adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const verificationResult = await authService.verifyToken(authHeader);
      if (verificationResult.success) {
        req.user = verificationResult.data!;
      }
    }
    
    next();
  } catch (error) {
    // In optional auth, we don't fail the request if token verification fails
    console.warn('⚠️  Optional auth failed:', error);
    next();
  }
};

/**
 * Rate limiting middleware (placeholder for future implementation)
 */
export const rateLimit = (maxRequests: number, windowMs: number) => {
  // This is a placeholder for future rate limiting implementation
  // In production, you might use express-rate-limit or similar
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Implement actual rate limiting logic
    next();
  };
};

/**
 * Request validation middleware
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  // Only check for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        success: false,
        error: '请求必须使用 application/json 格式',
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
  
  next();
};

/**
 * Request logging middleware
 */
export const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log request start
  console.log(`🌐 ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`);
  
  // Log response time when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${statusColor} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('💥 Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    details: isDevelopment ? {
      message: error.message,
      stack: error.stack
    } : undefined,
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: '请求的资源不存在',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

/**
 * CORS middleware for development
 */
export const corsHandler = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',  // User app dev
    'http://localhost:5173',  // Admin panel dev
    'http://localhost:4173',  // Admin panel preview
    'https://yeslocker-web-production-314a.up.railway.app'  // Production
  ];

  if (allowedOrigins.includes(origin as string)) {
    res.setHeader('Access-Control-Allow-Origin', origin as string);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};