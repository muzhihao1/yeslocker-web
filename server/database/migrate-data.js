const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// 数据迁移脚本：从JSON文件迁移到PostgreSQL
class DataMigrator {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/yeslocker',
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
    this.jsonDataPath = path.join(__dirname, '..', 'data.json');
  }

  async loadJsonData() {
    try {
      const data = await fs.readFile(this.jsonDataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log('No existing JSON data file found, using default data');
      return null;
    }
  }

  async migrateStores(stores) {
    console.log('📦 迁移门店数据...');
    
    for (const [id, store] of stores) {
      try {
        const query = `
          INSERT INTO stores (id, name, address, contact)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            contact = EXCLUDED.contact
        `;
        await this.pool.query(query, [
          store.id,
          store.name,
          store.address || '',
          store.contact || ''
        ]);
        console.log(`  ✅ 门店 ${store.name} 迁移成功`);
      } catch (error) {
        console.error(`  ❌ 门店 ${store.name} 迁移失败:`, error.message);
      }
    }
  }

  async migrateUsers(users) {
    console.log('\n👥 迁移用户数据...');
    
    for (const [phone, user] of users) {
      try {
        // 跳过管理员账号，改为插入到admins表
        if (user.role === 'admin') {
          const adminQuery = `
            INSERT INTO admins (username, password, name, role, store_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (username) DO UPDATE SET
              name = EXCLUDED.name,
              role = EXCLUDED.role
          `;
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await this.pool.query(adminQuery, [
            user.phone,
            hashedPassword,
            user.name,
            'super_admin',
            user.store_id || null
          ]);
          console.log(`  ✅ 管理员 ${user.name} 迁移成功`);
          continue;
        }

        const query = `
          INSERT INTO users (phone, name, avatar_url, store_id, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (phone) DO UPDATE SET
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url,
            store_id = EXCLUDED.store_id
          RETURNING id
        `;
        const result = await this.pool.query(query, [
          user.phone,
          user.name,
          user.avatar_url || null,
          user.store_id,
          user.created_at || new Date().toISOString()
        ]);
        
        // 保存用户ID映射，用于后续迁移
        this.userIdMap = this.userIdMap || {};
        this.userIdMap[user.id] = result.rows[0].id;
        
        console.log(`  ✅ 用户 ${user.name} (${user.phone}) 迁移成功`);
      } catch (error) {
        console.error(`  ❌ 用户 ${user.name} 迁移失败:`, error.message);
      }
    }
  }

  async migrateLockers(lockers) {
    console.log('\n🗄️ 迁移杆柜数据...');
    
    for (const [id, locker] of lockers) {
      try {
        const query = `
          INSERT INTO lockers (store_id, number, status, user_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (store_id, number) DO UPDATE SET
            status = EXCLUDED.status,
            user_id = EXCLUDED.user_id
          RETURNING id
        `;
        
        // 如果有用户ID，使用映射后的新ID
        const userId = locker.user_id && this.userIdMap[locker.user_id] 
          ? this.userIdMap[locker.user_id] 
          : null;
        
        const result = await this.pool.query(query, [
          locker.store_id,
          locker.id || locker.number, // 使用原ID作为编号
          locker.status || 'available',
          userId
        ]);
        
        // 保存杆柜ID映射
        this.lockerIdMap = this.lockerIdMap || {};
        this.lockerIdMap[id] = result.rows[0].id;
        
        console.log(`  ✅ 杆柜 ${locker.id} 迁移成功`);
      } catch (error) {
        console.error(`  ❌ 杆柜 ${locker.id} 迁移失败:`, error.message);
      }
    }
  }

  async migrateApplications(applications) {
    console.log('\n📋 迁移申请数据...');
    
    for (const [id, app] of applications) {
      try {
        // 获取用户ID
        let userId = app.user_id;
        if (app.user_phone) {
          const userResult = await this.pool.query(
            'SELECT id FROM users WHERE phone = $1',
            [app.user_phone]
          );
          if (userResult.rows[0]) {
            userId = userResult.rows[0].id;
          }
        } else if (this.userIdMap[app.user_id]) {
          userId = this.userIdMap[app.user_id];
        }

        // 获取杆柜ID
        const lockerId = app.locker_id && this.lockerIdMap[app.locker_id]
          ? this.lockerIdMap[app.locker_id]
          : null;

        const query = `
          INSERT INTO applications (
            user_id, store_id, locker_id, reason, status,
            created_at, approved_at, approved_by, rejected_at, 
            rejected_by, reject_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT DO NOTHING
        `;
        
        await this.pool.query(query, [
          userId,
          app.store_id,
          lockerId,
          app.reason || '',
          app.status || 'pending',
          app.created_at || new Date().toISOString(),
          app.approved_at || null,
          app.approved_by || null,
          app.rejected_at || null,
          app.rejected_by || null,
          app.reject_reason || null
        ]);
        
        console.log(`  ✅ 申请 ${id} 迁移成功`);
      } catch (error) {
        console.error(`  ❌ 申请 ${id} 迁移失败:`, error.message);
      }
    }
  }

  async migrateLockerRecords(records) {
    console.log('\n📝 迁移操作记录...');
    
    for (const record of records) {
      try {
        // 获取用户ID和杆柜ID
        const userId = this.userIdMap[record.user_id] || record.user_id;
        const lockerId = this.lockerIdMap[record.locker_id] || record.locker_id;

        const query = `
          INSERT INTO locker_records (
            user_id, locker_id, store_id, operation, 
            remark, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `;
        
        await this.pool.query(query, [
          userId,
          lockerId,
          record.store_id,
          record.operation || 'open',
          record.remark || '',
          record.created_at || new Date().toISOString()
        ]);
        
        console.log(`  ✅ 操作记录迁移成功`);
      } catch (error) {
        console.error(`  ❌ 操作记录迁移失败:`, error.message);
      }
    }
  }

  async migrate() {
    console.log('🚀 开始数据迁移...\n');

    try {
      // 加载JSON数据
      const jsonData = await this.loadJsonData();
      
      if (!jsonData) {
        console.log('没有找到需要迁移的JSON数据，将使用种子数据初始化');
        
        // 执行种子数据
        const seedPath = path.join(__dirname, 'seed.sql');
        const seedSql = await fs.readFile(seedPath, 'utf8');
        await this.pool.query(seedSql);
        console.log('✅ 种子数据导入成功');
        return;
      }

      // 转换Map对象
      const stores = jsonData.stores ? new Map(Object.entries(jsonData.stores)) : new Map();
      const users = jsonData.users ? new Map(Object.entries(jsonData.users)) : new Map();
      const applications = jsonData.applications ? new Map(Object.entries(jsonData.applications)) : new Map();
      const lockers = jsonData.lockers ? new Map(Object.entries(jsonData.lockers)) : new Map();
      const lockerRecords = jsonData.lockerRecords || [];

      // 按顺序迁移数据
      await this.migrateStores(stores);
      await this.migrateUsers(users);
      await this.migrateLockers(lockers);
      await this.migrateApplications(applications);
      await this.migrateLockerRecords(lockerRecords);

      console.log('\n✅ 数据迁移完成！');
      
    } catch (error) {
      console.error('\n❌ 数据迁移失败:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// 执行迁移
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.migrate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = DataMigrator;