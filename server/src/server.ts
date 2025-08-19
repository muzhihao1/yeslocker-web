/**
 * Modern Modular Server - 现代化模块服务器
 * Uses the new service-controller architecture with clean separation of concerns
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

// Import modular routes
import apiRoutes from './routes/index';

// Import database connection
import { DatabaseConnection } from './models/DatabaseConnection';

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME;

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ModernServer {
  private app: Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeDatabase();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();
    this.setupErrorHandling();
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await DatabaseConnection.initialize();
      console.log('✅ Database connection established successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      if (IS_PRODUCTION) {
        process.exit(1);
      }
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: IS_PRODUCTION ? undefined : false
    }));

    // Compression middleware
    this.app.use(compression());

    // CORS configuration
    const corsOptions = {
      origin: (origin: string | undefined, callback: Function) => {
        const allowedOrigins = [
          'http://localhost:3000',  // User app dev
          'http://localhost:5173',  // Admin panel dev
          'http://localhost:4173',  // Admin panel preview
          'https://yeslocker-web-production-314a.up.railway.app'  // Production
        ];

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`⚠️  CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['X-Total-Count']
    };

    this.app.use(cors(corsOptions));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy (important for Railway and other cloud platforms)
    if (IS_PRODUCTION || IS_RAILWAY) {
      this.app.set('trust proxy', 1);
    }

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const timestamp = new Date().toISOString();
      
      console.log(`🌐 [${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
        
        console.log(`${statusEmoji} [${timestamp}] ${req.method} ${req.path} - ${status} - ${duration}ms`);
      });
      
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint (before API routes)
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'YesLocker Server is running',
        server: 'Modular Architecture v2.0',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        database: {
          type: process.env.DATABASE_URL?.includes('postgresql') ? 'PostgreSQL' : 'SQLite',
          connected: DatabaseConnection.isConnected()
        }
      });
    });

    // Mount API routes
    this.app.use('/api', apiRoutes);

    // Legacy compatibility routes (for gradual migration)
    this.setupLegacyRoutes();

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      if (IS_PRODUCTION) {
        // In production, serve the built frontend
        res.sendFile(path.join(__dirname, '../../dist/index.html'));
      } else {
        // In development, return API information
        res.json({
          success: true,
          message: 'Welcome to YesLocker API',
          version: '2.0.0 (Modular Architecture)',
          environment: NODE_ENV,
          documentation: '/api/info',
          health: '/health',
          endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            stores: '/api/stores',
            applications: '/api/applications',
            lockers: '/api/lockers',
            records: '/api/records'
          },
          migration: {
            status: 'New Modular Architecture Active',
            legacy_support: 'Available for backward compatibility'
          }
        });
      }
    });
  }

  /**
   * Setup legacy routes for backward compatibility
   */
  private setupLegacyRoutes(): void {
    // Legacy admin login (redirect to new endpoint)
    this.app.post('/admin-login', (req: Request, res: Response) => {
      res.redirect(307, '/api/auth/login');
    });

    // Legacy locker application (redirect to new endpoint)
    this.app.post('/lockers-apply', (req: Request, res: Response) => {
      res.redirect(307, '/api/applications');
    });

    // Legacy admin approval routes
    this.app.get('/admin-approval', (req: Request, res: Response) => {
      res.redirect(301, '/api/applications?status=pending');
    });

    this.app.post('/admin-approval', (req: Request, res: Response) => {
      const { applicationId, action } = req.body;
      if (action === 'approve') {
        res.redirect(307, `/api/applications/${applicationId}/approve`);
      } else if (action === 'reject') {
        res.redirect(307, `/api/applications/${applicationId}/reject`);
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: 'Use new API endpoints: /api/applications/:id/approve or /api/applications/:id/reject'
        });
      }
    });

    // Legacy user check
    this.app.post('/check-user', (req: Request, res: Response) => {
      const { phone } = req.body;
      if (phone) {
        res.redirect(301, `/api/users/check-phone/${phone}`);
      } else {
        res.status(400).json({
          success: false,
          error: 'Phone number required'
        });
      }
    });

    // Legacy store list
    this.app.get('/stores', (req: Request, res: Response) => {
      res.redirect(301, '/api/stores/active');
    });
  }

  /**
   * Setup static file serving for production
   */
  private setupStaticFiles(): void {
    if (IS_PRODUCTION) {
      // Serve user app static files
      const userAppPath = path.join(__dirname, '../../dist');
      this.app.use(express.static(userAppPath));

      // Serve admin panel static files
      const adminPanelPath = path.join(__dirname, '../../admin/dist');
      this.app.use('/admin', express.static(adminPanelPath));

      // Handle SPA routing for user app
      this.app.get('*', (req: Request, res: Response, next: NextFunction) => {
        // Skip API routes and admin routes
        if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
          return next();
        }
        
        res.sendFile(path.join(userAppPath, 'index.html'));
      });

      // Handle SPA routing for admin panel
      this.app.get('/admin/*', (req: Request, res: Response) => {
        res.sendFile(path.join(adminPanelPath, 'index.html'));
      });

      console.log('📁 Static file serving configured for production');
    }
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        message: 'The requested resource does not exist',
        documentation: '/api/info',
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      console.error('💥 Unhandled server error:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      const isDevelopment = NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        details: isDevelopment ? {
          stack: error.stack,
          path: req.path,
          method: req.method
        } : undefined,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Ensure database is initialized
      await this.initializeDatabase();

      // Start the server
      this.server = this.app.listen(PORT, () => {
        console.log('\n🚀 YesLocker Server Started Successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📍 Server URL: http://localhost:${PORT}`);
        console.log(`🌍 Environment: ${NODE_ENV}`);
        console.log(`🏗️  Architecture: Modular Service-Controller Pattern`);
        console.log(`💾 Database: ${process.env.DATABASE_URL?.includes('postgresql') ? 'PostgreSQL' : 'SQLite'}`);
        console.log(`📊 Health Check: http://localhost:${PORT}/health`);
        console.log(`📖 API Info: http://localhost:${PORT}/api/info`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (IS_PRODUCTION) {
          console.log('🎯 Production mode: Serving static files');
          console.log(`👤 User App: http://localhost:${PORT}/`);
          console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin`);
        } else {
          console.log('🛠️  Development mode: API only');
          console.log('📱 User App Dev: http://localhost:3000');
          console.log('⚙️  Admin Panel Dev: http://localhost:5173');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      if (this.server) {
        this.server.close(async () => {
          console.log('🔒 HTTP server closed');
          
          try {
            await DatabaseConnection.close();
            console.log('💾 Database connection closed');
          } catch (error) {
            console.error('❌ Error closing database connection:', error);
          }
          
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Promise Rejection:', reason);
      console.error('Promise:', promise);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }
}

// Create and start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ModernServer();
  server.start().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export default ModernServer;
export { ModernServer };