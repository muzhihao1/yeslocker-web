/**
 * Locker Service - 储物柜服务层
 * Handles business logic for locker management, availability, and locker operations
 */

import { BaseService, ServiceResponse } from './BaseService';
import { LockerRepository } from '../models/LockerRepository';
import { StoreRepository } from '../models/StoreRepository';
import { LockerRecordRepository } from '../models/LockerRecordRepository';
import { ApplicationRepository } from '../models/ApplicationRepository';

export interface CreateLockerData {
  store_id: string;
  locker_number: string;
  floor?: string;
  location_description?: string;
  size?: 'small' | 'medium' | 'large';
  status?: 'available' | 'occupied' | 'maintenance' | 'reserved';
}

export interface UpdateLockerData {
  locker_number?: string;
  floor?: string;
  location_description?: string;
  size?: 'small' | 'medium' | 'large';
  status?: 'available' | 'occupied' | 'maintenance' | 'reserved';
  maintenance_notes?: string;
}

export interface LockerSearchFilters {
  store_id?: string;
  status?: string;
  size?: string;
  floor?: string;
  search?: string; // Search in locker_number or location_description
  available_only?: boolean;
}

export interface LockerStatistics {
  totalLockers: number;
  availableLockers: number;
  occupiedLockers: number;
  maintenanceLockers: number;
  reservedLockers: number;
  utilizationRate: number;
  lockersBySize: {
    small: number;
    medium: number;
    large: number;
  };
  lockersByFloor: Record<string, number>;
}

export interface LockerUsageData {
  locker_id: string;
  user_id: string;
  check_in_time: Date;
  items_description?: string;
}

export class LockerService extends BaseService {
  private lockerRepo: LockerRepository;
  private storeRepo: StoreRepository;
  private recordRepo: LockerRecordRepository;
  private applicationRepo: ApplicationRepository;

  constructor() {
    super('LockerService');
    this.lockerRepo = new LockerRepository();
    this.storeRepo = new StoreRepository();
    this.recordRepo = new LockerRecordRepository();
    this.applicationRepo = new ApplicationRepository();
  }

  /**
   * Create a new locker
   */
  async createLocker(lockerData: CreateLockerData): Promise<ServiceResponse<any>> {
    return this.executeOperation('createLocker', async () => {
      // Validate required fields
      const validation = this.validateRequired(lockerData, ['store_id', 'locker_number']);
      if (validation) {
        return validation;
      }

      // Validate store_id format
      if (!this.validateUUID(lockerData.store_id)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if store exists
      const store = await this.storeRepo.findById(lockerData.store_id);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      // Check if locker number already exists in this store
      const existingLocker = await this.lockerRepo.findByStoreAndNumber(
        lockerData.store_id,
        lockerData.locker_number
      );
      if (existingLocker) {
        return this.createErrorResponse('该门店已存在相同编号的储物柜', null, 409);
      }

      // Validate size if provided
      if (lockerData.size && !['small', 'medium', 'large'].includes(lockerData.size)) {
        return this.createErrorResponse('储物柜尺寸无效', null, 400);
      }

      // Validate status if provided
      if (lockerData.status && !['available', 'occupied', 'maintenance', 'reserved'].includes(lockerData.status)) {
        return this.createErrorResponse('储物柜状态无效', null, 400);
      }

      // Sanitize input data
      const sanitizedData = {
        store_id: lockerData.store_id,
        locker_number: this.sanitizeString(lockerData.locker_number, 20),
        floor: lockerData.floor ? this.sanitizeString(lockerData.floor, 10) : undefined,
        location_description: lockerData.location_description ? this.sanitizeString(lockerData.location_description, 200) : undefined,
        size: lockerData.size || 'medium',
        status: lockerData.status || 'available'
      };

      // Create locker
      const locker = await this.lockerRepo.create(sanitizedData);

      return this.createSuccessResponse(locker, '储物柜创建成功');
    }, { store_id: lockerData.store_id, locker_number: lockerData.locker_number });
  }

  /**
   * Get locker by ID
   */
  async getLockerById(lockerId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('getLockerById', async () => {
      if (!this.validateUUID(lockerId)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }

      const locker = await this.lockerRepo.findById(lockerId);
      if (!locker) {
        return this.createErrorResponse('储物柜不存在', null, 404);
      }

      return this.createSuccessResponse(locker, '获取储物柜信息成功');
    }, { lockerId });
  }

  /**
   * Update locker information
   */
  async updateLocker(lockerId: string, updateData: UpdateLockerData): Promise<ServiceResponse<any>> {
    return this.executeOperation('updateLocker', async () => {
      if (!this.validateUUID(lockerId)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }

      // Check if locker exists
      const existingLocker = await this.lockerRepo.findById(lockerId);
      if (!existingLocker) {
        return this.createErrorResponse('储物柜不存在', null, 404);
      }

      // Validate size if provided
      if (updateData.size && !['small', 'medium', 'large'].includes(updateData.size)) {
        return this.createErrorResponse('储物柜尺寸无效', null, 400);
      }

      // Validate status if provided
      if (updateData.status && !['available', 'occupied', 'maintenance', 'reserved'].includes(updateData.status)) {
        return this.createErrorResponse('储物柜状态无效', null, 400);
      }

      // Check locker number uniqueness if number is being updated
      if (updateData.locker_number && updateData.locker_number !== existingLocker.locker_number) {
        const numberExists = await this.lockerRepo.findByStoreAndNumber(
          existingLocker.store_id,
          updateData.locker_number
        );
        if (numberExists) {
          return this.createErrorResponse('该门店已存在相同编号的储物柜', null, 409);
        }
      }

      // Validate status transitions
      if (updateData.status && updateData.status !== existingLocker.status) {
        const validTransition = await this.validateStatusTransition(
          existingLocker.status,
          updateData.status,
          lockerId
        );
        if (!validTransition.isValid) {
          return this.createErrorResponse(validTransition.message!, null, 400);
        }
      }

      // Sanitize update data
      const sanitizedData: any = {};
      if (updateData.locker_number) {
        sanitizedData.locker_number = this.sanitizeString(updateData.locker_number, 20);
      }
      if (updateData.floor !== undefined) {
        sanitizedData.floor = updateData.floor ? this.sanitizeString(updateData.floor, 10) : null;
      }
      if (updateData.location_description !== undefined) {
        sanitizedData.location_description = updateData.location_description ? 
          this.sanitizeString(updateData.location_description, 200) : null;
      }
      if (updateData.size) {
        sanitizedData.size = updateData.size;
      }
      if (updateData.status) {
        sanitizedData.status = updateData.status;
      }
      if (updateData.maintenance_notes !== undefined) {
        sanitizedData.maintenance_notes = updateData.maintenance_notes ? 
          this.sanitizeString(updateData.maintenance_notes, 500) : null;
      }

      // Update locker
      const updatedLocker = await this.lockerRepo.update(lockerId, sanitizedData);

      return this.createSuccessResponse(updatedLocker, '储物柜信息更新成功');
    }, { lockerId, updateFields: Object.keys(updateData) });
  }

  /**
   * Get lockers with pagination and filters
   */
  async getLockers(
    page: number = 1,
    pageSize: number = 50,
    filters: LockerSearchFilters = {}
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getLockers', async () => {
      // Parse and validate pagination
      const pagination = this.parsePaginationParams(page, pageSize);

      // Validate UUID filters
      if (filters.store_id && !this.validateUUID(filters.store_id)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Validate status filter
      if (filters.status && !['available', 'occupied', 'maintenance', 'reserved'].includes(filters.status)) {
        return this.createErrorResponse('储物柜状态无效', null, 400);
      }

      // Validate size filter
      if (filters.size && !['small', 'medium', 'large'].includes(filters.size)) {
        return this.createErrorResponse('储物柜尺寸无效', null, 400);
      }

      // Sanitize search filter
      if (filters.search) {
        filters.search = this.sanitizeString(filters.search, 100);
      }

      // Get lockers with filters
      const { lockers, total } = await this.lockerRepo.findWithFilters(
        pagination.page,
        pagination.pageSize,
        filters
      );

      return this.createPaginatedResponse(
        lockers,
        total,
        pagination.page,
        pagination.pageSize,
        '获取储物柜列表成功'
      );
    }, { page, pageSize, filters });
  }

  /**
   * Get available lockers for a store
   */
  async getAvailableLockers(storeId: string): Promise<ServiceResponse<any[]>> {
    return this.executeOperation('getAvailableLockers', async () => {
      if (!this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      // Check if store exists
      const store = await this.storeRepo.findById(storeId);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }

      const lockers = await this.lockerRepo.findAvailableByStoreId(storeId);

      return this.createSuccessResponse(lockers, '获取可用储物柜成功');
    }, { storeId });
  }

  /**
   * Delete locker (soft delete)
   */
  async deleteLocker(lockerId: string): Promise<ServiceResponse<void>> {
    return this.executeOperation('deleteLocker', async () => {
      if (!this.validateUUID(lockerId)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }

      // Check if locker exists
      const locker = await this.lockerRepo.findById(lockerId);
      if (!locker) {
        return this.createErrorResponse('储物柜不存在', null, 404);
      }

      // Check if locker is occupied or has active records
      if (locker.status === 'occupied') {
        return this.createErrorResponse('储物柜正在使用中，无法删除', null, 409);
      }

      const activeRecords = await this.recordRepo.findByLockerId(lockerId, { status: 'checked_in' });
      if (activeRecords && activeRecords.length > 0) {
        return this.createErrorResponse('储物柜有未归还的物品，无法删除', null, 409);
      }

      // Check if locker has pending applications
      const pendingApplications = await this.applicationRepo.findByLockerId(lockerId, { status: 'pending' });
      if (pendingApplications && pendingApplications.length > 0) {
        return this.createErrorResponse('储物柜有待审核的申请，无法删除', null, 409);
      }

      // Soft delete locker
      await this.lockerRepo.softDelete(lockerId);

      return this.createSuccessResponse(undefined, '储物柜删除成功');
    }, { lockerId });
  }

  /**
   * Get locker statistics
   */
  async getLockerStatistics(storeId?: string): Promise<ServiceResponse<LockerStatistics>> {
    return this.executeOperation('getLockerStatistics', async () => {
      // Validate store_id if provided
      if (storeId && !this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      const stats = await this.lockerRepo.getLockerStatistics(storeId);

      return this.createSuccessResponse(stats, '获取储物柜统计成功');
    }, { storeId });
  }

  /**
   * Check in to locker (start usage)
   */
  async checkInLocker(usageData: LockerUsageData): Promise<ServiceResponse<any>> {
    return this.executeOperation('checkInLocker', async () => {
      // Validate required fields
      const validation = this.validateRequired(usageData, ['locker_id', 'user_id']);
      if (validation) {
        return validation;
      }

      // Validate UUID formats
      if (!this.validateUUID(usageData.locker_id)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }
      if (!this.validateUUID(usageData.user_id)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Check if locker exists and is available
      const locker = await this.lockerRepo.findById(usageData.locker_id);
      if (!locker) {
        return this.createErrorResponse('储物柜不存在', null, 404);
      }
      if (locker.status !== 'occupied') {
        return this.createErrorResponse('储物柜不可用或未分配', null, 409);
      }

      // Check if user has approved application for this locker
      const approvedApplication = await this.applicationRepo.findByUserAndLocker(
        usageData.user_id,
        usageData.locker_id,
        'approved'
      );
      if (!approvedApplication) {
        return this.createErrorResponse('用户无权使用此储物柜', null, 403);
      }

      // Check if user has already checked in to this locker
      const existingRecord = await this.recordRepo.findActiveByUserAndLocker(
        usageData.user_id,
        usageData.locker_id
      );
      if (existingRecord) {
        return this.createErrorResponse('您已在此储物柜存放物品', null, 409);
      }

      // Create usage record
      const recordData = {
        user_id: usageData.user_id,
        locker_id: usageData.locker_id,
        check_in_time: usageData.check_in_time || new Date(),
        items_description: usageData.items_description ? this.sanitizeString(usageData.items_description, 200) : undefined,
        status: 'checked_in'
      };

      const record = await this.recordRepo.create(recordData);

      return this.createSuccessResponse(record, '物品存入成功');
    }, { locker_id: usageData.locker_id, user_id: usageData.user_id });
  }

  /**
   * Check out from locker (end usage)
   */
  async checkOutLocker(lockerId: string, userId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('checkOutLocker', async () => {
      if (!this.validateUUID(lockerId)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Find active record
      const activeRecord = await this.recordRepo.findActiveByUserAndLocker(userId, lockerId);
      if (!activeRecord) {
        return this.createErrorResponse('未找到有效的使用记录', null, 404);
      }

      // Update record with check out time
      const updateData = {
        check_out_time: new Date(),
        status: 'checked_out'
      };

      const updatedRecord = await this.recordRepo.update(activeRecord.id, updateData);

      return this.createSuccessResponse(updatedRecord, '物品取出成功');
    }, { lockerId, userId });
  }

  /**
   * Change locker status (for maintenance, etc.)
   */
  async changeLockerStatus(
    lockerId: string,
    status: 'available' | 'occupied' | 'maintenance' | 'reserved',
    notes?: string
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('changeLockerStatus', async () => {
      if (!this.validateUUID(lockerId)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }

      if (!['available', 'occupied', 'maintenance', 'reserved'].includes(status)) {
        return this.createErrorResponse('储物柜状态无效', null, 400);
      }

      // Get current locker
      const locker = await this.lockerRepo.findById(lockerId);
      if (!locker) {
        return this.createErrorResponse('储物柜不存在', null, 404);
      }

      // Validate status transition
      const validTransition = await this.validateStatusTransition(locker.status, status, lockerId);
      if (!validTransition.isValid) {
        return this.createErrorResponse(validTransition.message!, null, 400);
      }

      const updateData: UpdateLockerData = {
        status,
        maintenance_notes: notes
      };

      return await this.updateLocker(lockerId, updateData);
    }, { lockerId, status, notes });
  }

  /**
   * Get locker usage history
   */
  async getLockerUsageHistory(
    lockerId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getLockerUsageHistory', async () => {
      if (!this.validateUUID(lockerId)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }

      // Check if locker exists
      const locker = await this.lockerRepo.findById(lockerId);
      if (!locker) {
        return this.createErrorResponse('储物柜不存在', null, 404);
      }

      const pagination = this.parsePaginationParams(page, pageSize);

      const { records, total } = await this.recordRepo.findByLockerIdWithPagination(
        lockerId,
        pagination.page,
        pagination.pageSize
      );

      return this.createPaginatedResponse(
        records,
        total,
        pagination.page,
        pagination.pageSize,
        '获取储物柜使用历史成功'
      );
    }, { lockerId, page, pageSize });
  }

  /**
   * Validate status transition
   */
  private async validateStatusTransition(
    currentStatus: string,
    newStatus: string,
    lockerId: string
  ): Promise<{ isValid: boolean; message?: string }> {
    // If status is not changing, it's valid
    if (currentStatus === newStatus) {
      return { isValid: true };
    }

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      'available': ['occupied', 'maintenance', 'reserved'],
      'occupied': ['available', 'maintenance'],
      'maintenance': ['available'],
      'reserved': ['available', 'occupied']
    };

    // Check if transition is allowed
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        isValid: false,
        message: `不能从${currentStatus}状态转换到${newStatus}状态`
      };
    }

    // Additional validation for specific transitions
    if (currentStatus === 'occupied' && newStatus === 'available') {
      // Check if there are active records
      const activeRecords = await this.recordRepo.findByLockerId(lockerId, { status: 'checked_in' });
      if (activeRecords && activeRecords.length > 0) {
        return {
          isValid: false,
          message: '储物柜内有物品，请先完成取出操作'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Batch update locker status
   */
  async batchUpdateLockerStatus(
    lockerIds: string[],
    status: 'available' | 'occupied' | 'maintenance' | 'reserved',
    notes?: string
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('batchUpdateLockerStatus', async () => {
      // Validate inputs
      if (!Array.isArray(lockerIds) || lockerIds.length === 0) {
        return this.createErrorResponse('储物柜ID列表不能为空', null, 400);
      }

      if (lockerIds.length > 100) {
        return this.createErrorResponse('批量更新储物柜数量不能超过100个', null, 400);
      }

      if (!['available', 'occupied', 'maintenance', 'reserved'].includes(status)) {
        return this.createErrorResponse('储物柜状态无效', null, 400);
      }

      // Validate all locker IDs
      const invalidIds = lockerIds.filter(id => !this.validateUUID(id));
      if (invalidIds.length > 0) {
        return this.createErrorResponse('存在无效的储物柜ID格式', null, 400, { invalidIds });
      }

      // Process each locker
      const results = [];
      const errors = [];

      for (const lockerId of lockerIds) {
        try {
          const result = await this.changeLockerStatus(lockerId, status, notes);
          if (result.success) {
            results.push({ lockerId, success: true });
          } else {
            errors.push({ lockerId, error: result.error });
          }
        } catch (error) {
          errors.push({ lockerId, error: 'Update failed' });
        }
      }

      return this.createSuccessResponse({
        total: lockerIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }, '批量更新储物柜状态完成');
    }, { count: lockerIds.length, status });
  }
}