const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
// QRCode removed per PRD requirement - no QR scanning needed
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-for-development-only';

/**
 * YesLocker Railway Deployment Server
 * Unified server that serves both Vue frontend and Express API
 * Uses PostgreSQL database via Railway
 */
class RailwayServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    // PostgreSQL connection configuration with robust error handling
    const databaseUrl = process.env.DATABASE_URL || 
                       process.env.DATABASE_PUBLIC_URL ||
                       process.env.POSTGRES_URL || 
                       process.env.PGURL ||
                       'postgresql://postgres:password@localhost:5432/postgres';
    
    console.log('🗄️  Database connection setup:');
    console.log('- Using URL:', databaseUrl.replace(/:[^:@]*@/, ':***@'));
    console.log('- All env vars:', Object.keys(process.env).join(', '));
    
    // Initialize PostgreSQL connection pool
    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,          // 增加最大连接数
        min: 2,           // 保持最少连接数
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,  // 减少连接超时
        acquireTimeoutMillis: 5000,     // 添加获取连接超时
        statement_timeout: 10000,       // SQL语句超时
        query_timeout: 10000,           // 查询超时
      });
      console.log('✅ PostgreSQL connection pool initialized');
      this.dbConnected = false; // Will be set to true after successful connection test
    } catch (error) {
      console.error('❌ Database pool initialization error:', error.message);
      this.pool = null;
      this.dbConnected = false;
    }
    
    this.setupRBAC();
    this.setupMiddleware();
    this.setupRoutes();
  }

  // Setup Role-Based Access Control
  setupRBAC() {
    // Define permission mappings for each role
    this.rolePermissions = {
      super_admin: [
        'all', // Super admin has all permissions
        'manage_all_stores',
        'manage_all_users',
        'manage_all_applications',
        'manage_all_lockers',
        'view_all_statistics',
        'manage_system_settings',
        'manage_admins'
      ],
      hq_admin: [
        'manage_all_stores',
        'manage_all_users',
        'manage_all_applications',
        'manage_all_lockers',
        'view_all_statistics',
        'manage_admins'
      ],
      store_admin: [
        'manage_own_store',
        'manage_store_users',
        'manage_store_applications',
        'manage_store_lockers',
        'view_store_statistics'
      ]
    };
  }

  // Get permissions for a given role
  getAdminPermissions(role) {
    return this.rolePermissions[role] || [];
  }

  // Check if admin has a specific permission
  hasPermission(adminRole, permission) {
    const permissions = this.getAdminPermissions(adminRole);
    return permissions.includes('all') || permissions.includes(permission);
  }

  // Middleware to check admin permissions
  requirePermission(permission) {
    return (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No authorization token provided'
        });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (!decoded.isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Admin access required'
          });
        }

        if (!this.hasPermission(decoded.role, permission)) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            required: permission,
            role: decoded.role
          });
        }

        req.admin = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    };
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: true,
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Serve static files from Vue build
    const distPath = path.join(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
      console.log(`📁 Serving static files from: ${distPath}`);
      this.app.use(express.static(distPath));
    }

    // Serve admin static assets only (not HTML files)
    const adminAssetsPath = path.join(__dirname, '../admin/dist');
    if (fs.existsSync(adminAssetsPath)) {
      console.log(`📁 Serving admin assets from: ${adminAssetsPath}`);
      // Serve only assets, not HTML files to avoid conflicts with SPA routing
      this.app.use('/admin/assets', express.static(path.join(adminAssetsPath, 'assets')));
      
      // Serve other static files (like images) but exclude index.html
      this.app.use('/admin', express.static(adminAssetsPath, {
        index: false, // Don't serve index.html automatically
        setHeaders: (res, path) => {
          // Block HTML files from being served by static middleware
          if (path.endsWith('.html')) {
            res.status(404).end();
          }
        }
      }));
    }

    // Serve public static files
    const publicPath = path.join(__dirname, '../public');
    if (fs.existsSync(publicPath)) {
      console.log(`📁 Serving public static files from: ${publicPath}`);
      this.app.use('/static', express.static(publicPath));
    }
    
    // Also serve admin public directory for admin-specific static files
    const adminPublicPath = path.join(__dirname, '../admin/public');
    if (fs.existsSync(adminPublicPath)) {
      console.log(`📁 Serving admin public files from: ${adminPublicPath}`);
      this.app.use('/static', express.static(adminPublicPath));
    }
  }

  setupRoutes() {
    // JWT Authentication Middleware
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      console.log('🔐 JWT认证调试:', {
        hasAuthHeader: !!authHeader,
        tokenExists: !!token,
        tokenPrefix: token ? token.substring(0, 20) + '...' : null,
        secretExists: !!JWT_SECRET,
        secretPrefix: JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : null
      });
      
      if (!token) {
        console.log('❌ JWT认证失败: 缺少token');
        return res.status(401).json({ 
          success: false, 
          message: '缺少访问令牌' 
        });
      }
      
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          console.log('❌ JWT验证失败:', {
            error: err.name,
            message: err.message,
            tokenValid: false
          });
          return res.status(403).json({ 
            success: false, 
            message: '无效的访问令牌',
            debug: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }
        console.log('✅ JWT验证成功:', {
          adminId: user.adminId,
          name: user.name,
          role: user.role
        });
        req.user = user;
        next();
      });
    };

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: this.port,
        database: {
          pool_initialized: !!this.pool,
          connected: this.dbConnected || false
        }
      });
    });

    // Debug endpoint to check environment variables
    this.app.get('/debug', (req, res) => {
      const envVars = Object.keys(process.env).filter(key => 
        key.includes('DATABASE') || 
        key.includes('POSTGRES') || 
        key.includes('NODE_ENV') ||
        key.includes('PORT')
      );
      
      res.json({
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 'not set',
        database_vars: envVars,
        database_url_exists: !!process.env.DATABASE_URL,
        database_url_prefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'not set'
      });
    });

    // Performance optimization: Create missing indexes
    this.app.post('/api/optimize-db', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        console.log('🚀 Starting database performance optimization...');
        
        // Create performance indexes for admin-statistics queries
        const optimizationQueries = [
          // Critical missing index for users.status
          'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
          
          // Additional performance indexes  
          'CREATE INDEX IF NOT EXISTS idx_lockers_status ON lockers(status)',
          'CREATE INDEX IF NOT EXISTS idx_locker_records_created_at_desc ON locker_records(created_at DESC)',
          
          // Composite indexes for common query patterns
          'CREATE INDEX IF NOT EXISTS idx_applications_status_created ON applications(status, created_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_users_status_active ON users(status, created_at DESC) WHERE status = \'active\'',
          
          // New indexes for admin statistics performance
          'CREATE INDEX IF NOT EXISTS idx_applications_store_id ON applications(store_id)',
          'CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_lockers_store_id ON lockers(store_id)',
          'CREATE INDEX IF NOT EXISTS idx_locker_records_locker_id ON locker_records(locker_id)',
          'CREATE INDEX IF NOT EXISTS idx_locker_records_user_id ON locker_records(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_locker_records_action ON locker_records(action)',
          'CREATE INDEX IF NOT EXISTS idx_vouchers_created_at ON vouchers(created_at)',
          
          // Composite indexes for complex queries
          'CREATE INDEX IF NOT EXISTS idx_applications_store_status ON applications(store_id, status)',
          'CREATE INDEX IF NOT EXISTS idx_lockers_store_status ON lockers(store_id, status)',
          'CREATE INDEX IF NOT EXISTS idx_locker_records_locker_created ON locker_records(locker_id, created_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_locker_records_action_created ON locker_records(action, created_at DESC)',
          
          // Analyze tables for query planner
          'ANALYZE users',
          'ANALYZE lockers', 
          'ANALYZE applications',
          'ANALYZE locker_records',
          'ANALYZE vouchers',
          'ANALYZE stores'
        ];
        
        const results = [];
        for (const query of optimizationQueries) {
          try {
            await client.query(query);
            results.push({ query: query.split(' ')[0] + ' ' + query.split(' ')[1], status: 'success' });
            console.log('✅', query.split(' ')[0], query.split(' ')[1]);
          } catch (error) {
            results.push({ query: query.split(' ')[0] + ' ' + query.split(' ')[1], status: 'error', message: error.message });
            console.log('❌', query.split(' ')[0], query.split(' ')[1], ':', error.message);
          }
        }
        
        client.release();
        
        res.json({
          success: true,
          message: 'Database optimization completed',
          results: results
        });
        
      } catch (error) {
        console.error('Database optimization error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Initialize database with seed data
    this.app.post('/api/init-db', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Insert stores data
        await client.query(`
          INSERT INTO stores (id, name, address, phone, status) VALUES 
          ('00000000-0000-0000-0000-000000000001', '旗舰店', '北京市朝阳区望京街道SOHO现代城', '010-12345678', 'active'),
          ('00000000-0000-0000-0000-000000000002', '分店A', '北京市海淀区中关村大街', '010-87654321', 'active'),
          ('00000000-0000-0000-0000-000000000003', '分店B', '北京市东城区王府井大街', '010-11223344', 'active')
          ON CONFLICT (id) DO NOTHING
        `);
        
        // Insert admin data  
        await client.query(`
          INSERT INTO admins (id, phone, password, name, role, store_id, status) VALUES 
          ('10000000-0000-0000-0000-000000000001', '13800000001', '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC', '超级管理员', 'super_admin', NULL, 'active'),
          ('10000000-0000-0000-0000-000000000002', '13800000002', '$2b$10$cwuUxomL1KE9dMddgFIeQeonqquzHFy6lABNgwXtuz0lMneoB4FfO', '门店管理员', 'store_admin', '00000000-0000-0000-0000-000000000001', 'active'),
          ('10000000-0000-0000-0000-000000000003', '13800000003', '$2b$10$qhdsA4CGdRd8uKpxVjln0ODH0JqLWg5R1QWKdP6m4PzyVH0XyPy4y', '门店管理员B', 'store_admin', '00000000-0000-0000-0000-000000000002', 'active')
          ON CONFLICT (id) DO NOTHING
        `);
        
        // Insert users data
        await client.query(`
          INSERT INTO users (id, phone, name, password, avatar_url, store_id, status) VALUES 
          ('20000000-0000-0000-0000-000000000001', '13800000010', '张三', '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC', NULL, '00000000-0000-0000-0000-000000000001', 'active'),
          ('20000000-0000-0000-0000-000000000002', '13800000011', '李四', '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC', NULL, '00000000-0000-0000-0000-000000000001', 'active'),
          ('20000000-0000-0000-0000-000000000003', '13800000012', '王五', '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC', NULL, '00000000-0000-0000-0000-000000000002', 'active'),
          ('20000000-0000-0000-0000-000000000004', '13800000013', '赵六', '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC', NULL, '00000000-0000-0000-0000-000000000001', 'active'),
          ('20000000-0000-0000-0000-000000000005', '13800000014', '孙七', '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC', NULL, '00000000-0000-0000-0000-000000000002', 'active'),
          ('20000000-0000-0000-0000-000000000006', '18669203134', '测试用户', '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC', NULL, '00000000-0000-0000-0000-000000000001', 'active')
          ON CONFLICT (id) DO NOTHING
        `);
        
        // Insert lockers data 
        await client.query(`
          INSERT INTO lockers (id, store_id, number, status, current_user_id) VALUES 
          ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'A-001', 'occupied', '20000000-0000-0000-0000-000000000002'),
          ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'A-002', 'available', NULL),
          ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'A-003', 'available', NULL),
          ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'A-004', 'available', NULL),
          ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'B-001', 'available', NULL),
          ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'B-002', 'available', NULL),
          ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'B-003', 'maintenance', NULL),
          ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'B-004', 'available', NULL),
          ('30000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'A-001', 'occupied', '20000000-0000-0000-0000-000000000005'),
          ('30000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 'A-002', 'available', NULL),
          ('30000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000002', 'A-003', 'available', NULL),
          ('30000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000002', 'A-004', 'available', NULL),
          ('30000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000002', 'B-001', 'available', NULL),
          ('30000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000002', 'B-002', 'available', NULL),
          ('30000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000003', 'A-001', 'available', NULL),
          ('30000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000003', 'A-002', 'available', NULL),
          ('30000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000003', 'A-003', 'available', NULL),
          ('30000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000003', 'A-004', 'available', NULL)
          ON CONFLICT (id) DO NOTHING
        `);
        
        // Insert applications data
        await client.query(`
          INSERT INTO applications (id, user_id, store_id, locker_type, purpose, notes, status, assigned_locker_id, approved_by, approved_at) VALUES 
          ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '标准杆柜', '存放私人球杆', '我是会员，需要长期存放', 'approved', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - INTERVAL '2 days'),
          ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', '大型杆柜', '存放多支球杆', '比赛用杆需要专门存放', 'approved', '30000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '1 day'),
          ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '标准杆柜', '临时存放', '周末来打球需要存杆', 'pending', NULL, NULL, NULL),
          ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '标准杆柜', '长期存放', '每天都来打球', 'pending', NULL, NULL, NULL),
          ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '标准杆柜', '存放球杆', '申请存放台球杆', 'pending', NULL, NULL, NULL),
          ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '豪华杆柜', '存放多支杆', '杆柜已满', 'rejected', NULL, '10000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - INTERVAL '3 days')
          ON CONFLICT (id) DO NOTHING
        `);
        
        // Insert locker_records data to fix admin-records API 500 error
        await client.query(`
          INSERT INTO locker_records (id, user_id, locker_id, action, notes, created_at) VALUES 
          ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'assigned', '分配杆柜A-001给李四', CURRENT_TIMESTAMP - INTERVAL '2 days'),
          ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'store', '存放台球杆', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '1 hour'),
          ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000101', 'assigned', '分配杆柜B-101给孙七', CURRENT_TIMESTAMP - INTERVAL '1 day'),
          ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000101', 'store', '存放比赛用杆', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '30 minutes'),
          ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'store', '临时存放周末球杆', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
          ('50000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'retrieve', '取回球杆', CURRENT_TIMESTAMP - INTERVAL '1 hour')
          ON CONFLICT (id) DO NOTHING
        `);
        
        client.release();
        
        // Get final counts
        const finalResult = await this.pool.connect();
        const counts = await Promise.all([
          finalResult.query('SELECT COUNT(*) FROM stores'),
          finalResult.query('SELECT COUNT(*) FROM admins'),
          finalResult.query('SELECT COUNT(*) FROM users'),
          finalResult.query('SELECT COUNT(*) FROM lockers'),
          finalResult.query('SELECT COUNT(*) FROM applications')
        ]);
        finalResult.release();
        
        res.json({
          success: true,
          message: 'Database initialized with seed data',
          counts: {
            stores: parseInt(counts[0].rows[0].count),
            admins: parseInt(counts[1].rows[0].count),
            users: parseInt(counts[2].rows[0].count),
            lockers: parseInt(counts[3].rows[0].count),
            applications: parseInt(counts[4].rows[0].count)
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          stack: error.stack
        });
      }
    });

    // Insert locker_records data specifically 
    this.app.post('/api/init-locker-records', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Check if locker_records already has data
        const existingResult = await client.query('SELECT COUNT(*) FROM locker_records');
        const existingCount = parseInt(existingResult.rows[0].count);
        
        if (existingCount > 0) {
          client.release();
          return res.json({
            success: true,
            message: `locker_records表已有${existingCount}条记录`,
            existing_count: existingCount
          });
        }
        
        // Insert locker_records data
        await client.query(`
          INSERT INTO locker_records (id, user_id, locker_id, action, notes, created_at) VALUES 
          ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'assigned', '分配杆柜A-001给李四', CURRENT_TIMESTAMP - INTERVAL '2 days'),
          ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'store', '存放台球杆', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '1 hour'),
          ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000101', 'assigned', '分配杆柜B-101给孙七', CURRENT_TIMESTAMP - INTERVAL '1 day'),
          ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000101', 'store', '存放比赛用杆', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '30 minutes'),
          ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'store', '临时存放周末球杆', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
          ('50000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'retrieve', '取回球杆', CURRENT_TIMESTAMP - INTERVAL '1 hour')
        `);
        
        // Verify insertion
        const newCountResult = await client.query('SELECT COUNT(*) FROM locker_records');
        const newCount = parseInt(newCountResult.rows[0].count);
        
        client.release();
        
        res.json({
          success: true,
          message: 'locker_records数据插入成功',
          inserted_count: newCount
        });
        
      } catch (error) {
        console.error('Insert locker_records error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          stack: error.stack
        });
      }
    });

    // Database test with null safety
    this.app.get('/api/db-test', async (req, res) => {
      if (!this.pool) {
        return res.status(500).json({
          success: false,
          error: 'Database pool not initialized',
          message: 'PostgreSQL connection pool was not created'
        });
      }
      
      try {
        const client = await this.pool.connect();
        
        // Test basic connection
        const versionResult = await client.query('SELECT version()');
        
        // Check if required tables exist
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('admins', 'stores', 'lockers', 'users', 'applications', 'locker_records')
          ORDER BY table_name
        `);
        
        // Count data in key tables
        const tableStats = {};
        const requiredTables = ['admins', 'stores', 'lockers', 'users', 'applications'];
        
        for (const tableName of requiredTables) {
          try {
            const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            tableStats[tableName] = parseInt(countResult.rows[0].count);
          } catch (tableError) {
            tableStats[tableName] = `Error: ${tableError.message}`;
          }
        }
        
        client.release();
        
        res.json({
          success: true,
          message: 'Database connection successful',
          version: versionResult.rows[0].version,
          tables: {
            existing: tablesResult.rows.map(row => row.table_name),
            counts: tableStats,
            missing: requiredTables.filter(table => !tablesResult.rows.find(row => row.table_name === table))
          }
        });
      } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
          success: false,
          error: 'Database connection failed',
          message: error.message,
          details: error.stack
        });
      }
    });

    // Debug endpoint to check users table structure
    this.app.get('/api/debug-users-table', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Get columns info
        const columnsQuery = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY ordinal_position;
        `);
        
        // Test insert with debug info
        let testResult = null;
        let testError = null;
        try {
          const testInsert = await client.query(`
            INSERT INTO users (phone, name, avatar_url, store_id, status)
            VALUES ('99999999999', 'Debug Test', NULL, '00000000-0000-0000-0000-000000000001', 'active')
            RETURNING *;
          `);
          testResult = testInsert.rows[0];
          // Clean up
          await client.query(`DELETE FROM users WHERE phone = '99999999999'`);
        } catch (err) {
          testError = {
            code: err.code,
            message: err.message,
            detail: err.detail,
            hint: err.hint,
            column: err.column
          };
        }
        
        client.release();
        
        res.json({
          columns: columnsQuery.rows,
          testInsertResult: testResult,
          testInsertError: testError
        });
      } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
          error: error.message,
          code: error.code
        });
      }
    });

    // Database migration endpoint to add avatar_url column
    this.app.post('/api/migrate-avatar-url', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Check if avatar_url column exists
        const checkColumn = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'avatar_url'
        `);
        
        if (checkColumn.rows.length === 0) {
          // Add avatar_url column
          await client.query('ALTER TABLE users ADD COLUMN avatar_url TEXT');
          
          // Make it nullable
          await client.query('ALTER TABLE users ALTER COLUMN avatar_url DROP NOT NULL');
          
          client.release();
          
          res.json({
            success: true,
            message: 'Migration successful: avatar_url column added to users table'
          });
        } else {
          client.release();
          res.json({
            success: true,
            message: 'Migration skipped: avatar_url column already exists'
          });
        }
      } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
          success: false,
          error: 'Migration failed',
          message: error.message,
          details: error.stack
        });
      }
    });

    // Cron endpoint: Auto-expire vouchers (call every 5 minutes)
    this.app.post('/api/cron/expire-vouchers', async (req, res) => {
      try {
        // Optional security token to prevent unauthorized calls
        const cronToken = req.headers['x-cron-token'];
        if (process.env.CRON_TOKEN && cronToken !== process.env.CRON_TOKEN) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid cron token'
          });
        }
        
        const client = await this.pool.connect();
        
        // Update expired vouchers
        const updateQuery = `
          UPDATE vouchers 
          SET status = 'expired',
              updated_at = NOW()
          WHERE status = 'issued' 
            AND expires_at < NOW()
          RETURNING id, code, user_id, operation_type
        `;
        
        const result = await client.query(updateQuery);
        
        // Log expiry events
        for (const voucher of result.rows) {
          await client.query(
            `INSERT INTO voucher_events (voucher_id, event_type, actor_type, actor_id, metadata, created_at)
             VALUES ($1, 'expired', 'system', NULL, $2, NOW())`,
            [voucher.id, JSON.stringify({ reason: 'timeout', code: voucher.code })]
          );
        }
        
        client.release();
        
        const expiredCount = result.rows.length;
        console.log(`✅ Cron: Expired ${expiredCount} vouchers at ${new Date().toISOString()}`);
        
        res.json({
          success: true,
          message: `Expired ${expiredCount} vouchers`,
          expired_count: expiredCount,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Cron expire vouchers error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to expire vouchers',
          message: error.message
        });
      }
    });

    // Cron endpoint: Check for 3-month unused lockers (call daily)
    this.app.post('/api/cron/check-unused-lockers', async (req, res) => {
      try {
        // Optional security token
        const cronToken = req.headers['x-cron-token'];
        if (process.env.CRON_TOKEN && cronToken !== process.env.CRON_TOKEN) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid cron token'
          });
        }
        
        const client = await this.pool.connect();
        
        // Find lockers with no activity in 3 months
        const query = `
          SELECT DISTINCT
            l.id as locker_id,
            l.number as locker_number,
            l.current_user_id,
            u.name as user_name,
            u.phone as user_phone,
            s.name as store_name,
            MAX(lr.created_at) as last_activity
          FROM lockers l
          JOIN users u ON l.current_user_id = u.id
          JOIN stores s ON l.store_id = s.id
          LEFT JOIN locker_records lr ON l.id = lr.locker_id
          WHERE l.status = 'occupied'
          GROUP BY l.id, l.number, l.current_user_id, u.name, u.phone, s.name
          HAVING MAX(lr.created_at) < NOW() - INTERVAL '3 months'
             OR MAX(lr.created_at) IS NULL
        `;
        
        const result = await client.query(query);
        
        // Create reminders for each unused locker
        const reminders = [];
        for (const locker of result.rows) {
          // Check if reminder already exists for this locker
          const existingReminder = await client.query(
            `SELECT id FROM reminders 
             WHERE locker_id = $1 
               AND reminder_type = 'unused_3_months'
               AND created_at > NOW() - INTERVAL '7 days'`,
            [locker.locker_id]
          );
          
          if (existingReminder.rows.length === 0) {
            // Create new reminder
            const reminderResult = await client.query(
              `INSERT INTO reminders (
                user_id, locker_id, reminder_type, 
                title, content, status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
              RETURNING id`,
              [
                locker.current_user_id,
                locker.locker_id,
                'unused_3_months',
                '杆柜长期未使用提醒',
                `您的杆柜 ${locker.locker_number} (${locker.store_name}) 已超过3个月未使用，请及时前往使用或办理退租。`,
                'pending'
              ]
            );
            
            reminders.push({
              reminder_id: reminderResult.rows[0].id,
              user_name: locker.user_name,
              user_phone: locker.user_phone,
              locker_number: locker.locker_number,
              store_name: locker.store_name,
              last_activity: locker.last_activity
            });
          }
        }
        
        client.release();
        
        console.log(`✅ Cron: Created ${reminders.length} reminders for unused lockers at ${new Date().toISOString()}`);
        
        res.json({
          success: true,
          message: `Checked unused lockers and created ${reminders.length} reminders`,
          unused_lockers_count: result.rows.length,
          new_reminders_count: reminders.length,
          reminders: reminders,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Cron check unused lockers error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to check unused lockers',
          message: error.message
        });
      }
    });

    // Database migration endpoint to create reminders table
    this.app.post('/api/migrate-reminders-table', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Check if reminders table exists
        const checkTable = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = 'reminders'
        `);
        
        if (checkTable.rows.length === 0) {
          // Create reminders table
          await client.query(`
            CREATE TABLE reminders (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL REFERENCES users(id),
              locker_id UUID REFERENCES lockers(id),
              reminder_type VARCHAR(50) NOT NULL,
              title VARCHAR(200) NOT NULL,
              content TEXT,
              status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'dismissed')),
              sent_at TIMESTAMP WITH TIME ZONE,
              read_at TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `);
          
          // Create indexes
          await client.query(`
            CREATE INDEX idx_reminders_user_id ON reminders(user_id);
            CREATE INDEX idx_reminders_locker_id ON reminders(locker_id);
            CREATE INDEX idx_reminders_status ON reminders(status);
            CREATE INDEX idx_reminders_reminder_type ON reminders(reminder_type);
            CREATE INDEX idx_reminders_created_at ON reminders(created_at);
          `);
          
          client.release();
          
          res.json({
            success: true,
            message: 'Reminders table created successfully'
          });
        } else {
          client.release();
          res.json({
            success: true,
            message: 'Reminders table already exists'
          });
        }
      } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
          success: false,
          error: 'Migration failed',
          message: error.message,
          details: error.stack
        });
      }
    });

    // Database migration endpoint to create vouchers tables
    this.app.post('/api/migrate-vouchers-tables', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Check if vouchers table exists
        const checkTable = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name = 'vouchers'
        `);
        
        if (checkTable.rows.length === 0) {
          // Create vouchers table
          await client.query(`
            CREATE TABLE vouchers (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL REFERENCES users(id),
              locker_id UUID NOT NULL REFERENCES lockers(id),
              operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('store', 'retrieve')),
              code VARCHAR(8) UNIQUE NOT NULL,
              qr_data TEXT NOT NULL,
              status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'expired', 'cancelled')),
              
              user_phone VARCHAR(20) NOT NULL,
              user_name VARCHAR(100) NOT NULL,
              user_avatar_url TEXT,
              
              locker_number VARCHAR(50) NOT NULL,
              store_id UUID NOT NULL REFERENCES stores(id),
              store_name VARCHAR(100) NOT NULL,
              
              issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
              used_at TIMESTAMP WITH TIME ZONE,
              cancelled_at TIMESTAMP WITH TIME ZONE,
              
              used_by UUID REFERENCES admins(id),
              used_at_store UUID REFERENCES stores(id),
              verification_notes TEXT,
              
              device_info JSONB,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `);
          
          // Create indexes
          await client.query(`
            CREATE INDEX idx_vouchers_user_id ON vouchers(user_id);
            CREATE INDEX idx_vouchers_code ON vouchers(code);
            CREATE INDEX idx_vouchers_status ON vouchers(status);
            CREATE INDEX idx_vouchers_issued_at ON vouchers(issued_at);
            CREATE INDEX idx_vouchers_expires_at ON vouchers(expires_at);
            CREATE INDEX idx_vouchers_locker_id ON vouchers(locker_id);
            CREATE INDEX idx_vouchers_store_id ON vouchers(store_id);
          `);
          
          // Create voucher_events table
          await client.query(`
            CREATE TABLE voucher_events (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              voucher_id UUID NOT NULL REFERENCES vouchers(id),
              event_type VARCHAR(50) NOT NULL,
              actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'staff', 'system')),
              actor_id UUID,
              store_id UUID REFERENCES stores(id),
              metadata JSONB,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `);
          
          // Create indexes for voucher_events
          await client.query(`
            CREATE INDEX idx_voucher_events_voucher_id ON voucher_events(voucher_id);
            CREATE INDEX idx_voucher_events_created_at ON voucher_events(created_at);
            CREATE INDEX idx_voucher_events_event_type ON voucher_events(event_type);
          `);
          
          client.release();
          
          res.json({
            success: true,
            message: 'Voucher tables created successfully'
          });
        } else {
          client.release();
          res.json({
            success: true,
            message: 'Voucher tables already exist'
          });
        }
      } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
          success: false,
          error: 'Migration failed',
          message: error.message,
          details: error.stack
        });
      }
    });

    // Public endpoint for getting stores (no authentication required for user applications)
    this.app.get('/stores-lockers', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Get stores with basic info and available locker count
        const storesQuery = `
          SELECT 
            s.id, s.name, s.address, s.phone, s.status,
            COUNT(CASE WHEN l.status = 'available' THEN 1 END) as available_lockers
          FROM stores s
          LEFT JOIN lockers l ON s.id = l.store_id
          WHERE s.status = 'active'
          GROUP BY s.id, s.name, s.address, s.phone, s.status
          ORDER BY s.name
        `;
        
        const storesResult = await client.query(storesQuery);
        client.release();
        
        const stores = storesResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          address: row.address || '',
          phone: row.phone || '',
          status: row.status,
          available_lockers: parseInt(row.available_lockers) || 0
        }));
        
        res.json({
          success: true,
          data: stores
        });
      } catch (error) {
        console.error('Get stores error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取门店信息失败'
        });
      }
    });

    // Public endpoint for getting lockers by store (no authentication required for user applications)
    this.app.get('/lockers/:storeId', async (req, res) => {
      try {
        const { storeId } = req.params;
        
        if (!storeId) {
          return res.status(400).json({
            success: false,
            error: 'Missing store ID',
            message: '缺少门店ID'
          });
        }
        
        const client = await this.pool.connect();
        
        // Get lockers for the specific store
        const lockersQuery = `
          SELECT 
            l.id, l.number, l.status, l.current_user_id, l.assigned_at,
            l.created_at, l.updated_at, l.store_id,
            u.name as user_name, u.phone as user_phone
          FROM lockers l
          LEFT JOIN users u ON l.current_user_id = u.id
          WHERE l.store_id = $1
          ORDER BY l.number
        `;
        
        const lockersResult = await client.query(lockersQuery, [storeId]);
        client.release();
        
        const lockers = lockersResult.rows.map(row => ({
          id: row.id,
          store_id: row.store_id,
          number: row.number,
          status: row.status,
          current_user_id: row.current_user_id,
          user_name: row.user_name,
          user_phone: row.user_phone,
          assigned_at: row.assigned_at,
          created_at: row.created_at,
          updated_at: row.updated_at
        }));
        
        res.json({
          success: true,
          data: lockers
        });
      } catch (error) {
        console.error('Get lockers by store error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取杆柜信息失败'
        });
      }
    });

    // Get stores and lockers (with API prefix)
    this.app.get('/api/stores-lockers', authenticateToken, async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Get stores with locker counts
        const storesQuery = `
          SELECT 
            s.id, s.name, s.address, s.phone, s.status,
            COUNT(l.id) as total_lockers,
            COUNT(CASE WHEN l.status = 'available' THEN 1 END) as available_lockers
          FROM stores s
          LEFT JOIN lockers l ON s.id = l.store_id
          WHERE s.status = 'active'
          GROUP BY s.id, s.name, s.address, s.phone, s.status
          ORDER BY s.name
        `;
        
        // Get lockers with store information
        const lockersQuery = `
          SELECT 
            l.id, l.number, l.status, l.current_user_id, l.assigned_at,
            l.created_at, l.updated_at,
            s.name as store_name, s.id as store_id,
            u.name as user_name, u.phone as user_phone
          FROM lockers l
          JOIN stores s ON l.store_id = s.id
          LEFT JOIN users u ON l.current_user_id = u.id
          WHERE s.status = 'active'
          ORDER BY s.name, l.number
        `;
        
        const [storesResult, lockersResult] = await Promise.all([
          client.query(storesQuery),
          client.query(lockersQuery)
        ]);
        
        client.release();
        
        const stores = storesResult.rows.map(row => ({
          id: row.id,
          name: row.name,
          address: row.address || '',
          phone: row.phone || '',
          status: row.status,
          total_lockers: parseInt(row.total_lockers) || 0,
          available_lockers: parseInt(row.available_lockers) || 0
        }));
        
        const lockers = lockersResult.rows.map(row => ({
          id: row.id,
          number: row.number,
          status: row.status,
          store_id: row.store_id,
          store_name: row.store_name,
          current_user_id: row.current_user_id,
          user_name: row.user_name,
          user_phone: row.user_phone,
          assigned_at: row.assigned_at,
          created_at: row.created_at,
          updated_at: row.updated_at
        }));
        
        // 计算统计数据
        const stats = {
          available: lockers.filter(l => l.status === 'available').length,
          occupied: lockers.filter(l => l.status === 'occupied').length,
          maintenance: lockers.filter(l => l.status === 'maintenance').length,
          storing: lockers.filter(l => l.status === 'storing').length
        };
        
        res.json({
          success: true,
          data: {
            stores,
            lockers,
            total: lockers.length,
            stats: stats
          }
        });
      } catch (error) {
        console.error('Get stores and lockers error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取门店和杆柜信息失败'
        });
      }
    });

    // Create Store endpoint (POST /api/stores-lockers)
    this.app.post('/api/stores-lockers', authenticateToken, async (req, res) => {
      try {
        const { name, code, address, manager_name, contact_phone, business_hours, remark } = req.body;
        
        if (!name || !address) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: '门店名称和地址为必填项'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Check if store name already exists
          const existingStore = await client.query('SELECT id FROM stores WHERE name = $1', [name]);
          
          if (existingStore.rows.length > 0) {
            client.release();
            return res.status(409).json({
              success: false,
              error: 'Store name exists',
              message: '门店名称已存在'
            });
          }
          
          // Insert new store with actual table structure
          const insertQuery = `
            INSERT INTO stores (id, name, address, phone, status)
            VALUES (gen_random_uuid(), $1, $2, $3, 'active')
            RETURNING id, name, address, phone, status
          `;
          
          const result = await client.query(insertQuery, [
            name, 
            address, 
            contact_phone || ''
          ]);
          const newStore = result.rows[0];
          
          client.release();
          
          console.log(`✅ 新建门店成功: ${name}`);
          
          res.json({
            success: true,
            message: '门店创建成功',
            data: {
              id: newStore.id,
              name: newStore.name,
              address: newStore.address,
              phone: newStore.phone,
              status: newStore.status
            }
          });
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Create store error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '创建门店失败'
        });
      }
    });

    // Update Store endpoint (PATCH /api/admin/stores/:id)
    this.app.patch('/api/admin/stores/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { name, code, address, contact_phone, is_active, manager_name, business_hours, remark } = req.body;
        
        const client = await this.pool.connect();
        
        try {
          // Check if store exists
          const existingStore = await client.query('SELECT * FROM stores WHERE id = $1', [id]);
          
          if (existingStore.rows.length === 0) {
            client.release();
            return res.status(404).json({
              success: false,
              error: 'Store not found',
              message: '门店不存在'
            });
          }
          
          // Build update query dynamically for actual table fields
          const updates = [];
          const values = [];
          let paramIndex = 0;
          
          if (name !== undefined) {
            paramIndex++;
            updates.push(`name = $${paramIndex}`);
            values.push(name);
          }
          
          if (address !== undefined) {
            paramIndex++;
            updates.push(`address = $${paramIndex}`);
            values.push(address);
          }
          
          if (contact_phone !== undefined) {
            paramIndex++;
            updates.push(`phone = $${paramIndex}`);
            values.push(contact_phone || '');
          }
          
          if (code !== undefined) {
            paramIndex++;
            updates.push(`code = $${paramIndex}`);
            values.push(code);
          }
          
          if (manager_name !== undefined) {
            paramIndex++;
            updates.push(`manager_name = $${paramIndex}`);
            values.push(manager_name || '');
          }
          
          if (business_hours !== undefined) {
            paramIndex++;
            updates.push(`business_hours = $${paramIndex}`);
            values.push(business_hours || '');
          }
          
          if (remark !== undefined) {
            paramIndex++;
            updates.push(`remark = $${paramIndex}`);
            values.push(remark || '');
          }
          
          if (is_active !== undefined) {
            paramIndex++;
            updates.push(`status = $${paramIndex}`);
            values.push(is_active ? 'active' : 'inactive');
          }
          
          if (updates.length === 0) {
            client.release();
            return res.status(400).json({
              success: false,
              error: 'No fields to update',
              message: '没有需要更新的字段'
            });
          }
          
          // Add WHERE clause parameter
          paramIndex++;
          values.push(id);
          
          const query = `UPDATE stores SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
          
          await client.query(query, values);
          client.release();
          
          console.log(`✅ 门店更新成功: ID ${id}`);
          
          res.json({
            success: true,
            message: '门店更新成功'
          });
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Update store error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '更新门店失败'
        });
      }
    });

    // Delete Store endpoint (DELETE /api/admin/stores/:id)
    this.app.delete('/api/admin/stores/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        
        const client = await this.pool.connect();
        
        try {
          // Check if store has associated lockers
          const lockersCheck = await client.query('SELECT COUNT(*) as count FROM lockers WHERE store_id = $1', [id]);
          const lockerCount = parseInt(lockersCheck.rows[0].count);
          
          if (lockerCount > 0) {
            client.release();
            return res.status(400).json({
              success: false,
              error: 'Store has lockers',
              message: `无法删除门店，该门店下还有${lockerCount}个杆柜`
            });
          }
          
          // Delete store
          const result = await client.query('DELETE FROM stores WHERE id = $1', [id]);
          
          if (result.rowCount === 0) {
            client.release();
            return res.status(404).json({
              success: false,
              error: 'Store not found',
              message: '门店不存在'
            });
          }
          
          client.release();
          
          console.log(`✅ 门店删除成功: ID ${id}`);
          
          res.json({
            success: true,
            message: '门店删除成功'
          });
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Delete store error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '删除门店失败'
        });
      }
    });

    // User registration
    this.app.post('/auth-register', async (req, res) => {
      try {
        const { phone, name, avatar_url, store_id } = req.body;

        if (!phone || !name || !store_id) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: '手机号、姓名和门店为必填项'
          });
        }

        // Validate store_id as UUID (PostgreSQL uses UUIDs for store IDs)
        // The database foreign key constraint will validate if it exists
        if (typeof store_id !== 'string' || store_id.trim() === '') {
          return res.status(400).json({
            error: 'Invalid store_id',
            message: '门店ID格式不正确'
          });
        }

        // 处理avatar_url为undefined的情况
        const avatarUrl = avatar_url || null;

        const client = await this.pool.connect();
        
        try {
          // Check if phone already exists
          const existingUser = await client.query(
            'SELECT id FROM users WHERE phone = $1',
            [phone]
          );

          if (existingUser.rows.length > 0) {
            client.release();
            return res.status(409).json({
              error: 'Phone already registered',
              message: '该手机号已注册'
            });
          }

          // Check if store exists
          const storeCheck = await client.query(
            'SELECT id FROM stores WHERE id = $1',
            [store_id]
          );

          if (storeCheck.rows.length === 0) {
            client.release();
            return res.status(400).json({
              error: 'Invalid store',
              message: '选择的门店不存在'
            });
          }

          // Insert new user with a default password (phone number as password)
          // In production, you should hash the password or use a different auth method
          const insertQuery = `
            INSERT INTO users (phone, name, password, avatar_url, store_id, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING id, phone, name, store_id
          `;
          
          // Use phone as default password (in production, this should be hashed)
          const defaultPassword = phone;
          const result = await client.query(insertQuery, [phone, name, defaultPassword, avatarUrl, store_id]);
          const newUser = result.rows[0];
          
          client.release();
          
          console.log(`✅ 新用户注册成功: ${name} (${phone})`);
          
          res.json({
            success: true,
            message: '注册成功',
            data: {
              user_id: newUser.id,
              phone: newUser.phone,
              name: newUser.name,
              store_id: newUser.store_id
            }
          });
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '注册失败，请稍后重试'
        });
      }
    });

    // Locker application endpoint (DISABLED - duplicate endpoint with wrong schema, see line 2304)
    /* COMMENTED OUT - This endpoint has applied_at column which doesn't exist in PostgreSQL schema
    this.app.post('/lockers-apply', async (req, res) => {
      try {
        const { store_id, locker_id, user_id, reason } = req.body;
        
        if (!store_id || !locker_id || !user_id) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: '门店、杆柜和用户信息为必填项'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Check if user already has a pending application
          const pendingCheck = await client.query(
            `SELECT id FROM applications 
             WHERE user_id = $1 AND status = 'pending'`,
            [user_id]
          );
          
          if (pendingCheck.rows.length > 0) {
            client.release();
            return res.status(409).json({
              error: 'Duplicate application',
              message: '您已有待审核的申请'
            });
          }
          
          // Check if locker is available
          const lockerCheck = await client.query(
            `SELECT status FROM lockers 
             WHERE id = $1 AND store_id = $2`,
            [locker_id, store_id]
          );
          
          if (lockerCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({
              error: 'Locker not found',
              message: '指定的杆柜不存在'
            });
          }
          
          if (lockerCheck.rows[0].status !== 'available') {
            client.release();
            return res.status(400).json({
              error: 'Locker not available',
              message: '该杆柜已被占用'
            });
          }
          
          // Create application
          const insertQuery = `
            INSERT INTO applications (
              user_id, store_id, assigned_locker_id, status, reason, 
              applied_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, 'pending', $4, NOW(), NOW(), NOW())
            RETURNING id, user_id, store_id, assigned_locker_id, status, reason, applied_at
          `;
          
          const result = await client.query(insertQuery, [
            user_id, store_id, locker_id, reason || ''
          ]);
          
          client.release();
          
          res.json({
            success: true,
            message: '申请提交成功',
            data: result.rows[0]
          });
          
        } catch (innerError) {
          client.release();
          throw innerError;
        }
        
      } catch (error) {
        console.error('Locker application error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '申请提交失败，请稍后重试'
        });
      }
    });
    */

    // Helper function to generate random voucher code
    function generateVoucherCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }

    // Voucher statistics endpoint
    this.app.get('/api/vouchers/statistics', async (req, res) => {
      try {
        const { start_date, end_date, group_by = 'day' } = req.query;
        
        const client = await this.pool.connect();
        
        // Get overall statistics
        const overallStats = await client.query(`
          SELECT 
            COUNT(*) as total_vouchers,
            COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued,
            COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
            COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
            COUNT(CASE WHEN operation_type = 'store' THEN 1 END) as store_operations,
            COUNT(CASE WHEN operation_type = 'retrieve' THEN 1 END) as retrieve_operations,
            ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(used_at, NOW()) - issued_at)) / 60), 2) as avg_usage_time_minutes
          FROM vouchers
          WHERE ($1::timestamp IS NULL OR issued_at >= $1)
            AND ($2::timestamp IS NULL OR issued_at <= $2)
        `, [start_date || null, end_date || null]);
        
        // Get time-based statistics
        let timeGrouping;
        if (group_by === 'hour') {
          timeGrouping = `DATE_TRUNC('hour', issued_at)`;
        } else if (group_by === 'day') {
          timeGrouping = `DATE_TRUNC('day', issued_at)`;
        } else if (group_by === 'week') {
          timeGrouping = `DATE_TRUNC('week', issued_at)`;
        } else if (group_by === 'month') {
          timeGrouping = `DATE_TRUNC('month', issued_at)`;
        } else {
          timeGrouping = `DATE_TRUNC('day', issued_at)`;
        }
        
        const timeStats = await client.query(`
          SELECT 
            ${timeGrouping} as period,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
            COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
            COUNT(CASE WHEN operation_type = 'store' THEN 1 END) as store_ops,
            COUNT(CASE WHEN operation_type = 'retrieve' THEN 1 END) as retrieve_ops
          FROM vouchers
          WHERE ($1::timestamp IS NULL OR issued_at >= $1)
            AND ($2::timestamp IS NULL OR issued_at <= $2)
          GROUP BY period
          ORDER BY period DESC
          LIMIT 30
        `, [start_date || null, end_date || null]);
        
        // Get top users
        const topUsers = await client.query(`
          SELECT 
            v.user_id,
            v.user_name,
            v.user_phone,
            COUNT(*) as voucher_count,
            COUNT(CASE WHEN v.status = 'used' THEN 1 END) as used_count,
            COUNT(CASE WHEN v.operation_type = 'store' THEN 1 END) as store_count,
            COUNT(CASE WHEN v.operation_type = 'retrieve' THEN 1 END) as retrieve_count
          FROM vouchers v
          WHERE ($1::timestamp IS NULL OR v.issued_at >= $1)
            AND ($2::timestamp IS NULL OR v.issued_at <= $2)
          GROUP BY v.user_id, v.user_name, v.user_phone
          ORDER BY voucher_count DESC
          LIMIT 10
        `, [start_date || null, end_date || null]);
        
        // Get store statistics
        const storeStats = await client.query(`
          SELECT 
            v.store_id,
            v.store_name,
            COUNT(*) as voucher_count,
            COUNT(CASE WHEN v.status = 'used' THEN 1 END) as used_count,
            COUNT(DISTINCT v.user_id) as unique_users
          FROM vouchers v
          WHERE ($1::timestamp IS NULL OR v.issued_at >= $1)
            AND ($2::timestamp IS NULL OR v.issued_at <= $2)
          GROUP BY v.store_id, v.store_name
          ORDER BY voucher_count DESC
        `, [start_date || null, end_date || null]);
        
        // Get hourly distribution (for pattern analysis)
        const hourlyPattern = await client.query(`
          SELECT 
            EXTRACT(HOUR FROM issued_at) as hour,
            COUNT(*) as count,
            COUNT(CASE WHEN status = 'used' THEN 1 END) as used_count
          FROM vouchers
          WHERE ($1::timestamp IS NULL OR issued_at >= $1)
            AND ($2::timestamp IS NULL OR issued_at <= $2)
          GROUP BY hour
          ORDER BY hour
        `, [start_date || null, end_date || null]);
        
        client.release();
        
        res.json({
          success: true,
          period: {
            start_date: start_date || 'all_time',
            end_date: end_date || 'now',
            group_by: group_by
          },
          overall: overallStats.rows[0],
          time_series: timeStats.rows,
          top_users: topUsers.rows,
          stores: storeStats.rows,
          hourly_pattern: hourlyPattern.rows,
          generated_at: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Get voucher statistics error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get statistics',
          message: error.message
        });
      }
    });

    // Voucher request endpoint - creates new voucher for each operation
    this.app.post('/vouchers/request', async (req, res) => {
      try {
        const { user_id, locker_id, operation_type } = req.body;
        
        if (!user_id || !locker_id || !operation_type) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: '用户、杆柜和操作类型为必填项'
          });
        }
        
        if (!['store', 'retrieve'].includes(operation_type)) {
          return res.status(400).json({
            error: 'Invalid operation type',
            message: '操作类型必须为 store 或 retrieve'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Get user info
          const userQuery = await client.query(
            'SELECT id, name, phone, avatar_url FROM users WHERE id = $1',
            [user_id]
          );
          
          if (userQuery.rows.length === 0) {
            client.release();
            return res.status(404).json({
              error: 'User not found',
              message: '用户不存在'
            });
          }
          
          const user = userQuery.rows[0];
          
          // Get locker and store info
          const lockerQuery = await client.query(
            `SELECT l.id, l.number, l.store_id, s.name as store_name 
             FROM lockers l 
             JOIN stores s ON l.store_id = s.id 
             WHERE l.id = $1`,
            [locker_id]
          );
          
          if (lockerQuery.rows.length === 0) {
            client.release();
            return res.status(404).json({
              error: 'Locker not found',
              message: '杆柜不存在'
            });
          }
          
          const locker = lockerQuery.rows[0];
          
          // Generate unique voucher code
          let voucherCode;
          let codeExists = true;
          while (codeExists) {
            voucherCode = generateVoucherCode();
            const checkCode = await client.query(
              'SELECT id FROM vouchers WHERE code = $1',
              [voucherCode]
            );
            codeExists = checkCode.rows.length > 0;
          }
          
          // PRD Requirement: No QR codes - simple display only
          // Create voucher display data (no QR code)
          const voucherDisplay = {
            code: voucherCode,
            operation: operation_type,
            user: user.name,
            phone: user.phone,
            locker: locker.number,
            store: locker.store_name,
            timestamp: new Date().toISOString()
          };
          
          // Set expiry time (30 minutes from now)
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 30);
          
          // Create voucher record (without QR data)
          const insertQuery = `
            INSERT INTO vouchers (
              user_id, locker_id, operation_type, code, qr_data, 
              user_phone, user_name, user_avatar_url,
              locker_number, store_id, store_name,
              expires_at
            )
            VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
          `;
          
          const result = await client.query(insertQuery, [
            user_id, locker_id, operation_type, voucherCode,
            user.phone, user.name, user.avatar_url,
            locker.number, locker.store_id, locker.store_name,
            expiresAt
          ]);
          
          const voucher = result.rows[0];
          
          // Log voucher creation event
          await client.query(
            `INSERT INTO voucher_events (voucher_id, event_type, actor_type, actor_id, store_id)
             VALUES ($1, 'issued', 'user', $2, $3)`,
            [voucher.id, user_id, locker.store_id]
          );
          
          client.release();
          
          // Format response (PRD: No QR code, simple display only)
          res.json({
            success: true,
            voucher: {
              id: voucher.id,
              code: voucher.code,
              // qr_data removed per PRD requirement
              operation_type: voucher.operation_type,
              display_text: `${operation_type === 'store' ? '存杆' : '取杆'}凭证`,
              user_info: {
                name: voucher.user_name,
                phone: voucher.user_phone,
                avatar_url: voucher.user_avatar_url
              },
              locker_info: {
                number: voucher.locker_number,
                store_name: voucher.store_name
              },
              issued_at: voucher.issued_at,
              expires_at: voucher.expires_at,
              status: voucher.status
            }
          });
          
        } catch (innerError) {
          client.release();
          throw innerError;
        }
        
      } catch (error) {
        console.error('Voucher request error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '凭证申请失败，请稍后重试'
        });
      }
    });
    
    // Get user's voucher history
    this.app.get('/vouchers/my-history', async (req, res) => {
      try {
        const { user_id, status, operation_type, from, to } = req.query;
        
        if (!user_id) {
          return res.status(400).json({
            error: 'Missing user ID',
            message: '缺少用户ID'
          });
        }
        
        const client = await this.pool.connect();
        
        let query = `
          SELECT v.*, 
            CASE WHEN v.expires_at < NOW() AND v.status = 'issued' THEN true ELSE false END as is_expired
          FROM vouchers v
          WHERE v.user_id = $1
        `;
        const params = [user_id];
        let paramIndex = 2;
        
        if (status) {
          query += ` AND v.status = $${paramIndex}`;
          params.push(status);
          paramIndex++;
        }
        
        if (operation_type) {
          query += ` AND v.operation_type = $${paramIndex}`;
          params.push(operation_type);
          paramIndex++;
        }
        
        if (from) {
          query += ` AND v.issued_at >= $${paramIndex}`;
          params.push(from);
          paramIndex++;
        }
        
        if (to) {
          query += ` AND v.issued_at <= $${paramIndex}`;
          params.push(to);
          paramIndex++;
        }
        
        query += ' ORDER BY v.issued_at DESC LIMIT 50';
        
        const result = await client.query(query, params);
        client.release();
        
        res.json({
          success: true,
          vouchers: result.rows,
          total: result.rows.length
        });
        
      } catch (error) {
        console.error('Get voucher history error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '获取凭证历史失败'
        });
      }
    });
    
    // Admin endpoint: Scan/lookup voucher by code
    this.app.get('/api/admin/vouchers/scan/:code', async (req, res) => {
      try {
        const { code } = req.params;
        
        if (!code) {
          return res.status(400).json({
            error: 'Missing voucher code',
            message: '缺少凭证码'
          });
        }
        
        const client = await this.pool.connect();
        
        const query = `
          SELECT v.*, 
            u.name as current_user_name,
            u.phone as current_user_phone,
            u.avatar_url as current_user_avatar,
            CASE WHEN v.expires_at < NOW() THEN true ELSE false END as is_expired,
            EXTRACT(EPOCH FROM (v.expires_at - NOW()))/60 as minutes_remaining
          FROM vouchers v
          JOIN users u ON v.user_id = u.id
          WHERE v.code = $1
        `;
        
        const result = await client.query(query, [code.toUpperCase()]);
        
        // Log scan event
        if (result.rows.length > 0) {
          await client.query(
            `INSERT INTO voucher_events (voucher_id, event_type, actor_type, store_id)
             VALUES ($1, 'scanned', 'staff', $2)`,
            [result.rows[0].id, result.rows[0].store_id]
          );
        }
        
        client.release();
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'Voucher not found',
            message: '凭证不存在'
          });
        }
        
        const voucher = result.rows[0];
        
        res.json({
          success: true,
          voucher: {
            id: voucher.id,
            code: voucher.code,
            operation_type: voucher.operation_type,
            status: voucher.status,
            user: {
              id: voucher.user_id,
              name: voucher.user_name,
              phone: voucher.user_phone,
              avatar_url: voucher.user_avatar_url
            },
            locker: {
              id: voucher.locker_id,
              number: voucher.locker_number,
              store_name: voucher.store_name
            },
            issued_at: voucher.issued_at,
            expires_at: voucher.expires_at,
            is_expired: voucher.is_expired,
            time_remaining: voucher.is_expired ? 0 : Math.max(0, Math.floor(voucher.minutes_remaining)) + ' 分钟'
          }
        });
        
      } catch (error) {
        console.error('Voucher scan error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '凭证查询失败'
        });
      }
    });
    
    // Admin endpoint: Verify and mark voucher as used
    this.app.post('/api/admin/vouchers/:id/verify', async (req, res) => {
      try {
        const { id } = req.params;
        const { admin_id, verification_notes } = req.body;
        
        if (!id || !admin_id) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: '缺少必要参数'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Check voucher status
          const checkQuery = await client.query(
            'SELECT * FROM vouchers WHERE id = $1',
            [id]
          );
          
          if (checkQuery.rows.length === 0) {
            client.release();
            return res.status(404).json({
              error: 'Voucher not found',
              message: '凭证不存在'
            });
          }
          
          const voucher = checkQuery.rows[0];
          
          if (voucher.status !== 'issued') {
            client.release();
            return res.status(400).json({
              error: 'Invalid voucher status',
              message: `凭证状态无效：${voucher.status === 'used' ? '已使用' : voucher.status === 'expired' ? '已过期' : '已取消'}`
            });
          }
          
          // Check if expired
          if (new Date(voucher.expires_at) < new Date()) {
            // Update status to expired
            await client.query(
              'UPDATE vouchers SET status = $1, updated_at = NOW() WHERE id = $2',
              ['expired', id]
            );
            
            client.release();
            return res.status(400).json({
              error: 'Voucher expired',
              message: '凭证已过期'
            });
          }
          
          // Mark voucher as used
          const updateQuery = `
            UPDATE vouchers 
            SET status = 'used',
                used_at = NOW(),
                used_by = $1,
                used_at_store = $2,
                verification_notes = $3,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
          `;
          
          const result = await client.query(updateQuery, [
            admin_id,
            voucher.store_id,
            verification_notes || null,
            id
          ]);
          
          // Log verification event
          await client.query(
            `INSERT INTO voucher_events (voucher_id, event_type, actor_type, actor_id, store_id, metadata)
             VALUES ($1, 'verified', 'staff', $2, $3, $4)`,
            [id, admin_id, voucher.store_id, JSON.stringify({ notes: verification_notes })]
          );
          
          // Update locker status based on operation type
          if (voucher.operation_type === 'store') {
            // Mark locker as occupied
            await client.query(
              'UPDATE lockers SET status = $1, current_user_id = $2, assigned_at = NOW() WHERE id = $3',
              ['occupied', voucher.user_id, voucher.locker_id]
            );
          } else if (voucher.operation_type === 'retrieve') {
            // Mark locker as available
            await client.query(
              'UPDATE lockers SET status = $1, current_user_id = NULL, assigned_at = NULL WHERE id = $2',
              ['available', voucher.locker_id]
            );
          }
          
          // Create locker record for history
          await client.query(
            `INSERT INTO locker_records (user_id, locker_id, action, notes, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [voucher.user_id, voucher.locker_id, voucher.operation_type, `凭证验证：${voucher.operation_type === 'store' ? '存放' : '取回'}球杆`]
          );
          
          client.release();
          
          res.json({
            success: true,
            message: '凭证已验证使用',
            voucher: result.rows[0]
          });
          
        } catch (innerError) {
          client.release();
          throw innerError;
        }
        
      } catch (error) {
        console.error('Voucher verification error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '凭证验证失败'
        });
      }
    });

    // User Registration (with avatar and store selection per PRD)
    this.app.post('/api/register', async (req, res) => {
      console.log('User registration request received');
      const { phone, name, store_id, avatar_base64 } = req.body;
      
      // Validation
      if (!phone || !name || !store_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: '请填写所有必填项（手机号、姓名、门店）'
        });
      }
      
      // Validate phone format
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number',
          message: '请输入有效的手机号码'
        });
      }
      
      // Validate name length
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Invalid name',
          message: '姓名长度应在2-50个字符之间'
        });
      }
      
      // Process avatar if provided
      let avatarUrl = null;
      if (avatar_base64) {
        // Validate base64 size (max 5MB after encoding)
        const base64Size = Buffer.byteLength(avatar_base64, 'base64');
        if (base64Size > 5 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            error: 'Avatar too large',
            message: '头像文件过大，请选择小于5MB的图片'
          });
        }
        // Store base64 directly for now (in production, should use cloud storage)
        avatarUrl = avatar_base64;
      }
      
      const client = await this.pool.connect();
      let clientReleased = false;
      
      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id FROM users WHERE phone = $1',
          [phone]
        );
        
        if (existingUser.rows.length > 0) {
          client.release();
          return res.status(409).json({
            success: false,
            error: 'User already exists',
            message: '该手机号已注册'
          });
        }
        
        // Verify store exists
        const storeCheck = await client.query(
          'SELECT id, name FROM stores WHERE id = $1',
          [store_id]
        );
        
        if (storeCheck.rows.length === 0) {
          client.release();
          return res.status(400).json({
            success: false,
            error: 'Invalid store',
            message: '选择的门店不存在'
          });
        }
        
        // Create new user
        const createUserQuery = `
          INSERT INTO users (
            id, phone, name, avatar_url, store_id, 
            status, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, 
            'active', NOW()
          ) RETURNING *
        `;
        
        const result = await client.query(createUserQuery, [
          phone, name, avatarUrl, store_id
        ]);
        
        const newUser = result.rows[0];
        client.release();
        clientReleased = true;
        
        console.log(`✅ User registered successfully: ${name} (${phone})`);
        
        // Generate token for auto-login
        const token = 'test_token_' + newUser.id;
        
        res.json({
          success: true,
          message: '注册成功',
          data: {
            user: {
              id: newUser.id,
              phone: newUser.phone,
              name: newUser.name,
              avatar: newUser.avatar_url,
              store_id: newUser.store_id,
              store_name: storeCheck.rows[0].name
            },
            token: token
          }
        });
        
      } catch (error) {
        if (!clientReleased) {
          client.release();
        }
        console.error('Registration error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '注册失败，请稍后重试'
        });
      }
    });

    // Get current authenticated user info
    this.app.get('/auth/me', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: '未授权访问'
          });
        }
        
        const token = authHeader.substring(7);
        
        // For test environment, extract user ID from test token
        if (token.startsWith('test_token_')) {
          const userId = token.replace('test_token_', '');
          
          const client = await this.pool.connect();
          try {
            // Get user with locker info
            const userQuery = `
              SELECT 
                u.id, u.phone, u.name, u.avatar_url, u.status, u.created_at,
                s.id as store_id, s.name as store_name,
                l.id as locker_id, l.number as locker_number, l.status as locker_status
              FROM users u
              LEFT JOIN stores s ON u.store_id = s.id
              LEFT JOIN applications a ON a.user_id = u.id AND a.status = 'approved'
              LEFT JOIN lockers l ON a.assigned_locker_id = l.id
              WHERE u.id = $1
            `;
            
            const result = await client.query(userQuery, [userId]);
            
            if (result.rows.length === 0) {
              client.release();
              return res.status(404).json({
                success: false,
                error: 'User not found',
                message: '用户不存在'
              });
            }
            
            const user = result.rows[0];
            
            client.release();
            
            res.json({
              success: true,
              data: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                avatar_url: user.avatar_url,
                status: user.status,
                created_at: user.created_at,
                store: user.store_id ? {
                  id: user.store_id,
                  name: user.store_name
                } : null,
                locker: user.locker_id ? {
                  id: user.locker_id,
                  number: user.locker_number,
                  status: user.locker_status
                } : null
              }
            });
            
          } catch (error) {
            console.error('Get user info error:', error);
            client.release();
            res.status(500).json({
              success: false,
              error: 'Database error',
              message: '获取用户信息失败'
            });
          }
        } else {
          // For JWT token validation in production
          const jwt = require('jsonwebtoken');
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yeslocker-secret-key-2024');
            const userId = decoded.id || decoded.userId;
            
            const client = await this.pool.connect();
            try {
              const userQuery = `
                SELECT 
                  u.id, u.phone, u.name, u.avatar_url, u.status, u.created_at,
                  s.id as store_id, s.name as store_name,
                  l.id as locker_id, l.number as locker_number, l.status as locker_status
                FROM users u
                LEFT JOIN stores s ON u.store_id = s.id
                LEFT JOIN applications a ON a.user_id = u.id AND a.status = 'approved'
                LEFT JOIN lockers l ON a.assigned_locker_id = l.id
                WHERE u.id = $1
              `;
              
              const result = await client.query(userQuery, [userId]);
              
              if (result.rows.length === 0) {
                client.release();
                return res.status(404).json({
                  success: false,
                  error: 'User not found',
                  message: '用户不存在'
                });
              }
              
              const user = result.rows[0];
              
              client.release();
              
              res.json({
                success: true,
                data: {
                  id: user.id,
                  phone: user.phone,
                  name: user.name,
                  avatar_url: user.avatar_url,
                  status: user.status,
                  created_at: user.created_at,
                  store: user.store_id ? {
                    id: user.store_id,
                    name: user.store_name
                  } : null,
                  locker: user.locker_id ? {
                    id: user.locker_id,
                    number: user.locker_number,
                    status: user.locker_status
                  } : null
                }
              });
              
            } catch (error) {
              console.error('Get user info error:', error);
              client.release();
              res.status(500).json({
                success: false,
                error: 'Database error',
                message: '获取用户信息失败'
              });
            }
          } catch (error) {
            console.error('Token validation error:', error);
            res.status(401).json({
              success: false,
              error: 'Invalid token',
              message: '无效的认证令牌'
            });
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: '服务器内部错误'
        });
      }
    });

    // Get user's locker information
    this.app.get('/users/:id/locker', async (req, res) => {
      let client;
      try {
        const { id: userId } = req.params;
        
        // Validate authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: '未授权访问'
          });
        }
        
        client = await this.pool.connect();
        
        // Get user's locker information through approved applications
        const query = `
          SELECT 
            l.id, 
            l.number, 
            l.status, 
            l.store_id,
            l.assigned_at,
            l.current_user_id,
            s.name as store_name,
            s.address as store_address,
            s.phone as store_phone,
            a.id as application_id,
            a.status as application_status
          FROM lockers l
          INNER JOIN applications a ON a.assigned_locker_id = l.id
          LEFT JOIN stores s ON l.store_id = s.id
          WHERE a.user_id = $1 
            AND a.status = 'approved'
            AND l.current_user_id = $1
          ORDER BY a.approved_at DESC
          LIMIT 1
        `;
        
        const result = await client.query(query, [userId]);
        
        if (result.rows.length === 0) {
          client.release();
          return res.json({
            success: true,
            data: null,
            message: '用户暂无分配的杆柜'
          });
        }
        
        const locker = result.rows[0];
        
        // Get recent records for this locker
        const recordsQuery = `
          SELECT 
            id,
            action,
            created_at,
            notes
          FROM locker_records
          WHERE locker_id = $1 AND user_id = $2
          ORDER BY created_at DESC
          LIMIT 10
        `;
        
        const recordsResult = await client.query(recordsQuery, [locker.id, userId]);
        
        client.release();
        
        res.json({
          success: true,
          data: {
            id: locker.id,
            number: locker.number,
            status: locker.status,
            assigned_at: locker.assigned_at,
            store: {
              id: locker.store_id,
              name: locker.store_name || '未知门店',
              address: locker.store_address,
              phone: locker.store_phone
            },
            records: recordsResult.rows
          }
        });
        
      } catch (error) {
        console.error('Get user locker error:', error);
        if (client) client.release();
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取用户杆柜信息失败',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // Fix user-store associations for existing users
    this.app.post('/api/fix-user-store-associations', authenticateToken, async (req, res) => {
      let client;
      try {
        // Check if admin
        const authHeader = req.headers.authorization;
        const token = authHeader.substring(7);
        
        client = await this.pool.connect();
        
        // First, get stats on how many users need fixing
        const checkQuery = `
          SELECT COUNT(*) as need_fix
          FROM users u
          INNER JOIN applications a ON a.user_id = u.id
          WHERE a.status = 'approved'
            AND u.store_id IS NULL
            AND a.store_id IS NOT NULL
        `;
        
        const checkResult = await client.query(checkQuery);
        const needFix = parseInt(checkResult.rows[0].need_fix);
        
        if (needFix === 0) {
          client.release();
          return res.json({
            success: true,
            message: '没有需要修复的用户',
            fixed: 0
          });
        }
        
        // Fix all users with approved applications but NULL store_id
        const fixQuery = `
          UPDATE users u
          SET 
            store_id = a.store_id,
            updated_at = NOW()
          FROM applications a
          WHERE 
            u.id = a.user_id 
            AND a.status = 'approved'
            AND u.store_id IS NULL
            AND a.store_id IS NOT NULL
          RETURNING u.id, u.name, u.phone
        `;
        
        const fixResult = await client.query(fixQuery);
        
        // Also check for test store
        const testStoreQuery = `
          SELECT id, name, address, status 
          FROM stores 
          WHERE name LIKE '%测试%' OR address LIKE '%测试%'
        `;
        
        const testStoreResult = await client.query(testStoreQuery);
        
        client.release();
        
        console.log(`✅ 修复了 ${fixResult.rows.length} 个用户的门店关联`);
        
        res.json({
          success: true,
          message: `成功修复 ${fixResult.rows.length} 个用户的门店关联`,
          fixed: fixResult.rows.length,
          users: fixResult.rows,
          testStores: testStoreResult.rows
        });
        
      } catch (error) {
        console.error('Fix user-store associations error:', error);
        if (client) client.release();
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '修复用户门店关联失败',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // Diagnostic endpoint for debugging locker-user relationships
    this.app.get('/api/debug-locker-user/:user_id', authenticateToken, async (req, res) => {
      try {
        const { user_id } = req.params;
        const client = await this.pool.connect();
        
        // Get user info
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [user_id]);
        
        // Get all applications for this user
        const appResult = await client.query(
          'SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC',
          [user_id]
        );
        
        // Get lockers that have this user as current_user_id
        const lockerResult = await client.query(
          'SELECT * FROM lockers WHERE current_user_id = $1',
          [user_id]
        );
        
        // Get lockers referenced by approved applications
        const lockerByAppResult = await client.query(`
          SELECT l.*, a.id as app_id, a.status as app_status, a.approved_at
          FROM applications a
          LEFT JOIN lockers l ON a.assigned_locker_id = l.id
          WHERE a.user_id = $1 AND a.status = 'approved'
        `, [user_id]);
        
        client.release();
        
        res.json({
          success: true,
          data: {
            user: userResult.rows[0] || null,
            applications: appResult.rows,
            lockers_by_current_user_id: lockerResult.rows,
            lockers_by_application: lockerByAppResult.rows,
            analysis: {
              has_approved_application: appResult.rows.some(a => a.status === 'approved'),
              assigned_locker_ids: appResult.rows.filter(a => a.assigned_locker_id).map(a => a.assigned_locker_id),
              locker_with_user_as_current: lockerResult.rows.length > 0
            }
          }
        });
      } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // User login
    this.app.post('/auth-login', async (req, res) => {
      try {
        const { phone } = req.body;

        if (!phone) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: '请输入手机号'
          });
        }

        const client = await this.pool.connect();
        let clientReleased = false;
        
        try {
          const userQuery = 'SELECT * FROM users WHERE phone = $1 AND status = $2';
          const result = await client.query(userQuery, [phone, 'active']);
          
          if (result.rows.length === 0) {
            // Auto-create user for development/testing
            console.log(`🔧 Auto-creating user for phone: ${phone}`);
            const createUserQuery = `
              INSERT INTO users (id, phone, name, password, status, store_id, created_at) 
              VALUES (gen_random_uuid(), $1, $2, $3, 'active', '00000000-0000-0000-0000-000000000001', NOW()) 
              RETURNING *
            `;
            const createResult = await client.query(createUserQuery, [phone, `用户${phone.slice(-4)}`, '$2b$10$UXCLfYlgC5NFLu/PwOWg5uzQBv36q5EntaA2Gx8/i1LoHnNq01teC']);
            const newUser = createResult.rows[0];
            client.release();
            clientReleased = true;
            
            console.log(`✅ 新用户自动创建并登录成功: ${newUser.name} (${phone})`);
            
            return res.json({
              success: true,
              message: '登录成功（新用户已创建）',
              data: {
                user: {
                  id: newUser.id,
                  phone: newUser.phone,
                  name: newUser.name,
                  avatar: newUser.avatar_url,
                  store_id: newUser.store_id
                },
                token: 'test_token_' + newUser.id
              }
            });
          }

          const user = result.rows[0];
          client.release();
          clientReleased = true;

          // Login with phone number only (verification code removed)

          console.log(`✅ 用户登录成功: ${user.name} (${phone})`);

          res.json({
            success: true,
            message: '登录成功',
            data: {
              user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                avatar: user.avatar_url,
                store_id: user.store_id
              },
              token: 'test_token_' + user.id
            }
          });
        } catch (dbError) {
          if (!clientReleased) {
            client.release();
          }
          throw dbError;
        }
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '登录失败，请稍后重试'
        });
      }
    });

    // Admin Statistics API - Ultra-optimized for performance 
    // Enhanced Statistics API with RBAC support
    this.app.get('/api/admin-statistics', authenticateToken, async (req, res) => {
      try {
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        const { store_id, period = '7d' } = req.query;
        
        const client = await this.pool.connect();
        
        // Determine store filter based on RBAC
        let hasStoreFilter = false;
        let storeFilterId = null;
        
        if (adminRole === 'store_admin') {
          // Store admins can only see their own store stats
          hasStoreFilter = true;
          storeFilterId = adminStoreId;
        } else if (store_id) {
          // Super admin and HQ admin can filter by store
          hasStoreFilter = true;
          storeFilterId = store_id;
        }
        
        // Calculate date range for trends
        let dateRange = '7 days';
        if (period === '30d') dateRange = '30 days';
        else if (period === '90d') dateRange = '90 days';
        else if (period === '1y') dateRange = '1 year';
        
        // Build query based on whether we have a store filter
        let overviewQuery;
        let overviewParams = [];
        
        if (hasStoreFilter) {
          // Query with store filter
          overviewQuery = `
            WITH stats AS (
              SELECT 
                (SELECT COUNT(DISTINCT u.id) FROM users u 
                 JOIN applications a ON u.id = a.user_id
                 WHERE a.store_id = $1
                   AND a.status = 'approved'
                   AND u.status = 'active') as active_users,
                (SELECT COUNT(*) FROM applications 
                 WHERE store_id = $1
                   AND status = 'pending') as pending_applications,
                (SELECT COUNT(*) FROM locker_records lr
                 JOIN lockers l ON lr.locker_id = l.id
                 WHERE l.store_id = $1
                   AND lr.created_at >= CURRENT_DATE 
                   AND lr.created_at < CURRENT_DATE + INTERVAL '1 day') as today_records,
                1 as total_stores
            ),
            locker_stats AS (
              SELECT 
                COUNT(*) as total_lockers,
                COALESCE(SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_lockers,
                COALESCE(SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END), 0) as available_lockers,
                COALESCE(SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END), 0) as maintenance_lockers
              FROM lockers
              WHERE store_id = $1
            ),
            voucher_stats AS (
              SELECT
                COUNT(*) as total_vouchers,
                COALESCE(SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END), 0) as used_vouchers,
                COALESCE(SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END), 0) as active_vouchers
              FROM vouchers v
              JOIN users u ON v.user_id = u.id
              JOIN applications a ON u.id = a.user_id
              WHERE a.store_id = $1
                AND v.created_at >= CURRENT_DATE - INTERVAL '${dateRange}'
            )
            SELECT 
              s.*,
              ls.*,
              vs.*
            FROM stats s, locker_stats ls, voucher_stats vs
          `;
          overviewParams = [storeFilterId];
        } else {
          // Query without store filter (all stores)
          overviewQuery = `
            WITH stats AS (
              SELECT 
                (SELECT COUNT(DISTINCT u.id) FROM users u 
                 WHERE u.status = 'active'
                   AND EXISTS (SELECT 1 FROM applications a 
                               WHERE a.user_id = u.id 
                               AND a.status = 'approved')) as active_users,
                (SELECT COUNT(*) FROM applications 
                 WHERE status = 'pending') as pending_applications,
                (SELECT COUNT(*) FROM locker_records lr
                 WHERE lr.created_at >= CURRENT_DATE 
                   AND lr.created_at < CURRENT_DATE + INTERVAL '1 day') as today_records,
                (SELECT COUNT(*) FROM stores) as total_stores
            ),
            locker_stats AS (
              SELECT 
                COUNT(*) as total_lockers,
                COALESCE(SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_lockers,
                COALESCE(SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END), 0) as available_lockers,
                COALESCE(SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END), 0) as maintenance_lockers
              FROM lockers
            ),
            voucher_stats AS (
              SELECT
                COUNT(*) as total_vouchers,
                COALESCE(SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END), 0) as used_vouchers,
                COALESCE(SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END), 0) as active_vouchers
              FROM vouchers v
              WHERE v.created_at >= CURRENT_DATE - INTERVAL '${dateRange}'
            )
            SELECT 
              s.*,
              ls.*,
              vs.*
            FROM stats s, locker_stats ls, voucher_stats vs
          `;
          overviewParams = [];
        }
        
        const overviewResult = await client.query(overviewQuery, overviewParams);
        
        // Get trend data
        let trendQuery;
        let trendParams = [];
        
        if (hasStoreFilter) {
          trendQuery = `
            WITH daily_stats AS (
              SELECT 
                DATE(lr.created_at) as date,
                COUNT(*) FILTER (WHERE lr.action = 'check_in') as check_ins,
                COUNT(*) FILTER (WHERE lr.action = 'check_out') as check_outs,
                COUNT(DISTINCT lr.user_id) as unique_users
              FROM locker_records lr
              JOIN lockers l ON lr.locker_id = l.id
              WHERE l.store_id = $1
                AND lr.created_at >= CURRENT_DATE - INTERVAL '${dateRange}'
              GROUP BY DATE(lr.created_at)
              ORDER BY date
            )
            SELECT * FROM daily_stats
          `;
          trendParams = [storeFilterId];
        } else {
          trendQuery = `
            WITH daily_stats AS (
              SELECT 
                DATE(created_at) as date,
                COUNT(*) FILTER (WHERE action = 'check_in') as check_ins,
                COUNT(*) FILTER (WHERE action = 'check_out') as check_outs,
                COUNT(DISTINCT user_id) as unique_users
              FROM locker_records
              WHERE created_at >= CURRENT_DATE - INTERVAL '${dateRange}'
              GROUP BY DATE(created_at)
              ORDER BY date
            )
            SELECT * FROM daily_stats
          `;
          trendParams = [];
        }
        
        const trendResult = await client.query(trendQuery, trendParams);
        
        // Get top stores (for super admin and HQ admin only)
        let topStores = [];
        if (adminRole !== 'store_admin' && !store_id) {
          const topStoresQuery = `
            SELECT 
              s.id,
              s.name,
              s.address,
              COUNT(DISTINCT l.id) as total_lockers,
              COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'occupied') as occupied_lockers,
              COUNT(DISTINCT lr.id) as total_operations,
              COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'approved') as approved_applications
            FROM stores s
            LEFT JOIN lockers l ON s.id = l.store_id
            LEFT JOIN locker_records lr ON l.id = lr.locker_id 
              AND lr.created_at >= CURRENT_DATE - INTERVAL '${dateRange}'
            LEFT JOIN applications a ON s.id = a.store_id
            GROUP BY s.id, s.name, s.address
            ORDER BY total_operations DESC
            LIMIT 10
          `;
          
          const topStoresResult = await client.query(topStoresQuery);
          topStores = topStoresResult.rows;
        }
        
        // Get recent activities
        let recentQuery;
        let recentParams = [];
        
        if (hasStoreFilter) {
          recentQuery = `
            SELECT 
              'application' as type,
              a.id,
              a.created_at,
              u.name as user_name,
              s.name as store_name,
              a.status
            FROM applications a
            JOIN users u ON a.user_id = u.id
            JOIN stores s ON a.store_id = s.id
            WHERE s.id = $1
            ORDER BY a.created_at DESC
            LIMIT 10
          `;
          recentParams = [storeFilterId];
        } else {
          recentQuery = `
            SELECT 
              'application' as type,
              a.id,
              a.created_at,
              u.name as user_name,
              s.name as store_name,
              a.status
            FROM applications a
            JOIN users u ON a.user_id = u.id
            JOIN stores s ON a.store_id = s.id
            ORDER BY a.created_at DESC
            LIMIT 10
          `;
          recentParams = [];
        }
        
        const recentResult = await client.query(recentQuery, recentParams);
        
        client.release();
        
        // Format response
        const overview = overviewResult.rows[0];
        const response = {
          success: true,
          data: {
            overview: {
              users: {
                active: parseInt(overview.active_users) || 0,
                growth: 0 // TODO: Calculate growth percentage
              },
              lockers: {
                total: parseInt(overview.total_lockers) || 0,
                occupied: parseInt(overview.occupied_lockers) || 0,
                available: parseInt(overview.available_lockers) || 0,
                maintenance: parseInt(overview.maintenance_lockers) || 0,
                occupancy_rate: overview.total_lockers > 0 
                  ? Math.round((overview.occupied_lockers / overview.total_lockers) * 100) 
                  : 0
              },
              applications: {
                pending: parseInt(overview.pending_applications) || 0,
                today: parseInt(overview.today_records) || 0
              },
              vouchers: {
                total: parseInt(overview.total_vouchers) || 0,
                used: parseInt(overview.used_vouchers) || 0,
                active: parseInt(overview.active_vouchers) || 0
              },
              stores: {
                total: parseInt(overview.total_stores) || 0
              }
            },
            trends: trendResult.rows.map(row => ({
              date: row.date,
              checkIns: parseInt(row.check_ins) || 0,
              checkOuts: parseInt(row.check_outs) || 0,
              uniqueUsers: parseInt(row.unique_users) || 0
            })),
            topStores: topStores.map(store => ({
              id: store.id,
              name: store.name,
              address: store.address,
              totalLockers: parseInt(store.total_lockers) || 0,
              occupiedLockers: parseInt(store.occupied_lockers) || 0,
              totalOperations: parseInt(store.total_operations) || 0,
              approvedApplications: parseInt(store.approved_applications) || 0
            })),
            recentActivities: recentResult.rows.map(activity => ({
              type: activity.type,
              id: activity.id,
              createdAt: activity.created_at,
              userName: activity.user_name,
              storeName: activity.store_name,
              status: activity.status
            })),
            period: period,
            role: adminRole,
            storeId: store_id || adminStoreId
          }
        };
        
        res.json(response);
        
      } catch (error) {
        console.error('Get admin statistics error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取统计数据失败'
        });
      }
    });

    // Admin Applications API with RBAC
    this.app.get('/api/admin-approval', authenticateToken, async (req, res) => {
      try {
        const { page = 1, pageSize = 20, status, storeId, adminId } = req.query;
        const offset = (page - 1) * pageSize;
        
        // Get admin info from token
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        console.log(`📋 获取申请列表请求 - Admin: ${adminInfo.name}, Role: ${adminRole}, Store: ${adminStoreId}`);
        console.log(`📋 参数 - page: ${page}, pageSize: ${pageSize}, status: ${status}, storeId: ${storeId}`);
        
        const client = await this.pool.connect();
        
        // First check if applications table exists
        const tableCheckQuery = `
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name IN ('applications', 'users', 'stores', 'lockers')
        `;
        const tableCheck = await client.query(tableCheckQuery);
        console.log(`📊 数据库表检查结果:`, tableCheck.rows.map(r => r.table_name));
        
        let whereClause = 'WHERE 1=1';
        const params = [parseInt(pageSize), parseInt(offset)];
        let paramIndex = 2;
        
        // Apply RBAC filtering
        if (adminRole === 'store_admin') {
          // Store admins can only see applications for their own store
          if (!adminStoreId) {
            client.release();
            return res.status(403).json({
              success: false,
              error: 'Store admin without store assignment',
              message: '门店管理员未分配门店'
            });
          }
          paramIndex++;
          whereClause += ` AND a.store_id = $${paramIndex}`;
          params.push(adminStoreId);
        } else if (storeId) {
          // Super admin or HQ admin can filter by specific store if provided
          paramIndex++;
          whereClause += ` AND a.store_id = $${paramIndex}`;
          params.push(storeId);
        }
        
        if (status && status !== 'all') {
          paramIndex++;
          whereClause += ` AND a.status = $${paramIndex}`;
          params.push(status);
        }
        
        const applicationsQuery = `
          SELECT 
            a.id, a.status, a.rejection_reason as remark, a.created_at,
            u.id as user_id, u.name as user_name, u.phone as user_phone, u.avatar_url,
            s.id as store_id, s.name as store_name,
            l.id as locker_id, l.number as locker_number
          FROM applications a
          LEFT JOIN users u ON a.user_id = u.id
          LEFT JOIN stores s ON a.store_id = s.id
          LEFT JOIN lockers l ON a.assigned_locker_id = l.id
          ${whereClause}
          ORDER BY a.created_at DESC
          LIMIT $1 OFFSET $2
        `;
        
        console.log(`🔍 执行SQL查询:`, applicationsQuery);
        console.log(`🎯 查询参数:`, params);
        
        const result = await client.query(applicationsQuery, params);
        console.log(`✅ 查询成功，返回 ${result.rows.length} 条记录`);
        
        client.release();
        
        const applications = result.rows.map(row => ({
          id: row.id,
          status: row.status,
          notes: row.notes,
          created_at: row.created_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            phone: row.user_phone,
            avatar: row.avatar_url
          },
          store: {
            id: row.store_id,
            name: row.store_name
          },
          locker: {
            id: row.locker_id,
            number: row.locker_number
          }
        }));
        
        res.json({
          success: true,
          data: applications
        });
      } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取申请列表失败'
        });
      }
    });

    // User Locker Application API
    this.app.post('/lockers-apply', async (req, res) => {
      try {
        const { store_id, locker_id, user_id, reason } = req.body;
        
        console.log(`🔧 杆柜申请请求:`, { store_id, locker_id, user_id, reason });
        
        // Validate required fields
        if (!store_id || !locker_id || !user_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: '请选择门店和杆柜'
          });
        }

        const client = await this.pool.connect();
        
        // Check if user has pending applications
        const existingApp = await client.query(
          'SELECT id FROM applications WHERE user_id = $1 AND status = $2',
          [user_id, 'pending']
        );
        
        if (existingApp.rows.length > 0) {
          client.release();
          return res.status(409).json({
            success: false,
            error: 'Existing application',
            message: '您已有进行中的申请，请等待审核'
          });
        }

        // Create new application (include locker_type and purpose from request)
        const insertQuery = `
          INSERT INTO applications (user_id, store_id, assigned_locker_id, notes, status, locker_type, purpose, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id, status, created_at
        `;
        
        const result = await client.query(insertQuery, [
          user_id,
          store_id, 
          locker_id,  // This is correctly mapped to assigned_locker_id
          reason || '',
          'pending',
          req.body.locker_type || '标准杆柜',
          req.body.purpose || '存放球杆'
        ]);
        
        client.release();
        
        const application = result.rows[0];
        
        console.log(`✅ 新申请提交成功: ID ${application.id}, 用户 ${user_id}`);
        
        res.json({
          success: true,
          message: '申请提交成功，请等待审核',
          data: {
            application_id: application.id,
            status: application.status,
            created_at: application.created_at
          }
        });
        
      } catch (error) {
        console.error('Apply locker error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: '申请提交失败，请重试'
        });
      }
    });

    // Store Management CRUD APIs with RBAC
    
    // Get all stores (with filtering based on admin role)
    this.app.get('/api/stores', authenticateToken, async (req, res) => {
      try {
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        const client = await this.pool.connect();
        
        let query = `
          SELECT 
            s.id, s.name, s.address, s.phone, s.status, s.created_at,
            s.business_hours, s.contact_person, s.total_lockers,
            COUNT(DISTINCT l.id) as locker_count,
            COUNT(DISTINCT CASE WHEN l.status = 'available' THEN l.id END) as available_lockers,
            COUNT(DISTINCT u.id) as user_count
          FROM stores s
          LEFT JOIN lockers l ON s.id = l.store_id
          LEFT JOIN users u ON s.id = u.store_id
        `;
        
        const params = [];
        
        // Apply RBAC filtering
        if (adminRole === 'store_admin') {
          query += ' WHERE s.id = $1';
          params.push(adminStoreId);
        }
        
        query += ' GROUP BY s.id ORDER BY s.created_at DESC';
        
        const result = await client.query(query, params);
        client.release();
        
        res.json({
          success: true,
          data: result.rows
        });
      } catch (error) {
        console.error('Get stores error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch stores'
        });
      }
    });
    
    // Get single store details
    this.app.get('/api/stores/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        // RBAC check
        if (adminRole === 'store_admin' && id !== adminStoreId) {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }
        
        const client = await this.pool.connect();
        
        const query = `
          SELECT 
            s.*,
            COUNT(DISTINCT l.id) as locker_count,
            COUNT(DISTINCT CASE WHEN l.status = 'available' THEN l.id END) as available_lockers,
            COUNT(DISTINCT u.id) as user_count,
            COUNT(DISTINCT a.id) as total_applications,
            COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications
          FROM stores s
          LEFT JOIN lockers l ON s.id = l.store_id
          LEFT JOIN users u ON s.id = u.store_id
          LEFT JOIN applications a ON s.id = a.store_id
          WHERE s.id = $1
          GROUP BY s.id
        `;
        
        const result = await client.query(query, [id]);
        client.release();
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Store not found'
          });
        }
        
        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        console.error('Get store details error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch store details'
        });
      }
    });
    
    // Create new store (super_admin and hq_admin only)
    this.app.post('/api/stores', authenticateToken, async (req, res) => {
      try {
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        
        // Permission check
        if (!this.hasPermission(adminRole, 'manage_all_stores')) {
          return res.status(403).json({
            success: false,
            error: 'Permission denied',
            message: '您没有创建门店的权限'
          });
        }
        
        const { name, address, phone, business_hours, contact_person, total_lockers } = req.body;
        
        // Validation
        if (!name || !address) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields'
          });
        }
        
        const client = await this.pool.connect();
        
        // Check if store name already exists
        const existing = await client.query(
          'SELECT id FROM stores WHERE name = $1',
          [name]
        );
        
        if (existing.rows.length > 0) {
          client.release();
          return res.status(409).json({
            success: false,
            error: 'Store name already exists'
          });
        }
        
        const insertQuery = `
          INSERT INTO stores (name, address, phone, business_hours, contact_person, total_lockers, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const result = await client.query(insertQuery, [
          name,
          address,
          phone || '',
          business_hours || '09:00-22:00',
          contact_person || '',
          total_lockers || 50,
          'active'
        ]);
        
        client.release();
        
        console.log(`✅ New store created: ${name} by ${adminInfo.name}`);
        
        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        console.error('Create store error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create store'
        });
      }
    });
    
    // Update store
    this.app.put('/api/stores/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        // RBAC check
        if (adminRole === 'store_admin') {
          if (id !== adminStoreId) {
            return res.status(403).json({
              success: false,
              error: 'Permission denied',
              message: '您只能编辑自己的门店'
            });
          }
        } else if (!this.hasPermission(adminRole, 'manage_all_stores')) {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }
        
        const { name, address, phone, business_hours, contact_person, total_lockers, status } = req.body;
        
        const client = await this.pool.connect();
        
        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          params.push(name);
        }
        if (address !== undefined) {
          updates.push(`address = $${paramIndex++}`);
          params.push(address);
        }
        if (phone !== undefined) {
          updates.push(`phone = $${paramIndex++}`);
          params.push(phone);
        }
        if (business_hours !== undefined) {
          updates.push(`business_hours = $${paramIndex++}`);
          params.push(business_hours);
        }
        if (contact_person !== undefined) {
          updates.push(`contact_person = $${paramIndex++}`);
          params.push(contact_person);
        }
        if (total_lockers !== undefined) {
          updates.push(`total_lockers = $${paramIndex++}`);
          params.push(total_lockers);
        }
        
        // Store admins cannot change store status
        if (status !== undefined && adminRole !== 'store_admin') {
          updates.push(`status = $${paramIndex++}`);
          params.push(status);
        }
        
        if (updates.length === 0) {
          client.release();
          return res.status(400).json({
            success: false,
            error: 'No fields to update'
          });
        }
        
        params.push(id);
        const updateQuery = `
          UPDATE stores 
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, params);
        client.release();
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Store not found'
          });
        }
        
        console.log(`✅ Store updated: ${id} by ${adminInfo.name}`);
        
        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        console.error('Update store error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update store'
        });
      }
    });
    
    // Delete store (super_admin only)
    this.app.delete('/api/stores/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        
        // Only super_admin can delete stores
        if (adminRole !== 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Permission denied',
            message: '只有超级管理员可以删除门店'
          });
        }
        
        const client = await this.pool.connect();
        
        // Check if store has active users or lockers
        const checkQuery = `
          SELECT 
            COUNT(DISTINCT u.id) as user_count,
            COUNT(DISTINCT l.id) as locker_count
          FROM stores s
          LEFT JOIN users u ON s.id = u.store_id AND u.status = 'active'
          LEFT JOIN lockers l ON s.id = l.store_id AND l.status != 'inactive'
          WHERE s.id = $1
          GROUP BY s.id
        `;
        
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rows.length > 0) {
          const counts = checkResult.rows[0];
          if (counts.user_count > 0 || counts.locker_count > 0) {
            client.release();
            return res.status(409).json({
              success: false,
              error: 'Cannot delete store',
              message: `门店还有 ${counts.user_count} 个用户和 ${counts.locker_count} 个杆柜在使用`
            });
          }
        }
        
        // Soft delete - set status to inactive
        const deleteQuery = `
          UPDATE stores 
          SET status = 'inactive', updated_at = NOW()
          WHERE id = $1
          RETURNING id, name
        `;
        
        const result = await client.query(deleteQuery, [id]);
        client.release();
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Store not found'
          });
        }
        
        console.log(`✅ Store deleted: ${result.rows[0].name} by ${adminInfo.name}`);
        
        res.json({
          success: true,
          message: '门店已删除',
          data: result.rows[0]
        });
      } catch (error) {
        console.error('Delete store error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete store'
        });
      }
    });

    // Locker Management CRUD APIs with RBAC
    
    // Get all lockers (with filtering based on admin role)
    this.app.get('/api/admin/lockers', authenticateToken, async (req, res) => {
      try {
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        const { store_id } = req.query;
        
        let query;
        let params = [];
        
        if (adminRole === 'store_admin') {
          // Store admins can only see their own store's lockers
          query = `
            SELECT l.*, s.name as store_name, s.address as store_address,
                   u.name as current_user_name, u.phone as current_user_phone
            FROM lockers l
            LEFT JOIN stores s ON l.store_id = s.id
            LEFT JOIN users u ON l.current_user_id = u.id
            WHERE l.store_id = $1
            ORDER BY l.number
          `;
          params = [adminStoreId];
        } else {
          // Super admin and HQ admin can see all or filter by store
          if (store_id) {
            query = `
              SELECT l.*, s.name as store_name, s.address as store_address,
                     u.name as current_user_name, u.phone as current_user_phone
              FROM lockers l
              LEFT JOIN stores s ON l.store_id = s.id
              LEFT JOIN users u ON l.current_user_id = u.id
              WHERE l.store_id = $1
              ORDER BY l.number
            `;
            params = [store_id];
          } else {
            query = `
              SELECT l.*, s.name as store_name, s.address as store_address,
                     u.name as current_user_name, u.phone as current_user_phone
              FROM lockers l
              LEFT JOIN stores s ON l.store_id = s.id
              LEFT JOIN users u ON l.current_user_id = u.id
              ORDER BY s.name, l.number
            `;
          }
        }
        
        const result = await this.pool.query(query, params);
        
        res.json({
          success: true,
          data: result.rows
        });
      } catch (error) {
        console.error('Error fetching lockers:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch lockers'
        });
      }
    });
    
    // Get single locker details
    this.app.get('/api/admin/lockers/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        const result = await this.pool.query(
          `SELECT l.*, s.name as store_name, s.address as store_address,
                  u.name as current_user_name, u.phone as current_user_phone,
                  a.name as applicant_name, a.phone as applicant_phone
           FROM lockers l
           LEFT JOIN stores s ON l.store_id = s.id
           LEFT JOIN users u ON l.current_user_id = u.id
           LEFT JOIN applications app ON l.id = app.assigned_locker_id
           LEFT JOIN users a ON app.user_id = a.id
           WHERE l.id = $1`,
          [id]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Locker not found'
          });
        }
        
        const locker = result.rows[0];
        
        // RBAC check
        if (adminRole === 'store_admin' && locker.store_id !== adminStoreId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
        
        // Get recent operation records
        const recordsResult = await this.pool.query(
          `SELECT r.*, u.name as user_name, u.phone as user_phone
           FROM locker_records r
           LEFT JOIN users u ON r.user_id = u.id
           WHERE r.locker_id = $1
           ORDER BY r.created_at DESC
           LIMIT 10`,
          [id]
        );
        
        locker.recent_records = recordsResult.rows;
        
        res.json({
          success: true,
          data: locker
        });
      } catch (error) {
        console.error('Error fetching locker details:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch locker details'
        });
      }
    });
    
    // Create new locker
    this.app.post('/api/admin/lockers', authenticateToken, async (req, res) => {
      try {
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        const {
          store_id,
          locker_number,
          location,
          capacity,
          monthly_rent,
          deposit_amount,
          description
        } = req.body;
        
        // Validate required fields
        if (!store_id || !locker_number) {
          return res.status(400).json({
            success: false,
            error: 'Store ID and locker number are required'
          });
        }
        
        // RBAC check
        if (adminRole === 'store_admin' && store_id !== adminStoreId) {
          return res.status(403).json({
            success: false,
            error: 'You can only create lockers for your own store'
          });
        }
        
        // Check if locker number already exists in this store
        const existingCheck = await this.pool.query(
          'SELECT id FROM lockers WHERE store_id = $1 AND locker_number = $2',
          [store_id, locker_number]
        );
        
        if (existingCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Locker number already exists in this store'
          });
        }
        
        // Create locker
        const result = await this.pool.query(
          `INSERT INTO lockers (
            store_id, locker_number, location, capacity,
            monthly_rent, deposit_amount, description,
            status, is_available, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'available', true, NOW(), NOW())
          RETURNING *`,
          [
            store_id,
            locker_number,
            location || '',
            capacity || 1,
            monthly_rent || 0,
            deposit_amount || 0,
            description || ''
          ]
        );
        
        res.status(201).json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        console.error('Error creating locker:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create locker'
        });
      }
    });
    
    // Update locker
    this.app.put('/api/admin/lockers/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        // First check if locker exists and get its store_id
        const lockerCheck = await this.pool.query(
          'SELECT store_id FROM lockers WHERE id = $1',
          [id]
        );
        
        if (lockerCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Locker not found'
          });
        }
        
        const lockerStoreId = lockerCheck.rows[0].store_id;
        
        // RBAC check
        if (adminRole === 'store_admin' && lockerStoreId !== adminStoreId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
        
        const {
          locker_number,
          location,
          capacity,
          monthly_rent,
          deposit_amount,
          description,
          status,
          is_available
        } = req.body;
        
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (locker_number !== undefined) {
          updates.push(`locker_number = $${paramIndex++}`);
          values.push(locker_number);
        }
        if (location !== undefined) {
          updates.push(`location = $${paramIndex++}`);
          values.push(location);
        }
        if (capacity !== undefined) {
          updates.push(`capacity = $${paramIndex++}`);
          values.push(capacity);
        }
        if (monthly_rent !== undefined) {
          updates.push(`monthly_rent = $${paramIndex++}`);
          values.push(monthly_rent);
        }
        if (deposit_amount !== undefined) {
          updates.push(`deposit_amount = $${paramIndex++}`);
          values.push(deposit_amount);
        }
        if (description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(description);
        }
        if (status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          values.push(status);
        }
        if (is_available !== undefined) {
          updates.push(`is_available = $${paramIndex++}`);
          values.push(is_available);
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(id);
        
        const result = await this.pool.query(
          `UPDATE lockers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          values
        );
        
        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        console.error('Error updating locker:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update locker'
        });
      }
    });
    
    // Delete locker
    this.app.delete('/api/admin/lockers/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        const client = await this.pool.connect();
        
        try {
          await client.query('BEGIN');
          
          // Check if locker exists and get its details
          const lockerCheck = await client.query(
            'SELECT store_id, current_user_id, status FROM lockers WHERE id = $1',
            [id]
          );
          
          if (lockerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
              success: false,
              error: 'Locker not found'
            });
          }
          
          const locker = lockerCheck.rows[0];
          
          // RBAC check
          if (adminRole === 'store_admin' && locker.store_id !== adminStoreId) {
            await client.query('ROLLBACK');
            return res.status(403).json({
              success: false,
              error: 'Access denied'
            });
          }
          
          // Check if locker is currently in use
          if (locker.current_user_id || locker.status === 'occupied') {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: 'Cannot delete locker that is currently in use'
            });
          }
          
          // Check for any active applications
          const appCheck = await client.query(
            'SELECT COUNT(*) FROM applications WHERE assigned_locker_id = $1 AND status IN ($2, $3)',
            [id, 'pending', 'approved']
          );
          
          if (parseInt(appCheck.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: 'Cannot delete locker with active applications'
            });
          }
          
          // Delete locker
          await client.query('DELETE FROM lockers WHERE id = $1', [id]);
          
          await client.query('COMMIT');
          
          res.json({
            success: true,
            message: 'Locker deleted successfully'
          });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error deleting locker:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete locker'
        });
      }
    });
    
    // Batch create lockers
    this.app.post('/api/admin/lockers/batch', authenticateToken, async (req, res) => {
      try {
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        const {
          store_id,
          prefix,
          start_number,
          end_number,
          location,
          capacity,
          monthly_rent,
          deposit_amount
        } = req.body;
        
        // Validate required fields
        if (!store_id || !prefix || !start_number || !end_number) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields'
          });
        }
        
        // RBAC check
        if (adminRole === 'store_admin' && store_id !== adminStoreId) {
          return res.status(403).json({
            success: false,
            error: 'You can only create lockers for your own store'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          await client.query('BEGIN');
          
          const created = [];
          const failed = [];
          
          for (let i = start_number; i <= end_number; i++) {
            const locker_number = `${prefix}${String(i).padStart(3, '0')}`;
            
            // Check if locker number already exists
            const existingCheck = await client.query(
              'SELECT id FROM lockers WHERE store_id = $1 AND locker_number = $2',
              [store_id, locker_number]
            );
            
            if (existingCheck.rows.length > 0) {
              failed.push({
                locker_number,
                reason: 'Already exists'
              });
              continue;
            }
            
            // Create locker
            const result = await client.query(
              `INSERT INTO lockers (
                store_id, locker_number, location, capacity,
                monthly_rent, deposit_amount, status, is_available,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, 'available', true, NOW(), NOW())
              RETURNING id, locker_number`,
              [
                store_id,
                locker_number,
                location || '',
                capacity || 1,
                monthly_rent || 0,
                deposit_amount || 0
              ]
            );
            
            created.push(result.rows[0]);
          }
          
          await client.query('COMMIT');
          
          res.json({
            success: true,
            data: {
              created,
              failed,
              total_created: created.length,
              total_failed: failed.length
            }
          });
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error batch creating lockers:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to batch create lockers'
        });
      }
    });

    // Admin Approval Action API with RBAC
    this.app.post('/api/admin-approval', authenticateToken, async (req, res) => {
      try {
        const { application_id, action, admin_id, reject_reason } = req.body;
        
        if (!application_id || !action) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: '缺少必需参数'
          });
        }
        
        // Get admin info from token
        const adminInfo = req.user;
        const adminRole = adminInfo.role;
        const adminStoreId = adminInfo.store_id;
        
        const client = await this.pool.connect();
        
        // First get the application details
        const appResult = await client.query(
          'SELECT * FROM applications WHERE id = $1',
          [application_id]
        );
        
        if (appResult.rows.length === 0) {
          client.release();
          return res.status(404).json({
            success: false,
            error: 'Application not found',
            message: '申请不存在'
          });
        }
        
        const application = appResult.rows[0];
        
        console.log(`📋 审批申请详情:`, {
          application_id: application.id,
          user_id: application.user_id,
          assigned_locker_id: application.assigned_locker_id,
          store_id: application.store_id,
          status: application.status,
          action: action
        });
        
        // RBAC permission check
        if (adminRole === 'store_admin') {
          // Store admins can only approve/reject applications for their own store
          if (application.store_id !== adminStoreId) {
            client.release();
            return res.status(403).json({
              success: false,
              error: 'Permission denied',
              message: '您只能审核本门店的申请'
            });
          }
        }
        
        if (action === 'approve') {
          
          // Update application status (locker is already assigned in assigned_locker_id)
          const appUpdateResult = await client.query(
            'UPDATE applications SET status = $1, approved_at = NOW(), approved_by = $2 WHERE id = $3 RETURNING *',
            ['approved', admin_id || adminInfo.id, application_id]
          );
          console.log(`✅ 申请已批准:`, appUpdateResult.rows[0]);
          
          // Update locker status to occupied (use assigned_locker_id from application)
          const lockerUpdateResult = await client.query(
            'UPDATE lockers SET status = $1, current_user_id = $2, assigned_at = NOW(), updated_at = NOW() WHERE id = $3 RETURNING *',
            ['occupied', application.user_id, application.assigned_locker_id]
          );
          console.log(`✅ 杆柜已分配:`, {
            locker_id: application.assigned_locker_id,
            user_id: application.user_id,
            locker_data: lockerUpdateResult.rows[0]
          });
          
          // IMPORTANT: Update user's store_id to match the locker's store
          // This ensures the user is associated with the store where their locker is located
          const userUpdateResult = await client.query(
            'UPDATE users SET store_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [application.store_id, application.user_id]
          );
          console.log(`✅ 用户门店已更新:`, {
            user_id: application.user_id,
            store_id: application.store_id,
            user_data: userUpdateResult.rows[0]
          });
          
        } else if (action === 'reject') {
          await client.query(
            'UPDATE applications SET status = $1, rejection_reason = $2, approved_at = NOW(), approved_by = $3 WHERE id = $4',
            ['rejected', reject_reason || '', admin_id || adminInfo.id, application_id]
          );
        }
        
        client.release();
        
        res.json({
          success: true,
          message: action === 'approve' ? '审核通过' : '已拒绝'
        });
      } catch (error) {
        console.error('Admin approval error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '审核操作失败'
        });
      }
    });

    // Admin Records API - Fixed missing endpoint
    this.app.get('/api/admin-records', authenticateToken, async (req, res) => {
      try {
        const { user_id, store_id, action_type, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        const client = await this.pool.connect();
        
        let query = `
          SELECT 
            lr.id, lr.action, lr.created_at, lr.notes,
            u.id as user_id, u.name as user_name, u.phone as user_phone,
            l.id as locker_id, l.number as locker_number,
            s.id as store_id, s.name as store_name
          FROM locker_records lr
          JOIN users u ON lr.user_id = u.id
          LEFT JOIN lockers l ON lr.locker_id = l.id
          LEFT JOIN stores s ON l.store_id = s.id
        `;
        
        const params = [];
        const conditions = [];
        let paramIndex = 0;
        
        if (user_id) {
          paramIndex++;
          conditions.push(`lr.user_id = $${paramIndex}`);
          params.push(user_id);
        }
        
        if (store_id) {
          paramIndex++;
          conditions.push(`s.id = $${paramIndex}`);
          params.push(store_id);
        }
        
        if (action_type) {
          paramIndex++;
          conditions.push(`lr.action = $${paramIndex}`);
          params.push(action_type);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ` ORDER BY lr.created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await client.query(query, params);
        client.release();
        
        const records = result.rows.map(row => ({
          id: row.id,
          action: row.action,
          created_at: row.created_at,
          notes: row.notes,
          user: {
            id: row.user_id,
            name: row.user_name,
            phone: row.user_phone
          },
          locker: {
            id: row.locker_id,
            number: row.locker_number
          },
          store: {
            id: row.store_id,
            name: row.store_name
          }
        }));
        
        res.json({
          success: true,
          data: {
            list: records,
            total: records.length,
            page: parseInt(page),
            limit: parseInt(limit)
          }
        });
        
      } catch (error) {
        console.error('Get admin records error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取操作记录失败'
        });
      }
    });

    // Admin Users API - Get users list
    this.app.get('/api/admin-users', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 20, search, store_id, status } = req.query;
        const offset = (page - 1) * limit;
        
        const client = await this.pool.connect();
        
        let query = `
          SELECT 
            u.id, u.phone, u.name, u.avatar_url, u.status, u.created_at,
            s.id as store_id, s.name as store_name,
            COUNT(l.id) as locker_count
          FROM users u
          LEFT JOIN stores s ON u.store_id = s.id
          LEFT JOIN lockers l ON l.current_user_id = u.id
        `;
        
        const params = [];
        const conditions = [];
        let paramIndex = 0;
        
        if (search) {
          paramIndex++;
          conditions.push(`(u.name ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`);
          params.push(`%${search}%`);
        }
        
        if (store_id) {
          paramIndex++;
          conditions.push(`u.store_id = $${paramIndex}`);
          params.push(store_id);
        }
        
        if (status) {
          paramIndex++;
          conditions.push(`u.status = $${paramIndex}`);
          params.push(status);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ` GROUP BY u.id, u.phone, u.name, u.avatar_url, u.status, u.created_at, s.id, s.name`;
        query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await client.query(query, params);
        client.release();
        
        const users = result.rows.map(row => ({
          id: row.id,
          phone: row.phone,
          name: row.name,
          avatar_url: row.avatar_url,
          status: row.status,
          created_at: row.created_at,
          store: {
            id: row.store_id,
            name: row.store_name
          },
          locker_count: parseInt(row.locker_count) || 0
        }));
        
        res.json({
          success: true,
          data: {
            list: users,
            total: users.length,
            page: parseInt(page),
            limit: parseInt(limit)
          }
        });
        
      } catch (error) {
        console.error('Get admin users error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取用户列表失败'
        });
      }
    });

    // Admin Lockers API - Get all lockers with user info
    this.app.get('/api/admin-lockers', authenticateToken, async (req, res) => {
      let client;
      try {
        const { store_id, status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        client = await this.pool.connect();
        
        // Build query with user info from current_user_id
        let query = `
          SELECT 
            l.id, l.number, l.status, l.store_id, l.assigned_at, l.created_at, l.updated_at,
            l.current_user_id,
            s.name as store_name, s.address as store_location,
            u.id as user_id, u.name as user_name, u.phone as user_phone, u.avatar_url as user_avatar
          FROM lockers l
          LEFT JOIN stores s ON l.store_id = s.id
          LEFT JOIN users u ON l.current_user_id = u.id
        `;
        
        const params = [];
        const conditions = [];
        let paramIndex = 0;
        
        if (store_id) {
          paramIndex++;
          conditions.push(`l.store_id = $${paramIndex}`);
          params.push(store_id);
        }
        
        if (status) {
          paramIndex++;
          conditions.push(`l.status = $${paramIndex}`);
          params.push(status);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Get total count
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM').replace(/LEFT JOIN users u ON l.current_user_id = u.id/, '');
        const countResult = await client.query(countQuery, params);
        const total = parseInt(countResult.rows[0]?.count || 0);
        
        // Add pagination and ordering
        query += ` ORDER BY l.created_at DESC NULLS LAST LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
        params.push(limit, offset);
        
        console.log('Executing lockers query:', query);
        console.log('With params:', params);
        
        const result = await client.query(query, params);
        
        // Process results to format properly
        const lockers = result.rows.map(row => ({
          id: row.id,
          number: row.number,
          status: row.status,
          store_id: row.store_id,
          store_name: row.store_name,
          store_location: row.store_location,
          assigned_at: row.assigned_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          user: row.current_user_id ? {
            id: row.user_id,
            name: row.user_name,
            phone: row.user_phone,
            avatar: row.user_avatar
          } : null
        }));
        
        client.release();
        
        console.log(`📋 获取杆柜列表: 找到 ${lockers.length} 个杆柜`);
        
        res.json({
          success: true,
          data: {
            items: lockers,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        console.error('Error fetching lockers:', error);
        console.error('Error stack:', error.stack);
        if (client) {
          client.release();
        }
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取杆柜列表失败',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });

    // Admin Lockers API - Create new locker
    this.app.post('/api/admin-lockers', authenticateToken, async (req, res) => {
      try {
        const { store_id, number, remark } = req.body;
        
        if (!store_id || !number) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: '门店和杆柜编号为必填项'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Check if locker number already exists in the store
          const existingLocker = await client.query(
            'SELECT id FROM lockers WHERE store_id = $1 AND number = $2',
            [store_id, number]
          );
          
          if (existingLocker.rows.length > 0) {
            client.release();
            return res.status(409).json({
              success: false,
              error: 'Locker number exists',
              message: '该门店已存在相同编号的杆柜'
            });
          }
          
          // Insert new locker (PostgreSQL表只有 id, store_id, number, status, current_user_id, assigned_at, created_at, updated_at)
          const insertQuery = `
            INSERT INTO lockers (id, store_id, number, status, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, 'available', NOW(), NOW())
            RETURNING id, store_id, number, status, created_at, updated_at
          `;
          
          const result = await client.query(insertQuery, [store_id, number]);
          const newLocker = result.rows[0];
          
          client.release();
          
          console.log(`✅ 新建杆柜成功: ${number} (门店ID: ${store_id})`);
          
          res.json({
            success: true,
            message: '杆柜创建成功',
            data: {
              id: newLocker.id,
              store_id: newLocker.store_id,
              number: newLocker.number,
              status: newLocker.status,
              created_at: newLocker.created_at,
              updated_at: newLocker.updated_at
            }
          });
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Create locker error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '创建杆柜失败'
        });
      }
    });

    // Admin Lockers API - Get single locker details
    this.app.get('/api/admin-lockers/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        
        const client = await this.pool.connect();
        
        // Get locker with full user and application info
        const query = `
          SELECT 
            l.id, l.number, l.status, l.store_id, l.assigned_at, l.created_at, l.updated_at,
            l.current_user_id,
            s.name as store_name, s.address as store_location,
            u.id as user_id, u.name as user_name, u.phone as user_phone, 
            u.avatar_url as user_avatar,
            a.id as application_id, a.status as application_status, 
            a.created_at as application_date, a.approved_at
          FROM lockers l
          LEFT JOIN stores s ON l.store_id = s.id
          LEFT JOIN users u ON l.current_user_id = u.id
          LEFT JOIN applications a ON a.user_id = u.id AND a.assigned_locker_id = l.id AND a.status = 'approved'
          WHERE l.id = $1
        `;
        
        const result = await client.query(query, [id]);
        
        if (result.rows.length === 0) {
          client.release();
          return res.status(404).json({
            success: false,
            error: 'Locker not found',
            message: '杆柜不存在'
          });
        }
        
        const row = result.rows[0];
        
        // Format the response
        const locker = {
          id: row.id,
          number: row.number,
          status: row.status,
          store_id: row.store_id,
          store: {
            id: row.store_id,
            name: row.store_name || '未知门店',
            location: row.store_location
          },
          assigned_at: row.assigned_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          user: row.current_user_id ? {
            id: row.user_id,
            name: row.user_name,
            phone: row.user_phone,
            avatar: row.user_avatar,
            application_id: row.application_id,
            application_status: row.application_status,
            application_date: row.application_date,
            approved_at: row.approved_at
          } : null
        };
        
        // Get recent records for this locker
        const recordsQuery = `
          SELECT 
            lr.id, lr.action, lr.created_at, lr.notes,
            u.name as user_name, u.phone as user_phone
          FROM locker_records lr
          JOIN users u ON lr.user_id = u.id
          WHERE lr.locker_id = $1
          ORDER BY lr.created_at DESC
          LIMIT 10
        `;
        
        const recordsResult = await client.query(recordsQuery, [id]);
        locker.recent_records = recordsResult.rows;
        
        client.release();
        
        console.log(`📋 获取杆柜详情: ${row.number} (ID: ${id})`);
        
        res.json({
          success: true,
          data: locker
        });
      } catch (error) {
        console.error('Error fetching locker details:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取杆柜详情失败'
        });
      }
    });

    // Admin Lockers API - Update locker status
    this.app.put('/api/admin-lockers/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!id || !status) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: '杆柜ID和状态为必填项'
          });
        }
        
        // Validate status
        const validStatuses = ['available', 'occupied', 'maintenance'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid status',
            message: '无效的杆柜状态'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Update locker status (PostgreSQL表没有remark字段)
          const updateQuery = `
            UPDATE lockers 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, number, status, store_id, updated_at
          `;
          
          const result = await client.query(updateQuery, [status, id]);
          
          if (result.rows.length === 0) {
            client.release();
            return res.status(404).json({
              success: false,
              error: 'Locker not found',
              message: '杆柜不存在'
            });
          }
          
          const updatedLocker = result.rows[0];
          client.release();
          
          console.log(`✅ 杆柜状态更新成功: ${updatedLocker.number} -> ${status}`);
          
          res.json({
            success: true,
            message: '杆柜状态更新成功',
            data: {
              id: updatedLocker.id,
              number: updatedLocker.number,
              status: updatedLocker.status,
              store_id: updatedLocker.store_id,
              updated_at: updatedLocker.updated_at
            }
          });
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Update locker error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '更新杆柜状态失败'
        });
      }
    });

    // Delete Locker endpoint - 删除杆柜
    this.app.delete('/api/admin/lockers/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        
        if (!id) {
          return res.status(400).json({
            success: false,
            error: 'Missing locker ID',
            message: '缺少杆柜ID'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Check if locker exists
          const lockerQuery = 'SELECT * FROM lockers WHERE id = $1';
          const lockerResult = await client.query(lockerQuery, [id]);
          
          if (lockerResult.rows.length === 0) {
            client.release();
            return res.status(404).json({
              success: false,
              error: 'Locker not found',
              message: '杆柜不存在'
            });
          }
          
          const locker = lockerResult.rows[0];
          
          // Check if locker is currently in use
          if (locker.current_user_id) {
            client.release();
            return res.status(400).json({
              success: false,
              error: 'Locker in use',
              message: '该杆柜正在使用中，无法删除'
            });
          }
          
          // Delete the locker
          const deleteQuery = 'DELETE FROM lockers WHERE id = $1';
          await client.query(deleteQuery, [id]);
          
          client.release();
          
          console.log(`✅ 删除杆柜成功: ${locker.number} (${id})`);
          
          res.json({
            success: true,
            message: '杆柜删除成功',
            data: {
              id: locker.id,
              number: locker.number
            }
          });
          
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Delete locker error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '删除杆柜失败'
        });
      }
    });

    // Release Locker endpoint - 释放杆柜
    this.app.post('/api/admin/lockers/release', authenticateToken, async (req, res) => {
      try {
        const { lockerId } = req.body;
        
        if (!lockerId) {
          return res.status(400).json({
            success: false,
            error: 'Missing locker ID',
            message: '缺少杆柜ID'
          });
        }
        
        const client = await this.pool.connect();
        
        try {
          // Check if locker exists and is occupied
          const lockerQuery = 'SELECT * FROM lockers WHERE id = $1';
          const lockerResult = await client.query(lockerQuery, [lockerId]);
          
          if (lockerResult.rows.length === 0) {
            client.release();
            return res.status(404).json({
              success: false,
              error: 'Locker not found',
              message: '杆柜不存在'
            });
          }
          
          const locker = lockerResult.rows[0];
          
          if (locker.status !== 'occupied' || !locker.current_user_id) {
            client.release();
            return res.status(400).json({
              success: false,
              error: 'Locker not occupied',
              message: '该杆柜当前没有被使用'
            });
          }
          
          // Begin transaction
          await client.query('BEGIN');
          
          try {
            // Update locker to release it
            const updateQuery = `
              UPDATE lockers 
              SET status = $1, current_user_id = NULL, assigned_at = NULL, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `;
            await client.query(updateQuery, ['available', lockerId]);
            
            // Create locker record for the release action
            const recordQuery = `
              INSERT INTO locker_records (user_id, locker_id, action, notes, created_at)
              VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            `;
            await client.query(recordQuery, [
              locker.current_user_id,
              lockerId,
              'released',
              '管理员释放杆柜'
            ]);
            
            // Commit transaction
            await client.query('COMMIT');
            
            client.release();
            
            console.log(`✅ 杆柜释放成功: ${locker.number} (${lockerId})`);
            
            res.json({
              success: true,
              message: '杆柜释放成功',
              data: {
                id: locker.id,
                number: locker.number,
                status: 'available'
              }
            });
            
          } catch (transactionError) {
            await client.query('ROLLBACK');
            throw transactionError;
          }
          
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Release locker error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '释放杆柜失败'
        });
      }
    });

    // Get user history - Applications, Operations, Vouchers
    this.app.get('/api/user/history', async (req, res) => {
      console.log('Getting user history');
      
      const { user_id, type = 'all', page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing user ID',
          message: '缺少用户ID参数'
        });
      }
      
      const client = await this.pool.connect();
      
      try {
        const results = {
          applications: [],
          operations: [],
          vouchers: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0
          }
        };
        
        // Get application history
        if (type === 'all' || type === 'applications') {
          const appQuery = `
            SELECT 
              a.id, a.status, a.created_at, a.approved_at, a.reject_reason,
              l.number as locker_number,
              s.name as store_name
            FROM applications a
            LEFT JOIN lockers l ON a.locker_id = l.id
            LEFT JOIN stores s ON a.store_id = s.id
            WHERE a.user_id = $1
            ORDER BY a.created_at DESC
            LIMIT $2 OFFSET $3
          `;
          
          const appResult = await client.query(appQuery, [user_id, limit, offset]);
          results.applications = appResult.rows.map(row => ({
            id: row.id,
            type: 'application',
            status: row.status,
            locker_number: row.locker_number,
            store_name: row.store_name,
            created_at: row.created_at,
            approved_at: row.approved_at,
            reject_reason: row.reject_reason
          }));
          
          // Get total count
          const countResult = await client.query(
            'SELECT COUNT(*) FROM applications WHERE user_id = $1',
            [user_id]
          );
          results.pagination.total += parseInt(countResult.rows[0].count);
        }
        
        // Get store/retrieve operations history
        if (type === 'all' || type === 'operations') {
          const opsQuery = `
            SELECT 
              lr.id, lr.action, lr.created_at, lr.notes,
              l.number as locker_number,
              s.name as store_name
            FROM locker_records lr
            LEFT JOIN lockers l ON lr.locker_id = l.id
            LEFT JOIN stores s ON l.store_id = s.id
            WHERE lr.user_id = $1
            ORDER BY lr.created_at DESC
            LIMIT $2 OFFSET $3
          `;
          
          const opsResult = await client.query(opsQuery, [user_id, limit, offset]);
          results.operations = opsResult.rows.map(row => ({
            id: row.id,
            type: 'operation',
            action: row.action,
            locker_number: row.locker_number,
            store_name: row.store_name,
            created_at: row.created_at,
            notes: row.notes
          }));
          
          // Get total count
          const opsCountResult = await client.query(
            'SELECT COUNT(*) FROM locker_records WHERE user_id = $1',
            [user_id]
          );
          results.pagination.total += parseInt(opsCountResult.rows[0].count);
        }
        
        // Get voucher usage history
        if (type === 'all' || type === 'vouchers') {
          const voucherQuery = `
            SELECT 
              v.id, v.code, v.operation_type, v.status,
              v.issued_at, v.expires_at, v.used_at,
              v.locker_number, v.store_name
            FROM vouchers v
            WHERE v.user_id = $1
            ORDER BY v.issued_at DESC
            LIMIT $2 OFFSET $3
          `;
          
          const voucherResult = await client.query(voucherQuery, [user_id, limit, offset]);
          results.vouchers = voucherResult.rows.map(row => ({
            id: row.id,
            type: 'voucher',
            code: row.code,
            operation_type: row.operation_type,
            status: row.status,
            locker_number: row.locker_number,
            store_name: row.store_name,
            issued_at: row.issued_at,
            expires_at: row.expires_at,
            used_at: row.used_at
          }));
          
          // Get total count
          const voucherCountResult = await client.query(
            'SELECT COUNT(*) FROM vouchers WHERE user_id = $1',
            [user_id]
          );
          results.pagination.total += parseInt(voucherCountResult.rows[0].count);
        }
        
        client.release();
        
        res.json({
          success: true,
          data: results
        });
        
      } catch (error) {
        client.release();
        console.error('Get user history error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取历史记录失败'
        });
      }
    });

    // Get user's current locker assignment
    this.app.get('/api/user/locker-assignment', async (req, res) => {
      console.log('Getting user locker assignment');
      
      // Get user from auth header or query
      const authHeader = req.headers.authorization;
      let userId = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Extract user ID from token (simplified for test)
        userId = token.replace('test_token_', '');
      } else if (req.query.user_id) {
        userId = req.query.user_id;
      }
      
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '请先登录'
        });
      }
      
      const client = await this.pool.connect();
      try {
        // Get user's approved application with locker details
        const query = `
          SELECT 
            a.id as application_id,
            a.status,
            a.approved_at,
            l.id as locker_id,
            l.number as locker_number,
            l.status as locker_status,
            s.id as store_id,
            s.name as store_name,
            s.address as store_address
          FROM applications a
          LEFT JOIN lockers l ON a.assigned_locker_id = l.id
          LEFT JOIN stores s ON l.store_id = s.id
          WHERE a.user_id = $1 
            AND a.status = 'approved'
          ORDER BY a.approved_at DESC
          LIMIT 1
        `;
        
        const result = await client.query(query, [userId]);
        
        if (result.rows.length === 0) {
          return res.json({
            success: true,
            data: null,
            message: '用户暂无分配的杆柜'
          });
        }
        
        const assignment = result.rows[0];
        
        res.json({
          success: true,
          data: {
            id: assignment.locker_id,
            number: assignment.locker_number,
            status: assignment.locker_status,
            store_id: assignment.store_id,
            store_name: assignment.store_name,
            store_address: assignment.store_address,
            assigned_at: assignment.approved_at
          }
        });
        
      } catch (error) {
        console.error('Get locker assignment error:', error);
        res.status(500).json({
          error: 'Database error',
          message: '获取杆柜分配信息失败'
        });
      } finally {
        client.release();
      }
    });

    // Admin login with enhanced RBAC
    this.app.post('/api/admin-login', async (req, res) => {
      try {
        const { phone, password } = req.body;

        if (!phone || !password) {
          return res.status(400).json({
            error: 'Missing credentials',
            message: '请输入手机号和密码'
          });
        }

        const client = await this.pool.connect();
        
        try {
          // Get admin with store information
          const adminQuery = `
            SELECT 
              a.*,
              s.name as store_name,
              s.address as store_address
            FROM admins a
            LEFT JOIN stores s ON a.store_id = s.id
            WHERE a.phone = $1 AND a.status = $2
          `;
          const result = await client.query(adminQuery, [phone, 'active']);
          
          if (result.rows.length === 0) {
            client.release();
            return res.status(401).json({
              error: 'Invalid credentials',
              message: '账号或密码错误'
            });
          }

          // Password verification - development mode with fallback
          const admin = result.rows[0];
          let passwordMatch = false;
          
          if (admin.password) {
            // Try bcrypt first (production)
            try {
              passwordMatch = await bcrypt.compare(password, admin.password);
            } catch (bcryptError) {
              // If bcrypt fails, check for plain text password (development)
              passwordMatch = password === admin.password;
            }
          } else {
            // Fallback for development - allow 'admin123'
            passwordMatch = password === 'admin123';
          }

          if (!passwordMatch) {
            client.release();
            return res.status(401).json({
              error: 'Invalid credentials', 
              message: '账号或密码错误'
            });
          }

          client.release();

          // Get permissions based on role
          const permissions = this.getAdminPermissions(admin.role);

          console.log(`✅ 管理员登录成功: ${admin.name} (${phone}) - Role: ${admin.role}`);

          // Generate JWT token with permissions
          const token = jwt.sign(
            { 
              adminId: admin.id, 
              phone: admin.phone, 
              name: admin.name,
              role: admin.role,
              store_id: admin.store_id,
              permissions: permissions,
              isAdmin: true
            },
            JWT_SECRET,
            { expiresIn: '8h' }
          );

          res.json({
            success: true,
            data: {
              admin: {
                id: admin.id,
                phone: admin.phone,
                name: admin.name,
                role: admin.role,
                store_id: admin.store_id,
                store_name: admin.store_name,
                store_address: admin.store_address,
                permissions: permissions
              },
              token: token
            }
          });
        } catch (dbError) {
          client.release();
          throw dbError;
        }
      } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: '登录失败'
        });
      }
    });

    // Debug endpoint to check file structure
    this.app.get('/debug/files', (req, res) => {
      const fs = require('fs');
      const path = require('path');
      
      try {
        const serverDir = __dirname;
        const adminDistPath = path.join(__dirname, '../admin/dist');
        const adminAssetsPath = path.join(__dirname, '../admin/dist/assets');
        const mainDistPath = path.join(__dirname, '../dist');
        
        const result = {
          serverDir,
          paths: {
            adminDist: {
              path: adminDistPath,
              exists: fs.existsSync(adminDistPath),
              contents: fs.existsSync(adminDistPath) ? fs.readdirSync(adminDistPath) : null
            },
            adminAssets: {
              path: adminAssetsPath,
              exists: fs.existsSync(adminAssetsPath),
              contents: fs.existsSync(adminAssetsPath) ? fs.readdirSync(adminAssetsPath) : null
            },
            mainDist: {
              path: mainDistPath,
              exists: fs.existsSync(mainDistPath),
              contents: fs.existsSync(mainDistPath) ? fs.readdirSync(mainDistPath) : null
            }
          }
        };
        
        res.json(result);
      } catch (error) {
        res.json({ error: error.message });
      }
    });

    // SPA fallback - serve index.html for client-side routing
    this.app.get('*', (req, res) => {
      console.log(`🔍 SPA Fallback: ${req.method} ${req.path}`);
      
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/') || req.path.startsWith('/auth-') || 
          req.path.startsWith('/stores-') || req.path.startsWith('/lockers-') ||
          req.path.startsWith('/users/')) {
        console.log(`⛔ API route blocked: ${req.path}`);
        return res.status(404).json({ error: 'API endpoint not found' });
      }

      // Don't serve index.html for static assets (JS, CSS, images, etc.)
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
        console.log(`⛔ Static asset blocked: ${req.path}`);
        return res.status(404).json({ error: 'Static asset not found' });
      }

      // Serve admin app for admin routes (excluding static assets)
      if (req.path.startsWith('/admin')) {
        const adminIndexPath = path.join(__dirname, '../admin/dist/index.html');
        console.log(`📱 Admin route detected: ${req.path}`);
        console.log(`📁 Admin HTML path: ${adminIndexPath}`);
        console.log(`✅ Admin HTML exists: ${fs.existsSync(adminIndexPath)}`);
        if (fs.existsSync(adminIndexPath)) {
          console.log(`🎯 Serving admin HTML for: ${req.path}`);
          return res.sendFile(adminIndexPath);
        } else {
          console.log(`❌ Admin HTML not found: ${adminIndexPath}`);
        }
      }

      // Serve main app
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ 
          error: 'Application not found',
          message: 'Frontend build files not found. Please run npm run build first.'
        });
      }
    });
  }

  async start() {
    // Start server first, then test database
    this.app.listen(this.port, '0.0.0.0', async () => {
      console.log('\n🚀 YesLocker Railway Server Started');
      console.log('==========================================');
      console.log(`📍 Server listening on: 0.0.0.0:${this.port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Debug Railway configuration
      console.log('\n🔍 Railway Configuration Debug:');
      console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
      console.log('- DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'undefined');
      console.log('- NODE_ENV:', process.env.NODE_ENV);
      console.log('- PORT from Railway:', this.port);
      console.log('- 🚨 IMPORTANT: Railway domain target port MUST be set to:', this.port);
      console.log('- Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('POSTGRES')));
      
      // Test database connection if pool exists
      if (this.pool) {
        console.log('\n🔍 Testing database connection...');
        try {
          const client = await this.pool.connect();
          const result = await client.query('SELECT version()');
          client.release();
          this.dbConnected = true;
          console.log('✅ Database connection successful');
          console.log('📋 PostgreSQL version:', result.rows[0].version.substring(0, 50) + '...');
        } catch (dbError) {
          console.error('❌ Database connection failed:', dbError.message);
          console.log('⚠️  Server will run but database features will be disabled');
        }
      } else {
        console.log('\n⚠️  No database pool - database features disabled');
      }
      
      console.log('==========================================\n');
    });
  }

  async stop() {
    console.log('\n📁 Closing database connections...');
    if (this.pool) {
      await this.pool.end();
    }
    console.log('✅ Server stopped gracefully');
    process.exit(0);
  }
}

// Create and start server
const server = new RailwayServer();
server.start();

// Graceful shutdown
process.on('SIGINT', () => server.stop());
process.on('SIGTERM', () => server.stop());

module.exports = RailwayServer;