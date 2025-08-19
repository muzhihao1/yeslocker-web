/**
 * Store Routes - 门店路由
 * Handles all store management endpoints
 */

import { Router } from 'express';
import storeController from '../controllers/StoreController';
import { 
  authenticateToken, 
  requireStoreAdmin, 
  requireSuperAdmin,
  validateContentType,
  optionalAuth 
} from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/stores
 * @desc    Create a new store
 * @access  Protected (Super Admin only)
 */
router.post('/',
  authenticateToken,
  requireSuperAdmin,
  validateContentType,
  storeController.createStore
);

/**
 * @route   GET /api/stores
 * @desc    Get stores with pagination and filters
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/',
  authenticateToken,
  requireStoreAdmin,
  storeController.getStores
);

/**
 * @route   GET /api/stores/active
 * @desc    Get all active stores (simple list for dropdowns)
 * @access  Public/Optional Auth (for user app)
 */
router.get('/active',
  optionalAuth,
  storeController.getActiveStores
);

/**
 * @route   GET /api/stores/search
 * @desc    Search stores by name or address
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/search',
  authenticateToken,
  requireStoreAdmin,
  storeController.searchStores
);

/**
 * @route   GET /api/stores/statistics
 * @desc    Get store statistics
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/statistics',
  authenticateToken,
  requireStoreAdmin,
  storeController.getStoreStatistics
);

/**
 * @route   GET /api/stores/:id
 * @desc    Get store by ID
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id',
  authenticateToken,
  requireStoreAdmin,
  storeController.getStoreById
);

/**
 * @route   PUT /api/stores/:id
 * @desc    Update store information
 * @access  Protected (Super Admin only)
 */
router.put('/:id',
  authenticateToken,
  requireSuperAdmin,
  validateContentType,
  storeController.updateStore
);

/**
 * @route   DELETE /api/stores/:id
 * @desc    Delete store (soft delete)
 * @access  Protected (Super Admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireSuperAdmin,
  storeController.deleteStore
);

/**
 * @route   POST /api/stores/:id/status
 * @desc    Change store status
 * @access  Protected (Super Admin only)
 */
router.post('/:id/status',
  authenticateToken,
  requireSuperAdmin,
  validateContentType,
  storeController.changeStoreStatus
);

/**
 * @route   GET /api/stores/:id/lockers
 * @desc    Get store lockers with status
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id/lockers',
  authenticateToken,
  requireStoreAdmin,
  storeController.getStoreLockers
);

/**
 * @route   GET /api/stores/:id/users
 * @desc    Get store users
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id/users',
  authenticateToken,
  requireStoreAdmin,
  storeController.getStoreUsers
);

/**
 * @route   GET /api/stores/:id/capacity-analysis
 * @desc    Get store capacity analysis
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id/capacity-analysis',
  authenticateToken,
  requireStoreAdmin,
  storeController.getStoreCapacityAnalysis
);

export default router;