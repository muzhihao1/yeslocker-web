/**
 * Store Service - 门店服务层
 * Handles business logic for store management, locations, and store-related operations
 */

import { BaseService, ServiceResponse } from './BaseService';
import { StoreRepository } from '../repositories/StoreRepository';
import { LockerRepository } from '../repositories/LockerRepository';
import { UserRepository } from '../repositories/UserRepository';

export interface CreateStoreData {
  name: string;
  address: string;
  contact_phone?: string;
  contact_person?: string;
  business_hours?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface UpdateStoreData {
  name?: string;
  address?: string;
  contact_phone?: string;
  contact_person?: string;
  business_hours?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface StoreSearchFilters {
  status?: string;
  search?: string; // Search in name or address
  created_after?: string;
  created_before?: string;
}

export interface StoreStatistics {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  maintenanceStores: number;
  totalLockers: number;
  availableLockers: number;
  occupiedLockers: number;
  totalUsers: number;
}

export class StoreService extends BaseService {
  private storeRepo: StoreRepository;
  private lockerRepo: LockerRepository;
  private userRepo: UserRepository;

  constructor() {
    super('StoreService');
    this.storeRepo = new StoreRepository();
    this.lockerRepo = new LockerRepository();
    this.userRepo = new UserRepository();
  }

  /**
   * Create a new store
   */
  async createStore(storeData: CreateStoreData): Promise<ServiceResponse<any>> {
    return this.executeOperation('createStore', async () => {
      // Validate required fields
      const validation = this.validateRequired(storeData, ['name', 'address']);
      if (validation) {
        return validation;
      }

      // Validate phone format if provided
      if (storeData.contact_phone && !this.validatePhone(storeData.contact_phone)) {
        return this.createErrorResponse('联系电话格式不正确', null, 400);
      }

      // Check if store name already exists
      const existingStore = await this.storeRepo.findByName(storeData.name);
      if (existingStore) {
        return this.createErrorResponse('门店名称已存在', null, 409);
      }

      // Sanitize input data
      const sanitizedData = {
        name: this.sanitizeString(storeData.name, 100),
        address: this.sanitizeString(storeData.address, 200),
        contact_phone: storeData.contact_phone ? this.sanitizeString(storeData.contact_phone) : undefined,
        contact_person: storeData.contact_person ? this.sanitizeString(storeData.contact_person, 50) : undefined,
        business_hours: storeData.business_hours ? this.sanitizeString(storeData.business_hours, 100) : undefined,
        description: storeData.description ? this.sanitizeString(storeData.description, 500) : undefined,
        status: storeData.status || 'active'
      };

      // Create store
      const store = await this.storeRepo.create(sanitizedData);

      return this.createSuccessResponse(store, '门店创建成功');
    }, { name: storeData.name });
  }

  /**
   * Get store by ID
   */
  async getStoreById(storeId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('getStoreById', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      return this.createSuccessResponse(store, '获取门店信息成功');
    }, { storeId });
  }

  /**
   * Update store information
   */
  async updateStore(storeId: string, updateData: UpdateStoreData): Promise<ServiceResponse<any>> {
    return this.executeOperation('updateStore', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if store exists
      const existingStore = await this.storeRepo.findById(storeId);
      if (!existingStore) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      // Validate phone format if provided
      if (updateData.contact_phone && !this.validatePhone(updateData.contact_phone)) {
        return this.createErrorResponse('联系电话格式不正确', null, 400);
      }

      // Validate status if provided
      if (updateData.status && !['active', 'inactive', 'maintenance'].includes(updateData.status)) {
        return this.createErrorResponse('门店状态无效', null, 400);
      }

      // Check name uniqueness if name is being updated
      if (updateData.name && updateData.name !== existingStore.name) {
        const nameExists = await this.storeRepo.findByName(updateData.name);
        if (nameExists) {
          return this.createErrorResponse('门店名称已存在', null, 409);
        }
      }

      // Sanitize update data
      const sanitizedData: any = {};
      if (updateData.name) {
        sanitizedData.name = this.sanitizeString(updateData.name, 100);
      }
      if (updateData.address) {
        sanitizedData.address = this.sanitizeString(updateData.address, 200);
      }
      if (updateData.contact_phone !== undefined) {
        sanitizedData.contact_phone = updateData.contact_phone ? this.sanitizeString(updateData.contact_phone) : null;
      }
      if (updateData.contact_person !== undefined) {
        sanitizedData.contact_person = updateData.contact_person ? this.sanitizeString(updateData.contact_person, 50) : null;
      }
      if (updateData.business_hours !== undefined) {
        sanitizedData.business_hours = updateData.business_hours ? this.sanitizeString(updateData.business_hours, 100) : null;
      }
      if (updateData.description !== undefined) {
        sanitizedData.description = updateData.description ? this.sanitizeString(updateData.description, 500) : null;
      }
      if (updateData.status) {
        sanitizedData.status = updateData.status;
      }

      // Update store
      const updatedStore = await this.storeRepo.update(storeId, sanitizedData);

      return this.createSuccessResponse(updatedStore, '门店信息更新成功');
    }, { storeId, updateFields: Object.keys(updateData) });
  }

  /**
   * Get stores with pagination and filters
   */
  async getStores(
    page: number = 1,
    pageSize: number = 20,
    filters: StoreSearchFilters = {}
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getStores', async () => {
      // Parse and validate pagination
      const pagination = this.parsePaginationParams(page, pageSize);

      // Validate status filter
      if (filters.status && !['active', 'inactive', 'maintenance'].includes(filters.status)) {
        return this.createErrorResponse('门店状态无效', null, 400);
      }

      // Sanitize search filter
      if (filters.search) {
        filters.search = this.sanitizeString(filters.search, 100);
      }

      // Get stores with filters
      const { stores, total } = await this.storeRepo.findWithFilters(
        pagination.page,
        pagination.pageSize,
        filters
      );

      return this.createPaginatedResponse(
        stores,
        total,
        pagination.page,
        pagination.pageSize,
        '获取门店列表成功'
      );
    }, { page, pageSize, filters });
  }

  /**
   * Delete store (soft delete)
   */
  async deleteStore(storeId: string): Promise<ServiceResponse<void>> {
    return this.executeOperation('deleteStore', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if store exists
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      // Check if store has active lockers
      const activeLockers = await this.lockerRepo.findByStoreId(storeId, { status: 'occupied' });
      if (activeLockers && activeLockers.length > 0) {
        return this.createErrorResponse('门店有正在使用的储物柜，无法删除', null, 409);
      }

      // Check if store has registered users
      const storeUsers = await this.userRepo.findByStoreId(storeId, { status: 'active' });
      if (storeUsers && storeUsers.length > 0) {
        return this.createErrorResponse('门店有注册用户，无法删除', null, 409);
      }

      // Soft delete store
      await this.storeRepo.softDelete(storeId);

      return this.createSuccessResponse(undefined, '门店删除成功');
    }, { storeId });
  }

  /**
   * Get store statistics
   */
  async getStoreStatistics(storeId?: string): Promise<ServiceResponse<StoreStatistics>> {
    return this.executeOperation('getStoreStatistics', async () => {
      // Validate store_id if provided
      if (storeId && !this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      const stats = await this.storeRepo.getStoreStatistics(storeId);

      return this.createSuccessResponse(stats, '获取门店统计成功');
    }, { storeId });
  }

  /**
   * Get store lockers with status
   */
  async getStoreLockers(
    storeId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getStoreLockers', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if store exists
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      const pagination = this.parsePaginationParams(page, pageSize);

      const { lockers, total } = await this.lockerRepo.findByStoreIdWithPagination(
        storeId,
        pagination.page,
        pagination.pageSize
      );

      return this.createPaginatedResponse(
        lockers,
        total,
        pagination.page,
        pagination.pageSize,
        '获取门店储物柜成功'
      );
    }, { storeId, page, pageSize });
  }

  /**
   * Get store users
   */
  async getStoreUsers(
    storeId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getStoreUsers', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if store exists
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      const pagination = this.parsePaginationParams(page, pageSize);

      const { users, total } = await this.userRepo.findByStoreIdWithPagination(
        storeId,
        pagination.page,
        pagination.pageSize
      );

      return this.createPaginatedResponse(
        users,
        total,
        pagination.page,
        pagination.pageSize,
        '获取门店用户成功'
      );
    }, { storeId, page, pageSize });
  }

  /**
   * Change store status
   */
  async changeStoreStatus(
    storeId: string,
    status: 'active' | 'inactive' | 'maintenance',
    reason?: string
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('changeStoreStatus', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      if (!['active', 'inactive', 'maintenance'].includes(status)) {
        return this.createErrorResponse('门店状态无效', null, 400);
      }

      const updateData: UpdateStoreData = {
        status,
        description: reason ? this.sanitizeString(reason, 500) : undefined
      };

      return await this.updateStore(storeId, updateData);
    }, { storeId, status, reason });
  }

  /**
   * Get all active stores (simple list for dropdowns)
   */
  async getActiveStores(): Promise<ServiceResponse<any[]>> {
    return this.executeOperation('getActiveStores', async () => {
      const stores = await this.storeRepo.findActive();
      
      return this.createSuccessResponse(stores, '获取活跃门店列表成功');
    });
  }

  /**
   * Search stores by name or address
   */
  async searchStores(query: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
    return this.executeOperation('searchStores', async () => {
      if (!query || query.length < 2) {
        return this.createErrorResponse('搜索关键词至少2个字符', null, 400);
      }

      const sanitizedQuery = this.sanitizeString(query, 100);
      const stores = await this.storeRepo.searchByNameOrAddress(sanitizedQuery, limit);

      return this.createSuccessResponse(stores, '搜索门店成功');
    }, { query, limit });
  }

  /**
   * Get store capacity analysis
   */
  async getStoreCapacityAnalysis(storeId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('getStoreCapacityAnalysis', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if store exists
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      // Get locker statistics
      const lockerStats = await this.lockerRepo.getLockerStatsByStoreId(storeId);
      
      // Get user statistics
      const userStats = await this.userRepo.getUserStatsByStoreId(storeId);

      const analysis = {
        store: {
          id: store.id,
          name: store.name,
          status: store.status
        },
        lockers: lockerStats,
        users: userStats,
        capacity: {
          utilizationRate: lockerStats.total > 0 ? (lockerStats.occupied / lockerStats.total * 100).toFixed(2) : 0,
          availabilityRate: lockerStats.total > 0 ? (lockerStats.available / lockerStats.total * 100).toFixed(2) : 0
        },
        lastUpdated: this.formatDate(new Date())
      };

      return this.createSuccessResponse(analysis, '获取门店容量分析成功');
    }, { storeId });
  }
}