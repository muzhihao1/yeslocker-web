const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
        const result = await client.query('SELECT version()');
        client.release();
        
        res.json({
          success: true,
          message: 'Database connection successful',
          version: result.rows[0].version
        });
      } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
          success: false,
          error: 'Database connection failed',
          message: error.message
        });
      }
    });

    // Get stores and lockers (with API prefix)
    this.app.get('/api/stores-lockers', async (req, res) => {
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
        
        const result = await client.query(storesQuery);
        client.release();
        
        res.json({
          success: true,
          data: result.rows.map(row => ({
            id: row.id,
            name: row.name,
            address: row.address || '',
            phone: row.phone || '',
            status: row.status,
            total_lockers: parseInt(row.total_lockers) || 0,
            available_lockers: parseInt(row.available_lockers) || 0
          }))
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

    // Admin Statistics API
    this.app.get('/api/admin-statistics', async (req, res) => {
      try {
        const client = await this.pool.connect();
        
        // Get basic statistics
        const statsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM users WHERE status = 'active') as total_users,
            (SELECT COUNT(*) FROM lockers WHERE status = 'occupied') as occupied_lockers,
            (SELECT COUNT(*) FROM lockers WHERE status = 'available') as available_lockers,
            (SELECT COUNT(*) FROM applications WHERE status = 'pending') as pending_applications
        `;
        
        const result = await client.query(statsQuery);
        const stats = result.rows[0] || {};
        
        client.release();
        
        res.json({
          success: true,
          data: {
            pending_applications: parseInt(stats.pending_applications) || 0,
            occupied_lockers: parseInt(stats.occupied_lockers) || 0,
            active_users: parseInt(stats.total_users) || 0,
            today_records: 0, // TODO: Add today's records count
            available_lockers: parseInt(stats.available_lockers) || 0
          }
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
    this.app.get('/api/admin-approval', async (req, res) => {
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
    this.app.post('/api/admin-approval', async (req, res) => {
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
          
          if (result.rows.length === 0 || password !== 'admin123') {
            client.release();
            return res.status(401).json({
              error: 'Invalid credentials',
              message: '账号或密码错误'
            });
          }

          const admin = result.rows[0];
          client.release();

          console.log(`✅ 管理员登录成功: ${admin.name} (${phone})`);

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
              token: 'admin_token_' + admin.id
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