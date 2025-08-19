/**
 * Application Routes - 申请路由
 * Handles all locker application endpoints
 */

import { Router } from 'express';
import applicationController from '../controllers/ApplicationController';
import { 
  authenticateToken, 
  requireStoreAdmin,
  validateContentType 
} from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/applications
 * @desc    Create a new application
 * @access  Public (for user app)
 */
router.post('/',
  validateContentType,
  applicationController.createApplication
);

/**
 * @route   GET /api/applications
 * @desc    Get applications with pagination and filters
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/',
  authenticateToken,
  requireStoreAdmin,
  applicationController.getApplications
);

/**
 * @route   GET /api/applications/pending-count
 * @desc    Get pending applications count
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/pending-count',
  authenticateToken,
  requireStoreAdmin,
  applicationController.getPendingCount
);

/**
 * @route   GET /api/applications/statistics
 * @desc    Get application statistics
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/statistics',
  authenticateToken,
  requireStoreAdmin,
  applicationController.getStatistics
);

/**
 * @route   POST /api/applications/batch-process
 * @desc    Batch process applications
 * @access  Protected (Store Admin or Super Admin)
 */
router.post('/batch-process',
  authenticateToken,
  requireStoreAdmin,
  validateContentType,
  applicationController.batchProcess
);

/**
 * @route   GET /api/applications/user/:userId/history
 * @desc    Get user's application history
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/user/:userId/history',
  authenticateToken,
  requireStoreAdmin,
  applicationController.getUserApplicationHistory
);

/**
 * @route   GET /api/applications/:id
 * @desc    Get application by ID
 * @access  Protected (Store Admin or Super Admin)
 */
router.get('/:id',
  authenticateToken,
  requireStoreAdmin,
  applicationController.getApplicationById
);

/**
 * @route   POST /api/applications/:id/approve
 * @desc    Approve application
 * @access  Protected (Store Admin or Super Admin)
 */
router.post('/:id/approve',
  authenticateToken,
  requireStoreAdmin,
  validateContentType,
  applicationController.approveApplication
);

/**
 * @route   POST /api/applications/:id/reject
 * @desc    Reject application
 * @access  Protected (Store Admin or Super Admin)
 */
router.post('/:id/reject',
  authenticateToken,
  requireStoreAdmin,
  validateContentType,
  applicationController.rejectApplication
);

/**
 * @route   POST /api/applications/:id/cancel
 * @desc    Cancel application (user-initiated)
 * @access  Public (for user app)
 */
router.post('/:id/cancel',
  validateContentType,
  applicationController.cancelApplication
);

export default router;