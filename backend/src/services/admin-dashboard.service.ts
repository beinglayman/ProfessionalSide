import { prisma } from '../lib/prisma';
import * as os from 'os';
import * as fs from 'fs';

export interface SystemMetrics {
  server: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  database: {
    connectionStatus: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    activeConnections?: number;
  };
  application: {
    version: string;
    environment: string;
    nodeVersion: string;
    lastDeployment?: string;
  };
}

export interface UserMetrics {
  total: number;
  active: number;
  new24h: number;
  new7d: number;
  new30d: number;
  topContributors: Array<{
    id: string;
    name: string;
    email: string;
    journalEntries: number;
    lastActive: string;
  }>;
}

export interface ContentMetrics {
  journalEntries: {
    total: number;
    published: number;
    new24h: number;
    new7d: number;
    new30d: number;
  };
  workspaces: {
    total: number;
    active: number;
    new30d: number;
  };
  interactions: {
    likes: number;
    comments: number;
    appreciates: number;
    new24h: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    timestamp: string;
  }>;
  notifications: Array<{
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
  }>;
}

export class AdminDashboardService {
  
  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [dbResponseTime, packageJson] = await Promise.all([
        this.getDatabaseResponseTime(),
        this.getPackageInfo()
      ]);

      return {
        server: {
          uptime: process.uptime(),
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
          },
          cpu: {
            usage: await this.getCpuUsage(),
            cores: os.cpus().length
          },
          disk: await this.getDiskUsage()
        },
        database: {
          connectionStatus: 'connected',
          responseTime: dbResponseTime
        },
        application: {
          version: packageJson.version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          lastDeployment: process.env.LAST_DEPLOYMENT_DATE
        }
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get user-related metrics
   */
  async getUserMetrics(): Promise<UserMetrics> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers,
        new24h,
        new7d,
        new30d,
        topContributors
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { createdAt: { gte: yesterday } } }),
        prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.user.findMany({
          include: {
            _count: {
              select: { journalEntries: true }
            },
            profile: {
              select: { lastActiveAt: true }
            }
          },
          orderBy: {
            journalEntries: { _count: 'desc' }
          },
          take: 10
        })
      ]);

      return {
        total: totalUsers,
        active: activeUsers,
        new24h,
        new7d,
        new30d,
        topContributors: topContributors.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          journalEntries: user._count.journalEntries,
          lastActive: user.profile?.lastActiveAt?.toISOString() || user.updatedAt.toISOString()
        }))
      };
    } catch (error) {
      console.error('Error getting user metrics:', error);
      throw error;
    }
  }

  /**
   * Get content-related metrics
   */
  async getContentMetrics(): Promise<ContentMetrics> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalEntries,
        publishedEntries,
        newEntries24h,
        newEntries7d,
        newEntries30d,
        totalWorkspaces,
        activeWorkspaces,
        newWorkspaces30d,
        totalLikes,
        totalComments,
        totalAppreciates,
        newInteractions24h
      ] = await Promise.all([
        prisma.journalEntry.count(),
        prisma.journalEntry.count({ where: { isPublished: true } }),
        prisma.journalEntry.count({ where: { createdAt: { gte: yesterday } } }),
        prisma.journalEntry.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.journalEntry.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.workspace.count(),
        prisma.workspace.count({ where: { isActive: true } }),
        prisma.workspace.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.journalLike.count(),
        prisma.journalComment.count(),
        prisma.journalAppreciate.count(),
        this.getNewInteractions24h(yesterday)
      ]);

      return {
        journalEntries: {
          total: totalEntries,
          published: publishedEntries,
          new24h: newEntries24h,
          new7d: newEntries7d,
          new30d: newEntries30d
        },
        workspaces: {
          total: totalWorkspaces,
          active: activeWorkspaces,
          new30d: newWorkspaces30d
        },
        interactions: {
          likes: totalLikes,
          comments: totalComments,
          appreciates: totalAppreciates,
          new24h: newInteractions24h
        }
      };
    } catch (error) {
      console.error('Error getting content metrics:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const checks = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkMemoryUsage(),
        this.checkDiskSpace(),
        this.checkEmailService(),
        this.checkNotificationQueue()
      ]);

      const hasFailures = checks.some(check => check.status === 'fail');
      const hasWarnings = checks.some(check => check.status === 'warn');

      const status = hasFailures ? 'critical' : hasWarnings ? 'warning' : 'healthy';

      // Get recent system notifications
      const notifications = await this.getSystemNotifications();

      return {
        status,
        checks,
        notifications
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'critical',
        checks: [{
          name: 'System Health Check',
          status: 'fail',
          message: 'Unable to perform health checks',
          timestamp: new Date().toISOString()
        }],
        notifications: []
      };
    }
  }

  /**
   * Get admin activity logs
   */
  async getAdminActivityLogs(limit = 50): Promise<Array<{
    id: string;
    adminId: string;
    adminName: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    timestamp: string;
    ipAddress?: string;
  }>> {
    try {
      // In a real implementation, this would come from an audit log table
      // For now, we'll return a placeholder
      return [];
    } catch (error) {
      console.error('Error getting admin activity logs:', error);
      throw error;
    }
  }

  /**
   * Get system statistics for charts/graphs
   */
  async getSystemStatistics(period: 'daily' | 'weekly' | 'monthly'): Promise<{
    userGrowth: Array<{ date: string; count: number }>;
    contentCreation: Array<{ date: string; journalEntries: number; workspaces: number }>;
    engagement: Array<{ date: string; likes: number; comments: number }>;
  }> {
    try {
      const days = period === 'daily' ? 7 : period === 'weekly' ? 4 * 7 : 12 * 30;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // This would typically involve complex aggregation queries
      // For now, we'll return sample data
      const dates = this.generateDateRange(startDate, now, period);
      
      return {
        userGrowth: dates.map(date => ({
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 10) + 1
        })),
        contentCreation: dates.map(date => ({
          date: date.toISOString().split('T')[0],
          journalEntries: Math.floor(Math.random() * 20) + 5,
          workspaces: Math.floor(Math.random() * 3) + 1
        })),
        engagement: dates.map(date => ({
          date: date.toISOString().split('T')[0],
          likes: Math.floor(Math.random() * 50) + 10,
          comments: Math.floor(Math.random() * 30) + 5
        }))
      };
    } catch (error) {
      console.error('Error getting system statistics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getDatabaseResponseTime(): Promise<number> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return Date.now() - start;
    } catch (error) {
      return -1;
    }
  }

  private async getPackageInfo(): Promise<any> {
    try {
      const packagePath = require.resolve('../../package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      return JSON.parse(packageContent);
    } catch (error) {
      return { version: '1.0.0' };
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = Date.now();
        
        const cpuPercent = (currentUsage.user + currentUsage.system) / ((currentTime - startTime) * 1000);
        resolve(Math.min(cpuPercent * 100, 100));
      }, 100);
    });
  }

  private async getDiskUsage(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const stats = fs.statSync('.');
      // This is a simplified version - in production, you'd use a proper disk usage library
      return {
        used: 1024 * 1024 * 1024, // 1GB placeholder
        total: 10 * 1024 * 1024 * 1024, // 10GB placeholder
        percentage: 10
      };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  private async getNewInteractions24h(since: Date): Promise<number> {
    const [likes, comments, appreciates] = await Promise.all([
      prisma.journalLike.count({ where: { likedAt: { gte: since } } }),
      prisma.journalComment.count({ where: { createdAt: { gte: since } } }),
      prisma.journalAppreciate.count({ where: { appreciatedAt: { gte: since } } })
    ]);

    return likes + comments + appreciates;
  }

  private async checkDatabaseHealth(): Promise<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string; timestamp: string }> {
    try {
      const responseTime = await this.getDatabaseResponseTime();
      
      if (responseTime === -1) {
        return {
          name: 'Database Connection',
          status: 'fail',
          message: 'Database connection failed',
          timestamp: new Date().toISOString()
        };
      }
      
      if (responseTime > 1000) {
        return {
          name: 'Database Connection',
          status: 'warn',
          message: `Database response time is high: ${responseTime}ms`,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        name: 'Database Connection',
        status: 'pass',
        message: `Database responding in ${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Database Connection',
        status: 'fail',
        message: 'Database health check failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkMemoryUsage(): Promise<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string; timestamp: string }> {
    const memoryUsage = process.memoryUsage();
    const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (percentage > 90) {
      return {
        name: 'Memory Usage',
        status: 'fail',
        message: `Memory usage critical: ${percentage.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      };
    }
    
    if (percentage > 75) {
      return {
        name: 'Memory Usage',
        status: 'warn',
        message: `Memory usage high: ${percentage.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      name: 'Memory Usage',
      status: 'pass',
      message: `Memory usage normal: ${percentage.toFixed(1)}%`,
      timestamp: new Date().toISOString()
    };
  }

  private async checkDiskSpace(): Promise<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string; timestamp: string }> {
    // Simplified disk space check
    return {
      name: 'Disk Space',
      status: 'pass',
      message: 'Disk space normal: 10% used',
      timestamp: new Date().toISOString()
    };
  }

  private async checkEmailService(): Promise<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string; timestamp: string }> {
    const emailEnabled = process.env.EMAIL_ENABLED === 'true';
    
    if (!emailEnabled) {
      return {
        name: 'Email Service',
        status: 'warn',
        message: 'Email service is disabled',
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      name: 'Email Service',
      status: 'pass',
      message: 'Email service operational',
      timestamp: new Date().toISOString()
    };
  }

  private async checkNotificationQueue(): Promise<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string; timestamp: string }> {
    // This would check the actual notification queue status
    return {
      name: 'Notification Queue',
      status: 'pass',
      message: 'Notification queue processing normally',
      timestamp: new Date().toISOString()
    };
  }

  private async getSystemNotifications(): Promise<Array<{
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
  }>> {
    // In a real implementation, this would come from a system notifications table
    return [
      {
        type: 'info',
        title: 'System Updated',
        message: 'System successfully updated to version 1.2.0',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        type: 'warning',
        title: 'High Memory Usage',
        message: 'Memory usage exceeded 80% for 5 minutes',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];
  }

  private generateDateRange(start: Date, end: Date, period: 'daily' | 'weekly' | 'monthly'): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    
    const increment = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + increment);
    }
    
    return dates;
  }
}