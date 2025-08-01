import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/audit-log.service';

const auditLogService = new AuditLogService();

// Extend Request type to include audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        action?: string;
        entityType?: string;
        entityId?: string;
        oldValues?: any;
        skipAudit?: boolean;
      };
    }
  }
}

/**
 * Middleware to automatically log API requests
 */
export const auditMiddleware = (action?: string, entityType?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    
    // Set up audit context
    req.auditContext = {
      action: action || deriveActionFromRequest(req),
      entityType: entityType || deriveEntityTypeFromRequest(req),
      entityId: req.params.id || req.params.userId || req.params.workspaceId || req.params.entryId,
      skipAudit: false
    };

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData: any;
    let statusCode: number;

    // Override response methods to capture data
    res.send = function(data: any) {
      responseData = data;
      statusCode = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Log the request after response is sent
    res.on('finish', async () => {
      try {
        // Skip audit logging if explicitly requested
        if (req.auditContext?.skipAudit) {
          return;
        }

        // Skip audit logging for certain routes
        if (shouldSkipAudit(req)) {
          return;
        }

        const requestInfo = auditLogService.extractRequestInfo(req);
        const duration = Date.now() - startTime;

        // Determine if this was an admin action
        const isAdminAction = req.originalUrl.startsWith('/api/v1/admin');
        const userId = req.user?.id;
        const adminId = isAdminAction ? userId : undefined;

        // Extract entity ID from various sources
        const entityId = req.auditContext?.entityId || 
                        extractEntityIdFromResponse(responseData) ||
                        extractEntityIdFromBody(req.body);

        // Prepare audit log entry
        const auditEntry = {
          action: req.auditContext?.action || 'UNKNOWN',
          entityType: req.auditContext?.entityType || 'unknown',
          entityId,
          userId: isAdminAction ? undefined : userId,
          adminId,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
          sessionId: requestInfo.sessionId,
          requestId: requestInfo.requestId,
          details: {
            method: req.method,
            url: req.originalUrl,
            statusCode,
            duration,
            query: req.query,
            body: sanitizeBody(req.body),
            isAdminAction
          },
          oldValues: req.auditContext?.oldValues,
          newValues: extractNewValuesFromResponse(responseData),
          status: statusCode >= 200 && statusCode < 300 ? 'success' as const : 'failed' as const,
          errorMessage: statusCode >= 400 ? getErrorMessage(responseData) : undefined
        };

        // Log the activity
        await auditLogService.logActivity(auditEntry);

        // Log security events for suspicious activities
        await checkForSecurityEvents(req, res, auditEntry);

      } catch (error) {
        console.error('Audit logging failed:', error);
        // Don't throw - audit failures shouldn't break the request
      }
    });

    next();
  };
};

/**
 * Middleware to set audit context for specific actions
 */
export const setAuditContext = (action: string, entityType: string, entityId?: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.auditContext = {
      action,
      entityType,
      entityId: entityId || req.auditContext?.entityId
    };
    next();
  };
};

/**
 * Middleware to capture old values before update operations
 */
export const captureOldValues = (entityType: string, getEntityFn: (req: Request) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const oldValues = await getEntityFn(req);
        if (req.auditContext) {
          req.auditContext.oldValues = oldValues;
        } else {
          req.auditContext = { oldValues };
        }
      }
    } catch (error) {
      console.error('Failed to capture old values:', error);
      // Continue without old values rather than fail the request
    }
    next();
  };
};

/**
 * Middleware to skip audit logging
 */
export const skipAudit = (req: Request, res: Response, next: NextFunction): void => {
  if (req.auditContext) {
    req.auditContext.skipAudit = true;
  } else {
    req.auditContext = { skipAudit: true };
  }
  next();
};

/**
 * Helper functions
 */

function deriveActionFromRequest(req: Request): string {
  const method = req.method;
  const path = req.originalUrl;

  // Map HTTP methods to actions
  const methodActions: { [key: string]: string } = {
    'POST': 'CREATE',
    'GET': 'READ',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };

  let action = methodActions[method] || 'UNKNOWN';

  // Special cases based on path
  if (path.includes('/login')) action = 'LOGIN';
  if (path.includes('/logout')) action = 'LOGOUT';
  if (path.includes('/export')) action = 'EXPORT';
  if (path.includes('/like')) action = 'LIKE';
  if (path.includes('/comment')) action = 'COMMENT';
  if (path.includes('/publish')) action = 'PUBLISH';
  if (path.includes('/suspend')) action = 'SUSPEND';
  if (path.includes('/activate')) action = 'ACTIVATE';

  return action;
}

function deriveEntityTypeFromRequest(req: Request): string {
  const path = req.originalUrl;

  if (path.includes('/users')) return 'user';
  if (path.includes('/journal')) return 'journal_entry';
  if (path.includes('/workspaces')) return 'workspace';
  if (path.includes('/goals')) return 'goal';
  if (path.includes('/achievements')) return 'achievement';
  if (path.includes('/notifications')) return 'notification';
  if (path.includes('/export')) return 'export';
  if (path.includes('/admin')) return 'admin';

  return 'unknown';
}

function shouldSkipAudit(req: Request): boolean {
  const path = req.originalUrl;
  
  // Skip audit for certain paths
  const skipPaths = [
    '/health',
    '/api/v1/auth/refresh',
    '/api/v1/admin/permissions',
    '/api/v1/system/metrics',
    '/api/v1/audit' // Don't audit the audit endpoints themselves
  ];

  return skipPaths.some(skipPath => path.includes(skipPath));
}

function extractEntityIdFromResponse(responseData: any): string | undefined {
  if (!responseData) return undefined;
  
  try {
    const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    return parsed?.data?.id || parsed?.id;
  } catch {
    return undefined;
  }
}

function extractEntityIdFromBody(body: any): string | undefined {
  return body?.id;
}

function extractNewValuesFromResponse(responseData: any): any {
  if (!responseData) return undefined;
  
  try {
    const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    return parsed?.data || parsed;
  } catch {
    return undefined;
  }
}

function sanitizeBody(body: any): any {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

function getErrorMessage(responseData: any): string | undefined {
  if (!responseData) return undefined;
  
  try {
    const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    return parsed?.message || parsed?.error;
  } catch {
    return undefined;
  }
}

async function checkForSecurityEvents(req: Request, res: Response, auditEntry: any): Promise<void> {
  try {
    const statusCode = res.statusCode;
    const path = req.originalUrl;
    const method = req.method;
    
    // Failed login attempts
    if (path.includes('/login') && statusCode === 401) {
      await auditLogService.logSecurityEvent({
        type: 'login_failed',
        severity: 'medium',
        description: `Failed login attempt for ${req.body?.email || 'unknown user'}`,
        userId: undefined,
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent,
        metadata: { path, method }
      });
    }

    // Multiple failed requests from same IP
    if (statusCode >= 400) {
      // This would require implementing rate limiting tracking
      // For now, we'll just log high-frequency failures
    }

    // Admin actions on sensitive resources
    if (auditEntry.isAdminAction && ['DELETE', 'SUSPEND'].includes(auditEntry.action)) {
      await auditLogService.logSecurityEvent({
        type: 'admin_sensitive_action',
        severity: 'medium',
        description: `Admin performed ${auditEntry.action} on ${auditEntry.entityType}`,
        userId: auditEntry.adminId,
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent,
        metadata: { 
          action: auditEntry.action,
          entityType: auditEntry.entityType,
          entityId: auditEntry.entityId
        }
      });
    }

    // Data export activities
    if (path.includes('/export') && statusCode < 300) {
      await auditLogService.logSecurityEvent({
        type: 'data_export',
        severity: 'low',
        description: 'User initiated data export',
        userId: auditEntry.userId,
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent,
        metadata: { exportType: req.body?.type || 'unknown' }
      });
    }

  } catch (error) {
    console.error('Failed to check for security events:', error);
  }
}