const { Pool } = require('pg');
const bcrypt = require('bcrypt');

class PostgresDataStore {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
  }

  // User operations
  async getUser(phone) {
    try {
      const query = 'SELECT * FROM users WHERE phone = $1';
      const result = await this.pool.query(query, [phone]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const { phone, name, avatar_url, store_id } = userData;
      const query = `
        INSERT INTO users (phone, name, avatar_url, store_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const result = await this.pool.query(query, [phone, name, avatar_url, store_id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Admin operations
  async getAdmin(username) {
    try {
      const query = 'SELECT * FROM admins WHERE username = $1';
      const result = await this.pool.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting admin:', error);
      throw error;
    }
  }

  async validateAdminPassword(admin, password) {
    try {
      return await bcrypt.compare(password, admin.password);
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  }

  // Store operations
  async getStore(storeId) {
    try {
      const query = 'SELECT * FROM stores WHERE id = $1';
      const result = await this.pool.query(query, [storeId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting store:', error);
      throw error;
    }
  }

  async getStores() {
    try {
      const query = 'SELECT * FROM stores ORDER BY name';
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting stores:', error);
      throw error;
    }
  }

  // Locker operations
  async getLockersByStore(storeId) {
    try {
      const query = 'SELECT * FROM lockers WHERE store_id = $1 ORDER BY number';
      const result = await this.pool.query(query, [storeId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting lockers:', error);
      throw error;
    }
  }

  async updateLocker(lockerId, updates) {
    try {
      const { status, user_id } = updates;
      const query = `
        UPDATE lockers 
        SET status = $2, user_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [lockerId, status, user_id || null]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating locker:', error);
      throw error;
    }
  }

  // Application operations
  async createApplication(appData) {
    try {
      const { user_id, user_phone, store_id, locker_id, reason } = appData;
      const query = `
        INSERT INTO applications (user_id, store_id, locker_id, reason, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
      `;
      
      // Get user ID from phone if not provided
      let userId = user_id;
      if (!userId && user_phone) {
        const user = await this.getUser(user_phone);
        userId = user?.id;
      }
      
      const result = await this.pool.query(query, [userId, store_id, locker_id, reason || '']);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  async getApplication(applicationId) {
    try {
      const query = 'SELECT * FROM applications WHERE id = $1';
      const result = await this.pool.query(query, [applicationId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting application:', error);
      throw error;
    }
  }

  async getApplications(filters = {}) {
    try {
      let query = `
        SELECT a.*, u.phone as user_phone, u.name as user_name, u.avatar_url,
               s.name as store_name, l.number as locker_number
        FROM applications a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN stores s ON a.store_id = s.id
        LEFT JOIN lockers l ON a.locker_id = l.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        query += ` AND a.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.store_id) {
        paramCount++;
        query += ` AND a.store_id = $${paramCount}`;
        params.push(filters.store_id);
      }

      query += ' ORDER BY a.created_at DESC';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting applications:', error);
      throw error;
    }
  }

  async updateApplication(applicationId, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 0;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
      });

      paramCount++;
      values.push(applicationId);

      const query = `
        UPDATE applications 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating application:', error);
      throw error;
    }
  }

  // Statistics
  async getStatistics() {
    try {
      const [pendingApps, occupiedLockers, activeUsers, todayOps] = await Promise.all([
        this.pool.query("SELECT COUNT(*) FROM applications WHERE status = 'pending'"),
        this.pool.query("SELECT COUNT(*) FROM lockers WHERE status = 'occupied'"),
        this.pool.query("SELECT COUNT(*) FROM users"),
        this.pool.query(`
          SELECT COUNT(*) FROM locker_records 
          WHERE DATE(created_at) = CURRENT_DATE
        `)
      ]);

      return {
        pendingApplications: parseInt(pendingApps.rows[0].count),
        occupiedLockers: parseInt(occupiedLockers.rows[0].count),
        activeUsers: parseInt(activeUsers.rows[0].count),
        todayOperations: parseInt(todayOps.rows[0].count)
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  // Locker records
  async createLockerRecord(recordData) {
    try {
      const { user_id, locker_id, store_id, operation, remark } = recordData;
      const query = `
        INSERT INTO locker_records (user_id, locker_id, store_id, operation, remark)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await this.pool.query(query, [user_id, locker_id, store_id, operation, remark]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating locker record:', error);
      throw error;
    }
  }

  async getUserLockerRecords(userId) {
    try {
      const query = `
        SELECT lr.*, l.number as locker_number, s.name as store_name
        FROM locker_records lr
        JOIN lockers l ON lr.locker_id = l.id
        JOIN stores s ON lr.store_id = s.id
        WHERE lr.user_id = $1
        ORDER BY lr.created_at DESC
      `;
      const result = await this.pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user locker records:', error);
      throw error;
    }
  }

  // User locker info
  async getUserLocker(userId) {
    try {
      const query = `
        SELECT l.*, s.name as store_name, s.address as store_address
        FROM lockers l
        JOIN stores s ON l.store_id = s.id
        WHERE l.user_id = $1 AND l.status = 'occupied'
        LIMIT 1
      `;
      const result = await this.pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user locker:', error);
      throw error;
    }
  }

  // Initialize database schema
  async initializeDatabase() {
    try {
      const schemaPath = require('path').join(__dirname, 'schema.sql');
      const schema = require('fs').readFileSync(schemaPath, 'utf8');
      await this.pool.query(schema);
      console.log('✅ 数据库表结构初始化成功');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Seed initial data
  async seedDatabase() {
    try {
      const seedPath = require('path').join(__dirname, 'seed.sql');
      const seed = require('fs').readFileSync(seedPath, 'utf8');
      await this.pool.query(seed);
      console.log('✅ 初始数据导入成功');
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  // Close connection pool
  async close() {
    await this.pool.end();
  }
}

module.exports = new PostgresDataStore();