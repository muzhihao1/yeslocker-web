/**
 * Base Service - 基础服务层
 * Provides common functionality for all business services
 */

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export abstract class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Create a successful response
   */
  protected createSuccessResponse<T>(
    data?: T, 
    message?: string
  ): ServiceResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Create an error response
   */
  protected createErrorResponse(
    error: string, 
    details?: any,
    statusCode?: number
  ): ServiceResponse {
    return {
      success: false,
      error,
      details,
      statusCode
    };
  }

  /**
   * Handle and log service errors
   */
  protected handleServiceError(
    operation: string, 
    error: any, 
    context?: any
  ): ServiceResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Service Error [${this.serviceName}.${operation}]:`, {
      error: errorMessage,
      context,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Determine status code based on error type
    let statusCode = 500;
    let userMessage = '系统错误，请稍后重试';

    if (error instanceof Error) {
      // Map specific error types to status codes
      if (error.message.includes('not found') || error.message.includes('不存在')) {
        statusCode = 404;
        userMessage = '请求的资源不存在';
      } else if (error.message.includes('already exists') || error.message.includes('已存在')) {
        statusCode = 409;
        userMessage = '资源已存在';
      } else if (error.message.includes('unauthorized') || error.message.includes('无权限')) {
        statusCode = 403;
        userMessage = '权限不足';
      } else if (error.message.includes('invalid') || error.message.includes('无效')) {
        statusCode = 400;
        userMessage = '请求参数无效';
      }
    }

    return this.createErrorResponse(userMessage, {
      operation,
      timestamp: new Date().toISOString(),
      // Only include technical details in development
      technical: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, statusCode);
  }

  /**
   * Validate required fields
   */
  protected validateRequired(
    data: Record<string, any>, 
    requiredFields: string[]
  ): ServiceResponse | null {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      return this.createErrorResponse(
        '缺少必需参数',
        { missingFields },
        400
      );
    }

    return null;
  }

  /**
   * Validate phone number format (Chinese mobile)
   */
  protected validatePhone(phone: string): boolean {
    const phoneRegex = /^[0-9]{11}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate UUID format
   */
  protected validateUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Sanitize string input
   */
  protected sanitizeString(input: string, maxLength?: number): string {
    let sanitized = input.trim();
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>\"']/g, '');
    
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Log service operation
   */
  protected logOperation(
    operation: string, 
    params?: any, 
    result?: any
  ): void {
    console.log(`📋 Service [${this.serviceName}.${operation}]:`, {
      params: this.sanitizeLogParams(params),
      success: !!result?.success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeLogParams(params: any): any {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sanitized = { ...params };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }

  /**
   * Create paginated response
   */
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message?: string
  ): ServiceResponse<{
    list: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const totalPages = Math.ceil(total / pageSize);
    
    return this.createSuccessResponse({
      list: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    }, message);
  }

  /**
   * Execute operation with try-catch wrapper
   */
  protected async executeOperation<T>(
    operation: string,
    operationFn: () => Promise<T>,
    context?: any
  ): Promise<ServiceResponse<T>> {
    try {
      this.logOperation(operation, context);
      const result = await operationFn();
      
      // If result is already a ServiceResponse, return it
      if (result && typeof result === 'object' && 'success' in result) {
        return result as ServiceResponse<T>;
      }
      
      // Otherwise wrap in success response
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.handleServiceError(operation, error, context);
    }
  }

  /**
   * Format date for consistent API responses
   */
  protected formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString();
  }

  /**
   * Parse pagination parameters
   */
  protected parsePaginationParams(
    page?: string | number,
    pageSize?: string | number
  ): { page: number; pageSize: number } {
    const parsedPage = Math.max(1, parseInt(String(page || 1)));
    const parsedPageSize = Math.min(100, Math.max(1, parseInt(String(pageSize || 20))));
    
    return {
      page: parsedPage,
      pageSize: parsedPageSize
    };
  }

  /**
   * Check if service response indicates success
   */
  protected isSuccess<T>(response: ServiceResponse<T>): response is ServiceResponse<T> & { success: true; data: T } {
    return response.success === true;
  }

  /**
   * Extract data from successful service response
   */
  protected extractData<T>(response: ServiceResponse<T>): T | null {
    return this.isSuccess(response) ? response.data! : null;
  }

  /**
   * Chain service operations (stop on first error)
   */
  protected async chainOperations<T1, T2, T3>(
    op1: () => Promise<ServiceResponse<T1>>,
    op2: (data1: T1) => Promise<ServiceResponse<T2>>,
    op3?: (data1: T1, data2: T2) => Promise<ServiceResponse<T3>>
  ): Promise<ServiceResponse<T3 | T2>> {
    const result1 = await op1();
    if (!this.isSuccess(result1)) {
      return result1;
    }

    const result2 = await op2(result1.data);
    if (!this.isSuccess(result2)) {
      return result2;
    }

    if (op3) {
      return await op3(result1.data, result2.data);
    }

    return result2;
  }
}