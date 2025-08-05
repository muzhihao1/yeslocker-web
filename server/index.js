const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
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

    // 开发环境下绕过数据库验证 (暂时总是使用测试模式)
    const useTestMode = true; // TODO: 改为 process.env.NODE_ENV !== 'production'
    if (useTestMode) {
      // 模拟检查手机号是否已注册（使用内存存储）
      if (!global.registeredUsers) {
        global.registeredUsers = new Map();
      }
      
      if (global.registeredUsers.has(phone)) {
        return res.status(409).json({ 
          error: 'Phone already registered', 
          message: '该手机号已注册' 
        });
      }

      // 验证门店ID（使用测试门店数据）
      const testStores = ['1', '2', '3'];
      if (!testStores.includes(store_id)) {
        return res.status(400).json({ 
          error: 'Invalid store', 
          message: '选择的门店不存在或已停用' 
        });
      }

      // 创建模拟用户
      const userId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const user = {
        id: userId,
        phone,
        name,
        avatar_url: avatar_url || null,
        store_id,
        status: 'active',
        created_at: new Date().toISOString()
      };

      // 存储到内存中
      global.registeredUsers.set(phone, user);

      const storeName = store_id === '1' ? '旗舰店' : store_id === '2' ? '分店A' : '分店B';

      return res.json({
        success: true,
        message: '注册成功',
        data: {
          user_id: user.id,
          phone: user.phone,
          name: user.name,
          store: storeName
        }
      });
    }

    // 生产环境使用原有的Supabase逻辑
    // 检查手机号是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Phone already registered', 
        message: '该手机号已注册' 
      });
    }

    // 验证门店是否存在
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', store_id)
      .eq('status', 'active')
      .single();

    if (storeError || !store) {
      return res.status(400).json({ 
        error: 'Invalid store', 
        message: '选择的门店不存在或已停用' 
      });
    }

    // 创建用户记录
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        phone,
        name,
        avatar_url: avatar_url || null,
        store_id,
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('User creation error:', createError);
      return res.status(500).json({ 
        error: 'Registration failed', 
        message: '注册失败，请稍后重试' 
      });
    }

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
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: '服务器内部错误' 
    });
  }
});

// Auth Login
app.post('/auth-login', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: 'Missing phone number',
        message: '请输入手机号'
      });
    }

    // 开发环境下使用内存中的用户数据
    const useTestMode = true; // TODO: 改为 process.env.NODE_ENV !== 'production'
    if (useTestMode) {
      if (!global.registeredUsers) {
        global.registeredUsers = new Map();
      }

      const user = global.registeredUsers.get(phone);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: '用户不存在，请先注册'
        });
      }

      if (user.status !== 'active') {
        return res.status(403).json({
          error: 'User inactive',
          message: '用户已被禁用'
        });
      }

      const storeName = user.store_id === '1' ? '旗舰店' : user.store_id === '2' ? '分店A' : '分店B';

      return res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            avatar_url: user.avatar_url,
            store_id: user.store_id,
            store_name: storeName
          },
          token: Buffer.from(JSON.stringify({ user_id: user.id, phone: user.phone })).toString('base64')
        }
      });
    }

    // 生产环境使用Supabase
    // 查询用户
    const { data: user, error } = await supabase
      .from('users')
      .select('*, stores(name)')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'User not found',
        message: '用户不存在，请先注册'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'User inactive',
        message: '用户已被禁用'
      });
    }

    // 简化版：直接返回用户信息作为登录成功
    return res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          avatar_url: user.avatar_url,
          store_id: user.store_id,
          store_name: user.stores?.name
        },
        // 生成简单的token（生产环境需要使用JWT）
        token: Buffer.from(JSON.stringify({ user_id: user.id, phone: user.phone })).toString('base64')
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Admin Login (with both /admin-login and /api/admin-login endpoints)
app.post('/admin-login', handleAdminLogin);
app.post('/api/admin-login', handleAdminLogin);

async function handleAdminLogin(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: '请输入手机号和密码'
      });
    }

    // 开发环境使用测试模式
    const useTestMode = true; // TODO: 改为 process.env.NODE_ENV !== 'production'
    
    if (useTestMode) {
      // 测试管理员数据
      const testAdmins = [
        {
          id: 'admin_1',
          phone: '13800000001',
          password: 'admin123',
          name: '超级管理员',
          role: 'super_admin',
          store_id: null,
          store_name: null,
          status: 'active'
        },
        {
          id: 'admin_2',
          phone: '13800000002',
          password: 'admin123',
          name: '门店管理员',
          role: 'store_admin',
          store_id: '1',
          store_name: '旗舰店',
          status: 'active'
        }
      ];

      // 查找匹配的管理员
      const admin = testAdmins.find(a => a.phone === phone);
      if (!admin) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: '管理员不存在'
        });
      }

      // 验证密码
      if (admin.password !== password) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: '密码错误'
        });
      }

      if (admin.status !== 'active') {
        return res.status(403).json({
          error: 'Admin inactive',
          message: '管理员账号已被禁用'
        });
      }

      return res.json({
        success: true,
        message: '登录成功',
        data: {
          admin: {
            id: admin.id,
            phone: admin.phone,
            name: admin.name,
            role: admin.role,
            store_id: admin.store_id,
            store_name: admin.store_name
          },
          token: Buffer.from(JSON.stringify({ admin_id: admin.id, role: admin.role })).toString('base64')
        }
      });
    }

    // 生产环境使用Supabase数据库
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*, stores(name)')
      .eq('phone', phone)
      .single();

    if (error || !admin) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '手机号或密码错误'
      });
    }

    // 简化版：直接比较密码（生产环境需要加密）
    if (admin.password !== password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '手机号或密码错误'
      });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({
        error: 'Admin inactive',
        message: '管理员账号已被禁用'
      });
    }

    return res.json({
      success: true,
      message: '登录成功',
      data: {
        admin: {
          id: admin.id,
          phone: admin.phone,
          name: admin.name,
          role: admin.role,
          store_id: admin.store_id,
          store_name: admin.stores?.name
        },
        token: Buffer.from(JSON.stringify({ admin_id: admin.id, role: admin.role })).toString('base64')
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
}

// Get Stores
app.get('/stores-lockers', async (req, res) => {
  try {
    // 返回测试数据，绕过Supabase连接问题
    const testStores = [
      { id: '1', name: '旗舰店', address: '北京市朝阳区望京街道', status: 'active', phone: '010-12345678' },
      { id: '2', name: '分店A', address: '北京市海淀区中关村', status: 'active', phone: '010-87654321' },
      { id: '3', name: '分店B', address: '北京市东城区王府井', status: 'active', phone: '010-11223344' }
    ];

    return res.json({
      success: true,
      data: testStores
    });

  } catch (error) {
    console.error('Get stores error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Apply for Locker (old version - using Supabase)
// Commented out in favor of test version below
/*
app.post('/lockers-apply', async (req, res) => {
  try {
    const { user_id, store_id, locker_type, purpose, notes } = req.body;

    if (!user_id || !store_id || !locker_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '请填写必要信息'
      });
    }

    // 检查是否已有进行中的申请
    const { data: existingApplication } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user_id)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingApplication) {
      return res.status(409).json({
        error: 'Existing application',
        message: '您已有进行中的申请'
      });
    }

    // 创建申请
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        user_id,
        store_id,
        locker_type,
        purpose,
        notes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      message: '申请提交成功',
      data: application
    });

  } catch (error) {
    console.error('Apply locker error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});
*/

// Admin Token Verification Function
function verifyAdminToken(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '需要管理员身份验证'
    });
  }

  const token = authHeader.substring(7);
  try {
    // 在测试模式下验证测试token
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!decoded.admin_id || !decoded.role) {
      throw new Error('Invalid token structure');
    }
    return decoded;
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: '无效的身份验证令牌'
    });
  }
}

// Get Applications for Admin
app.get('/api/admin-approval', async (req, res) => {
  try {
    // 验证管理员权限
    const adminInfo = verifyAdminToken(req, res);
    if (!adminInfo) return; // Response already sent by verifyAdminToken

    const { status, store_id, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    // 开发环境使用测试模式
    const useTestMode = true; // TODO: 改为 process.env.NODE_ENV !== 'production'
    
    if (useTestMode) {
      // 初始化测试申请数据（如果不存在），确保与POST端点数据一致
      if (!global.testApplications) {
        global.testApplications = new Map([
          ['app_1', {
            id: 'app_1',
            user: { id: 'user_1', name: '张三', phone: '13800000003', avatar: null },
            store: { id: '1', name: '旗舰店' },
            locker: { id: '', number: '待分配' },
            status: 'pending',
            remark: '申请存放台球杆',
            created_at: '2025-01-03T10:00:00Z',
            approved_at: null,
            approved_by: null
          }],
          ['app_2', {
            id: 'app_2',
            user: { id: 'user_2', name: '李四', phone: '13800000004', avatar: null },
            store: { id: '1', name: '旗舰店' },
            locker: { id: 'locker_001', number: 'A-001' },
            status: 'approved',
            remark: '申请存放台球杆',
            created_at: '2025-01-02T14:30:00Z',
            approved_at: '2025-01-02T15:00:00Z',
            approved_by: 'admin_1'
          }],
          ['app_3', {
            id: 'app_3',
            user: { id: 'user_3', name: '王五', phone: '13800000005', avatar: null },
            store: { id: '2', name: '分店A' },
            locker: { id: '', number: '待分配' },
            status: 'rejected',
            remark: '申请存放台球杆',
            created_at: '2025-01-01T09:00:00Z',
            approved_at: '2025-01-01T10:00:00Z',
            approved_by: 'admin_2'
          }],
          ['app_4', {
            id: 'app_4',
            user: { id: 'user_4', name: '赵六', phone: '13800000006', avatar: null },
            store: { id: '1', name: '旗舰店' },
            locker: { id: '', number: '待分配' },
            status: 'pending',
            remark: '会员存杆申请',
            created_at: '2025-01-04T16:00:00Z',
            approved_at: null,
            approved_by: null
          }],
          ['app_5', {
            id: 'app_5',
            user: { id: 'user_5', name: '孙七', phone: '13800000007', avatar: null },
            store: { id: '2', name: '分店A' },
            locker: { id: 'locker_005', number: 'B-005' },
            status: 'approved',
            remark: '申请存放私人球杆',
            created_at: '2024-12-30T11:00:00Z',
            approved_at: '2024-12-30T11:30:00Z',
            approved_by: 'admin_2'
          }]
        ]);
      }
      
      // 从全局Map获取数据，确保看到POST审批操作的更改
      const testApplications = Array.from(global.testApplications.values()).map(app => ({
        ...app,
        // 确保数据格式一致
        locker: {
          id: app.assigned_locker_id || app.locker?.id || '',
          number: app.assigned_locker_id ? `L-${app.assigned_locker_id.slice(-3)}` : (app.locker?.number || '待分配')
        }
      }));
      
      console.log('✅ 使用全局测试申请数据，当前状态：', global.testApplications.size, '个申请');

      // 应用筛选条件
      let filteredApplications = [...testApplications];
      
      if (status) {
        filteredApplications = filteredApplications.filter(app => app.status === status);
      }
      
      if (store_id) {
        filteredApplications = filteredApplications.filter(app => app.store.id === store_id);
      }

      // 按创建时间倒序排列
      filteredApplications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // 应用分页
      const total = filteredApplications.length;
      const paginatedData = filteredApplications.slice(offset, offset + parseInt(pageSize));

      return res.json({
        success: true,
        data: paginatedData,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    }

    // 生产环境使用Supabase数据库
    let query = supabase
      .from('applications')
      .select(`
        *,
        users!inner (
          id,
          name,
          phone,
          avatar_url
        ),
        stores!inner (
          id,
          name
        ),
        lockers (
          id,
          number
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // 添加筛选条件
    if (status) {
      query = query.eq('status', status);
    }
    
    if (store_id) {
      query = query.eq('store_id', store_id);
    }

    const { data: applications, error } = await query;

    if (error) {
      throw error;
    }

    // 格式化返回数据
    const formattedData = applications.map(app => ({
      id: app.id,
      user: {
        id: app.users.id,
        name: app.users.name,
        phone: app.users.phone,
        avatar: app.users.avatar_url
      },
      store: {
        id: app.stores.id,
        name: app.stores.name
      },
      locker: app.lockers ? {
        id: app.lockers.id,
        number: app.lockers.number
      } : {
        id: '',
        number: app.locker_type || '待分配'
      },
      status: app.status,
      remark: app.notes || '',
      created_at: app.created_at,
      approved_at: app.approved_at,
      approved_by: app.approved_by
    }));

    return res.json({
      success: true,
      data: formattedData
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
    // 验证管理员权限
    const adminInfo = verifyAdminToken(req, res);
    if (!adminInfo) return; // Response already sent by verifyAdminToken

    const { application_id, action, assigned_locker_id, rejection_reason } = req.body;

    if (!application_id || !action) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: '缺少必要参数'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: '无效的操作'
      });
    }

    // 开发环境使用测试模式
    const useTestMode = true; // TODO: 改为 process.env.NODE_ENV !== 'production'
    
    if (useTestMode) {
      // 初始化测试申请数据（如果不存在）
      if (!global.testApplications) {
        global.testApplications = new Map([
          ['app_1', { 
            id: 'app_1', 
            status: 'pending', 
            user_id: 'user_1', 
            store_id: '1',
            user_name: '张三'
          }],
          ['app_4', { 
            id: 'app_4', 
            status: 'pending', 
            user_id: 'user_4', 
            store_id: '1',
            user_name: '赵六'
          }]
        ]);
      }

      // 查找申请
      const application = global.testApplications.get(application_id);
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

      // 更新申请状态
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_at: new Date().toISOString(),
        approved_by: 'admin_1', // 从token获取管理员ID (测试模式下使用固定值)
        rejection_reason: action === 'reject' ? rejection_reason : null
      };

      // 如果批准，需要分配杆柜
      if (action === 'approve') {
        let lockerId = assigned_locker_id;
        
        // 初始化已占用杆柜列表
        if (!global.occupiedLockers) {
          global.occupiedLockers = new Set(['locker_001']); // locker_001已被占用
        }
        
        // 如果没有指定杆柜，自动分配一个
        if (!lockerId) {
          // 测试用可用杆柜
          const availableLockers = ['locker_001', 'locker_002', 'locker_003'];

          // 找到可用杆柜
          const availableLocker = availableLockers.find(id => !global.occupiedLockers.has(id));
          
          if (availableLocker) {
            lockerId = availableLocker;
          } else {
            return res.status(400).json({
              error: 'No available locker',
              message: '没有可用的杆柜'
            });
          }
        }

        // 更新申请记录
        updateData.assigned_locker_id = lockerId;

        // 标记杆柜为已占用
        global.occupiedLockers.add(lockerId);

        // 创建杆柜记录（模拟）
        console.log(`测试模式：为用户 ${application.user_name} 分配杆柜 ${lockerId}`);
      }

      // 更新测试数据
      Object.assign(application, updateData);

      return res.json({
        success: true,
        message: action === 'approve' ? '审批通过' : '已拒绝',
        data: {
          application_id,
          status: updateData.status,
          assigned_locker_id: updateData.assigned_locker_id || null
        }
      });
    }

    // Early return for test mode to prevent executing production code
    return;

    // 生产环境使用Supabase数据库
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*, users(id, name)')
      .eq('id', application_id)
      .single();

    if (appError || !application) {
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

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_at: new Date().toISOString(),
      approved_by: 'admin', // 实际项目中应该从 token 获取管理员ID
      rejection_reason: action === 'reject' ? rejection_reason : null
    };

    // 如果批准，需要分配杆柜
    if (action === 'approve') {
      let lockerId = assigned_locker_id;
      
      // 如果没有指定杆柜，自动分配一个
      if (!lockerId) {
        const { data: availableLocker } = await supabase
          .from('lockers')
          .select('id')
          .eq('store_id', application.store_id)
          .eq('status', 'available')
          .limit(1)
          .single();
        
        if (availableLocker) {
          lockerId = availableLocker.id;
        } else {
          return res.status(400).json({
            error: 'No available locker',
            message: '没有可用的杆柜'
          });
        }
      }

      // 更新申请记录
      updateData.assigned_locker_id = lockerId;

      // 创建杆柜记录
      await supabase
        .from('locker_records')
        .insert({
          user_id: application.user_id,
          locker_id: lockerId,
          action: 'assigned',
          notes: '审批通过，分配杆柜'
        });

      // 更新杆柜状态
      await supabase
        .from('lockers')
        .update({ 
          status: 'occupied',
          current_user_id: application.user_id
        })
        .eq('id', lockerId);
    }

    // 更新申请状态
    const { error: updateError } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', application_id);

    if (updateError) {
      throw updateError;
    }

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
      message: '服务器内部错误'
    });
  }
});

// Get Users for Admin
app.get('/api/admin-users', async (req, res) => {
  try {
    // 验证管理员权限
    const adminInfo = verifyAdminToken(req, res);
    if (!adminInfo) return; // Response already sent by verifyAdminToken

    const { search, filter, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    // 开发环境使用测试模式
    const useTestMode = true; // TODO: 改为 process.env.NODE_ENV !== 'production'
    
    if (useTestMode) {
      // 测试用户数据
      const testUsers = [
        {
          id: 'user_1',
          name: '张三',
          phone: '13800000003',
          avatar: null,
          created_at: '2024-12-01T10:00:00Z',
          lastActiveAt: '2025-01-04T15:30:00Z',
          isActive: true,
          disabled: false,
          lockerCount: 1,
          currentLockers: 1,
          totalOperations: 5,
          store_name: '旗舰店'
        },
        {
          id: 'user_2',
          name: '李四',
          phone: '13800000004',
          avatar: null,
          created_at: '2024-11-15T14:00:00Z',
          lastActiveAt: '2025-01-03T09:00:00Z',
          isActive: true,
          disabled: false,
          lockerCount: 1,
          currentLockers: 1,
          totalOperations: 8,
          store_name: '旗舰店'
        },
        {
          id: 'user_3',
          name: '王五',
          phone: '13800000005',
          avatar: null,
          created_at: '2024-10-20T11:30:00Z',
          lastActiveAt: '2024-12-15T16:00:00Z',
          isActive: false,
          disabled: false,
          lockerCount: 0,
          currentLockers: 0,
          totalOperations: 2,
          store_name: '分店A'
        },
        {
          id: 'user_4',
          name: '赵六',
          phone: '13800000006',
          avatar: null,
          created_at: '2024-12-10T09:00:00Z',
          lastActiveAt: '2025-01-02T12:00:00Z',
          isActive: true,
          disabled: false,
          lockerCount: 0,
          currentLockers: 0,
          totalOperations: 1,
          store_name: '旗舰店'
        },
        {
          id: 'user_5',
          name: '孙七',
          phone: '13800000007',
          avatar: null,
          created_at: '2024-09-30T16:00:00Z',
          lastActiveAt: '2024-12-30T10:00:00Z',
          isActive: false,
          disabled: true,
          lockerCount: 1,
          currentLockers: 1,
          totalOperations: 12,
          store_name: '分店A'
        },
        {
          id: 'user_6',
          name: '周八',
          phone: '13800000008',
          avatar: null,
          created_at: '2024-12-20T13:00:00Z',
          lastActiveAt: '2025-01-01T14:00:00Z',
          isActive: true,
          disabled: false,
          lockerCount: 2,
          currentLockers: 2,
          totalOperations: 15,
          store_name: '分店B'
        }
      ];

      // 应用搜索条件
      let filteredUsers = [...testUsers];
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.name.includes(search) || 
          user.phone.includes(search)
        );
      }

      // 应用筛选条件
      if (filter === 'active') {
        filteredUsers = filteredUsers.filter(user => user.isActive);
      } else if (filter === 'hasLocker') {
        filteredUsers = filteredUsers.filter(user => user.lockerCount > 0);
      } else if (filter === 'noLocker') {
        filteredUsers = filteredUsers.filter(user => user.lockerCount === 0);
      } else if (filter === 'disabled') {
        filteredUsers = filteredUsers.filter(user => user.disabled);
      }

      // 按创建时间倒序排列
      filteredUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // 应用分页
      const total = filteredUsers.length;
      const paginatedData = filteredUsers.slice(offset, offset + parseInt(pageSize));

      return res.json({
        success: true,
        data: {
          list: paginatedData,
          total: total,
          statistics: {
            totalUsers: testUsers.length,
            activeUsers: testUsers.filter(u => u.isActive).length,
            usersWithLocker: testUsers.filter(u => u.lockerCount > 0).length,
            disabledUsers: testUsers.filter(u => u.disabled).length
          }
        }
      });
    }

    // 生产环境使用Supabase数据库
    let query = supabase
      .from('users')
      .select(`
        *,
        stores (name)
      `, { count: 'exact' });

    // 搜索条件
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // 筛选条件
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (filter === 'active') {
      // 30天内有活动的用户
      query = query.gte('last_active_at', thirtyDaysAgo.toISOString());
    } else if (filter === 'hasLocker') {
      // 有杆柜的用户 - 需要子查询
      const { data: usersWithLockers } = await supabase
        .from('lockers')
        .select('current_user_id')
        .not('current_user_id', 'is', null);
      
      const userIds = usersWithLockers?.map(l => l.current_user_id) || [];
      if (userIds.length > 0) {
        query = query.in('id', userIds);
      }
    } else if (filter === 'noLocker') {
      // 无杆柜的用户
      const { data: usersWithLockers } = await supabase
        .from('lockers')
        .select('current_user_id')
        .not('current_user_id', 'is', null);
      
      const userIds = usersWithLockers?.map(l => l.current_user_id) || [];
      if (userIds.length > 0) {
        query = query.not('id', 'in', userIds);
      }
    }

    // 排序和分页
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: users, error, count } = await query;

    if (error) {
      throw error;
    }

    // 获取用户的杆柜数量和操作统计
    const userIds = users.map(u => u.id);
    
    // 获取每个用户的杆柜数量
    const { data: lockerCounts } = await supabase
      .from('lockers')
      .select('current_user_id')
      .in('current_user_id', userIds);
    
    // 获取每个用户的操作次数
    const { data: operationCounts } = await supabase
      .from('locker_records')
      .select('user_id, action')
      .in('user_id', userIds);

    // 统计数据
    const lockerCountMap = {};
    const operationCountMap = {};

    lockerCounts?.forEach(l => {
      lockerCountMap[l.current_user_id] = (lockerCountMap[l.current_user_id] || 0) + 1;
    });

    operationCounts?.forEach(o => {
      operationCountMap[o.user_id] = (operationCountMap[o.user_id] || 0) + 1;
    });

    // 格式化返回数据
    const formattedData = users.map(user => {
      const lastActive = user.last_active_at || user.created_at;
      const isActive = new Date(lastActive) > thirtyDaysAgo;

      return {
        id: user.id,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar_url,
        created_at: user.created_at,
        lastActiveAt: lastActive,
        isActive,
        disabled: user.status !== 'active',
        lockerCount: lockerCountMap[user.id] || 0,
        currentLockers: lockerCountMap[user.id] || 0,
        totalOperations: operationCountMap[user.id] || 0
      };
    });

    return res.json({
      success: true,
      data: {
        list: formattedData,
        total: count || 0
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Get Lockers by Store
app.get('/lockers/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    
    // 测试模式下返回模拟数据
    const testLockers = [
      { id: '1', store_id: storeId, number: 'A01', status: 'available', created_at: new Date().toISOString() },
      { id: '2', store_id: storeId, number: 'A02', status: 'occupied', user_id: 'user123', created_at: new Date().toISOString() },
      { id: '3', store_id: storeId, number: 'A03', status: 'available', created_at: new Date().toISOString() },
      { id: '4', store_id: storeId, number: 'A04', status: 'available', created_at: new Date().toISOString() },
      { id: '5', store_id: storeId, number: 'B01', status: 'available', created_at: new Date().toISOString() },
      { id: '6', store_id: storeId, number: 'B02', status: 'occupied', user_id: 'user456', created_at: new Date().toISOString() },
      { id: '7', store_id: storeId, number: 'B03', status: 'available', created_at: new Date().toISOString() },
      { id: '8', store_id: storeId, number: 'B04', status: 'occupied', user_id: 'user789', created_at: new Date().toISOString() },
    ];

    return res.json({
      success: true,
      data: testLockers
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

    // 存储申请记录（测试模式）
    if (!global.applications) {
      global.applications = [];
    }

    const applicationId = 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const application = {
      id: applicationId,
      store_id,
      locker_id,
      user_id,
      reason: reason || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    global.applications.push(application);

    return res.json({
      success: true,
      message: '申请提交成功',
      data: {
        application_id: applicationId,
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

// Get User's Locker
app.get('/users/:userId/locker', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 测试模式下返回模拟数据
    // 检查是否有已分配的杆柜
    let userLocker = null;
    
    // 首先检查testApplications中已审批的申请
    if (global.testApplications) {
      console.log(`🔍 查找用户 ${userId} 的已审批申请，总申请数：${global.testApplications.size}`);
      const userApplication = Array.from(global.testApplications.values()).find(app => 
        app.user_id === userId && app.status === 'approved' && app.assigned_locker_id
      );
      console.log(`🔍 找到的申请:`, userApplication ? `${userApplication.id} (${userApplication.status})` : 'null');
      
      if (userApplication) {
        userLocker = {
          id: userApplication.assigned_locker_id,
          number: `L-${userApplication.assigned_locker_id.slice(-3)}`, // L-002 format
          store_id: userApplication.store_id,
          store_name: userApplication.store_id === '1' ? '旗舰店' : 
                      userApplication.store_id === '2' ? '分店A' : '分店B',
          status: 'approved',
          created_at: userApplication.approved_at || userApplication.created_at,
          last_use_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1天前
        };
        
        console.log(`✅ 用户 ${userId} 查看已分配杆柜: ${userLocker.id}`);
      }
    }
    
    // 如果没有申请中的，返回一个已批准的模拟杆柜
    if (!userLocker && Math.random() > 0.3) { // 70%概率有杆柜
      userLocker = {
        id: 'locker_123',
        number: 'A03',
        store_id: '1',
        store_name: '旗舰店',
        status: 'approved',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天前
        last_use_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2天前
      };
    }

    return res.json({
      success: true,
      data: userLocker
    });

  } catch (error) {
    console.error('Get user locker error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Get User's Locker Records
app.get('/users/:userId/locker-records', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    // 测试模式下返回模拟数据
    const testRecords = [
      {
        id: 'record_1',
        user_id: userId,
        locker_id: 'locker_123',
        locker_number: 'A03',
        store_name: '旗舰店',
        action_type: 'store',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        note: ''
      },
      {
        id: 'record_2',
        user_id: userId,
        locker_id: 'locker_123',
        locker_number: 'A03',
        store_name: '旗舰店',
        action_type: 'retrieve',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        note: ''
      },
      {
        id: 'record_3',
        user_id: userId,
        locker_id: 'locker_123',
        locker_number: 'A03',
        store_name: '旗舰店',
        action_type: 'store',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        note: ''
      }
    ];

    return res.json({
      success: true,
      data: testRecords.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Get locker records error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务器内部错误'
    });
  }
});

// Locker Operations (Store/Retrieve)
app.post('/locker-operations', async (req, res) => {
  try {
    const { user_id, locker_id, action_type, locker_number, store_name } = req.body;

    // Validate required fields
    if (!user_id || !locker_id || !action_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '缺少必要参数'
      });
    }

    // Validate action type
    if (!['store', 'retrieve'].includes(action_type)) {
      return res.status(400).json({
        error: 'Invalid action type',
        message: '无效的操作类型'
      });
    }

    // 存储操作记录（测试模式）
    if (!global.lockerRecords) {
      global.lockerRecords = [];
    }

    const recordId = 'record_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const record = {
      id: recordId,
      user_id,
      locker_id,
      locker_number: locker_number || 'A03',
      store_name: store_name || '旗舰店',
      action_type,
      created_at: new Date().toISOString(),
      note: ''
    };

    global.lockerRecords.push(record);

    // 更新用户的最后使用时间（如果有用户杆柜数据）
    if (global.userLockers && global.userLockers[user_id]) {
      global.userLockers[user_id].last_use_time = record.created_at;
    }

    return res.json({
      success: true,
      message: action_type === 'store' ? '存杆成功' : '取杆成功',
      data: {
        record_id: recordId,
        action_type,
        timestamp: record.created_at
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

// Get Locker QR Code Data
app.get('/lockers/:lockerId/qrcode', async (req, res) => {
  try {
    const { lockerId } = req.params;
    
    // 生成二维码数据
    const qrData = {
      lockerId: lockerId,
      lockerNumber: 'A03', // 实际应该从数据库获取
      storeName: '旗舰店',
      timestamp: new Date().toISOString()
    };

    return res.json({
      success: true,
      data: {
        qrContent: JSON.stringify(qrData),
        lockerInfo: {
          id: lockerId,
          number: qrData.lockerNumber,
          store: qrData.storeName
        }
      }
    });

  } catch (error) {
    console.error('Get QR code error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取二维码失败'
    });
  }
});

// Test Data Management - Reset all test data states
app.post('/api/test-data-reset', (req, res) => {
  try {
    // Reset all global test data variables
    delete global.registeredUsers;
    delete global.testApplications;
    delete global.applications;
    delete global.lockerRecords;
    delete global.userLockers;
    delete global.occupiedLockers;
    
    // Reinitialize with original test data
    global.testApplications = new Map([
      ['app_1', { 
        id: 'app_1', 
        status: 'pending', 
        user_id: 'user_1', 
        store_id: '1',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }],
      ['app_2', { 
        id: 'app_2', 
        status: 'pending', 
        user_id: 'user_2', 
        store_id: '1',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }]
    ]);
    
    console.log('Test data reset completed at:', new Date().toISOString());
    
    return res.json({
      success: true,
      message: '测试数据已重置',
      data: {
        resetTime: new Date().toISOString(),
        clearedData: [
          'registeredUsers',
          'testApplications', 
          'applications',
          'lockerRecords',
          'userLockers'
        ],
        reinitializedData: [
          'testApplications (2 items)'
        ]
      }
    });
    
  } catch (error) {
    console.error('Test data reset error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '测试数据重置失败'
    });
  }
});

// Test Data Management - Get test data status
app.get('/api/test-data-status', (req, res) => {
  try {
    const status = {
      registeredUsers: global.registeredUsers ? global.registeredUsers.size : 0,
      testApplications: global.testApplications ? global.testApplications.size : 0,
      applications: global.applications ? global.applications.length : 0,
      lockerRecords: global.lockerRecords ? global.lockerRecords.length : 0,
      userLockers: global.userLockers ? Object.keys(global.userLockers).length : 0,
      lastResetTime: global.lastResetTime || 'Never',
      serverStartTime: global.serverStartTime || new Date().toISOString()
    };
    
    return res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Get test data status error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: '获取测试数据状态失败'
    });
  }
});

// Initialize server start time
global.serverStartTime = new Date().toISOString();

app.listen(port, () => {
  console.log(`YesLocker API server running at http://localhost:${port}`);
});