/**
 * Database Configuration for YesLocker
 * Supports both SQLite (development) and PostgreSQL (production)
 */

import { Knex } from 'knex';
import { Model } from 'objection';

export interface DatabaseConfig {
  client: string;
  connection: string | object;
  migrations?: {
    directory: string;
  };
  seeds?: {
    directory: string;
  };
  ssl?: boolean | object;
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
  };
}

/**
 * Get database configuration based on environment
 */
export const getDatabaseConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    // PostgreSQL configuration for Railway
    return {
      client: 'pg',
      connection: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '',
      ssl: { rejectUnauthorized: false },
      pool: {
        min: 2,
        max: 20,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 5000
      },
      migrations: {
        directory: './database/migrations'
      }
    };
  } else {
    // SQLite configuration for development
    return {
      client: 'sqlite3',
      connection: {
        filename: './database/yeslocker.db'
      },
      migrations: {
        directory: './database/migrations'
      }
    };
  }
};

/**
 * Initialize database connection and bind to Objection.js
 */
export const initializeDatabase = async (): Promise<Knex> => {
  const config = getDatabaseConfig();
  const knex = require('knex')(config);
  
  // Test database connection
  try {
    await knex.raw('SELECT 1');
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
  
  // Bind Knex instance to Objection.js Model
  Model.knex(knex);
  
  return knex;
};

/**
 * Close database connection
 */
export const closeDatabaseConnection = async (knex: Knex): Promise<void> => {
  await knex.destroy();
  console.log('🔐 Database connection closed');
};

/**
 * Database health check
 */
export const healthCheck = async (knex: Knex): Promise<boolean> => {
  try {
    await knex.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};