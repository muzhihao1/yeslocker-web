/**
 * Database Connection - 数据库连接抽象类
 * Manages database connections for both SQLite and PostgreSQL
 */

import knex, { Knex } from 'knex';
import { Model } from 'objection';

export class DatabaseConnection {
  private static instance: Knex | null = null;
  private static isInitialized = false;

  /**
   * Initialize database connection
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized && this.instance) {
      console.log('📋 Database already initialized');
      return;
    }

    try {
      const config = this.getKnexConfig();
      this.instance = knex(config);

      // Set up Objection.js
      Model.knex(this.instance);

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      
      const dbType = process.env.DATABASE_URL?.includes('postgresql') ? 'PostgreSQL' : 'SQLite';
      console.log(`✅ Database connection established successfully (${dbType})`);
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get Knex configuration based on environment
   */
  private static getKnexConfig(): Knex.Config {
    const isProduction = process.env.NODE_ENV === 'production';
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl && databaseUrl.includes('postgresql')) {
      // PostgreSQL configuration (production)
      return {
        client: 'pg',
        connection: {
          connectionString: databaseUrl,
          ssl: isProduction ? { rejectUnauthorized: false } : false
        },
        pool: {
          min: 2,
          max: 10,
          createTimeoutMillis: 30000,
          acquireTimeoutMillis: 60000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
          propagateCreateError: false
        },
        migrations: {
          directory: './database/migrations',
          tableName: 'knex_migrations'
        },
        seeds: {
          directory: './database/seeds'
        },
        debug: !isProduction
      };
    } else {
      // SQLite configuration (development)
      const dbPath = databaseUrl || './database/database.sqlite';
      
      return {
        client: 'sqlite3',
        connection: {
          filename: dbPath
        },
        useNullAsDefault: true,
        pool: {
          min: 1,
          max: 1,
          afterCreate: (conn: any, done: Function) => {
            // Enable foreign key constraints in SQLite
            conn.run('PRAGMA foreign_keys = ON', done);
          }
        },
        migrations: {
          directory: './database/migrations',
          tableName: 'knex_migrations'
        },
        seeds: {
          directory: './database/seeds'
        },
        debug: !isProduction
      };
    }
  }

  /**
   * Test database connection
   */
  private static async testConnection(): Promise<void> {
    if (!this.instance) {
      throw new Error('Database instance not initialized');
    }

    try {
      await this.instance.raw('SELECT 1 as test');
      console.log('🔍 Database connection test passed');
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  public static getInstance(): Knex {
    if (!this.instance) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  /**
   * Check if database is connected
   */
  public static isConnected(): boolean {
    return this.isInitialized && this.instance !== null;
  }

  /**
   * Get database type
   */
  public static getDatabaseType(): 'postgresql' | 'sqlite' {
    const databaseUrl = process.env.DATABASE_URL;
    return databaseUrl && databaseUrl.includes('postgresql') ? 'postgresql' : 'sqlite';
  }

  /**
   * Close database connection
   */
  public static async close(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.destroy();
        this.instance = null;
        this.isInitialized = false;
        console.log('🔒 Database connection closed successfully');
      } catch (error) {
        console.error('❌ Error closing database connection:', error);
        throw error;
      }
    }
  }

  /**
   * Execute raw SQL query
   */
  public static async raw(sql: string, bindings?: any[]): Promise<any> {
    if (!this.instance) {
      throw new Error('Database not initialized');
    }
    return this.instance.raw(sql, bindings);
  }

  /**
   * Start a transaction
   */
  public static async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    if (!this.instance) {
      throw new Error('Database not initialized');
    }
    return this.instance.transaction(callback);
  }

  /**
   * Check if table exists
   */
  public static async hasTable(tableName: string): Promise<boolean> {
    if (!this.instance) {
      throw new Error('Database not initialized');
    }
    return this.instance.schema.hasTable(tableName);
  }

  /**
   * Run database health check
   */
  public static async healthCheck(): Promise<{
    connected: boolean;
    type: string;
    version?: string;
    uptime?: number;
    tablesCount?: number;
  }> {
    if (!this.instance) {
      return {
        connected: false,
        type: 'unknown'
      };
    }

    try {
      const dbType = this.getDatabaseType();
      
      // Get database version
      let version: string | undefined;
      if (dbType === 'postgresql') {
        const result = await this.instance.raw('SELECT version()');
        version = result.rows[0]?.version;
      } else {
        const result = await this.instance.raw('SELECT sqlite_version() as version');
        version = result[0]?.version;
      }

      // Count tables
      let tablesCount: number | undefined;
      try {
        if (dbType === 'postgresql') {
          const result = await this.instance.raw(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
          );
          tablesCount = parseInt(result.rows[0]?.count || '0');
        } else {
          const result = await this.instance.raw(
            "SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'table'"
          );
          tablesCount = result[0]?.count || 0;
        }
      } catch (error) {
        console.warn('⚠️  Could not count tables:', error);
      }

      return {
        connected: true,
        type: dbType,
        version,
        tablesCount
      };
      
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return {
        connected: false,
        type: this.getDatabaseType()
      };
    }
  }

  /**
   * Get connection pool status (PostgreSQL only)
   */
  public static getPoolStatus(): any {
    if (!this.instance) {
      return null;
    }

    const pool = (this.instance as any).client?.pool;
    if (!pool) {
      return null;
    }

    return {
      size: pool.size,
      available: pool.available,
      borrowed: pool.borrowed,
      pending: pool.pending,
      max: pool.max,
      min: pool.min
    };
  }

  /**
   * Run migrations (if available)
   */
  public static async runMigrations(): Promise<void> {
    if (!this.instance) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('🔄 Running database migrations...');
      const [batchNo, migrations] = await this.instance.migrate.latest();
      
      if (migrations.length === 0) {
        console.log('✅ Database is already up to date');
      } else {
        console.log(`✅ Ran ${migrations.length} migrations (batch ${batchNo})`);
        migrations.forEach(migration => {
          console.log(`  📄 ${migration}`);
        });
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  public static async rollbackMigrations(): Promise<void> {
    if (!this.instance) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('🔄 Rolling back migrations...');
      const [batchNo, migrations] = await this.instance.migrate.rollback();
      
      if (migrations.length === 0) {
        console.log('ℹ️  No migrations to rollback');
      } else {
        console.log(`✅ Rolled back ${migrations.length} migrations (batch ${batchNo})`);
        migrations.forEach(migration => {
          console.log(`  📄 ${migration}`);
        });
      }
    } catch (error) {
      console.error('❌ Migration rollback failed:', error);
      throw error;
    }
  }

  /**
   * Seed the database
   */
  public static async runSeeds(): Promise<void> {
    if (!this.instance) {
      throw new Error('Database not initialized');
    }

    try {
      console.log('🌱 Running database seeds...');
      const seeds = await this.instance.seed.run();
      console.log(`✅ Ran ${seeds[0].length} seed files`);
      seeds[0].forEach(seed => {
        console.log(`  🌱 ${seed}`);
      });
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }
}