/**
 * Store Controller - 门店控制器层
 * Handles HTTP requests for store management, locations, and store-related operations
 */

import { Request, Response } from 'express';
import { BaseController, AuthenticatedRequest } from './BaseController';
import { StoreService, CreateStoreData, UpdateStoreData, StoreSearchFilters } from '../services/StoreService';

export class StoreController extends BaseController {
  private storeService: StoreService;

  constructor() {
    super('StoreController');
    this.storeService = new StoreService();
  }

  /**
   * POST /api/stores
   * Create a new store
   */
  public createStore = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'createStore', { name: req.body.name });

    // Check permissions (only super admin can create stores)
    if (!this.isSuperAdmin(req)) {
      this.sendError(res, '权限不足，只有超级管理员可以创建门店', 403);
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['name', 'address'])) {
      return;
    }

    const storeData: CreateStoreData = {
      name: req.body.name,
      address: req.body.address,
      contact_phone: req.body.contact_phone,
      contact_person: req.body.contact_person,
      business_hours: req.body.business_hours,
      description: req.body.description,
      status: req.body.status
    };

    const result = await this.storeService.createStore(storeData);
    this.handleServiceResponse(res, result, 201);
  });

  /**
   * GET /api/stores
   * Get stores with pagination and filters
   */
  public getStores = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getStores', req.query);

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    // Parse filters
    const allowedFilters = ['status', 'search', 'created_after', 'created_before'];
    const filters = this.parseFilters(req, allowedFilters) as StoreSearchFilters;

    const result = await this.storeService.getStores(page, pageSize, filters);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/stores/active
   * Get all active stores (simple list for dropdowns)
   */
  public getActiveStores = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getActiveStores');

    const result = await this.storeService.getActiveStores();
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/stores/search
   * Search stores by name or address
   */
  public searchStores = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'searchStores', { query: req.query.q });

    // Check permissions
    const user = this.getAuthenticatedUser(req);
    if (!user || (!this.isSuperAdmin(req) && !this.isStoreAdmin(req))) {
      this.sendError(res, '权限不足', 403);
      return;
    }

    const { q: query, limit } = req.query;
    
    if (!query || typeof query !== 'string') {
      this.sendError(res, '缺少搜索关键词', 400);
      return;
    }

    const limitNum = limit ? parseInt(limit as string) : 20;
    const result = await this.storeService.searchStores(query, limitNum);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/stores/statistics
   * Get store statistics
   */
  public getStoreStatistics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getStoreStatistics', req.query);

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

    const result = await this.storeService.getStoreStatistics(store_id as string);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/stores/:id
   * Get store by ID
   */
  public getStoreById = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getStoreById', { storeId: req.params.id });

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

    const result = await this.storeService.getStoreById(req.params.id);
    this.handleServiceResponse(res, result);
  });

  /**
   * PUT /api/stores/:id
   * Update store information
   */
  public updateStore = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'updateStore', { storeId: req.params.id, updates: Object.keys(req.body) });

    // Check permissions (only super admin can update stores)
    if (!this.isSuperAdmin(req)) {
      this.sendError(res, '权限不足，只有超级管理员可以修改门店信息', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const updateData: UpdateStoreData = {
      name: req.body.name,
      address: req.body.address,
      contact_phone: req.body.contact_phone,
      contact_person: req.body.contact_person,
      business_hours: req.body.business_hours,
      description: req.body.description,
      status: req.body.status
    };

    const result = await this.storeService.updateStore(req.params.id, updateData);
    this.handleServiceResponse(res, result);
  });

  /**
   * DELETE /api/stores/:id
   * Delete store (soft delete)
   */
  public deleteStore = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'deleteStore', { storeId: req.params.id });

    // Check permissions (only super admin can delete stores)
    if (!this.isSuperAdmin(req)) {
      this.sendError(res, '权限不足，只有超级管理员可以删除门店', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    const result = await this.storeService.deleteStore(req.params.id);
    this.handleServiceResponse(res, result);
  });

  /**
   * POST /api/stores/:id/status
   * Change store status
   */
  public changeStoreStatus = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'changeStoreStatus', { storeId: req.params.id, status: req.body.status });

    // Check permissions (only super admin can change store status)
    if (!this.isSuperAdmin(req)) {
      this.sendError(res, '权限不足，只有超级管理员可以修改门店状态', 403);
      return;
    }

    // Validate UUID parameter
    if (!this.validateUUIDParam(req, res, 'id')) {
      return;
    }

    // Validate required fields
    if (!this.validateRequiredFields(req, res, ['status'])) {
      return;
    }

    const { status, reason } = req.body;

    // Validate status value
    if (!['active', 'inactive', 'maintenance'].includes(status)) {
      this.sendError(res, '门店状态无效', 400);
      return;
    }

    const result = await this.storeService.changeStoreStatus(req.params.id, status, reason);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/stores/:id/lockers
   * Get store lockers with status
   */
  public getStoreLockers = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getStoreLockers', { storeId: req.params.id });

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

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    const result = await this.storeService.getStoreLockers(req.params.id, page, pageSize);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/stores/:id/users
   * Get store users
   */
  public getStoreUsers = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getStoreUsers', { storeId: req.params.id });

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

    // Parse pagination
    const { page, pageSize } = this.parsePagination(req);

    const result = await this.storeService.getStoreUsers(req.params.id, page, pageSize);
    this.handleServiceResponse(res, result);
  });

  /**
   * GET /api/stores/:id/capacity-analysis
   * Get store capacity analysis
   */
  public getStoreCapacityAnalysis = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    this.logRequest(req, 'getStoreCapacityAnalysis', { storeId: req.params.id });

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

    const result = await this.storeService.getStoreCapacityAnalysis(req.params.id);
    this.handleServiceResponse(res, result);
  });
}

export default new StoreController();