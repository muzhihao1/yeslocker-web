const express = require('express');
const cors = require('cors');
const dataStore = require('./database/dataStore-pg');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 初始化数据库（仅在开发环境）
if (process.env.NODE_ENV !== 'production') {
  (async () => {
    try {
      await dataStore.initializeDatabase();
      // 仅在第一次运行时导入种子数据
      // await dataStore.seedDatabase();
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  })();
}

// Auth Register
app.post('/auth-register', async (req, res) => {
  try {
    const { phone, name, avatar_url, store_id } = req.body;

    // 验证必填字段
    if (!phone || !name || !store_id) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: '手机号、姓名和门店为必填项' 
      });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number', 
        message: '请输入有效的手机号码' 
      });
    }

    // 检查手机号是否已注册
    const existingUser = await dataStore.getUser(phone);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Phone already registered', 
        message: '该手机号已注册' 
      });
    }

    // 验证门店ID
    const store = await dataStore.getStore(store_id);
    if (!store) {
      return res.status(400).json({ 
        error: 'Invalid store', 
        message: '选择的门店不存在或已停用' 
      });
    }

    // 创建用户
    const user = await dataStore.createUser({
      phone,
      name,
      avatar_url: avatar_url || null,
      store_id
    });

    console.log(`✅ 新用户注册成功: ${name} (${phone})`);

    return res.json({
      success: true,
      message: '注册成功',
      data: {
        user_id: user.id,
        phone: user.phone,
        name: user.name,
        store: store.name
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: '注册失败，请稍后重试' 
    });
  }
});

// Auth Login
app.post('/auth-login', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: '请输入手机号和验证码' 
      });
    }

    // 获取用户
    const user = await dataStore.getUser(phone);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: '用户不存在，请先注册' 
      });
    }

    // 验证码验证（测试模式下接受 123456）
    if (code !== '123456') {
      return res.status(401).json({ 
        error: 'Invalid code', 
        message: '验证码错误' 
      });
    }

    console.log(`✅ 用户登录成功: ${user.name} (${phone})`);

    return res.json({
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

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: '登录失败，请稍后重试' 
    });
  }
});

// Admin Login
app.post('/admin-login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials', 
        message: '请输入手机号和密码' 
      });
    }

    // 管理员账号验证（使用username作为phone）
    const admin = await dataStore.getAdmin(phone);
    if (!admin) {
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        message: '账号或密码错误' 
      });
    }

    // 密码验证
    const isValidPassword = await dataStore.validateAdminPassword(admin, password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        message: '账号或密码错误' 
      });
    }

    console.log(`✅ 管理员登录成功: ${admin.name} (${phone})`);

    return res.json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          phone: admin.username,
          name: admin.name,
          role: admin.role,
          store_id: admin.store_id,
          permissions: admin.role === 'super_admin' ? ['all'] : ['store']
        },
        token: 'admin_token_' + admin.id
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: '登录失败' 
    });
  }
});

// Get Stores and Lockers
app.get('/stores-lockers', async (req, res) => {
  try {
    const stores = await dataStore.getStores();
    
    // 为每个门店添加杆柜数量统计
    const storesWithLockers = await Promise.all(stores.map(async (store) => {
      const lockers = await dataStore.getLockersByStore(store.id);
      return {
        ...store,
        available_lockers: lockers.filter(l => l.status === 'available').length,
        total_lockers: lockers.length
      };
    }));

    return res.json({
      success: true,
      data: storesWithLockers
    });

  } catch (error) {
    console.error('Get stores error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取门店信息失败'
    });
  }
});

// Get Lockers by Store
app.get('/lockers/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const lockers = await dataStore.getLockersByStore(storeId);
    
    return res.json({ 
      success: true, 
      data: lockers 
    });

  } catch (error) {
    console.error('Get lockers error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Apply for Locker
app.post('/lockers-apply', async (req, res) => {
  try {
    const { store_id, locker_id, user_id, reason } = req.body;

    // Validate required fields
    if (!store_id || !locker_id || !user_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '请选择门店和杆柜'
      });
    }

    // 创建申请
    const application = await dataStore.createApplication({
      user_id,
      store_id,
      locker_id,
      reason: reason || ''
    });

    console.log(`✅ 新申请提交: 用户 ${user_id} 申请杆柜 ${locker_id}`);

    return res.json({
      success: true,
      message: '申请提交成功',
      data: {
        application_id: application.id,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Apply locker error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '申请提交失败'
    });
  }
});

// Get Applications for Admin
app.get('/api/admin-approval', async (req, res) => {
  try {
    const { status, store_id, page = 1, pageSize = 20 } = req.query;
    
    // 获取申请列表
    const applications = await dataStore.getApplications({ status, store_id });
    
    // 分页
    const start = (page - 1) * pageSize;
    const end = start + parseInt(pageSize);
    const paginatedData = applications.slice(start, end);

    console.log(`📋 返回申请列表: ${paginatedData.length}条，总计${applications.length}条`);

    return res.json({
      success: true,
      data: paginatedData.map(app => ({
        id: app.id,
        user: {
          id: app.user_id,
          name: app.user_name,
          phone: app.user_phone,
          avatar: app.avatar_url
        },
        store: {
          id: app.store_id,
          name: app.store_name
        },
        locker: {
          id: app.locker_id || '',
          number: app.locker_number || '待分配'
        },
        status: app.status,
        remark: app.reason || '',
        created_at: app.created_at,
        approved_at: app.approved_at || null,
        approved_by: app.approved_by || null,
        rejected_at: app.rejected_at || null,
        rejected_by: app.rejected_by || null,
        reject_reason: app.reject_reason || null
      })),
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: applications.length,
        totalPages: Math.ceil(applications.length / pageSize)
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Admin Approval Action
app.post('/api/admin-approval', async (req, res) => {
  try {
    const { application_id, action, admin_id, locker_id, reject_reason } = req.body;

    if (!application_id || !action || !admin_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '缺少必要参数'
      });
    }

    const application = await dataStore.getApplication(application_id);
    if (!application) {
      return res.status(404).json({
        error: 'Application not found',
        message: '申请不存在'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        error: 'Invalid status',
        message: '该申请已处理'
      });
    }

    let updateData = {};
    
    if (action === 'approve') {
      // 如果没有指定杆柜，自动分配一个
      let assignedLockerId = locker_id;
      if (!assignedLockerId) {
        const availableLockers = await dataStore.getLockersByStore(application.store_id);
        const available = availableLockers.filter(l => l.status === 'available');
        
        if (available.length > 0) {
          assignedLockerId = available[0].id;
        }
      }

      updateData = {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: admin_id,
        locker_id: assignedLockerId
      };

      // 更新杆柜状态
      if (assignedLockerId) {
        await dataStore.updateLocker(assignedLockerId, {
          status: 'occupied',
          user_id: application.user_id
        });
      }
    } else if (action === 'reject') {
      updateData = {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: admin_id,
        reject_reason: reject_reason || '不符合申请条件'
      };
    }

    // 更新申请状态
    await dataStore.updateApplication(application_id, updateData);

    console.log(`✅ 申请 ${application_id} 已${action === 'approve' ? '通过' : '拒绝'}`);

    return res.json({
      success: true,
      message: action === 'approve' ? '审批通过' : '已拒绝',
      data: {
        application_id,
        status: updateData.status
      }
    });

  } catch (error) {
    console.error('Admin approval error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '操作失败'
    });
  }
});

// Get Dashboard Stats
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const stats = await dataStore.getStatistics();
    
    return res.json({
      success: true,
      data: {
        pending_applications: stats.pendingApplications,
        occupied_lockers: stats.occupiedLockers,
        active_users: stats.activeUsers,
        today_operations: stats.todayOperations
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取统计数据失败'
    });
  }
});

// Get User Locker Info
app.get('/api/locker-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const locker = await dataStore.getUserLocker(userId);
    const records = await dataStore.getUserLockerRecords(userId);
    
    return res.json({
      success: true,
      data: {
        locker,
        records
      }
    });

  } catch (error) {
    console.error('Get user locker error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取杆柜信息失败'
    });
  }
});

// Locker Operations (open/close)
app.post('/locker-operations', async (req, res) => {
  try {
    const { user_id, locker_id, store_id, operation } = req.body;

    if (!user_id || !locker_id || !store_id || !operation) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '缺少必要参数'
      });
    }

    // 创建操作记录
    const record = await dataStore.createLockerRecord({
      user_id,
      locker_id,
      store_id,
      operation,
      remark: ''
    });

    console.log(`✅ 杆柜操作记录: 用户 ${user_id} ${operation} 杆柜 ${locker_id}`);

    return res.json({
      success: true,
      message: '操作成功',
      data: {
        record_id: record.id,
        operation
      }
    });

  } catch (error) {
    console.error('Locker operation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '操作失败'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'YesLocker API (PostgreSQL)',
    timestamp: new Date().toISOString() 
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 YesLocker API Server (PostgreSQL) running on port ${port}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});