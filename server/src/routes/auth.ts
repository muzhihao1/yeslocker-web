/**
 * Authentication Routes - 认证路由
 * Handles all authentication-related endpoints
 */

import { Router } from 'express';
import authController from '../controllers/AuthController';
import { authenticateToken, rateLimit, validateContentType } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Admin login with phone and password
 * @access  Public
 */
router.post('/login', 
  rateLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  validateContentType,
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Protected (requires valid token)
 */
router.post('/refresh',
  validateContentType,
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current user
 * @access  Protected
 */
router.post('/logout',
  authenticateToken,
  authController.logout
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Protected
 */
router.get('/me',
  authenticateToken,
  authController.getCurrentUser
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change current user's password
 * @access  Protected
 */
router.post('/change-password',
  authenticateToken,
  validateContentType,
  authController.changePassword
);

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify JWT token validity (for middleware use)
 * @access  Protected
 */
router.post('/verify-token',
  authController.verifyToken
);

/**
 * @route   GET /api/auth/check-permissions
 * @desc    Check if user has specific permissions
 * @access  Protected
 */
router.get('/check-permissions',
  authenticateToken,
  authController.checkPermissions
);

/**
 * @route   GET /api/auth/roles
 * @desc    Get available roles and their permissions
 * @access  Protected (Super Admin only)
 */
router.get('/roles',
  authenticateToken,
  authController.getRoles
);

/**
 * @route   POST /api/auth/validate-password
 * @desc    Validate password strength (utility endpoint)
 * @access  Public
 */
router.post('/validate-password',
  validateContentType,
  authController.validatePassword
);

/**
 * @route   GET /api/auth/session-info
 * @desc    Get session information for debugging
 * @access  Protected
 */
router.get('/session-info',
  authenticateToken,
  authController.getSessionInfo
);

export default router;