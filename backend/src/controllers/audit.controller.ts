import { Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import { sendSuccess, sendError, sendPaginated, asyncHandler } from '../utils/response.utils';
import { hasAdminPermission } from '../middleware/admin.middleware';
import { z } from 'zod';

const auditLogService = new AuditLogService();

// Validation schemas
const auditQuerySchema = z.object({
  userId: z.string().optional(),
  adminId: z.string().optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

const securityEventQuerySchema = z.object({
  userId: z.string().optional(),
  type: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  resolved: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

const systemLogQuerySchema = z.object({
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).optional(),
  module: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

const resolveSecurityEventSchema = z.object({
  resolution: z.string().min(1, 'Resolution description is required')
});

/**
 * Get audit logs
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'admin', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const queryParams = {
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const validatedQuery = auditQuerySchema.parse(queryParams);

    const options = {
      ...validatedQuery,
      startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
      endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined
    };

    const result = await auditLogService.getAuditLogs(options);
    
    sendPaginated(res, result.logs, result.pagination, 'Audit logs retrieved successfully');
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid query parameters', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Get user's own audit logs
 */
export const getUserAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const action = req.query.action as string;
    const entityType = req.query.entityType as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await auditLogService.getAuditLogs({
      userId,
      action,
      entityType,
      startDate,
      endDate,
      page,
      limit
    });

    sendPaginated(res, result.logs, result.pagination, 'User audit logs retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Get security events
 */
export const getSecurityEvents = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'admin', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const queryParams = {
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      resolved: req.query.resolved ? req.query.resolved === 'true' : undefined
    };

    const validatedQuery = securityEventQuerySchema.parse(queryParams);

    const options = {
      ...validatedQuery,
      startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
      endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined
    };

    const result = await auditLogService.getSecurityEvents(options);
    
    sendPaginated(res, result.events, result.pagination, 'Security events retrieved successfully');
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid query parameters', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Resolve security event
 */
export const resolveSecurityEvent = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  const { eventId } = req.params;
  
  if (!admin || !hasAdminPermission(admin, 'admin', 'update')) {
    return sendError(res, 'Permission denied', 403);
  }

  if (!eventId) {
    return sendError(res, 'Event ID is required', 400);
  }

  try {
    const validatedData = resolveSecurityEventSchema.parse(req.body);

    const success = await auditLogService.resolveSecurityEvent(
      eventId,
      admin.id,
      validatedData.resolution
    );

    if (success) {
      sendSuccess(res, null, 'Security event resolved successfully');
    } else {
      sendError(res, 'Failed to resolve security event', 500);
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid resolution data', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Get system logs
 */
export const getSystemLogs = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'system', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const queryParams = {
      ...req.query,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const validatedQuery = systemLogQuerySchema.parse(queryParams);

    const options = {
      ...validatedQuery,
      startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
      endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined
    };

    const result = await auditLogService.getSystemLogs(options);
    
    sendPaginated(res, result.logs, result.pagination, 'System logs retrieved successfully');
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendError(res, 'Invalid query parameters', 400, error.errors);
    }
    throw error;
  }
});

/**
 * Get audit statistics
 */
export const getAuditStatistics = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'analytics', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const statistics = await auditLogService.getAuditStatistics(startDate, endDate);
    
    sendSuccess(res, statistics, 'Audit statistics retrieved successfully');
  } catch (error: any) {
    throw error;
  }
});

/**
 * Clean up old logs (admin maintenance)
 */
export const cleanupOldLogs = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || admin.role !== 'super_admin') {
    return sendError(res, 'Super admin access required', 403);
  }

  try {
    const retentionDays = parseInt(req.query.retentionDays as string) || 90;

    if (retentionDays < 30) {
      return sendError(res, 'Retention period must be at least 30 days', 400);
    }

    await auditLogService.cleanupOldLogs(retentionDays);
    
    sendSuccess(res, null, `Old logs cleaned up (retention: ${retentionDays} days)`);
  } catch (error: any) {
    throw error;
  }
});

/**
 * Export audit logs
 */
export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const admin = req.admin;
  
  if (!admin || !hasAdminPermission(admin, 'admin', 'read')) {
    return sendError(res, 'Permission denied', 403);
  }

  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const format = (req.query.format as string) || 'json';

    if (!['json', 'csv'].includes(format)) {
      return sendError(res, 'Invalid export format. Use json or csv', 400);
    }

    // Get all audit logs for the period (without pagination)
    const result = await auditLogService.getAuditLogs({
      startDate,
      endDate,
      limit: 10000 // Large limit for export
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertAuditLogsToCSV(result.logs);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      res.send(csvData);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.json"');
      res.json({
        exportedAt: new Date().toISOString(),
        period: { startDate, endDate },
        totalRecords: result.logs.length,
        logs: result.logs
      });
    }
  } catch (error: any) {
    throw error;
  }
});

/**
 * Helper function to convert audit logs to CSV
 */
function convertAuditLogsToCSV(logs: any[]): string {
  if (logs.length === 0) {
    return 'No data available';
  }

  const headers = [
    'ID', 'Action', 'Entity Type', 'Entity ID', 'User', 'Admin', 
    'IP Address', 'Status', 'Created At'
  ];

  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = [
      log.id,
      log.action,
      log.entityType,
      log.entityId || '',
      log.user?.name || '',
      log.admin?.name || '',
      log.ipAddress || '',
      log.status,
      log.createdAt
    ];
    
    csvRows.push(row.map(field => `"${field}"`).join(','));
  });

  return csvRows.join('\n');
}