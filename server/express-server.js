const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();
const port = 3001;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Database setup
const dbPath = path.join(__dirname, 'database', 'yeslocker.db');
const db = new sqlite3.Database(dbPath);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '缺少访问令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '无效的访问令牌' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ENDPOINTS ====================

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { phone, name, password } = req.body;

    // Validate required fields
    if (!phone || !name || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号、姓名和密码为必填项'
      });
    }

    // Validate phone format
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的手机号码'
      });
    }

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该手机号已注册'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (id, phone, name, password, store_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, phone, name, hashedPassword, null, 'active', new Date().toISOString(), new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId, phone, name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: userId,
          phone,
          name,
          status: 'active'
        }
      }
    });

  } catch (error) {
    console.error('注册错误详情:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号和密码为必填项'
      });
    }

    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          status: user.status,
          avatarUrl: user.avatar_url
        }
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== USER ENDPOINTS ====================

// Get User Lockers
app.get('/api/user/lockers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const lockers = await new Promise((resolve, reject) => {
      db.all(`
        SELECT l.*, s.name as store_name, s.address as store_address
        FROM lockers l
        JOIN stores s ON l.store_id = s.id
        WHERE l.current_user_id = ?
        ORDER BY l.created_at DESC
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      data: lockers
    });

  } catch (error) {
    console.error('获取杆柜错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// Apply for Locker
app.post('/api/user/apply', authenticateToken, async (req, res) => {
  try {
    const { storeId, reason } = req.body;
    const userId = req.user.userId;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: '请选择门店'
      });
    }

    // Check if user already has an active application for this store
    const existingApp = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM applications WHERE user_id = ? AND store_id = ? AND status = "pending"',
        [userId, storeId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: '您已有待审核的申请，请耐心等待'
      });
    }

    // Create application
    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO applications (id, user_id, store_id, purpose, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [applicationId, userId, storeId, '长期存放', reason || '', 'pending', new Date().toISOString(), new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: '申请提交成功，请等待审核',
      data: { applicationId }
    });

  } catch (error) {
    console.error('申请错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// Get Stores
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM stores ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      data: stores
    });

  } catch (error) {
    console.error('获取门店错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// Get User Records
app.get('/api/user/records', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const records = await new Promise((resolve, reject) => {
      db.all(`
        SELECT lr.*, l.locker_number, s.name as store_name
        FROM locker_records lr
        JOIN lockers l ON lr.locker_id = l.id
        JOIN stores s ON l.store_id = s.id
        WHERE lr.user_id = ?
        ORDER BY lr.created_at DESC
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('获取记录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号和密码为必填项'
      });
    }

    // Find admin
    const admin = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM admins WHERE phone = ?', [phone], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin.id, phone: admin.phone, name: admin.name, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Get store info if store admin
    let storeInfo = null;
    if (admin.store_id) {
      storeInfo = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM stores WHERE id = ?', [admin.store_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role,
          store_id: admin.store_id,
          store_name: storeInfo?.name
        }
      }
    });

  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// Get Applications for Admin
app.get('/api/admin/applications', authenticateToken, async (req, res) => {
  try {
    const adminId = req.user.adminId;
    const { status = 'pending', page = 1, pageSize = 20 } = req.query;

    // Get applications with user and store details
    const applications = await new Promise((resolve, reject) => {
      let query = `
        SELECT 
          a.*,
          u.name as user_name,
          u.phone as user_phone,
          u.avatar_url as user_avatar,
          s.name as store_name,
          l.number as locker_number
        FROM applications a
        JOIN users u ON a.user_id = u.id
        JOIN stores s ON a.store_id = s.id
        LEFT JOIN lockers l ON a.assigned_locker_id = l.id
      `;
      
      const params = [];
      if (status && status !== 'all') {
        query += ' WHERE a.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY a.created_at DESC';
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Format response data
    const formattedData = applications.map(app => ({
      id: app.id,
      user: {
        id: app.user_id,
        name: app.user_name,
        phone: app.user_phone,
        avatar: app.user_avatar
      },
      store: {
        id: app.store_id,
        name: app.store_name
      },
      locker: {
        id: app.assigned_locker_id,
        number: app.locker_number || '待分配'
      },
      purpose: app.purpose,
      notes: app.notes,
      status: app.status,
      created_at: app.created_at,
      approved_at: app.approved_at,
      approved_by: app.approved_by,
      rejection_reason: app.rejection_reason
    }));

    // Pagination
    const start = (page - 1) * pageSize;
    const end = start + parseInt(pageSize);
    const paginatedData = formattedData.slice(start, end);

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: formattedData.length,
        totalPages: Math.ceil(formattedData.length / pageSize)
      }
    });

  } catch (error) {
    console.error('获取申请列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// Approve/Reject Application
app.post('/api/admin/applications/:applicationId/action', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, locker_id, rejection_reason } = req.body;
    const adminId = req.user.adminId;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的操作类型'
      });
    }

    // Get application
    const application = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM applications WHERE id = ?', [applicationId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该申请已处理'
      });
    }

    if (action === 'approve') {
      // Auto-assign locker if not specified
      let assignedLockerId = locker_id;
      if (!assignedLockerId) {
        const availableLocker = await new Promise((resolve, reject) => {
          db.get(
            'SELECT * FROM lockers WHERE store_id = ? AND status = "available" LIMIT 1',
            [application.store_id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        if (!availableLocker) {
          return res.status(400).json({
            success: false,
            message: '该门店暂无可用杆柜'
          });
        }
        
        assignedLockerId = availableLocker.id;
      }

      // Update application and locker
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) return reject(err);
          
          // Update application
          db.run(
            'UPDATE applications SET status = ?, assigned_locker_id = ?, approved_by = ?, approved_at = ? WHERE id = ?',
            ['approved', assignedLockerId, adminId, new Date().toISOString(), applicationId],
            (err) => {
              if (err) return reject(err);
              
              // Update locker
              db.run(
                'UPDATE lockers SET status = ?, current_user_id = ?, assigned_at = ? WHERE id = ?',
                ['occupied', application.user_id, new Date().toISOString(), assignedLockerId],
                (err) => {
                  if (err) return reject(err);
                  
                  // Create locker record
                  const recordId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  db.run(
                    'INSERT INTO locker_records (id, user_id, locker_id, action, notes) VALUES (?, ?, ?, ?, ?)',
                    [recordId, application.user_id, assignedLockerId, 'assigned', '管理员分配杆柜'],
                    (err) => {
                      if (err) return reject(err);
                      
                      db.run('COMMIT', (err) => {
                        if (err) return reject(err);
                        resolve();
                      });
                    }
                  );
                }
              );
            }
          );
        });
      });

      res.json({
        success: true,
        message: '申请已批准',
        data: { applicationId, status: 'approved', assignedLockerId }
      });

    } else if (action === 'reject') {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE applications SET status = ?, approved_by = ?, approved_at = ?, rejection_reason = ? WHERE id = ?',
          ['rejected', adminId, new Date().toISOString(), rejection_reason || '不符合申请条件', applicationId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      res.json({
        success: true,
        message: '申请已拒绝',
        data: { applicationId, status: 'rejected' }
      });
    }

  } catch (error) {
    console.error('处理申请错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== MISSING ADMIN API ENDPOINTS ====================

// Admin Applications endpoint (aliased for frontend compatibility)
app.get('/api/admin-approval', authenticateToken, async (req, res) => {
  // Forward to existing endpoint
  req.url = '/api/admin/applications'
  return app._router.handle(req, res)
})

// Store and Locker Management endpoint
app.get('/api/stores-lockers', authenticateToken, async (req, res) => {
  try {
    const { store_id } = req.query
    
    let storesQuery = 'SELECT * FROM stores ORDER BY name'
    let lockersQuery = `
      SELECT l.*, s.name as store_name 
      FROM lockers l 
      JOIN stores s ON l.store_id = s.id
    `
    
    const storeParams = []
    const lockerParams = []
    
    if (store_id) {
      storesQuery += ' WHERE id = ?'
      lockersQuery += ' WHERE l.store_id = ?'
      storeParams.push(store_id)
      lockerParams.push(store_id)
    }
    
    lockersQuery += ' ORDER BY s.name, l.number'
    
    // Get stores
    const stores = await new Promise((resolve, reject) => {
      db.all(storesQuery, storeParams, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
    
    // Get lockers
    const lockers = await new Promise((resolve, reject) => {
      db.all(lockersQuery, lockerParams, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
    
    res.json({
      success: true,
      data: {
        stores,
        lockers
      }
    })
    
  } catch (error) {
    console.error('获取门店杆柜错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Create Store endpoint
app.post('/api/stores-lockers', authenticateToken, async (req, res) => {
  try {
    const { name, code, address, manager_name, contact_phone, business_hours, remark } = req.body
    
    if (!name || !address || !code) {
      return res.status(400).json({
        success: false,
        message: '门店名称、编码和地址为必填项'
      })
    }
    
    // Check if store code already exists
    const existingStore = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM stores WHERE code = ?', [code], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
    
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: '门店编码已存在'
      })
    }
    
    const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const currentTime = new Date().toISOString()
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO stores (id, name, code, address, manager_name, phone, business_hours, remark, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [storeId, name, code, address, manager_name || '', contact_phone || '', business_hours || '09:00 - 22:00', remark || '', 1, currentTime, currentTime],
        function(err) {
          if (err) reject(err)
          else resolve()
        }
      )
    })
    
    res.json({
      success: true,
      message: '门店创建成功',
      data: { 
        id: storeId, 
        name, 
        code, 
        address, 
        manager_name, 
        contact_phone, 
        business_hours, 
        remark,
        is_active: true
      }
    })
    
  } catch (error) {
    console.error('创建门店错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Update Store endpoint
app.patch('/api/admin/stores/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { name, address, manager_name, contact_phone, business_hours, remark, is_active } = req.body
    
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: '门店名称和地址为必填项'
      })
    }
    
    const currentTime = new Date().toISOString()
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE stores SET name = ?, address = ?, manager_name = ?, phone = ?, business_hours = ?, remark = ?, is_active = ?, updated_at = ?
         WHERE id = ?`,
        [name, address, manager_name || '', contact_phone || '', business_hours || '09:00 - 22:00', remark || '', is_active !== undefined ? is_active : 1, currentTime, id],
        function(err) {
          if (err) reject(err)
          else resolve()
        }
      )
    })
    
    res.json({
      success: true,
      message: '门店更新成功'
    })
    
  } catch (error) {
    console.error('更新门店错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Delete Store endpoint
app.delete('/api/admin/stores/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if store has lockers
    const lockerCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM lockers WHERE store_id = ?', [id], (err, row) => {
        if (err) reject(err)
        else resolve(row.count)
      })
    })
    
    if (lockerCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该门店下还有杆柜，无法删除'
      })
    }
    
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM stores WHERE id = ?', [id], function(err) {
        if (err) reject(err)
        else resolve()
      })
    })
    
    res.json({
      success: true,
      message: '门店删除成功'
    })
    
  } catch (error) {
    console.error('删除门店错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Get Store Statistics endpoint
app.get('/api/admin/stores/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(l.id) as total_lockers,
          COUNT(CASE WHEN l.status = 'available' THEN 1 END) as available_lockers,
          COUNT(CASE WHEN l.status = 'occupied' THEN 1 END) as occupied_lockers,
          COUNT(CASE WHEN l.status = 'maintenance' THEN 1 END) as maintenance_lockers
        FROM lockers l 
        WHERE l.store_id = ?
      `, [id], (err, row) => {
        if (err) reject(err)
        else resolve(row || {})
      })
    })
    
    res.json({
      success: true,
      data: {
        total_lockers: stats.total_lockers || 0,
        available_lockers: stats.available_lockers || 0,
        occupied_lockers: stats.occupied_lockers || 0,
        maintenance_lockers: stats.maintenance_lockers || 0
      }
    })
    
  } catch (error) {
    console.error('获取门店统计错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Admin Store Creation endpoint (alias for /api/stores-lockers)
app.post('/api/admin/stores', authenticateToken, async (req, res) => {
  // Redirect to the main store creation endpoint
  req.url = '/api/stores-lockers'
  return app._router.handle(req, res)
})

// Admin Users endpoint
app.get('/api/admin-users', authenticateToken, async (req, res) => {
  try {
    const { store_id, status, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    
    let query = `
      SELECT u.*, s.name as store_name,
        COUNT(lr.id) as total_operations,
        COUNT(CASE WHEN l.current_user_id = u.id THEN 1 END) as current_lockers
      FROM users u 
      LEFT JOIN stores s ON u.store_id = s.id
      LEFT JOIN locker_records lr ON lr.user_id = u.id
      LEFT JOIN lockers l ON l.current_user_id = u.id
    `
    
    const params = []
    const conditions = []
    
    if (store_id) {
      conditions.push('u.store_id = ?')
      params.push(store_id)
    }
    
    if (status) {
      conditions.push('u.status = ?')
      params.push(status)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))
    
    const users = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
    
    // Format response data
    const formattedUsers = users.map(user => ({
      ...user,
      isActive: user.status === 'active',
      disabled: user.status === 'disabled',
      lockerCount: user.current_lockers || 0,
      totalOperations: user.total_operations || 0,
      lastActiveAt: user.last_active_at
    }))
    
    res.json({
      success: true,
      data: {
        list: formattedUsers,
        total: formattedUsers.length
      }
    })
    
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Admin Records endpoint
app.get('/api/admin-records', authenticateToken, async (req, res) => {
  try {
    const { user_id, store_id, action_type, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    
    let query = `
      SELECT lr.*, u.name as user_name, u.phone as user_phone,
        l.number as locker_number, s.name as store_name
      FROM locker_records lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN lockers l ON lr.locker_id = l.id
      LEFT JOIN stores s ON l.store_id = s.id
    `
    
    const params = []
    const conditions = []
    
    if (user_id) {
      conditions.push('lr.user_id = ?')
      params.push(user_id)
    }
    
    if (store_id) {
      conditions.push('s.id = ?')
      params.push(store_id)
    }
    
    if (action_type) {
      conditions.push('lr.action = ?')
      params.push(action_type)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY lr.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))
    
    const records = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
    
    res.json({
      success: true,
      data: {
        list: records,
        total: records.length
      }
    })
    
  } catch (error) {
    console.error('获取操作记录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Admin Statistics endpoint
app.get('/api/admin-statistics', authenticateToken, async (req, res) => {
  try {
    const { store_id, date_range } = req.query
    
    // Get basic statistics
    const totalUsers = await new Promise((resolve, reject) => {
      let query = 'SELECT COUNT(*) as count FROM users'
      const params = []
      
      if (store_id) {
        query += ' WHERE store_id = ?'
        params.push(store_id)
      }
      
      db.get(query, params, (err, row) => {
        if (err) reject(err)
        else resolve(row.count)
      })
    })
    
    const totalStores = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM stores', (err, row) => {
        if (err) reject(err)
        else resolve(row.count)
      })
    })
    
    const totalLockers = await new Promise((resolve, reject) => {
      let query = 'SELECT COUNT(*) as count FROM lockers'
      const params = []
      
      if (store_id) {
        query += ' WHERE store_id = ?'
        params.push(store_id)
      }
      
      db.get(query, params, (err, row) => {
        if (err) reject(err)
        else resolve(row.count)
      })
    })
    
    const occupiedLockers = await new Promise((resolve, reject) => {
      let query = 'SELECT COUNT(*) as count FROM lockers WHERE status = "occupied"'
      const params = []
      
      if (store_id) {
        query += ' AND store_id = ?'
        params.push(store_id)
      }
      
      db.get(query, params, (err, row) => {
        if (err) reject(err)
        else resolve(row.count)
      })
    })
    
    const pendingApplications = await new Promise((resolve, reject) => {
      let query = 'SELECT COUNT(*) as count FROM applications WHERE status = "pending"'
      const params = []
      
      if (store_id) {
        query += ' AND store_id = ?'
        params.push(store_id)
      }
      
      db.get(query, params, (err, row) => {
        if (err) reject(err)
        else resolve(row.count)
      })
    })
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: totalUsers // Simplified for now
        },
        stores: {
          total: totalStores
        },
        lockers: {
          total: totalLockers,
          occupied: occupiedLockers,
          available: totalLockers - occupiedLockers
        },
        applications: {
          pending: pendingApplications
        },
        today: {
          operations: 0, // TODO: Calculate today's operations
          revenue: 0 // TODO: Calculate if revenue tracking is needed
        }
      }
    })
    
  } catch (error) {
    console.error('获取统计数据错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// Initialize database and start server
const initServer = async () => {
  try {
    // Initialize database
    console.log('🔧 Initializing database...');
    await require('./database/init-sqlite.js');
    
    console.log('🚀 Starting YesLocker Express API server...');
    app.listen(port, () => {
      console.log(`🎯 YesLocker API server running at http://localhost:${port}`);
      console.log(`📋 Available endpoints:`);
      console.log(`   POST /api/auth/register - User registration`);
      console.log(`   POST /api/auth/login - User login`);
      console.log(`   GET  /api/user/lockers - Get user lockers`);
      console.log(`   POST /api/user/apply - Apply for locker`);
      console.log(`   GET  /api/stores - Get all stores`);
      console.log(`   GET  /api/user/records - Get user records`);
      console.log(`   POST /api/admin/login - Admin login`);
      console.log('🔥 Server ready for integration testing!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

initServer();