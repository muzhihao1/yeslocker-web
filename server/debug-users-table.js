const { Pool } = require('pg');

// Production database URL
const DATABASE_URL = 'postgresql://postgres:RvdKvUvBCyGYENbHJtZCWtqeJCfvdnJQ@postgres-xpqx.railway.internal:5432/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugUsersTable() {
  try {
    console.log('=== USERS TABLE STRUCTURE ===\n');
    
    // Get all columns and their properties
    const columnsQuery = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in users table:');
    columnsQuery.rows.forEach(col => {
      console.log(`  ${col.column_name}:`);
      console.log(`    Type: ${col.data_type}`);
      console.log(`    Nullable: ${col.is_nullable}`);
      console.log(`    Default: ${col.column_default || 'none'}`);
      if (col.character_maximum_length) {
        console.log(`    Max Length: ${col.character_maximum_length}`);
      }
      console.log('');
    });
    
    // Check constraints
    const constraintsQuery = await pool.query(`
      SELECT 
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_namespace nsp ON nsp.oid = con.connamespace
      JOIN pg_class cls ON cls.oid = con.conrelid
      WHERE cls.relname = 'users'
      AND nsp.nspname = 'public';
    `);
    
    console.log('\n=== CONSTRAINTS ===');
    constraintsQuery.rows.forEach(con => {
      console.log(`  ${con.constraint_name} (${con.constraint_type}):`);
      console.log(`    ${con.definition}`);
      console.log('');
    });
    
    // Get sample user data
    const sampleQuery = await pool.query(`
      SELECT * FROM users LIMIT 2;
    `);
    
    console.log('\n=== SAMPLE USER RECORDS ===');
    console.log(JSON.stringify(sampleQuery.rows, null, 2));
    
    // Test what happens with a direct insert
    console.log('\n=== TESTING DIRECT INSERT ===');
    try {
      const testInsert = await pool.query(`
        INSERT INTO users (phone, name, avatar_url, store_id, status)
        VALUES ('99999999999', 'Test User', NULL, '00000000-0000-0000-0000-000000000001', 'active')
        RETURNING *;
      `);
      console.log('Insert successful!');
      console.log(JSON.stringify(testInsert.rows[0], null, 2));
      
      // Clean up test data
      await pool.query(`DELETE FROM users WHERE phone = '99999999999'`);
      console.log('Test user deleted');
    } catch (insertError) {
      console.error('Insert failed with error:');
      console.error('  Code:', insertError.code);
      console.error('  Message:', insertError.message);
      console.error('  Detail:', insertError.detail);
      console.error('  Hint:', insertError.hint);
      console.error('  Table:', insertError.table);
      console.error('  Column:', insertError.column);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugUsersTable();