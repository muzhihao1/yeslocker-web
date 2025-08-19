/**
 * User Routes - 用户路由
 * Handles all user management endpoints
 */

import { Router } from 'express';
import userController from '../controllers/UserController';
import { 
  authenticateToken, 
  requireStoreAdmin, 
  requireSuperAdmin,
  validateContentType 
} from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Protected (Store Admin or Super Admin)
 */
router.post('/',
  authenticateToken,
  requireStoreAdmin,
  validateContentType,
  userController.createUser
);

/**
 * @route   GET /api/users
 * @desc    Get users with pagination and filters
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/',
  authenticateToken,
  requireStoreAdmin,
  userController.getUsers
);

/**
 * @route   GET /api/users/statistics
 * @desc    Get user statistics
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/statistics',
  authenticateToken,
  requireStoreAdmin,
  userController.getUserStatistics
);

/**
 * @route   GET /api/users/search
 * @desc    Search users by phone or name
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/search',
  authenticateToken,
  requireStoreAdmin,
  userController.searchUsers
);

/**
 * @route   GET /api/users/check-phone/:phone
 * @desc    Check if phone number is available for registration
 * @access  Public
 */
router.get('/check-phone/:phone',
  userController.checkPhoneAvailability
);

/**
 * @route   POST /api/users/batch-update
 * @desc    Batch update multiple users
 * @access  Protected (Super Admin only)
 */
router.post('/batch-update',
  authenticateToken,
  requireSuperAdmin,
  validateContentType,
  userController.batchUpdateUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id',
  authenticateToken,
  requireStoreAdmin,
  userController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user information
 * @access  Protected (Store Admin or Super Admin)
 */
router.put('/:id',
  authenticateToken,
  requireStoreAdmin,
  validateContentType,
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Protected (Super Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireSuperAdmin,
  userController.deleteUser
);

/**
 * @route   POST /api/users/:id/suspend
 * @desc    Suspend user account
 * @access  Protected (Store Admin or Super Admin)
 */
router.post('/:id/suspend',
  authenticateToken,
  requireStoreAdmin,
  validateContentType,
  userController.suspendUser
);

/**
 * @route   POST /api/users/:id/activate
 * @desc    Activate user account
 * @access  Protected (Store Admin or Super Admin)
 */
router.post('/:id/activate',
  authenticateToken,
  requireStoreAdmin,
  userController.activateUser
);

/**
 * @route   GET /api/users/:id/applications
 * @desc    Get user's application history
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id/applications',
  authenticateToken,
  requireStoreAdmin,
  userController.getUserApplications
);

/**
 * @route   GET /api/users/:id/records
 * @desc    Get user's locker usage history
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id/records',
  authenticateToken,
  requireStoreAdmin,
  userController.getUserRecords
);

/**
 * @route   GET /api/users/:id/profile
 * @desc    Get user profile with related data
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id/profile',
  authenticateToken,
  requireStoreAdmin,
  userController.getUserProfile
);

export default router;