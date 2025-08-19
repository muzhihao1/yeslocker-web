const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
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
    
    this.setupMiddleware();
    this.setupRoutes();
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
          
          // Analyze tables for query planner
          'ANALYZE users',
          'ANALYZE lockers', 
          'ANALYZE applications',
          'ANALYZE locker_records'
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

          // Insert new user
          const insertQuery = `
            INSERT INTO users (phone, name, avatar_url, store_id, status)
            VALUES ($1, $2, $3, $4, 'active')
            RETURNING id, phone, name, store_id
          `;
          
          const result = await client.query(insertQuery, [phone, name, avatarUrl, store_id]);
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
    this.app.get('/api/admin-statistics', authenticateToken, async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Single optimized query to get all statistics in one go
        const combinedQuery = `
          WITH stats AS (
            SELECT 
              (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
              (SELECT COUNT(*) FROM applications WHERE status = 'pending') as pending_applications,
              (SELECT COUNT(*) FROM locker_records 
               WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day') as today_records
          ),
          locker_stats AS (
            SELECT 
              COALESCE(SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END), 0) as occupied_lockers,
              COALESCE(SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END), 0) as available_lockers,
              COALESCE(SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END), 0) as maintenance_lockers
            FROM lockers
          )
          SELECT 
            s.active_users,
            s.pending_applications,  
            s.today_records,
            ls.occupied_lockers,
            ls.available_lockers,
            ls.maintenance_lockers
          FROM stats s, locker_stats ls
        `;
        
        const result = await client.query(combinedQuery);
        client.release();
        
        // Extract stats from the single query result
        const row = result.rows[0];
        const stats = {
          active_users: parseInt(row.active_users) || 0,
          occupied_lockers: parseInt(row.occupied_lockers) || 0,
          available_lockers: parseInt(row.available_lockers) || 0,
          maintenance_lockers: parseInt(row.maintenance_lockers) || 0,
          pending_applications: parseInt(row.pending_applications) || 0,
          today_records: parseInt(row.today_records) || 0
        };
        
        res.json({
          success: true,
          data: stats
        });
        
      } catch (error) {
        console.error('Get admin statistics error:', error);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: '获取统计数据失败'
        });
      }
    });

    // Admin Applications API
    this.app.get('/api/admin-approval', authenticateToken, async (req, res) => {
      try {
        const { page = 1, pageSize = 20, status, storeId, adminId } = req.query;
        const offset = (page - 1) * pageSize;
        
        console.log(`📋 获取申请列表请求 - page: ${page}, pageSize: ${pageSize}, status: ${status}, storeId: ${storeId}, adminId: ${adminId}`);
        
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
        
        if (status && status !== 'all') {
          paramIndex++;
          whereClause += ` AND a.status = $${paramIndex}`;
          params.push(status);
        }
        
        if (storeId) {
          paramIndex++;
          whereClause += ` AND a.store_id = $${paramIndex}`;
          params.push(storeId);
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
          remark: row.remark,
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

        // Create new application
        const insertQuery = `
          INSERT INTO applications (user_id, store_id, assigned_locker_id, notes, status, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id, status, created_at
        `;
        
        const result = await client.query(insertQuery, [
          user_id,
          store_id, 
          locker_id,
          reason || '',
          'pending'
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

    // Admin Approval Action API
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
        
        const client = await this.pool.connect();
        
        if (action === 'approve') {
          await client.query(
            'UPDATE applications SET status = $1, approved_at = NOW(), approved_by = $2 WHERE id = $3',
            ['approved', admin_id, application_id]
          );
        } else if (action === 'reject') {
          await client.query(
            'UPDATE applications SET status = $1, reject_reason = $2, approved_at = NOW(), approved_by = $3 WHERE id = $4',
            ['rejected', reject_reason, admin_id, application_id]
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
            lr.id, lr.action, lr.created_at, lr.notes as remark,
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
          remark: row.remark,
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

    // Admin login
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
          const adminQuery = 'SELECT * FROM admins WHERE phone = $1 AND status = $2';
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

          console.log(`✅ 管理员登录成功: ${admin.name} (${phone})`);

          // Generate real JWT token
          const token = jwt.sign(
            { 
              adminId: admin.id, 
              phone: admin.phone, 
              name: admin.name,
              role: admin.role 
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
                permissions: ['all']
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