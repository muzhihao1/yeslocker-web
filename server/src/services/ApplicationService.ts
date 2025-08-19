/**
 * Application Service - 申请服务层
 * Handles business logic for locker applications, approvals, and application lifecycle management
 */

import { BaseService, ServiceResponse } from './BaseService';
import { ApplicationRepository } from '../models/ApplicationRepository';
import { UserRepository } from '../models/UserRepository';
import { LockerRepository } from '../models/LockerRepository';
import { StoreRepository } from '../models/StoreRepository';

export interface CreateApplicationData {
  user_id: string;
  store_id: string;
  assigned_locker_id: string;
  reason: string;
  application_type?: 'new' | 'renewal' | 'transfer';
}

export interface UpdateApplicationData {
  status?: 'pending' | 'approved' | 'rejected';
  assigned_locker_id?: string;
  admin_notes?: string;
  approval_reason?: string;
  rejection_reason?: string;
}

export interface ApplicationSearchFilters {
  status?: string;
  store_id?: string;
  user_id?: string;
  admin_id?: string;
  application_type?: string;
  created_after?: string;
  created_before?: string;
  approved_after?: string;
  approved_before?: string;
}

export interface ApplicationStatistics {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  applicationsThisMonth: number;
  applicationsToday: number;
  averageProcessingTime: number; // in hours
  approvalRate: number; // percentage
}

export interface ApprovalData {
  admin_id: string;
  assigned_locker_id?: string;
  approval_reason?: string;
  admin_notes?: string;
}

export interface RejectionData {
  admin_id: string;
  rejection_reason: string;
  admin_notes?: string;
}

export class ApplicationService extends BaseService {
  private applicationRepo: ApplicationRepository;
  private userRepo: UserRepository;
  private lockerRepo: LockerRepository;
  private storeRepo: StoreRepository;

  constructor() {
    super('ApplicationService');
    this.applicationRepo = new ApplicationRepository();
    this.userRepo = new UserRepository();
    this.lockerRepo = new LockerRepository();
    this.storeRepo = new StoreRepository();
  }

  /**
   * Create a new application
   */
  async createApplication(applicationData: CreateApplicationData): Promise<ServiceResponse<any>> {
    return this.executeOperation('createApplication', async () => {
      // Validate required fields
      const validation = this.validateRequired(applicationData, [
        'user_id', 'store_id', 'assigned_locker_id', 'reason'
      ]);
      if (validation) {
        return validation;
      }

      // Validate UUID formats
      if (!this.validateUUID(applicationData.user_id)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }
      if (!this.validateUUID(applicationData.store_id)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }
      if (!this.validateUUID(applicationData.assigned_locker_id)) {
        return this.createErrorResponse('储物柜ID格式无效', null, 400);
      }

      // Check if user exists
      const user = await this.userRepo.findById(applicationData.user_id);
      if (!user) {
        return this.createErrorResponse('用户不存在', null, 404);
      }

      // Check if user is active
      if (user.status !== 'active') {
        return this.createErrorResponse('用户状态异常，无法申请', null, 403);
      }

      // Check if store exists and is active
      const store = await this.storeRepo.findById(applicationData.store_id);
      if (!store) {
        return this.createErrorResponse('门店不存在', null, 404);
      }
      if (store.status !== 'active') {
        return this.createErrorResponse('门店暂不可用', null, 403);
      }

      // Check if locker exists and belongs to the store
      const locker = await this.lockerRepo.findById(applicationData.assigned_locker_id);
      if (!locker) {
        return this.createErrorResponse('储物柜不存在', null, 404);
      }
      if (locker.store_id !== applicationData.store_id) {
        return this.createErrorResponse('储物柜不属于指定门店', null, 400);
      }
      if (locker.status !== 'available') {
        return this.createErrorResponse('储物柜不可用', null, 409);
      }

      // Check if user has pending applications
      const pendingApplications = await this.applicationRepo.findByUserId(
        applicationData.user_id, 
        { status: 'pending' }
      );
      if (pendingApplications && pendingApplications.length > 0) {
        return this.createErrorResponse('您已有待审核的申请，请等待处理完成', null, 409);
      }

      // Check if user already has approved application for this store
      const approvedApplications = await this.applicationRepo.findByUserId(
        applicationData.user_id,
        { status: 'approved', store_id: applicationData.store_id }
      );
      if (approvedApplications && approvedApplications.length > 0) {
        return this.createErrorResponse('您在该门店已有已批准的申请', null, 409);
      }

      // Sanitize input data
      const sanitizedData = {
        user_id: applicationData.user_id,
        store_id: applicationData.store_id,
        assigned_locker_id: applicationData.assigned_locker_id,
        reason: this.sanitizeString(applicationData.reason, 500),
        application_type: applicationData.application_type || 'new',
        status: 'pending'
      };

      // Create application
      const application = await this.applicationRepo.create(sanitizedData);

      // Update locker status to reserved
      await this.lockerRepo.updateStatus(applicationData.assigned_locker_id, 'reserved');

      return this.createSuccessResponse(application, '申请提交成功');
    }, { 
      user_id: applicationData.user_id, 
      store_id: applicationData.store_id,
      assigned_locker_id: applicationData.assigned_locker_id
    });
  }

  /**
   * Get application by ID
   */
  async getApplicationById(applicationId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('getApplicationById', async () => {
      if (!this.validateUUID(applicationId)) {
        return this.createErrorResponse('申请ID格式无效', null, 400);
      }

      const application = await this.applicationRepo.findById(applicationId);
      if (!application) {
        return this.createErrorResponse('申请不存在', null, 404);
      }

      return this.createSuccessResponse(application, '获取申请信息成功');
    }, { applicationId });
  }

  /**
   * Get applications with pagination and filters
   */
  async getApplications(
    page: number = 1,
    pageSize: number = 20,
    filters: ApplicationSearchFilters = {}
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getApplications', async () => {
      // Parse and validate pagination
      const pagination = this.parsePaginationParams(page, pageSize);

      // Validate UUID filters
      if (filters.store_id && !this.validateUUID(filters.store_id)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }
      if (filters.user_id && !this.validateUUID(filters.user_id)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }
      if (filters.admin_id && !this.validateUUID(filters.admin_id)) {
        return this.createErrorResponse('管理员ID格式无效', null, 400);
      }

      // Validate status filter
      if (filters.status && !['pending', 'approved', 'rejected'].includes(filters.status)) {
        return this.createErrorResponse('申请状态无效', null, 400);
      }

      // Validate application type filter
      if (filters.application_type && !['new', 'renewal', 'transfer'].includes(filters.application_type)) {
        return this.createErrorResponse('申请类型无效', null, 400);
      }

      // Get applications with filters
      const { applications, total } = await this.applicationRepo.findWithFilters(
        pagination.page,
        pagination.pageSize,
        filters
      );

      return this.createPaginatedResponse(
        applications,
        total,
        pagination.page,
        pagination.pageSize,
        '获取申请列表成功'
      );
    }, { page, pageSize, filters });
  }

  /**
   * Approve application
   */
  async approveApplication(
    applicationId: string,
    approvalData: ApprovalData
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('approveApplication', async () => {
      // Validate inputs
      if (!this.validateUUID(applicationId)) {
        return this.createErrorResponse('申请ID格式无效', null, 400);
      }
      if (!this.validateUUID(approvalData.admin_id)) {
        return this.createErrorResponse('管理员ID格式无效', null, 400);
      }

      // Get application
      const application = await this.applicationRepo.findById(applicationId);
      if (!application) {
        return this.createErrorResponse('申请不存在', null, 404);
      }

      // Check if application is still pending
      if (application.status !== 'pending') {
        return this.createErrorResponse('申请已处理，无法重复操作', null, 409);
      }

      // If assigned_locker_id is provided, validate and check availability
      let finalLockerId = application.assigned_locker_id;
      if (approvalData.assigned_locker_id) {
        if (!this.validateUUID(approvalData.assigned_locker_id)) {
          return this.createErrorResponse('储物柜ID格式无效', null, 400);
        }

        const newLocker = await this.lockerRepo.findById(approvalData.assigned_locker_id);
        if (!newLocker) {
          return this.createErrorResponse('指定储物柜不存在', null, 404);
        }
        if (newLocker.store_id !== application.store_id) {
          return this.createErrorResponse('储物柜不属于申请门店', null, 400);
        }
        if (newLocker.status !== 'available') {
          return this.createErrorResponse('指定储物柜不可用', null, 409);
        }

        finalLockerId = approvalData.assigned_locker_id;

        // If changing locker, release the old one
        if (finalLockerId !== application.assigned_locker_id) {
          await this.lockerRepo.updateStatus(application.assigned_locker_id, 'available');
          await this.lockerRepo.updateStatus(finalLockerId, 'reserved');
        }
      }

      // Prepare update data
      const updateData = {
        status: 'approved' as const,
        assigned_locker_id: finalLockerId,
        admin_id: approvalData.admin_id,
        approved_at: new Date(),
        approval_reason: approvalData.approval_reason ? this.sanitizeString(approvalData.approval_reason, 500) : undefined,
        admin_notes: approvalData.admin_notes ? this.sanitizeString(approvalData.admin_notes, 500) : undefined
      };

      // Update application
      const updatedApplication = await this.applicationRepo.update(applicationId, updateData);

      // Update locker status to occupied
      await this.lockerRepo.updateStatus(finalLockerId, 'occupied');

      return this.createSuccessResponse(updatedApplication, '申请审批成功');
    }, { applicationId, admin_id: approvalData.admin_id });
  }

  /**
   * Reject application
   */
  async rejectApplication(
    applicationId: string,
    rejectionData: RejectionData
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('rejectApplication', async () => {
      // Validate inputs
      if (!this.validateUUID(applicationId)) {
        return this.createErrorResponse('申请ID格式无效', null, 400);
      }
      if (!this.validateUUID(rejectionData.admin_id)) {
        return this.createErrorResponse('管理员ID格式无效', null, 400);
      }

      const validation = this.validateRequired(rejectionData, ['rejection_reason']);
      if (validation) {
        return validation;
      }

      // Get application
      const application = await this.applicationRepo.findById(applicationId);
      if (!application) {
        return this.createErrorResponse('申请不存在', null, 404);
      }

      // Check if application is still pending
      if (application.status !== 'pending') {
        return this.createErrorResponse('申请已处理，无法重复操作', null, 409);
      }

      // Prepare update data
      const updateData = {
        status: 'rejected' as const,
        admin_id: rejectionData.admin_id,
        rejected_at: new Date(),
        rejection_reason: this.sanitizeString(rejectionData.rejection_reason, 500),
        admin_notes: rejectionData.admin_notes ? this.sanitizeString(rejectionData.admin_notes, 500) : undefined
      };

      // Update application
      const updatedApplication = await this.applicationRepo.update(applicationId, updateData);

      // Release reserved locker
      await this.lockerRepo.updateStatus(application.assigned_locker_id, 'available');

      return this.createSuccessResponse(updatedApplication, '申请已拒绝');
    }, { applicationId, admin_id: rejectionData.admin_id });
  }

  /**
   * Cancel application (user-initiated)
   */
  async cancelApplication(applicationId: string, userId: string): Promise<ServiceResponse<any>> {
    return this.executeOperation('cancelApplication', async () => {
      if (!this.validateUUID(applicationId)) {
        return this.createErrorResponse('申请ID格式无效', null, 400);
      }
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      // Get application
      const application = await this.applicationRepo.findById(applicationId);
      if (!application) {
        return this.createErrorResponse('申请不存在', null, 404);
      }

      // Check if user owns the application
      if (application.user_id !== userId) {
        return this.createErrorResponse('无权操作此申请', null, 403);
      }

      // Check if application can be canceled
      if (application.status !== 'pending') {
        return this.createErrorResponse('申请已处理，无法取消', null, 409);
      }

      // Update application status
      const updateData = {
        status: 'rejected' as const,
        rejection_reason: '用户主动取消',
        rejected_at: new Date()
      };

      const updatedApplication = await this.applicationRepo.update(applicationId, updateData);

      // Release reserved locker
      await this.lockerRepo.updateStatus(application.assigned_locker_id, 'available');

      return this.createSuccessResponse(updatedApplication, '申请已取消');
    }, { applicationId, userId });
  }

  /**
   * Get application statistics
   */
  async getApplicationStatistics(
    storeId?: string,
    adminId?: string
  ): Promise<ServiceResponse<ApplicationStatistics>> {
    return this.executeOperation('getApplicationStatistics', async () => {
      // Validate parameters if provided
      if (storeId && !this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }
      if (adminId && !this.validateUUID(adminId)) {
        return this.createErrorResponse('管理员ID格式无效', null, 400);
      }

      const stats = await this.applicationRepo.getApplicationStatistics(storeId, adminId);

      return this.createSuccessResponse(stats, '获取申请统计成功');
    }, { storeId, adminId });
  }

  /**
   * Get pending applications count
   */
  async getPendingApplicationsCount(storeId?: string): Promise<ServiceResponse<{ count: number }>> {
    return this.executeOperation('getPendingApplicationsCount', async () => {
      if (storeId && !this.validateUUID(storeId)) {
        return this.createErrorResponse('门店ID格式无效', null, 400);
      }

      const count = await this.applicationRepo.countPendingApplications(storeId);

      return this.createSuccessResponse({ count }, '获取待审核申请数量成功');
    }, { storeId });
  }

  /**
   * Batch process applications
   */
  async batchProcessApplications(
    applicationIds: string[],
    action: 'approve' | 'reject',
    adminId: string,
    reason?: string
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('batchProcessApplications', async () => {
      // Validate inputs
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        return this.createErrorResponse('申请ID列表不能为空', null, 400);
      }

      if (applicationIds.length > 50) {
        return this.createErrorResponse('批量处理申请数量不能超过50个', null, 400);
      }

      if (!this.validateUUID(adminId)) {
        return this.createErrorResponse('管理员ID格式无效', null, 400);
      }

      if (!['approve', 'reject'].includes(action)) {
        return this.createErrorResponse('操作类型无效', null, 400);
      }

      // Validate all application IDs
      const invalidIds = applicationIds.filter(id => !this.validateUUID(id));
      if (invalidIds.length > 0) {
        return this.createErrorResponse('存在无效的申请ID格式', null, 400, { invalidIds });
      }

      // Process each application
      const results = [];
      const errors = [];

      for (const applicationId of applicationIds) {
        try {
          let result;
          if (action === 'approve') {
            result = await this.approveApplication(applicationId, {
              admin_id: adminId,
              approval_reason: reason
            });
          } else {
            result = await this.rejectApplication(applicationId, {
              admin_id: adminId,
              rejection_reason: reason || '批量拒绝'
            });
          }

          if (result.success) {
            results.push({ applicationId, success: true });
          } else {
            errors.push({ applicationId, error: result.error });
          }
        } catch (error) {
          errors.push({ applicationId, error: 'Processing failed' });
        }
      }

      return this.createSuccessResponse({
        total: applicationIds.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }, `批量${action === 'approve' ? '审批' : '拒绝'}完成`);
    }, { count: applicationIds.length, action, adminId });
  }

  /**
   * Get user's application history
   */
  async getUserApplicationHistory(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<any>> {
    return this.executeOperation('getUserApplicationHistory', async () => {
      if (!this.validateUUID(userId)) {
        return this.createErrorResponse('用户ID格式无效', null, 400);
      }

      const pagination = this.parsePaginationParams(page, pageSize);

      const { applications, total } = await this.applicationRepo.findByUserIdWithPagination(
        userId,
        pagination.page,
        pagination.pageSize
      );

      return this.createPaginatedResponse(
        applications,
        total,
        pagination.page,
        pagination.pageSize,
        '获取用户申请历史成功'
      );
    }, { userId, page, pageSize });
  }
}