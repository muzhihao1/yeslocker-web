/**
 * Repository Index - Central export point for all YesLocker repositories
 * Provides easy imports and repository factory methods
 */

// Export base repository
export { BaseRepository } from './BaseRepository';
export type { 
  PaginationOptions, 
  SortOptions, 
  SearchResult 
} from './BaseRepository';

// Export specific repositories
export { UserRepository } from './UserRepository';
export { StoreRepository } from './StoreRepository';
export { AdminRepository } from './AdminRepository';
export { LockerRepository } from './LockerRepository';
export { ApplicationRepository } from './ApplicationRepository';
export { LockerRecordRepository } from './LockerRecordRepository';
export { ReminderRepository } from './ReminderRepository';

// Export repository types and interfaces
export type {
  CreateUserData,
  UpdateUserData,
  UserSearchFilters
} from './UserRepository';

export type {
  CreateStoreData,
  UpdateStoreData,
  StoreSearchFilters
} from './StoreRepository';

export type {
  CreateAdminData,
  UpdateAdminData,
  AdminSearchFilters
} from './AdminRepository';

export type {
  CreateLockerData,
  UpdateLockerData,
  LockerSearchFilters,
  LockerAssignmentData
} from './LockerRepository';

export type {
  CreateApplicationData,
  UpdateApplicationData,
  ApplicationSearchFilters,
  ApprovalData,
  RejectionData
} from './ApplicationRepository';

export type {
  CreateRecordData,
  RecordSearchFilters,
  UsageStats
} from './LockerRecordRepository';

export type {
  CreateReminderData,
  UpdateReminderData,
  ReminderSearchFilters
} from './ReminderRepository';

/**
 * Repository registry for centralized access
 */
export class RepositoryRegistry {
  private static instance: RepositoryRegistry;
  
  private userRepository: UserRepository;
  private storeRepository: StoreRepository;
  private adminRepository: AdminRepository;
  private lockerRepository: LockerRepository;
  private applicationRepository: ApplicationRepository;
  private lockerRecordRepository: LockerRecordRepository;
  private reminderRepository: ReminderRepository;

  private constructor() {
    this.userRepository = new UserRepository();
    this.storeRepository = new StoreRepository();
    this.adminRepository = new AdminRepository();
    this.lockerRepository = new LockerRepository();
    this.applicationRepository = new ApplicationRepository();
    this.lockerRecordRepository = new LockerRecordRepository();
    this.reminderRepository = new ReminderRepository();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RepositoryRegistry {
    if (!RepositoryRegistry.instance) {
      RepositoryRegistry.instance = new RepositoryRegistry();
    }
    return RepositoryRegistry.instance;
  }

  /**
   * Repository getters
   */
  get users(): UserRepository {
    return this.userRepository;
  }

  get stores(): StoreRepository {
    return this.storeRepository;
  }

  get admins(): AdminRepository {
    return this.adminRepository;
  }

  get lockers(): LockerRepository {
    return this.lockerRepository;
  }

  get applications(): ApplicationRepository {
    return this.applicationRepository;
  }

  get lockerRecords(): LockerRecordRepository {
    return this.lockerRecordRepository;
  }

  get reminders(): ReminderRepository {
    return this.reminderRepository;
  }

  /**
   * Health check for all repositories
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results = await Promise.allSettled([
      this.userRepository.healthCheck(),
      this.storeRepository.healthCheck(),
      this.adminRepository.healthCheck(),
      this.lockerRepository.healthCheck(),
      this.applicationRepository.healthCheck(),
      this.lockerRecordRepository.healthCheck(),
      this.reminderRepository.healthCheck()
    ]);

    return {
      users: results[0].status === 'fulfilled' ? results[0].value : false,
      stores: results[1].status === 'fulfilled' ? results[1].value : false,
      admins: results[2].status === 'fulfilled' ? results[2].value : false,
      lockers: results[3].status === 'fulfilled' ? results[3].value : false,
      applications: results[4].status === 'fulfilled' ? results[4].value : false,
      lockerRecords: results[5].status === 'fulfilled' ? results[5].value : false,
      reminders: results[6].status === 'fulfilled' ? results[6].value : false
    };
  }

  /**
   * Get statistics for all repositories
   */
  async getAllStats(): Promise<Record<string, any>> {
    const results = await Promise.allSettled([
      this.userRepository.getStats(),
      this.storeRepository.getStats(),
      this.adminRepository.getStats(),
      this.lockerRepository.getStats(),
      this.applicationRepository.getStats(),
      this.lockerRecordRepository.getStats(),
      this.reminderRepository.getStats()
    ]);

    return {
      users: results[0].status === 'fulfilled' ? results[0].value : null,
      stores: results[1].status === 'fulfilled' ? results[1].value : null,
      admins: results[2].status === 'fulfilled' ? results[2].value : null,
      lockers: results[3].status === 'fulfilled' ? results[3].value : null,
      applications: results[4].status === 'fulfilled' ? results[4].value : null,
      lockerRecords: results[5].status === 'fulfilled' ? results[5].value : null,
      reminders: results[6].status === 'fulfilled' ? results[6].value : null
    };
  }
}

/**
 * Factory function to get repository registry instance
 */
export function getRepositories(): RepositoryRegistry {
  return RepositoryRegistry.getInstance();
}

/**
 * Individual repository factory functions
 */
export function getUserRepository(): UserRepository {
  return getRepositories().users;
}

export function getStoreRepository(): StoreRepository {
  return getRepositories().stores;
}

export function getAdminRepository(): AdminRepository {
  return getRepositories().admins;
}

export function getLockerRepository(): LockerRepository {
  return getRepositories().lockers;
}

export function getApplicationRepository(): ApplicationRepository {
  return getRepositories().applications;
}

export function getLockerRecordRepository(): LockerRecordRepository {
  return getRepositories().lockerRecords;
}

export function getReminderRepository(): ReminderRepository {
  return getRepositories().reminders;
}

/**
 * Initialize all repositories
 */
export function initializeRepositories(): void {
  const registry = RepositoryRegistry.getInstance();
  console.log('✅ Repository layer initialized successfully');
  
  // Log available repositories
  const repositoryNames = [
    'users', 'stores', 'admins', 'lockers', 
    'applications', 'lockerRecords', 'reminders'
  ];
  console.log(`📋 Available repositories: ${repositoryNames.join(', ')}`);
}

/**
 * Repository health and diagnostics
 */
export async function checkRepositoryHealth(): Promise<{
  healthy: boolean;
  results: Record<string, boolean>;
  summary: string;
}> {
  const registry = RepositoryRegistry.getInstance();
  const results = await registry.healthCheck();
  
  const healthyCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  const healthy = healthyCount === totalCount;
  
  const summary = `${healthyCount}/${totalCount} repositories healthy`;
  
  return {
    healthy,
    results,
    summary
  };
}