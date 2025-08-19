/**
 * Application Controller - 申请控制器层
 * Handles HTTP requests for locker applications, approvals, and application lifecycle management
 */

import { Request, Response } from 'express';
import { BaseController, AuthenticatedRequest } from './BaseController';
import { 
  ApplicationService, 
  CreateApplicationData, 
  ApplicationSearchFilters,
  ApprovalData,
  RejectionData 
} from '../services/ApplicationService';

export class ApplicationController extends BaseController {
  private applicationService: ApplicationService;

  constructor() {
    super('ApplicationController');
    this.applicationService = new ApplicationService();
  }

  /**
   * POST /api/applications
   * Create a new application
   */
  public createApplication = this.asyncHandler(async (req: Request, res: Response) => {
    this.logRequest(req, 'createApplication', { 
      user_id: req.body.user_id, 
      store_id: req.body.store_id,
      assigned_locker_id: req.body.assigned_locker_id 
    });

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['user_id', 'store_id', 'assigned_locker_id', 'reason'])) {
      return;
    }

    const applicationData: CreateApplicationData = {
      user_id: req.body.user_id,
      store_id: req.body.store_id,
      assigned_locker_id: req.body.assigned_locker_id,
      reason: req.body.reason,
      application_type: req.body.application_type
    };

    const result = await this.applicationService.createApplication(applicationData);
    this.handleServiceResponse(res, result, 201);
  });

  /**
   * GET /api/applications
   * Get applications with pagination and filters
   */
  public getApplications = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getApplications', req.query);

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    // Parse filters
    const allowedFilters = [
      'status', 'store_id', 'user_id', 'admin_id', 'application_type',
      'created_after', 'created_before', 'approved_after', 'approved_before'
    ];
    const filters = this.parseFilters(req, allowedFilters) as ApplicationSearchFilters;

    const result = await this.applicationService.getApplications(page, pageSize, filters);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/applications/pending-count
   * Get pending applications count
   */
  public getPendingCount = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getPendingCount', req.query);

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    const { store_id } = req.query;

    // Validate store_id if provided
    if (store_id && typeof store_id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(store_id)) {
        this.sendError(res, '门店ID格式无效', 400);
        return;
      }
    }

    const result = await this.applicationService.getPendingApplicationsCount(store_id as string);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/applications/statistics
   * Get application statistics
   */
  public getStatistics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getStatistics', req.query);

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    const { store_id, admin_id } = req.query;

    // Validate parameters if provided
    if (store_id && typeof store_id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(store_id)) {
        this.sendError(res, '门店ID格式无效', 400);
        return;
      }
    }

    if (admin_id && typeof admin_id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(admin_id)) {
        this.sendError(res, '管理员ID格式无效', 400);
        return;
      }
    }

    const result = await this.applicationService.getApplicationStatistics(
      store_id as string,
      admin_id as string
    );
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/applications/batch-process
   * Batch process applications
   */
  public batchProcess = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'batchProcess', { 
      count: req.body.applicationIds?.length,
      action: req.body.action 
    });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['applicationIds', 'action'])) {
      return;
    }

    const { applicationIds, action, reason } = req.body;

    const result = await this.applicationService.batchProcessApplications(
      applicationIds,
      action,
      user.adminId,
      reason
    );
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/applications/:id
   * Get application by ID
   */
  public getApplicationById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getApplicationById', { applicationId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const result = await this.applicationService.getApplicationById(req.params.id);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/applications/:id/approve
   * Approve application
   */
  public approveApplication = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'approveApplication', { applicationId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const approvalData: ApprovalData = {
      admin_id: user.adminId,
      assigned_locker_id: req.body.assigned_locker_id,
      approval_reason: req.body.approval_reason,
      admin_notes: req.body.admin_notes
    };

    const result = await this.applicationService.approveApplication(req.params.id, approvalData);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/applications/:id/reject
   * Reject application
   */
  public rejectApplication = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'rejectApplication', { applicationId: req.params.id });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['rejection_reason'])) {
      return;
    }

    const rejectionData: RejectionData = {
      admin_id: user.adminId,
      rejection_reason: req.body.rejection_reason,
      admin_notes: req.body.admin_notes
    };

    const result = await this.applicationService.rejectApplication(req.params.id, rejectionData);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/applications/:id/cancel
   * Cancel application (user-initiated)
   */
  public cancelApplication = this.asyncHandler(async (req: Request, res: Response) => {
    this.logRequest(req, 'cancelApplication', { applicationId: req.params.id });

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['user_id'])) {
      return;
    }

    const { user_id } = req.body;

    const result = await this.applicationService.cancelApplication(req.params.id, user_id);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/applications/user/:userId/history
   * Get user's application history
   */
  public getUserApplicationHistory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getUserApplicationHistory', { userId: req.params.userId });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'userId')) {
      return;
    }

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    const result = await this.applicationService.getUserApplicationHistory(
      req.params.userId,
      page,
      pageSize
    );
    this.handleServiceResponse(res, result);
  });
}

export default new ApplicationController();