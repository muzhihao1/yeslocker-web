const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * YesLocker PostgreSQL Database Initializer
 * Initializes Railway PostgreSQL database with schema and seed data
 */
class PostgreSQLInitializer {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
  }

  async initialize() {
    try {
      console.log('🚀 Initializing YesLocker PostgreSQL Database');
      console.log('============================================');

      // Test connection
      const client = await this.pool.connect();
      const { rows } = await client.query('SELECT version()');
      console.log('✅ Database connection successful');
      console.log('📊 PostgreSQL version:', rows[0].version);
      client.release();

      // Check if tables exist
      const tablesExist = await this.checkTablesExist();
      
      if (tablesExist) {
        console.log('⚠️  Tables already exist');
        const userInput = await this.promptUser('Do you want to recreate the database? (y/N): ');
        if (userInput.toLowerCase() !== 'y' && userInput.toLowerCase() !== 'yes') {
          console.log('❌ Initialization cancelled');
          return;
        }
        
        console.log('🗑️  Dropping existing tables...');
        await this.dropTables();
      }

      // Run schema
      console.log('📋 Creating database schema...');
      await this.runSchema();
      console.log('✅ Schema created successfully');

      // Run seed data
      console.log('🌱 Importing seed data...');
      await this.runSeedData();
      console.log('✅ Seed data imported successfully');

      // Verify data
      console.log('🔍 Verifying database setup...');
      await this.verifySetup();

      console.log('');
      console.log('🎉 Database initialization completed successfully!');
      console.log('');
      console.log('📊 Summary:');
      console.log('   • Database: PostgreSQL');
      console.log('   • Schema: Created');
      console.log('   • Seed Data: Imported');
      console.log('   • Status: Ready for production');

    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      if (error.detail) {
        console.error('   Detail:', error.detail);
      }
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async checkTablesExist() {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `;
    const { rows } = await this.pool.query(query);
    return rows[0].exists;
  }

  async dropTables() {
    const dropQuery = `
      DROP TABLE IF EXISTS locker_records CASCADE;
      DROP TABLE IF EXISTS applications CASCADE;
      DROP TABLE IF EXISTS lockers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS admins CASCADE;
      DROP TABLE IF EXISTS stores CASCADE;
      DROP TABLE IF EXISTS reminders CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `;
    await this.pool.query(dropQuery);
  }

  async runSchema() {
    const schemaPath = path.join(__dirname, 'schema-postgresql.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await this.pool.query(schema);
  }

  async runSeedData() {
    const seedPath = path.join(__dirname, 'seed-postgresql.sql');
    const seedData = fs.readFileSync(seedPath, 'utf8');
    await this.pool.query(seedData);
  }

  async verifySetup() {
    // Check table counts
    const tables = ['stores', 'admins', 'users', 'lockers', 'applications', 'locker_records', 'reminders'];
    
    for (const table of tables) {
      const { rows } = await this.pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   • ${table}: ${rows[0].count} records`);
    }
  }

  async promptUser(question) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

// Run initialization if called directly
if (require.main === module) {
  const initializer = new PostgreSQLInitializer();
  initializer.initialize();
}

module.exports = PostgreSQLInitializer;