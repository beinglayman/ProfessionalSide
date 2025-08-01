import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response, 
  data?: T, 
  message?: string, 
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response, 
  error: string, 
  statusCode: number = 400,
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error,
    ...(details && { details })
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
): Response => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    ...(message && { message }),
    pagination: {
      ...pagination,
      totalPages
    }
  };
  
  return res.status(200).json(response);
};

/**
 * Handle async route errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};