const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Universal Database Utility Layer
 * Supports both SQLite (development) and PostgreSQL (production)
 * with connection pooling and performance optimizations
 */

let dbInstance = null;

/**
 * Initialize and get database instance
 * @returns {Object} Database instance with query methods
 */
function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  const isPostgreSQL = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://');
  
  if (isPostgreSQL) {
    // PostgreSQL with connection pooling
    const pgDb = require('./index');
    dbInstance = {
      type: 'postgresql',
      query: pgDb.query,
      transaction: pgDb.transaction,
      healthCheck: pgDb.healthCheck,
      getPoolStatus: pgDb.getPoolStatus,
      shutdown: pgDb.shutdown,
      pool: pgDb.pool
    };
    
    console.log('🗄️  Using PostgreSQL database with connection pooling');
  } else {
    // SQLite for development
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'yeslocker.db');
    const db = new sqlite3.Database(dbPath);
    
    // Enable WAL mode for better performance
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA synchronous=NORMAL');
    db.run('PRAGMA cache_size=10000');
    db.run('PRAGMA temp_store=MEMORY');
    
    dbInstance = {
      type: 'sqlite',
      db,
      
      /**
       * Execute query with Promise interface
       * @param {string} sql - SQL query
       * @param {Array} params - Query parameters
       * @returns {Promise} Query result
       */
      query: (sql, params = []) => {
        return new Promise((resolve, reject) => {
          const start = Date.now();
          
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sql, params, (err, rows) => {
              const duration = Date.now() - start;
              
              if (duration > 1000) {
                console.warn(`🐌 Slow SQLite query (${duration}ms):`, sql.substring(0, 100));
              }
              
              if (err) {
                console.error('💥 SQLite query error:', {
                  error: err.message,
                  query: sql.substring(0, 100),
                  params: params ? params.slice(0, 5) : undefined
                });
                reject(err);
              } else {
                resolve({ rows, rowCount: rows.length });
              }
            });
          } else {
            db.run(sql, params, function(err) {
              const duration = Date.now() - start;
              
              if (duration > 1000) {
                console.warn(`🐌 Slow SQLite query (${duration}ms):`, sql.substring(0, 100));
              }
              
              if (err) {
                console.error('💥 SQLite query error:', {
                  error: err.message,
                  query: sql.substring(0, 100),
                  params: params ? params.slice(0, 5) : undefined
                });
                reject(err);
              } else {
                resolve({ 
                  rowCount: this.changes,
                  insertId: this.lastID,
                  rows: []
                });
              }
            });
          }
        });
      },
      
      /**
       * Execute transaction with automatic rollback
       * @param {Function} callback - Transaction callback
       * @returns {Promise} Transaction result
       */
      transaction: async (callback) => {
        return new Promise(async (resolve, reject) => {
          db.serialize(async () => {
            try {
              await new Promise((res, rej) => {
                db.run('BEGIN TRANSACTION', (err) => {
                  if (err) rej(err);
                  else res();
                });
              });
              
              const result = await callback({
                query: (sql, params) => dbInstance.query(sql, params)
              });
              
              await new Promise((res, rej) => {
                db.run('COMMIT', (err) => {
                  if (err) rej(err);
                  else res();
                });
              });
              
              resolve(result);
            } catch (error) {
              await new Promise((res) => {
                db.run('ROLLBACK', () => res());
              });
              reject(error);
            }
          });
        });
      },
      
      /**
       * Health check for SQLite
       * @returns {Promise<Object>} Health status
       */
      healthCheck: async () => {
        try {
          const start = Date.now();
          await dbInstance.query('SELECT 1');
          const responseTime = Date.now() - start;
          
          return {
            status: 'healthy',
            responseTime,
            database: 'sqlite',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            error: error.message,
            database: 'sqlite',
            timestamp: new Date().toISOString()
          };
        }
      },
      
      /**
       * Get database status (SQLite doesn't have connection pools)
       * @returns {Object} Status info
       */
      getPoolStatus: () => {
        return {
          type: 'sqlite',
          status: 'single_connection',
          file: dbPath
        };
      },
      
      /**
       * Close database connection
       * @returns {Promise} Shutdown completion
       */
      shutdown: () => {
        return new Promise((resolve) => {
          console.log('🛑 Closing SQLite database...');
          db.close((err) => {
            if (err) {
              console.error('❌ Error closing SQLite database:', err);
            } else {
              console.log('✅ SQLite database closed successfully');
            }
            resolve();
          });
        });
      }
    };
    
    console.log('🗄️  Using SQLite database for development');
  }
  
  return dbInstance;
}

/**
 * Common database utility functions
 */
const DatabaseUtils = {
  /**
   * Get database instance
   */
  getInstance: getDatabase,
  
  /**
   * Execute paginated query
   * @param {string} baseQuery - Base SQL query without LIMIT/OFFSET
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async paginatedQuery(baseQuery, options = {}) {
    const { page = 1, pageSize = 20, params = [] } = options;
    const offset = (page - 1) * pageSize;
    
    const db = getDatabase();
    
    let paginatedQuery;
    if (db.type === 'postgresql') {
      paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    } else {
      paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
    }
    
    const paginatedParams = [...params, pageSize, offset];
    
    try {
      const result = await db.query(paginatedQuery, paginatedParams);
      
      return {
        data: result.rows,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: result.rows.length,
          hasMore: result.rows.length === pageSize
        }
      };
    } catch (error) {
      console.error('💥 Paginated query error:', error);
      throw error;
    }
  },
  
  /**
   * Execute bulk insert with batching
   * @param {string} table - Table name
   * @param {Array} records - Array of records to insert
   * @param {Array} columns - Column names
   * @returns {Promise} Insert result
   */
  async bulkInsert(table, records, columns) {
    if (!records || records.length === 0) {
      return { rowCount: 0 };
    }
    
    const db = getDatabase();
    const batchSize = 1000; // Process in batches of 1000
    let totalInserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      if (db.type === 'postgresql') {
        // PostgreSQL bulk insert
        const placeholders = batch.map((_, batchIndex) => 
          `(${columns.map((_, colIndex) => `$${batchIndex * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');
        
        const values = batch.flat();
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
        
        const result = await db.query(query, values);
        totalInserted += result.rowCount;
      } else {
        // SQLite bulk insert
        const placeholders = columns.map(() => '?').join(', ');
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        
        await db.transaction(async (client) => {
          for (const record of batch) {
            await client.query(query, record);
            totalInserted++;
          }
        });
      }
    }
    
    return { rowCount: totalInserted };
  },
  
  /**
   * Get database health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const db = getDatabase();
    const health = await db.healthCheck();
    
    if (db.type === 'postgresql') {
      health.pool = db.getPoolStatus();
    }
    
    return health;
  },
  
  /**
   * Gracefully shutdown database connections
   * @returns {Promise} Shutdown completion
   */
  async shutdown() {
    if (dbInstance) {
      await dbInstance.shutdown();
      dbInstance = null;
    }
  }
};

// Handle process termination
process.on('SIGINT', DatabaseUtils.shutdown);
process.on('SIGTERM', DatabaseUtils.shutdown);

module.exports = DatabaseUtils;