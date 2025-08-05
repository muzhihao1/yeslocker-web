const fs = require('fs').promises;
const path = require('path');

class DataStore {
  constructor() {
    this.dataFile = path.join(__dirname, 'data.json');
    this.data = {
      users: new Map(),
      applications: new Map(),
      lockers: new Map(),
      lockerRecords: [],
      stores: new Map([
        ['1', { id: '1', name: '旗舰店', address: '北京市朝阳区望京街道' }],
        ['2', { id: '2', name: '分店A', address: '北京市海淀区中关村' }],
        ['3', { id: '3', name: '分店B', address: '北京市东城区王府井' }]
      ])
    };
    
    // 初始化默认用户和申请
    this.initializeDefaultData();
    
    // 尝试加载持久化数据
    this.loadData();
    
    // 每30秒自动保存一次
    setInterval(() => {
      this.saveData().catch(console.error);
    }, 30000);
  }

  initializeDefaultData() {
    // 默认管理员
    this.data.users.set('13800000001', {
      id: 'admin_1',
      phone: '13800000001',
      name: '超级管理员',
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString()
    });

    // 测试用户
    const testUsers = [
      { phone: '13800000003', name: '张三', id: 'user_1' },
      { phone: '13800000004', name: '李四', id: 'user_2' },
      { phone: '13800000005', name: '王五', id: 'user_3' },
      { phone: '13800000006', name: '赵六', id: 'user_4' },
      { phone: '13800000007', name: '孙七', id: 'user_5' }
    ];

    testUsers.forEach(user => {
      this.data.users.set(user.phone, {
        ...user,
        status: 'active',
        store_id: '1',
        created_at: new Date().toISOString()
      });
    });

    // 测试申请
    const testApplications = [
      {
        id: 'app_1',
        user_id: 'user_1',
        user_phone: '13800000003',
        store_id: '1',
        locker_id: '',
        status: 'pending',
        reason: '申请存放台球杆',
        created_at: new Date('2025-01-03T10:00:00Z').toISOString()
      },
      {
        id: 'app_2',
        user_id: 'user_2',
        user_phone: '13800000004',
        store_id: '1',
        locker_id: 'A-001',
        status: 'approved',
        reason: '申请存放台球杆',
        created_at: new Date('2025-01-02T14:30:00Z').toISOString(),
        approved_at: new Date('2025-01-02T15:00:00Z').toISOString(),
        approved_by: 'admin_1'
      },
      {
        id: 'app_3',
        user_id: 'user_3',
        user_phone: '13800000005',
        store_id: '2',
        locker_id: '',
        status: 'rejected',
        reason: '申请存放台球杆',
        created_at: new Date('2025-01-01T09:00:00Z').toISOString(),
        rejected_at: new Date('2025-01-01T10:00:00Z').toISOString(),
        rejected_by: 'admin_1',
        reject_reason: '资料不完整'
      },
      {
        id: 'app_4',
        user_id: 'user_4',
        user_phone: '13800000006',
        store_id: '1',
        locker_id: '',
        status: 'pending',
        reason: '会员存杆申请',
        created_at: new Date('2025-01-05T00:00:00Z').toISOString()
      },
      {
        id: 'app_5',
        user_id: 'user_5',
        user_phone: '13800000007',
        store_id: '2',
        locker_id: 'B-005',
        status: 'approved',
        reason: '申请存放私人球杆',
        created_at: new Date('2024-12-30T11:00:00Z').toISOString(),
        approved_at: new Date('2024-12-30T12:00:00Z').toISOString(),
        approved_by: 'admin_1'
      }
    ];

    testApplications.forEach(app => {
      this.data.applications.set(app.id, app);
    });

    // 初始化杆柜数据
    const lockers = [
      { id: '1', store_id: '1', number: 'A01', status: 'available' },
      { id: '2', store_id: '1', number: 'A02', status: 'occupied', user_id: 'user_2' },
      { id: '3', store_id: '1', number: 'A03', status: 'available' },
      { id: '4', store_id: '1', number: 'A04', status: 'available' },
      { id: '5', store_id: '1', number: 'B01', status: 'available' },
      { id: '6', store_id: '1', number: 'B02', status: 'occupied' },
      { id: '7', store_id: '1', number: 'B03', status: 'available' },
      { id: '8', store_id: '1', number: 'B04', status: 'occupied' }
    ];

    lockers.forEach(locker => {
      this.data.lockers.set(locker.id, locker);
    });
  }

  async loadData() {
    try {
      const fileContent = await fs.readFile(this.dataFile, 'utf8');
      const savedData = JSON.parse(fileContent);
      
      // 转换数组回Map
      if (savedData.users) {
        this.data.users = new Map(savedData.users);
      }
      if (savedData.applications) {
        this.data.applications = new Map(savedData.applications);
      }
      if (savedData.lockers) {
        this.data.lockers = new Map(savedData.lockers);
      }
      if (savedData.lockerRecords) {
        this.data.lockerRecords = savedData.lockerRecords;
      }
      
      console.log('Data loaded from file successfully');
    } catch (error) {
      console.log('No existing data file found, using default data');
    }
  }

  async saveData() {
    try {
      const dataToSave = {
        users: Array.from(this.data.users.entries()),
        applications: Array.from(this.data.applications.entries()),
        lockers: Array.from(this.data.lockers.entries()),
        lockerRecords: this.data.lockerRecords,
        lastSaved: new Date().toISOString()
      };
      
      await fs.writeFile(this.dataFile, JSON.stringify(dataToSave, null, 2));
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // 用户相关方法
  getUser(phone) {
    return this.data.users.get(phone);
  }

  createUser(userData) {
    this.data.users.set(userData.phone, userData);
    return userData;
  }

  // 申请相关方法
  getApplications(filters = {}) {
    let applications = Array.from(this.data.applications.values());
    
    if (filters.status) {
      applications = applications.filter(app => app.status === filters.status);
    }
    
    if (filters.store_id) {
      applications = applications.filter(app => app.store_id === filters.store_id);
    }
    
    // 按创建时间倒序排序
    applications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return applications;
  }

  createApplication(appData) {
    const id = 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const application = {
      id,
      ...appData,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    this.data.applications.set(id, application);
    return application;
  }

  updateApplication(id, updates) {
    const app = this.data.applications.get(id);
    if (!app) return null;
    
    const updatedApp = { ...app, ...updates };
    this.data.applications.set(id, updatedApp);
    return updatedApp;
  }

  getApplication(id) {
    return this.data.applications.get(id);
  }

  // 杆柜相关方法
  getLockersByStore(storeId) {
    return Array.from(this.data.lockers.values())
      .filter(locker => locker.store_id === storeId);
  }

  updateLocker(id, updates) {
    const locker = this.data.lockers.get(id);
    if (!locker) return null;
    
    const updatedLocker = { ...locker, ...updates };
    this.data.lockers.set(id, updatedLocker);
    return updatedLocker;
  }

  // 门店相关方法
  getStores() {
    return Array.from(this.data.stores.values());
  }

  getStore(id) {
    return this.data.stores.get(id);
  }

  // 操作记录
  addLockerRecord(record) {
    this.data.lockerRecords.push({
      ...record,
      created_at: new Date().toISOString()
    });
  }

  // 获取统计数据
  getStatistics() {
    const applications = Array.from(this.data.applications.values());
    const users = Array.from(this.data.users.values());
    const lockers = Array.from(this.data.lockers.values());
    
    return {
      pendingApplications: applications.filter(a => a.status === 'pending').length,
      occupiedLockers: lockers.filter(l => l.status === 'occupied').length,
      activeUsers: users.filter(u => u.status === 'active' && u.role !== 'admin').length,
      todayOperations: this.data.lockerRecords.filter(r => {
        const today = new Date().toDateString();
        return new Date(r.created_at).toDateString() === today;
      }).length
    };
  }
}

// 创建单例实例
const dataStore = new DataStore();

module.exports = dataStore;