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
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
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

    // Serve admin static files
    const adminDistPath = path.join(__dirname, '../admin/dist');
    if (fs.existsSync(adminDistPath)) {
      console.log(`📁 Serving admin files from: ${adminDistPath}`);
      this.app.use('/admin', express.static(adminDistPath));
    }
  }

  setupRoutes() {
    // JWT Authentication Middleware
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: '缺少访问令牌' 
        });
      }
      
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ 
            success: false, 
            message: '无效的访问令牌' 
          });
        }
        req.user = user;
        next();
      });
    };

    // Health check
    this.app.get('/health', (req, res) => {
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
        
        res.json({
          success: true,
          data: {
            stores,
            lockers
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

          // Insert new user
          const insertQuery = `
            INSERT INTO users (phone, name, avatar_url, store_id, status)
            VALUES ($1, $2, $3, $4, 'active')
            RETURNING id, phone, name, store_id
          `;
          
          const result = await client.query(insertQuery, [phone, name, avatar_url, store_id]);
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

    // Admin Statistics API - Optimized for performance 
    this.app.get('/api/admin-statistics', authenticateToken, async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Execute all statistics queries in parallel for better performance
        const [usersResult, lockersResult, applicationsResult, recordsResult] = await Promise.all([
          client.query("SELECT COUNT(*) as count FROM users WHERE status = 'active'"),
          client.query("SELECT status, COUNT(*) as count FROM lockers GROUP BY status"),
          client.query("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'"),
          client.query(`
            SELECT COUNT(*) as count FROM locker_records 
            WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
          `)
        ]);
        
        client.release();
        
        // Process locker status counts
        const lockerStats = {
          occupied: 0,
          available: 0,
          maintenance: 0
        };
        
        lockersResult.rows.forEach(row => {
          const status = row.status;
          const count = parseInt(row.count) || 0;
          if (status in lockerStats) {
            lockerStats[status] = count;
          }
        });
        
        const stats = {
          active_users: parseInt(usersResult.rows[0]?.count) || 0,
          occupied_lockers: lockerStats.occupied,
          available_lockers: lockerStats.available,
          maintenance_lockers: lockerStats.maintenance,
          pending_applications: parseInt(applicationsResult.rows[0]?.count) || 0,
          today_records: parseInt(recordsResult.rows[0]?.count) || 0
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
        const { page = 1, pageSize = 20, status, storeId } = req.query;
        const offset = (page - 1) * pageSize;
        
        const client = await this.pool.connect();
        
        let whereClause = 'WHERE 1=1';
        const params = [pageSize, offset];
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
            a.id, a.status, a.remark, a.created_at,
            u.id as user_id, u.name as user_name, u.phone as user_phone, u.avatar_url,
            s.id as store_id, s.name as store_name,
            l.id as locker_id, l.number as locker_number
          FROM applications a
          LEFT JOIN users u ON a.user_id = u.id
          LEFT JOIN stores s ON a.store_id = s.id
          LEFT JOIN lockers l ON a.locker_id = l.id
          ${whereClause}
          ORDER BY a.created_at DESC
          LIMIT $1 OFFSET $2
        `;
        
        const result = await client.query(applicationsQuery, params);
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
          
          // Insert new locker
          const insertQuery = `
            INSERT INTO lockers (id, store_id, number, status, remark, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, 'available', $3, NOW(), NOW())
            RETURNING id, store_id, number, status, remark, created_at
          `;
          
          const result = await client.query(insertQuery, [store_id, number, remark || null]);
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
              remark: newLocker.remark,
              created_at: newLocker.created_at
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
        const { status, remark } = req.body;
        
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
          // Update locker status
          const updateQuery = `
            UPDATE lockers 
            SET status = $1, remark = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, number, status, remark, store_id
          `;
          
          const result = await client.query(updateQuery, [status, remark || null, id]);
          
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
              remark: updatedLocker.remark,
              store_id: updatedLocker.store_id
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

    // SPA fallback - serve index.html for client-side routing
    this.app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/') || req.path.startsWith('/auth-') || 
          req.path.startsWith('/stores-') || req.path.startsWith('/lockers-') ||
          req.path.startsWith('/users/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }

      // Serve admin app for admin routes
      if (req.path.startsWith('/admin')) {
        const adminIndexPath = path.join(__dirname, '../admin/dist/index.html');
        if (fs.existsSync(adminIndexPath)) {
          return res.sendFile(adminIndexPath);
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