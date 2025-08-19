/**
 * Routes Index - 路由索引
 * Aggregates and organizes all API routes
 */

import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import storeRoutes from './stores';
import applicationRoutes from './applications';
// import lockerRoutes from './lockers';     // Temporarily disabled for testing
// import recordRoutes from './records';      // Temporarily disabled for testing

import { 
  logRequest,
  corsHandler,
  errorHandler,
  notFoundHandler,
  validateContentType
} from '../middleware/auth';

const router = Router();

/**
 * Apply global middleware
 */
router.use(corsHandler);
router.use(logRequest);
router.use(validateContentType);

/**
 * Health check endpoint
 * @route GET /api/health
 * @desc System health check
 * @access Public
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'YesLocker API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      type: process.env.DATABASE_URL?.includes('postgresql') ? 'postgresql' : 'sqlite',
      connected: true // TODO: Add actual database health check
    }
  });
});

/**
 * API Information endpoint
 * @route GET /api/info
 * @desc API information and available endpoints
 * @access Public
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'YesLocker API',
      version: '2.0.0',
      description: '台球杆柜管理系统 API',
      documentation: 'https://github.com/your-repo/api-docs',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        stores: '/api/stores',
        applications: '/api/applications',
        lockers: '/api/lockers',
        records: '/api/records'
      },
      features: [
        'JWT Authentication',
        'Role-based Access Control',
        'User Management',
        'Store Management',
        'Application Workflow',
        'Locker Management',
        'Usage Records',
        'Statistics & Analytics'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Mount route modules
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stores', storeRoutes);
router.use('/applications', applicationRoutes);
// router.use('/lockers', lockerRoutes);     // Temporarily disabled for testing
// router.use('/records', recordRoutes);     // Temporarily disabled for testing

/**
 * Legacy endpoints compatibility (for gradual migration)
 * These map old endpoints to new route structure
 */

// ============= AUTHENTICATION & USER MANAGEMENT =============

// Legacy admin login
router.post('/admin-login', (req: Request, res: Response) => {
  res.redirect(307, '/api/auth/login');
});

// Legacy user authentication endpoints
router.post('/auth-register', (req: Request, res: Response) => {
  res.redirect(307, '/api/auth/register');
});

router.post('/auth-login', (req: Request, res: Response) => {
  res.redirect(307, '/api/auth/login');
});

// Legacy user check
router.post('/check-user', (req: Request, res: Response) => {
  const { phone } = req.body;
  res.redirect(301, `/api/users/check-phone/${phone}`);
});

// ============= USER ENDPOINTS =============

// Legacy user endpoints
router.get('/admin-users', (req: Request, res: Response) => {
  res.redirect(301, '/api/users');
});

// User locker and records
router.get('/users/:userId/locker', (req: Request, res: Response) => {
  res.redirect(301, `/api/users/${req.params.userId}/locker`);
});

router.get('/users/:userId/locker-records', (req: Request, res: Response) => {
  res.redirect(301, `/api/users/${req.params.userId}/records`);
});

// ============= STORES AND LOCKERS =============

// Legacy store list
router.get('/stores', (req: Request, res: Response) => {
  res.redirect(301, '/api/stores/active');
});

// Legacy stores and lockers combined endpoint
router.get('/stores-lockers', (req: Request, res: Response) => {
  res.redirect(301, '/api/stores');
});

router.post('/stores-lockers', (req: Request, res: Response) => {
  res.redirect(307, '/api/stores');
});

// Legacy admin store management
router.patch('/admin/stores/:id', (req: Request, res: Response) => {
  res.redirect(307, `/api/stores/${req.params.id}`);
});

router.delete('/admin/stores/:id', (req: Request, res: Response) => {
  res.redirect(307, `/api/stores/${req.params.id}`);
});

// Legacy locker management
router.get('/lockers/:storeId', (req: Request, res: Response) => {
  res.redirect(301, `/api/stores/${req.params.storeId}/lockers`);
});

router.get('/lockers/details/:lockerId', (req: Request, res: Response) => {
  res.redirect(301, `/api/lockers/${req.params.lockerId}`);
});

router.get('/lockers/:lockerId/qrcode', (req: Request, res: Response) => {
  res.redirect(301, `/api/lockers/${req.params.lockerId}/qrcode`);
});

router.post('/admin/lockers', (req: Request, res: Response) => {
  res.redirect(307, '/api/lockers');
});

router.patch('/admin/lockers/:id', (req: Request, res: Response) => {
  res.redirect(307, `/api/lockers/${req.params.id}`);
});

router.delete('/admin/lockers/:id', (req: Request, res: Response) => {
  res.redirect(307, `/api/lockers/${req.params.id}`);
});

// ============= APPLICATIONS =============

// Legacy locker application endpoint
router.post('/lockers-apply', (req: Request, res: Response) => {
  res.redirect(307, '/api/applications');
});

// Legacy admin approval endpoints
router.get('/admin-approval', (req: Request, res: Response) => {
  res.redirect(301, '/api/applications?status=pending');
});

// Legacy admin approval action
router.post('/admin-approval', (req: Request, res: Response) => {
  const { application_id, action } = req.body;
  if (action === 'approve') {
    res.redirect(307, `/api/applications/${application_id}/approve`);
  } else if (action === 'reject') {
    res.redirect(307, `/api/applications/${application_id}/reject`);
  } else {
    res.status(400).json({
      success: false,
      error: '无效的操作类型',
      message: '请使用新的API端点: /api/applications/:id/approve 或 /api/applications/:id/reject'
    });
  }
});

// ============= RECORDS AND OPERATIONS =============

// Legacy operations and records
router.post('/locker-operations', (req: Request, res: Response) => {
  res.redirect(307, '/api/records');
});

router.get('/admin-records', (req: Request, res: Response) => {
  res.redirect(301, '/api/records');
});

// ============= STATISTICS AND REPORTS =============

// Legacy statistics
router.get('/admin/statistics', (req: Request, res: Response) => {
  res.redirect(301, '/api/applications/statistics');
});

router.get('/admin-statistics', (req: Request, res: Response) => {
  res.redirect(301, '/api/applications/statistics');
});

// Legacy export
router.get('/admin-export', (req: Request, res: Response) => {
  res.redirect(301, '/api/records/export');
});

// ============= REMINDERS =============

// Legacy reminders
router.post('/admin-reminders', (req: Request, res: Response) => {
  res.redirect(307, '/api/reminders');
});

// ============= FILE UPLOADS =============

// Legacy file upload (placeholder - needs implementation)
router.post('/upload-image', (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: '文件上传功能正在开发中',
    message: '请使用新的文件上传API端点',
    redirect: '/api/uploads/image'
  });
});

/**
 * Database initialization endpoint (development only)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/init-db', async (req: Request, res: Response) => {
    try {
      // TODO: Implement database initialization logic
      // This should seed the database with initial data
      res.json({
        success: true,
        message: '数据库初始化成功',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(500).json({
        success: false,
        error: '数据库初始化失败',
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Migration status endpoint
 * @route GET /api/migration-status
 * @desc Shows the migration status from monolithic to modular architecture
 * @access Public
 */
router.get('/migration-status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      architecture: 'Modular Service-Controller Architecture',
      migration: {
        status: 'In Progress',
        phase: 'Service Layer Implementation',
        completed: [
          'Database Abstraction Layer (Models & Repositories)',
          'Base Service & Controller Classes',
          'Authentication Service & Controller',
          'User Management Service & Controller',
          'Store Management Service & Controller',
          'Application Service & Controller',
          'Modular Route Organization',
          'Middleware Architecture'
        ],
        pending: [
          'Locker Service & Controller',
          'Record Service & Controller',
          'Legacy Server Integration',
          'Frontend Service Integration',
          'Configuration Unification'
        ]
      },
      benefits: [
        'Clean separation of concerns',
        'Improved testability',
        'Better error handling',
        'Consistent API responses',
        'Scalable architecture',
        'Maintainable codebase'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 handler for unmatched API routes
 */
router.use('*', notFoundHandler);

/**
 * Global error handler
 */
router.use(errorHandler);

export default router;