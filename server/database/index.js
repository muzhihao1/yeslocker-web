const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL Connection Pool Configuration
 * Optimized for production scalability and performance
 */
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX) || 20,           // Maximum number of clients
  min: parseInt(process.env.DB_POOL_MIN) || 2,            // Minimum number of clients
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,  // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,  // 5 seconds
  
  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,  // 30 seconds
  
  // SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Application name for monitoring
  application_name: 'yeslocker-api',
  
  // Statement timeout (prevent long-running queries)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 60000  // 60 seconds
};

// Create connection pool
const pool = new Pool(poolConfig);

// Enhanced connection monitoring
pool.on('connect', (client) => {
  console.log(`📊 Database client connected. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('acquire', (client) => {
  console.log(`🔒 Client acquired from pool. Active connections: ${pool.totalCount - pool.idleCount}`);
});

pool.on('remove', (client) => {
  console.log(`🗑️  Client removed from pool. Total: ${pool.totalCount}`);
});

pool.on('error', (err, client) => {
  console.error('💥 Unexpected error on idle client:', err);
  
  // Graceful degradation - don't exit immediately in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Pool status monitoring function
const getPoolStatus = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    active: pool.totalCount - pool.idleCount
  };
};

/**
 * Execute a query with automatic connection management
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries for performance monitoring
    if (duration > 1000) {
      console.warn(`🐌 Slow query detected (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('💥 Database query error:', {
      error: error.message,
      query: text.substring(0, 100),
      params: params ? params.slice(0, 5) : undefined
    });
    throw error;
  }
};

/**
 * Execute a transaction with automatic rollback on error
 * @param {Function} callback - Transaction callback function
 * @returns {Promise} Transaction result
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Health check function for monitoring
 * @returns {Promise<Object>} Health status
 */
const healthCheck = async () => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
      pool: getPoolStatus(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      pool: getPoolStatus(),
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Graceful shutdown function
 * @returns {Promise} Shutdown completion
 */
const shutdown = async () => {
  console.log('🛑 Gracefully shutting down database connections...');
  
  try {
    await pool.end();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
  }
};

// Handle process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Log pool configuration on startup
console.log('🗄️  PostgreSQL connection pool initialized:', {
  max: poolConfig.max,
  min: poolConfig.min,
  idleTimeout: poolConfig.idleTimeoutMillis,
  connectionTimeout: poolConfig.connectionTimeoutMillis,
  environment: process.env.NODE_ENV
});

module.exports = {
  query,
  transaction,
  healthCheck,
  getPoolStatus,
  shutdown,
  pool
};