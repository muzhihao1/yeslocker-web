const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Apply performance indexes to the database
 * Supports both SQLite and PostgreSQL
 */
async function applyPerformanceIndexes() {
  const isPostgreSQL = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://');
  
  console.log(`🔧 Applying performance indexes for ${isPostgreSQL ? 'PostgreSQL' : 'SQLite'}...`);
  
  try {
    if (isPostgreSQL) {
      // PostgreSQL setup
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      const indexSql = fs.readFileSync(
        path.join(__dirname, 'performance-indexes-postgresql.sql'), 
        'utf8'
      );
      
      // Split and execute each statement
      const statements = indexSql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            console.log(`Executing: ${statement.substring(0, 60)}...`);
            await pool.query(statement);
            console.log('✅ Success');
          } catch (error) {
            console.warn(`⚠️  Warning: ${error.message}`);
          }
        }
      }
      
      await pool.end();
      
    } else {
      // SQLite setup
      const sqlite3 = require('sqlite3').verbose();
      const dbPath = path.join(__dirname, 'yeslocker.db');
      
      const db = new sqlite3.Database(dbPath);
      
      const indexSql = fs.readFileSync(
        path.join(__dirname, 'performance-indexes-sqlite.sql'), 
        'utf8'
      );
      
      // Split and execute each statement
      const statements = indexSql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await new Promise((resolve, reject) => {
            console.log(`Executing: ${statement.substring(0, 60)}...`);
            db.run(statement, function(error) {
              if (error) {
                console.warn(`⚠️  Warning: ${error.message}`);
              } else {
                console.log('✅ Success');
              }
              resolve();
            });
          });
        }
      }
      
      db.close();
    }
    
    console.log('🎉 Performance indexes applied successfully!');
    
    // Analyze table statistics for query optimization
    console.log('📊 Analyzing table statistics...');
    await analyzeTableStats(isPostgreSQL);
    
  } catch (error) {
    console.error('❌ Error applying performance indexes:', error);
    process.exit(1);
  }
}

/**
 * Analyze table statistics for better query planning
 */
async function analyzeTableStats(isPostgreSQL) {
  try {
    if (isPostgreSQL) {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      const tables = ['users', 'stores', 'lockers', 'applications', 'locker_records', 'admins'];
      
      for (const table of tables) {
        console.log(`Analyzing ${table}...`);
        await pool.query(`ANALYZE ${table}`);
      }
      
      await pool.end();
      
    } else {
      const sqlite3 = require('sqlite3').verbose();
      const dbPath = path.join(__dirname, 'yeslocker.db');
      const db = new sqlite3.Database(dbPath);
      
      await new Promise((resolve, reject) => {
        console.log('Running SQLite ANALYZE...');
        db.run('ANALYZE', (error) => {
          if (error) {
            console.warn(`⚠️  Warning during ANALYZE: ${error.message}`);
          } else {
            console.log('✅ Table statistics updated');
          }
          resolve();
        });
      });
      
      db.close();
    }
    
    console.log('📊 Table statistics analysis completed');
    
  } catch (error) {
    console.warn('⚠️  Warning during statistics analysis:', error.message);
  }
}

// Run the script
if (require.main === module) {
  applyPerformanceIndexes();
}

module.exports = { applyPerformanceIndexes };