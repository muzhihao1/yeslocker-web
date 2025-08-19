/**
 * Record Routes - 记录路由
 * Handles all operation record endpoints
 */

import { Router } from 'express';
import { RecordController } from '../controllers/RecordController';
import { 
  authenticateToken, 
  requireAdmin 
} from '../middleware/auth';

const router = Router();
const recordController = new RecordController();

/**
 * @route   POST /api/records
 * @desc    Create new operation record
 * @access  Authenticated
 */
router.post('/',
  authenticateToken,
  recordController.createRecord
);

/**
 * @route   GET /api/records
 * @desc    Get operation records with filters
 * @access  Admin
 */
router.get('/',
  authenticateToken,
  requireAdmin,
  recordController.getRecords
);

/**
 * @route   GET /api/records/statistics
 * @desc    Get records statistics
 * @access  Admin
 */
router.get('/statistics',
  authenticateToken,
  requireAdmin,
  recordController.getStatistics
);

/**
 * @route   GET /api/records/export
 * @desc    Export records data
 * @access  Admin
 */
router.get('/export',
  authenticateToken,
  requireAdmin,
  recordController.exportRecords
);

/**
 * @route   GET /api/records/daily/:date
 * @desc    Get daily usage summary
 * @access  Admin
 */
router.get('/daily/:date',
  authenticateToken,
  requireAdmin,
  recordController.getDailySummary
);

/**
 * @route   GET /api/records/user/:userId
 * @desc    Get user's operation records
 * @access  Authenticated (own records or admin)
 */
router.get('/user/:userId',
  authenticateToken,
  recordController.getUserRecords
);

/**
 * @route   GET /api/records/:id
 * @desc    Get specific record details
 * @access  Authenticated
 */
router.get('/:id',
  authenticateToken,
  recordController.getRecordDetails
);

/**
 * @route   DELETE /api/records/:id
 * @desc    Delete operation record
 * @access  Admin
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  recordController.deleteRecord
);

export default router;