const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const dataStore = require('./dataStore');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();
const port = 3001;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Auth Register - 使用统一数据存储
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
    const existingUser = dataStore.getUser(phone);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Phone already registered', 
        message: '该手机号已注册' 
      });
    }

    // 验证门店ID
    const store = dataStore.getStore(store_id);
    if (!store) {
      return res.status(400).json({ 
        error: 'Invalid store', 
        message: '选择的门店不存在或已停用' 
      });
    }

    // 创建用户
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const user = dataStore.createUser({
      id: userId,
      phone,
      name,
      avatar_url: avatar_url || null,
      store_id,
      status: 'active',
      created_at: new Date().toISOString()
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

// Auth Login - 使用统一数据存储
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
    const user = dataStore.getUser(phone);
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
app.post('/api/admin-login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials', 
        message: '请输入手机号和密码' 
      });
    }

    // 管理员账号验证
    const user = dataStore.getUser(phone);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        message: '账号或密码错误' 
      });
    }

    // 密码验证（测试模式下使用固定密码）
    if (password !== 'admin123') {
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        message: '账号或密码错误' 
      });
    }

    console.log(`✅ 管理员登录成功: ${user.name} (${phone})`);

    return res.json({
      success: true,
      data: {
        admin: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role || 'super_admin',
          permissions: ['all']
        },
        token: 'admin_token_' + user.id
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

// Get Stores and Lockers - 使用统一数据存储
app.get('/stores-lockers', async (req, res) => {
  try {
    const stores = dataStore.getStores();
    
    // 为每个门店添加杆柜数量统计
    const storesWithLockers = stores.map(store => {
      const lockers = dataStore.getLockersByStore(store.id);
      return {
        ...store,
        available_lockers: lockers.filter(l => l.status === 'available').length,
        total_lockers: lockers.length
      };
    });

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

// Get Lockers by Store - 使用统一数据存储
app.get('/lockers/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    const lockers = dataStore.getLockersByStore(storeId);
    
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

// Apply for Locker - 使用统一数据存储
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

    // 获取用户手机号（用于关联）
    const user = Array.from(dataStore.data.users.values()).find(u => u.id === user_id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    // 创建申请
    const application = dataStore.createApplication({
      user_id,
      user_phone: user.phone,
      store_id,
      locker_id,
      reason: reason || ''
    });

    console.log(`✅ 新申请提交: ${user.name} 申请杆柜 ${locker_id}`);

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

// Get Applications for Admin - 使用统一数据存储
app.get('/api/admin-approval', async (req, res) => {
  try {
    const { status, store_id, page = 1, pageSize = 20 } = req.query;
    
    // 获取申请列表
    const applications = dataStore.getApplications({ status, store_id });
    
    // 格式化返回数据，包含用户和门店信息
    const formattedData = applications.map(app => {
      const user = dataStore.getUser(app.user_phone) || { name: '未知用户', phone: app.user_phone };
      const store = dataStore.getStore(app.store_id) || { name: '未知门店' };
      
      return {
        id: app.id,
        user: {
          id: app.user_id,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar_url
        },
        store: {
          id: app.store_id,
          name: store.name
        },
        locker: {
          id: app.locker_id || '',
          number: app.locker_id || '待分配'
        },
        status: app.status,
        remark: app.reason || '',
        created_at: app.created_at,
        approved_at: app.approved_at || null,
        approved_by: app.approved_by || null,
        rejected_at: app.rejected_at || null,
        rejected_by: app.rejected_by || null,
        reject_reason: app.reject_reason || null
      };
    });

    // 分页
    const start = (page - 1) * pageSize;
    const end = start + parseInt(pageSize);
    const paginatedData = formattedData.slice(start, end);

    console.log(`📋 返回申请列表: ${paginatedData.length}条，总计${formattedData.length}条`);

    return res.json({
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
    console.error('Get applications error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Admin Approval Action - 使用统一数据存储
app.post('/api/admin-approval', async (req, res) => {
  try {
    const { application_id, action, admin_id, locker_id, reject_reason } = req.body;

    if (!application_id || !action || !admin_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '缺少必要参数'
      });
    }

    const application = dataStore.getApplication(application_id);
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
        const availableLockers = dataStore.getLockersByStore(application.store_id)
          .filter(l => l.status === 'available');
        
        if (availableLockers.length > 0) {
          assignedLockerId = availableLockers[0].id;
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
        dataStore.updateLocker(assignedLockerId, {
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
    dataStore.updateApplication(application_id, updateData);

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

// Get Dashboard Stats - 使用统一数据存储
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const stats = dataStore.getStatistics();
    
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

// Get Users for Admin - 使用统一数据存储
app.get('/api/admin-users', async (req, res) => {
  try {
    const { store_id, status, limit = 20, offset = 0, search } = req.query;
    
    // 获取所有用户
    let users = Array.from(dataStore.data.users.values());
    
    // 过滤条件
    if (store_id) {
      users = users.filter(u => u.store_id === store_id);
    }
    
    if (status) {
      users = users.filter(u => u.status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(searchLower) ||
        u.phone.includes(search)
      );
    }
    
    // 添加杆柜信息
    const usersWithLocker = users.map(user => {
      // 查找用户的已批准申请
      const userApplication = dataStore.getApplications({ status: 'approved' })
        .find(app => app.user_id === user.id);
        
      const hasLocker = !!userApplication;
      const locker = hasLocker && userApplication.locker_id ? 
        Array.from(dataStore.data.lockers.values()).find(l => l.id === userApplication.locker_id) : null;
      
      return {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatar_url: user.avatar_url,
        store_id: user.store_id,
        status: user.status || 'active',
        created_at: user.created_at || new Date().toISOString(),
        has_locker: hasLocker,
        locker_number: locker?.number || null
      };
    });
    
    // 排序 - 最新创建的在前
    usersWithLocker.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // 分页
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedUsers = usersWithLocker.slice(start, end);
    
    console.log(`📋 返回用户列表: ${paginatedUsers.length}条，总计${usersWithLocker.length}条`);
    
    return res.json({
      success: true,
      data: {
        list: paginatedUsers,
        total: usersWithLocker.length
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取用户列表失败'
    });
  }
});

// Get User's Locker - 使用统一数据存储
app.get('/users/:userId/locker', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 查找用户的已批准申请
    const userApplications = dataStore.getApplications({ status: 'approved' })
      .filter(app => app.user_id === userId);
    
    if (userApplications.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: '暂无分配的杆柜'
      });
    }

    // 获取最新的已批准申请
    const latestApp = userApplications[0];
    const locker = Array.from(dataStore.data.lockers.values())
      .find(l => l.id === latestApp.locker_id);
    const store = dataStore.getStore(latestApp.store_id);

    if (!locker) {
      return res.json({
        success: true,
        data: null,
        message: '杆柜信息不存在'
      });
    }

    const userLocker = {
      id: locker.id,
      number: locker.number,
      store_id: store.id,
      store_name: store.name,
      status: 'active',
      created_at: latestApp.approved_at,
      last_use_time: new Date().toISOString()
    };

    console.log(`✅ 用户 ${userId} 查看杆柜: ${locker.number}`);

    return res.json({
      success: true,
      data: userLocker
    });

  } catch (error) {
    console.error('Get user locker error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取杆柜信息失败'
    });
  }
});

// Reset Data - 仅供测试使用
app.post('/api/test/reset', async (req, res) => {
  try {
    // 重新初始化默认数据
    dataStore.initializeDefaultData();
    
    // 保存到文件
    await dataStore.saveData();
    
    console.log('✅ 测试数据已重置');
    
    return res.json({
      success: true,
      message: '数据已重置'
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '重置失败'
    });
  }
});

// Locker Operations (Deposit/Withdrawal) - 使用统一数据存储
app.post('/locker-operations', async (req, res) => {
  try {
    const { user_id, locker_id, action_type, locker_number, store_name } = req.body;

    // 验证必填字段
    if (!user_id || !locker_id || !action_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '用户ID、杆柜ID和操作类型为必填项'
      });
    }

    // 验证操作类型
    if (!['store', 'retrieve'].includes(action_type)) {
      return res.status(400).json({
        error: 'Invalid action type',
        message: '操作类型必须为 store 或 retrieve'
      });
    }

    // 验证用户是否存在
    const user = dataStore.getUserById(user_id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    // 验证杆柜是否存在且属于该用户
    const locker = dataStore.getLockerById(locker_id);
    if (!locker) {
      return res.status(404).json({
        error: 'Locker not found',
        message: '杆柜不存在'
      });
    }

    // 检查杆柜是否分配给该用户
    if (locker.user_id !== user_id) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: '您没有权限操作此杆柜'
      });
    }

    // 创建操作记录
    const recordId = 'record_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const operationRecord = {
      id: recordId,
      user_id: user_id,
      locker_id: locker_id,
      action_type: action_type, // 'store' or 'retrieve'
      locker_number: locker_number || locker.number,
      store_name: store_name || '旗舰店',
      created_at: new Date().toISOString(),
      note: action_type === 'store' ? '存放台球杆' : '取出台球杆'
    };

    // 保存操作记录到数据存储
    dataStore.createLockerRecord(operationRecord);

    // 更新杆柜最后使用时间
    dataStore.updateLocker(locker_id, {
      last_use_time: new Date().toISOString()
    });

    console.log(`✅ 杆柜操作记录: ${user.name} ${action_type === 'store' ? '存杆' : '取杆'} - 杆柜${locker_number || locker.number}`);

    return res.json({
      success: true,
      message: action_type === 'store' ? '存杆操作记录成功' : '取杆操作记录成功',
      data: {
        record_id: recordId,
        action_type: action_type,
        locker_number: locker_number || locker.number,
        created_at: operationRecord.created_at,
        certificate: action_type === 'store' ? {
          id: recordId,
          user_name: user.name,
          phone: user.phone,
          locker_number: locker_number || locker.number,
          store_name: store_name || '旗舰店',
          timestamp: operationRecord.created_at,
          qr_code: `locker_${locker_id}_${recordId}`
        } : null
      }
    });

  } catch (error) {
    console.error('Locker operation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '操作失败，请稍后重试'
    });
  }
});

// Get User's Locker Records - 使用统一数据存储
app.get('/users/:userId/locker-records', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // 验证用户是否存在
    const user = dataStore.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在'
      });
    }

    // 获取用户的操作记录
    const allRecords = dataStore.data.lockerRecords || [];
    const userRecords = allRecords
      .filter(record => record.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    console.log(`📋 返回用户 ${user.name} 的操作记录: ${userRecords.length}条`);

    return res.json({
      success: true,
      message: '获取操作记录成功',
      data: userRecords.map(record => ({
        id: record.id,
        action_type: record.action_type,
        locker_number: record.locker_number,
        store_name: record.store_name,
        created_at: record.created_at,
        note: record.note
      }))
    });

  } catch (error) {
    console.error('Get locker records error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取操作记录失败'
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    dataStoreStatus: 'active'
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 YesLocker API server running at http://localhost:${port}`);
  console.log(`📁 Data persistence enabled with auto-save`);
  console.log(`✅ Unified data store initialized`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n📁 Saving data before shutdown...');
  await dataStore.saveData();
  console.log('✅ Data saved. Goodbye!');
  process.exit(0);
});