import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SystemSettingsData {
  invitationOnlyMode: boolean;
  lastUpdatedBy?: string;
}

export class SystemSettingsService {
  /**
   * Get current system settings
   */
  async getSettings(): Promise<SystemSettingsData> {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
      include: {
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'singleton',
          invitationOnlyMode: false, // Start with open registration
          lastUpdatedBy: null
        },
        include: {
          updatedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    }

    return {
      invitationOnlyMode: settings.invitationOnlyMode,
      lastUpdatedBy: settings.lastUpdatedBy || undefined
    };
  }

  /**
   * Update system settings (admin only)
   */
  async updateSettings(
    updates: Partial<SystemSettingsData>,
    updatedBy: string
  ): Promise<SystemSettingsData> {
    // Verify updater is admin
    const admin = await prisma.user.findUnique({
      where: { id: updatedBy },
      select: { isAdmin: true, name: true }
    });

    if (!admin?.isAdmin) {
      throw new Error('Only admins can update system settings');
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: {
        ...updates,
        lastUpdatedBy: updatedBy,
        updatedAt: new Date()
      },
      create: {
        id: 'singleton',
        invitationOnlyMode: updates.invitationOnlyMode ?? false,
        lastUpdatedBy: updatedBy
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Log the settings change
    console.log(`System settings updated by ${admin.name}:`, updates);

    // Create audit log for settings change
    await this.createSettingsAuditLog(updatedBy, updates);

    return {
      invitationOnlyMode: settings.invitationOnlyMode,
      lastUpdatedBy: settings.lastUpdatedBy || undefined
    };
  }

  /**
   * Check if invitation-only mode is enabled
   * This is a frequently called method, so we might want to cache it in the future
   */
  async isInvitationOnlyMode(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.invitationOnlyMode;
    } catch (error) {
      // Fallback to open registration if table doesn't exist
      console.warn('SystemSettings table not found, defaulting to open registration:', error.message);
      return false;
    }
  }

  /**
   * Toggle invitation-only mode (admin only)
   */
  async toggleInvitationMode(adminId: string): Promise<{ enabled: boolean; updatedBy: string }> {
    const currentSettings = await this.getSettings();
    const newMode = !currentSettings.invitationOnlyMode;

    await this.updateSettings(
      { invitationOnlyMode: newMode },
      adminId
    );

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true }
    });

    console.log(`Invitation-only mode ${newMode ? 'ENABLED' : 'DISABLED'} by ${admin?.name}`);

    return {
      enabled: newMode,
      updatedBy: adminId
    };
  }

  /**
   * Get system settings history/audit log
   */
  async getSettingsHistory(page: number = 1, limit: number = 20) {
    // This would require an audit log table for settings changes
    // For now, we'll return a simple version
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          entityType: 'system_settings',
          action: 'UPDATE'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.auditLog.count({
        where: {
          entityType: 'system_settings',
          action: 'UPDATE'
        }
      })
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
  }

  /**
   * Create audit log for settings changes
   */
  private async createSettingsAuditLog(userId: string, changes: Partial<SystemSettingsData>) {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'system_settings',
          entityId: 'singleton',
          userId,
          newValues: changes,
          details: {
            changeType: 'settings_update',
            changedFields: Object.keys(changes)
          },
          status: 'success'
        }
      });
    } catch (error) {
      console.error('Failed to create settings audit log:', error);
    }
  }

  /**
   * Initialize system settings (for seeding/first run)
   */
  async initializeSettings(): Promise<SystemSettingsData> {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: {}, // Don't update if already exists
      create: {
        id: 'singleton',
        invitationOnlyMode: false, // Start with open registration
        lastUpdatedBy: null
      }
    });

    console.log('System settings initialized:', {
      invitationOnlyMode: settings.invitationOnlyMode
    });

    return {
      invitationOnlyMode: settings.invitationOnlyMode
    };
  }

  /**
   * Get system status for health checks
   */
  async getSystemStatus() {
    const settings = await this.getSettings();
    
    const [
      totalUsers,
      pendingInvitations,
      pendingRequests,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.platformInvitation.count({
        where: { status: 'pending' }
      }),
      prisma.invitationRequest.count({
        where: { status: 'pending' }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    return {
      invitationOnlyMode: settings.invitationOnlyMode,
      stats: {
        totalUsers,
        pendingInvitations,
        pendingRequests,
        recentUsers
      },
      health: 'healthy'
    };
  }
}