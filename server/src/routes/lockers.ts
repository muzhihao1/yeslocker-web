/**
 * Locker Routes - 杆柜路由
 * Handles all locker-related endpoints
 */

import { Router } from 'express';
import { LockerController } from '../controllers/LockerController';
import { 
  authenticateToken, 
  requireAdmin 
} from '../middleware/auth';

const router = Router();
const lockerController = new LockerController();

/**
 * @route   GET /api/lockers/:id
 * @desc    Get locker details by ID
 * @access  Public
 */
router.get('/:id', 
  lockerController.getLockerDetails
);

/**
 * @route   POST /api/lockers
 * @desc    Create new locker
 * @access  Admin
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  lockerController.createLocker
);

/**
 * @route   PATCH /api/lockers/:id
 * @desc    Update locker
 * @access  Admin
 */
router.patch('/:id',
  authenticateToken,
  requireAdmin,
  lockerController.updateLocker
);

/**
 * @route   DELETE /api/lockers/:id
 * @desc    Delete locker
 * @access  Admin
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  lockerController.deleteLocker
);

/**
 * @route   GET /api/lockers/:id/qrcode
 * @desc    Generate QR code for locker
 * @access  Public
 */
router.get('/:id/qrcode',
  lockerController.generateQRCode
);

/**
 * @route   POST /api/lockers/:id/operate
 * @desc    Record locker operation (store/retrieve cue)
 * @access  Authenticated
 */
router.post('/:id/operate',
  authenticateToken,
  lockerController.recordOperation
);

/**
 * @route   GET /api/lockers/statistics
 * @desc    Get locker usage statistics
 * @access  Admin
 */
router.get('/statistics',
  authenticateToken,
  requireAdmin,
  lockerController.getStatistics
);

/**
 * @route   POST /api/lockers/bulk-update
 * @desc    Bulk update lockers
 * @access  Admin
 */
router.post('/bulk-update',
  authenticateToken,
  requireAdmin,
  lockerController.bulkUpdateLockers
);

/**
 * @route   GET /api/lockers/availability/:storeId
 * @desc    Get real-time locker availability for a store
 * @access  Public
 */
router.get('/availability/:storeId',
  lockerController.getAvailability
);

export default router;