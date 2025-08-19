/**
 * Model Index - Central export point for all YesLocker models
 * Provides easy imports and prevents circular dependency issues
 */

// Export base model
export { BaseModel } from './BaseModel';

// Export entity models
export { Store } from './Store';
export { User } from './User';
export { Admin } from './Admin';
export { Locker } from './Locker';
export { Application } from './Application';
export { LockerRecord } from './LockerRecord';
export { Reminder } from './Reminder';

// Export types for models
export type {
  Store as StoreType,
  User as UserType,
  Admin as AdminType,
  Locker as LockerType,
  Application as ApplicationType,
  LockerRecord as LockerRecordType,
  Reminder as ReminderType
} from './';

/**
 * Model registry for dynamic access
 */
export const Models = {
  Store: require('./Store').Store,
  User: require('./User').User,
  Admin: require('./Admin').Admin,
  Locker: require('./Locker').Locker,
  Application: require('./Application').Application,
  LockerRecord: require('./LockerRecord').LockerRecord,
  Reminder: require('./Reminder').Reminder
} as const;

/**
 * Initialize all models with database connection
 * Call this after Knex is configured
 */
export function initializeModels() {
  // Models are automatically initialized when Knex is bound
  // via Model.knex() in database configuration
  console.log('✅ Models initialized successfully');
  
  // Log available models
  const modelNames = Object.keys(Models);
  console.log(`📋 Available models: ${modelNames.join(', ')}`);
}

/**
 * Model validation and health check
 */
export async function validateModels() {
  const results = [];
  
  for (const [name, ModelClass] of Object.entries(Models)) {
    try {
      // Check if model can query the database
      await ModelClass.query().limit(1);
      results.push({ model: name, status: 'OK' });
    } catch (error) {
      results.push({ 
        model: name, 
        status: 'ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Get model statistics
 */
export async function getModelStats() {
  const stats: Record<string, number> = {};
  
  for (const [name, ModelClass] of Object.entries(Models)) {
    try {
      stats[name] = await ModelClass.query().resultSize();
    } catch (error) {
      stats[name] = -1; // Indicates error
    }
  }
  
  return stats;
}