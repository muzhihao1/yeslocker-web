const { Pool } = require('pg');
require('dotenv').config();

// Hardcode production database URL for testing
const DATABASE_URL = 'postgresql://postgres:RvdKvUvBCyGYENbHJtZCWtqeJCfvdnJQ@postgres-xpqx.railway.internal:5432/railway';

console.log('Connecting to production database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Test connection
    const testQuery = await pool.query('SELECT NOW()');
    console.log('Connection successful:', testQuery.rows[0].now);
    console.log('');
    
    // Check users table structure
    const usersSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table columns:');
    console.log('--------------------');
    usersSchema.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });
    
    // Check if avatar_url column exists
    const hasAvatarUrl = usersSchema.rows.some(col => col.column_name === 'avatar_url');
    console.log(`\navatar_url column exists: ${hasAvatarUrl}`);
    
    // Check stores table
    const storesCount = await pool.query('SELECT COUNT(*) FROM stores');
    console.log(`\nStores in database: ${storesCount.rows[0].count}`);
    
    // List stores
    const stores = await pool.query('SELECT id, name FROM stores ORDER BY id');
    console.log('\nAvailable stores:');
    stores.rows.forEach(store => {
      console.log(`  ID: ${store.id}, Name: ${store.name}`);
    });
    
    // Check for existing users
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\nUsers in database: ${usersCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking schema:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkSchema();