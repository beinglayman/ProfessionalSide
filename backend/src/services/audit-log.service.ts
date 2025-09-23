import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  oldValues?: any;
  newValues?: any;
  status?: 'success' | 'failed' | 'error';
  errorMessage?: string;
  sessionId?: string;
  requestId?: string;
}

export interface SecurityEventEntry {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  metadata?: any;
}

export interface SystemLogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  module?: string;
  function?: string;
  metadata?: any;
  stackTrace?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
}

export class AuditLogService {
  
  /**
   * Log user activity
   */
  async logActivity(entry: AuditLogEntry): Promise<string> {
    try {
      const auditLog = await prisma.audit_logs.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          userId: entry.userId,
          adminId: entry.adminId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          details: entry.details || {},
          oldValues: entry.oldValues || {},
          newValues: entry.newValues || {},
          status: entry.status || 'success',
          errorMessage: entry.errorMessage,
          sessionId: entry.sessionId,
          requestId: entry.requestId
        }
      });

      return auditLog.id;
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error - audit logging should not break the main flow
      return '';
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: SecurityEventEntry): Promise<string> {
    try {
      const securityEvent = await prisma.securityEvent.create({
        data: {
          type: event.type,
          severity: event.severity,
          description: event.description,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          location: event.location,
          metadata: event.metadata || {}
        }
      });

      // For high severity events, we might want to send alerts
      if (event.severity === 'high' || event.severity === 'critical') {
        this.alertHighSeverityEvent(securityEvent.id, event);
      }

      return securityEvent.id;
    } catch (error) {
      console.error('Failed to log security event:', error);
      return '';
    }
  }

  /**
   * Log system message
   */
  async logSystem(log: SystemLogEntry): Promise<string> {
    try {
      const systemLog = await prisma.systemLog.create({
        data: {
          level: log.level,
          message: log.message,
          module: log.module,
          function: log.function,
          metadata: log.metadata || {},
          stackTrace: log.stackTrace,
          requestId: log.requestId,
          userId: log.userId,
          sessionId: log.sessionId
        }
      });

      return systemLog.id;
    } catch (error) {
      console.error('Failed to log system message:', error);
      return '';
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(options: {
    userId?: string;
    adminId?: string;
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        userId,
        adminId,
        entityType,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = options;

      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (userId) whereClause.userId = userId;
      if (adminId) whereClause.adminId = adminId;
      if (entityType) whereClause.entityType = entityType;
      if (action) whereClause.action = action;

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.audit_logs.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            admin: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.audit_logs.count({ where: whereClause })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(options: {
    userId?: string;
    type?: string;
    severity?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        userId,
        type,
        severity,
        resolved,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = options;

      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (userId) whereClause.userId = userId;
      if (type) whereClause.type = type;
      if (severity) whereClause.severity = severity;
      if (resolved !== undefined) whereClause.resolved = resolved;

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [events, total] = await Promise.all([
        prisma.securityEvent.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            resolver: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.securityEvent.count({ where: whereClause })
      ]);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get security events:', error);
      throw error;
    }
  }

  /**
   * Get system logs with filtering
   */
  async getSystemLogs(options: {
    level?: string;
    module?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        level,
        module,
        startDate,
        endDate,
        page = 1,
        limit = 100
      } = options;

      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (level) whereClause.level = level;
      if (module) whereClause.module = module;

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.systemLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.systemLog.count({ where: whereClause })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get system logs:', error);
      throw error;
    }
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(eventId: string, resolvedBy: string, resolution: string): Promise<boolean> {
    try {
      await prisma.securityEvent.update({
        where: { id: eventId },
        data: {
          resolved: true,
          resolvedBy,
          resolvedAt: new Date(),
          resolution
        }
      });

      // Log the resolution activity
      await this.logActivity({
        action: 'RESOLVE_SECURITY_EVENT',
        entityType: 'security_event',
        entityId: eventId,
        adminId: resolvedBy,
        details: { resolution }
      });

      return true;
    } catch (error) {
      console.error('Failed to resolve security event:', error);
      return false;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate?: Date, endDate?: Date) {
    try {
      const whereClause: any = {};

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [
        totalLogs,
        actionCounts,
        entityTypeCounts,
        statusCounts,
        securityEventCounts,
        systemLogCounts
      ] = await Promise.all([
        prisma.audit_logs.count({ where: whereClause }),
        prisma.audit_logs.groupBy({
          by: ['action'],
          where: whereClause,
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10
        }),
        prisma.audit_logs.groupBy({
          by: ['entityType'],
          where: whereClause,
          _count: { entityType: true },
          orderBy: { _count: { entityType: 'desc' } },
          take: 10
        }),
        prisma.audit_logs.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true }
        }),
        prisma.securityEvent.groupBy({
          by: ['severity'],
          where: whereClause,
          _count: { severity: true }
        }),
        prisma.systemLog.groupBy({
          by: ['level'],
          where: whereClause,
          _count: { level: true }
        })
      ]);

      return {
        total: totalLogs,
        byAction: actionCounts.map(item => ({
          action: item.action,
          count: item._count.action
        })),
        byEntityType: entityTypeCounts.map(item => ({
          entityType: item.entityType,
          count: item._count.entityType
        })),
        byStatus: statusCounts.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        securityEvents: {
          bySeverity: securityEventCounts.map(item => ({
            severity: item.severity,
            count: item._count.severity
          }))
        },
        systemLogs: {
          byLevel: systemLogCounts.map(item => ({
            level: item.level,
            count: item._count.level
          }))
        }
      };
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old logs (for maintenance)
   */
  async cleanupOldLogs(retentionDays = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const [auditDeleted, systemDeleted] = await Promise.all([
        prisma.audit_logs.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
            status: 'success' // Keep failed/error logs longer
          }
        }),
        prisma.systemLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
            level: { in: ['DEBUG', 'INFO'] } // Keep warning/error logs longer
          }
        })
      ]);

      console.log(`Cleaned up ${auditDeleted.count} audit logs and ${systemDeleted.count} system logs`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Helper method to extract request information
   */
  extractRequestInfo(req: Request): {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
  } {
    return {
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      sessionId: req.headers['x-session-id'] as string,
      requestId: req.headers['x-request-id'] as string
    };
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Alert on high severity security events
   */
  private async alertHighSeverityEvent(eventId: string, event: SecurityEventEntry): Promise<void> {
    try {
      // Here you would integrate with your alerting system
      // For example: send to Slack, PagerDuty, email, etc.
      console.warn(`HIGH SEVERITY SECURITY EVENT: ${event.type} - ${event.description}`);
      
      // Log the alert as a system log
      await this.logSystem({
        level: 'WARN',
        message: `High severity security event detected: ${event.type}`,
        module: 'security',
        metadata: { eventId, severity: event.severity }
      });
    } catch (error) {
      console.error('Failed to alert on security event:', error);
    }
  }
}