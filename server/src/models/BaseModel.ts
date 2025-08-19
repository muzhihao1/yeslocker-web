/**
 * Base Model for all YesLocker entities
 * Provides common functionality and configurations
 */

import { Model, Pojo } from 'objection';

export class BaseModel extends Model {
  // Common fields for all models
  id!: string;
  created_at!: string;
  updated_at!: string;

  /**
   * Auto-update timestamps
   */
  $beforeInsert(): void {
    const now = new Date().toISOString();
    this.created_at = now;
    this.updated_at = now;
  }

  $beforeUpdate(): void {
    this.updated_at = new Date().toISOString();
  }

  /**
   * Format data for database storage
   */
  $formatDatabaseJson(json: Pojo): Pojo {
    json = super.$formatDatabaseJson(json);
    
    // Convert camelCase to snake_case for database
    const formatted: any = {};
    for (const [key, value] of Object.entries(json)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      formatted[snakeKey] = value;
    }
    
    return formatted;
  }

  /**
   * Parse data from database
   */
  $parseDatabaseJson(json: Pojo): Pojo {
    json = super.$parseDatabaseJson(json);
    
    // Convert snake_case to camelCase for application
    const parsed: any = {};
    for (const [key, value] of Object.entries(json)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      parsed[camelKey] = value;
    }
    
    return parsed;
  }

  /**
   * Common JSON schema properties
   */
  static get commonJsonSchema() {
    return {
      properties: {
        id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  /**
   * Convert model instance to plain object for API responses
   */
  toJSON(): Pojo {
    const json = super.toJSON();
    
    // Remove sensitive fields by default
    delete json.password;
    delete json.updated_at; // Usually not needed in API responses
    
    return json;
  }

  /**
   * Common query modifiers
   */
  static get modifiers() {
    return {
      active(builder: any) {
        builder.where('status', 'active');
      },
      
      orderByNewest(builder: any) {
        builder.orderBy('created_at', 'desc');
      },
      
      orderByOldest(builder: any) {
        builder.orderBy('created_at', 'asc');
      }
    };
  }
}