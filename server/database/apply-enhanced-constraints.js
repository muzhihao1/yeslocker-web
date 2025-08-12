#!/usr/bin/env node

/**
 * Apply Enhanced Database Constraints and Validations
 * 
 * This script applies comprehensive foreign key constraints and data validations
 * to the YesLocker database schema. It supports both SQLite and PostgreSQL.
 * 
 * Usage:
 *   node apply-enhanced-constraints.js [--dry-run] [--force] [--db=sqlite|postgresql]
 */

const fs = require('fs').promises
const path = require('path')

// Database connection modules
let dbConnection = null
let dbType = null

/**
 * Configuration
 */
const config = {
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  dbType: process.argv.find(arg => arg.startsWith('--db='))?.split('=')[1] || null
}

/**
 * Logger utility
 */
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  debug: (message) => console.log(`[DEBUG] ${message}`)
}

/**
 * Detect database type from environment or configuration
 */
async function detectDatabaseType() {
  if (config.dbType) {
    return config.dbType
  }

  // Check environment variables
  const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL
  
  if (databaseUrl) {
    if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
      return 'postgresql'
    }
    if (databaseUrl.includes('.db') || databaseUrl.startsWith('sqlite:')) {
      return 'sqlite'
    }
  }

  // Check for SQLite database file
  const sqliteDbPath = path.join(__dirname, 'yeslocker.db')
  try {
    await fs.access(sqliteDbPath)
    return 'sqlite'
  } catch (err) {
    // SQLite file doesn't exist
  }

  // Default to SQLite for development
  logger.warn('Could not detect database type. Defaulting to SQLite.')
  return 'sqlite'
}

/**
 * Initialize database connection
 */
async function initializeDatabase(type) {
  dbType = type
  
  if (type === 'sqlite') {
    const sqlite3 = require('sqlite3').verbose()
    const dbPath = path.join(__dirname, 'yeslocker.db')
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`SQLite connection failed: ${err.message}`))
        } else {
          logger.info(`Connected to SQLite database: ${dbPath}`)
          // Enable foreign key constraints
          db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
              reject(new Error(`Failed to enable foreign keys: ${err.message}`))
            } else {
              resolve(db)
            }
          })
        }
      })
    })
  } else if (type === 'postgresql') {
    const { Pool } = require('pg')
    const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL
    
    if (!connectionString) {
      throw new Error('PostgreSQL connection string not found in environment variables')
    }

    const pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })

    try {
      const client = await pool.connect()
      logger.info('Connected to PostgreSQL database')
      return { pool, client }
    } catch (err) {
      throw new Error(`PostgreSQL connection failed: ${err.message}`)
    }
  } else {
    throw new Error(`Unsupported database type: ${type}`)
  }
}

/**
 * Execute SQL statements
 */
async function executeSql(sql, description = '') {
  if (config.dryRun) {
    logger.info(`[DRY RUN] Would execute: ${description || 'SQL statement'}`)
    return { success: true, rowsAffected: 0 }
  }

  try {
    if (dbType === 'sqlite') {
      return new Promise((resolve, reject) => {
        dbConnection.run(sql, function(err) {
          if (err) {
            if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
              logger.warn(`Constraint already exists: ${description}`)
              resolve({ success: true, rowsAffected: 0, skipped: true })
            } else {
              reject(new Error(`SQLite execution failed: ${err.message}`))
            }
          } else {
            resolve({ success: true, rowsAffected: this.changes })
          }
        })
      })
    } else if (dbType === 'postgresql') {
      const result = await dbConnection.client.query(sql)
      return { success: true, rowsAffected: result.rowCount }
    }
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      logger.warn(`Constraint already exists: ${description}`)
      return { success: true, rowsAffected: 0, skipped: true }
    }
    throw err
  }
}

/**
 * Parse SQL file into individual statements
 */
function parseSqlStatements(sql) {
  const statements = []
  let currentStatement = ''
  let inFunction = false
  let inTrigger = false
  let dollarQuoteTag = null
  let triggerDepth = 0
  
  const lines = sql.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip comments and empty lines
    if (trimmedLine.startsWith('--') || trimmedLine === '') {
      continue
    }
    
    // Check for PostgreSQL function dollar quoting
    if (trimmedLine.includes('$$')) {
      if (!inFunction) {
        const match = trimmedLine.match(/\$(\w*)\$/)
        if (match) {
          dollarQuoteTag = match[0]
          inFunction = true
        }
      } else if (trimmedLine.includes(dollarQuoteTag)) {
        inFunction = false
        dollarQuoteTag = null
      }
    }
    
    // Check for SQLite trigger blocks
    if (trimmedLine.toUpperCase().includes('CREATE TRIGGER')) {
      inTrigger = true
      triggerDepth = 0
    }
    
    if (inTrigger) {
      if (trimmedLine.toUpperCase() === 'BEGIN') {
        triggerDepth++
      } else if (trimmedLine.toUpperCase() === 'END;' || trimmedLine.toUpperCase() === 'END') {
        triggerDepth--
      }
    }
    
    currentStatement += line + '\n'
    
    // Check for statement end
    const shouldEndStatement = !inFunction && !inTrigger && trimmedLine.endsWith(';')
    const triggerEnded = inTrigger && triggerDepth <= 0 && (trimmedLine.toUpperCase() === 'END;' || trimmedLine.toUpperCase() === 'END')
    
    if (shouldEndStatement || triggerEnded) {
      statements.push(currentStatement.trim())
      currentStatement = ''
      
      if (triggerEnded) {
        inTrigger = false
        triggerDepth = 0
      }
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim())
  }
  
  return statements.filter(stmt => stmt.length > 0)
}

/**
 * Apply enhanced constraints
 */
async function applyEnhancedConstraints() {
  const constraintsFile = dbType === 'sqlite' 
    ? 'enhanced-constraints-sqlite-compat.sql'
    : 'enhanced-constraints-postgresql.sql'
    
  const constraintsPath = path.join(__dirname, constraintsFile)
  
  logger.info(`Applying enhanced constraints from: ${constraintsFile}`)
  
  try {
    const constraintsSql = await fs.readFile(constraintsPath, 'utf8')
    const statements = parseSqlStatements(constraintsSql)
    
    logger.info(`Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const statementPreview = statement.substring(0, 80).replace(/\s+/g, ' ') + '...'
      
      try {
        logger.debug(`Executing statement ${i + 1}/${statements.length}: ${statementPreview}`)
        
        const result = await executeSql(statement, `Statement ${i + 1}`)
        
        if (result.skipped) {
          skippedCount++
        } else {
          successCount++
          if (result.rowsAffected > 0) {
            logger.debug(`Statement ${i + 1} affected ${result.rowsAffected} rows`)
          }
        }
      } catch (err) {
        errorCount++
        logger.error(`Statement ${i + 1} failed: ${err.message}`)
        logger.debug(`Failed statement: ${statement}`)
        
        if (!config.force) {
          throw new Error(`Failed to apply constraints. Use --force to continue on errors.`)
        }
      }
    }
    
    // Summary
    logger.success(`Constraint application completed:`)
    logger.success(`  ✓ Successful: ${successCount}`)
    logger.success(`  ⚠ Skipped: ${skippedCount}`)
    
    if (errorCount > 0) {
      logger.warn(`  ✗ Failed: ${errorCount}`)
    }
    
    return { successCount, skippedCount, errorCount }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Constraints file not found: ${constraintsPath}`)
    }
    throw err
  }
}

/**
 * Validate database schema after applying constraints
 */
async function validateSchema() {
  logger.info('Validating database schema...')
  
  const validationQueries = {
    sqlite: [
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
      "PRAGMA foreign_key_check;",
      "SELECT COUNT(*) as user_count FROM users;",
      "SELECT COUNT(*) as store_count FROM stores;",
      "SELECT COUNT(*) as locker_count FROM lockers;"
    ],
    postgresql: [
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
      "SELECT COUNT(*) as user_count FROM users;",
      "SELECT COUNT(*) as store_count FROM stores;",
      "SELECT COUNT(*) as locker_count FROM lockers;",
      "SELECT * FROM database_health_report();" // Custom health function we created
    ]
  }
  
  const queries = validationQueries[dbType] || []
  
  for (const query of queries) {
    try {
      if (dbType === 'sqlite') {
        await new Promise((resolve, reject) => {
          dbConnection.all(query, (err, rows) => {
            if (err) {
              reject(err)
            } else {
              logger.debug(`Query result: ${JSON.stringify(rows)}`)
              resolve(rows)
            }
          })
        })
      } else {
        const result = await dbConnection.client.query(query)
        logger.debug(`Query result: ${JSON.stringify(result.rows)}`)
      }
    } catch (err) {
      logger.warn(`Validation query failed: ${query}`)
      logger.warn(`Error: ${err.message}`)
    }
  }
  
  logger.success('Schema validation completed')
}

/**
 * Clean up database connection
 */
async function cleanup() {
  if (dbConnection) {
    if (dbType === 'sqlite') {
      dbConnection.close((err) => {
        if (err) {
          logger.error(`Error closing SQLite connection: ${err.message}`)
        } else {
          logger.info('SQLite connection closed')
        }
      })
    } else if (dbType === 'postgresql') {
      dbConnection.client.release()
      await dbConnection.pool.end()
      logger.info('PostgreSQL connection closed')
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    logger.info('Starting enhanced constraints application...')
    
    if (config.dryRun) {
      logger.info('Running in DRY RUN mode - no changes will be made')
    }
    
    // Detect and connect to database
    const detectedDbType = await detectDatabaseType()
    logger.info(`Detected database type: ${detectedDbType}`)
    
    dbConnection = await initializeDatabase(detectedDbType)
    
    // Apply enhanced constraints
    const results = await applyEnhancedConstraints()
    
    // Validate schema if not dry run
    if (!config.dryRun) {
      await validateSchema()
    }
    
    logger.success('Enhanced constraints application completed successfully!')
    
    if (results.errorCount > 0) {
      process.exit(1)
    }
    
  } catch (err) {
    logger.error(`Application failed: ${err.message}`)
    process.exit(1)
  } finally {
    await cleanup()
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  logger.warn('Received SIGINT, cleaning up...')
  await cleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.warn('Received SIGTERM, cleaning up...')
  await cleanup()
  process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', async (err) => {
  logger.error(`Uncaught exception: ${err.message}`)
  await cleanup()
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`)
  await cleanup()
  process.exit(1)
})

// Run the application
if (require.main === module) {
  main()
}

module.exports = {
  main,
  detectDatabaseType,
  initializeDatabase,
  applyEnhancedConstraints,
  validateSchema
}