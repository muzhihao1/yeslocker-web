/**
 * Base Repository - 基础数据访问层
 * Provides common CRUD operations and query building for all entities
 */

import { Model, QueryBuilder, Page } from 'objection';
import { BaseModel } from '../models/BaseModel';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface SortOptions {
  field?: string;
  direction?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export abstract class BaseRepository<T extends BaseModel> {
  protected model: typeof BaseModel;

  constructor(model: typeof BaseModel) {
    this.model = model;
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const result = await this.model.query().findById(id);
      return result as T | null;
    } catch (error) {
      this.handleError('findById', error, { id });
      return null;
    }
  }

  /**
   * Find entity by ID with relations
   */
  async findByIdWithRelations(id: string, relations: string[]): Promise<T | null> {
    try {
      const result = await this.model.query()
        .findById(id)
        .withGraphFetched(`[${relations.join(', ')}]`);
      return result as T | null;
    } catch (error) {
      this.handleError('findByIdWithRelations', error, { id, relations });
      return null;
    }
  }

  /**
   * Find all entities
   */
  async findAll(options?: { 
    limit?: number; 
    offset?: number;
    sort?: SortOptions;
  }): Promise<T[]> {
    try {
      let query = this.model.query();

      if (options?.sort) {
        query = query.orderBy(options.sort.field || 'created_at', options.sort.direction || 'desc');
      } else {
        query = query.orderBy('created_at', 'desc');
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query;
      return results as T[];
    } catch (error) {
      this.handleError('findAll', error, options);
      return [];
    }
  }

  /**
   * Find entities with pagination
   */
  async findPaginated(pagination: PaginationOptions, sort?: SortOptions): Promise<SearchResult<T>> {
    try {
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 20, 100); // Max 100 per page

      let query = this.model.query();

      if (sort) {
        query = query.orderBy(sort.field || 'created_at', sort.direction || 'desc');
      } else {
        query = query.orderBy('created_at', 'desc');
      }

      const result: Page<Model> = await query.page(page - 1, pageSize);

      return {
        data: result.results as T[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('findPaginated', error, { pagination, sort });
      return {
        data: [],
        total: 0,
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 20,
        totalPages: 0
      };
    }
  }

  /**
   * Create new entity
   */
  async create(data: Partial<T>): Promise<T | null> {
    try {
      const result = await this.model.query().insert(data);
      return result as T;
    } catch (error) {
      this.handleError('create', error, data);
      return null;
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      const result = await this.model.query()
        .patchAndFetchById(id, data);
      return result as T | null;
    } catch (error) {
      this.handleError('update', error, { id, data });
      return null;
    }
  }

  /**
   * Delete entity by ID (soft delete if supported)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const count = await this.model.query().deleteById(id);
      return count > 0;
    } catch (error) {
      this.handleError('delete', error, { id });
      return false;
    }
  }

  /**
   * Count entities with optional where conditions
   */
  async count(whereConditions?: Record<string, any>): Promise<number> {
    try {
      let query = this.model.query();

      if (whereConditions) {
        query = query.where(whereConditions);
      }

      const result = await query.resultSize();
      return result;
    } catch (error) {
      this.handleError('count', error, whereConditions);
      return 0;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.model.query()
        .findById(id)
        .resultSize();
      return count > 0;
    } catch (error) {
      this.handleError('exists', error, { id });
      return false;
    }
  }

  /**
   * Find entities by field value
   */
  async findBy(field: string, value: any, options?: {
    limit?: number;
    relations?: string[];
  }): Promise<T[]> {
    try {
      let query = this.model.query().where(field, value);

      if (options?.relations) {
        query = query.withGraphFetched(`[${options.relations.join(', ')}]`);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const results = await query;
      return results as T[];
    } catch (error) {
      this.handleError('findBy', error, { field, value, options });
      return [];
    }
  }

  /**
   * Find single entity by field value
   */
  async findOneBy(field: string, value: any, relations?: string[]): Promise<T | null> {
    try {
      let query = this.model.query().where(field, value).first();

      if (relations) {
        query = query.withGraphFetched(`[${relations.join(', ')}]`);
      }

      const result = await query;
      return result as T | null;
    } catch (error) {
      this.handleError('findOneBy', error, { field, value, relations });
      return null;
    }
  }

  /**
   * Find entities with custom where conditions
   */
  async findWhere(conditions: Record<string, any>, options?: {
    limit?: number;
    offset?: number;
    sort?: SortOptions;
    relations?: string[];
  }): Promise<T[]> {
    try {
      let query = this.model.query().where(conditions);

      if (options?.relations) {
        query = query.withGraphFetched(`[${options.relations.join(', ')}]`);
      }

      if (options?.sort) {
        query = query.orderBy(options.sort.field || 'created_at', options.sort.direction || 'desc');
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query;
      return results as T[];
    } catch (error) {
      this.handleError('findWhere', error, { conditions, options });
      return [];
    }
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(data: Partial<T>[]): Promise<T[]> {
    try {
      const results = await this.model.query().insert(data);
      return results as T[];
    } catch (error) {
      this.handleError('bulkCreate', error, { count: data.length });
      return [];
    }
  }

  /**
   * Bulk update entities
   */
  async bulkUpdate(ids: string[], data: Partial<T>): Promise<number> {
    try {
      const count = await this.model.query()
        .whereIn('id', ids)
        .patch(data);
      return count;
    } catch (error) {
      this.handleError('bulkUpdate', error, { ids, data });
      return 0;
    }
  }

  /**
   * Execute custom query builder
   */
  protected createQuery(): QueryBuilder<Model, Model[]> {
    return this.model.query();
  }

  /**
   * Error handling helper
   */
  protected handleError(operation: string, error: any, context?: any): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const modelName = this.model.name;
    
    console.error(`❌ Repository Error [${modelName}.${operation}]:`, {
      error: errorMessage,
      context,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Log to external service
    }
  }

  /**
   * Transaction support
   */
  async withTransaction<R>(callback: (trx: any) => Promise<R>): Promise<R | null> {
    try {
      return await this.model.transaction(callback);
    } catch (error) {
      this.handleError('withTransaction', error);
      return null;
    }
  }

  /**
   * Health check for repository
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.model.query().limit(1);
      return true;
    } catch (error) {
      this.handleError('healthCheck', error);
      return false;
    }
  }

  /**
   * Get repository statistics
   */
  async getStats(): Promise<{
    total: number;
    modelName: string;
    tableName: string;
  }> {
    const total = await this.count();
    return {
      total,
      modelName: this.model.name,
      tableName: this.model.tableName
    };
  }
}