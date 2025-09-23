import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InvitationReplenishmentService {
  /**
   * Replenish invitation quotas for users with 0 remaining invitations
   * This should run on the 1st of each month
   */
  async replenishMonthlyQuotas(): Promise<{ 
    processed: number; 
    replenished: number; 
    errors: number;
    details: string[];
  }> {
    const startTime = new Date();
    const details: string[] = [];
    let processed = 0;
    let replenished = 0;
    let errors = 0;

    console.log('🔄 Starting monthly invitation quota replenishment...');
    details.push(`Started at: ${startTime.toISOString()}`);

    try {
      // Find all non-admin users who have 0 invitations remaining
      const usersToReplenish = await prisma.users.findMany({
        where: {
          AND: [
            { invitationsRemaining: 0 },
            { isAdmin: false },
            { isActive: true }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          invitationsRemaining: true,
          lastQuotaReplenishment: true
        }
      });

      processed = usersToReplenish.length;
      console.log(`📊 Found ${processed} users eligible for replenishment`);
      details.push(`Found ${processed} users with 0 remaining invitations`);

      if (processed === 0) {
        details.push('No users require replenishment');
        return { processed: 0, replenished: 0, errors: 0, details };
      }

      // Replenish quotas in batches for better performance
      const batchSize = 50;
      const batches = Math.ceil(processed / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batch = usersToReplenish.slice(i * batchSize, (i + 1) * batchSize);
        console.log(`📦 Processing batch ${i + 1}/${batches} (${batch.length} users)`);

        for (const user of batch) {
          try {
            await prisma.users.update({
              where: { id: user.id },
              data: {
                invitationsRemaining: 10, // Standard monthly quota
                lastQuotaReplenishment: new Date()
              }
            });

            replenished++;
            console.log(`✅ Replenished quota for ${user.name} (${user.email})`);
            details.push(`Replenished: ${user.name} (${user.email})`);
          } catch (error) {
            errors++;
            console.error(`❌ Failed to replenish quota for ${user.name}:`, error);
            details.push(`Error replenishing ${user.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Small delay between batches to avoid overwhelming the database
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Log summary
      const duration = Date.now() - startTime.getTime();
      console.log(`🎉 Monthly replenishment completed in ${duration}ms`);
      console.log(`📈 Results: ${replenished}/${processed} users replenished, ${errors} errors`);
      
      details.push(`Completed in ${duration}ms`);
      details.push(`Results: ${replenished} replenished, ${errors} errors`);

      // Create audit log entry
      await this.createReplenishmentAuditLog({
        processed,
        replenished,
        errors,
        duration,
        details: details.slice(-10) // Keep last 10 details for audit
      });

      return { processed, replenished, errors, details };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Monthly replenishment failed:', error);
      details.push(`Fatal error: ${errorMessage}`);
      
      // Still try to create audit log for the failure
      try {
        await this.createReplenishmentAuditLog({
          processed,
          replenished,
          errors: errors + 1,
          duration: Date.now() - startTime.getTime(),
          details: [...details, `Fatal error: ${errorMessage}`],
          fatalError: errorMessage
        });
      } catch (auditError) {
        console.error('Failed to create audit log for failed replenishment:', auditError);
      }

      throw error;
    }
  }

  /**
   * Create audit log entry for replenishment operation
   */
  private async createReplenishmentAuditLog(data: {
    processed: number;
    replenished: number;
    errors: number;
    duration: number;
    details: string[];
    fatalError?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          action: 'SYSTEM_REPLENISHMENT',
          entityType: 'invitation_quota',
          entityId: 'monthly_replenishment',
          userId: null, // System operation
          newValues: {
            processed: data.processed,
            replenished: data.replenished,
            errors: data.errors,
            duration: data.duration,
            timestamp: new Date().toISOString()
          },
          details: {
            operation: 'monthly_quota_replenishment',
            summary: data.details,
            fatalError: data.fatalError
          },
          status: data.fatalError ? 'failed' : 'success'
        }
      });
    } catch (error) {
      console.error('Failed to create replenishment audit log:', error);
      // Don't throw here to avoid masking the original replenishment result
    }
  }

  /**
   * Get replenishment statistics and history
   */
  async getReplenishmentHistory(limit: number = 10) {
    try {
      const history = await prisma.auditLog.findMany({
        where: {
          action: 'SYSTEM_REPLENISHMENT',
          entityType: 'invitation_quota'
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          newValues: true,
          details: true,
          status: true
        }
      });

      return history.map(entry => ({
        id: entry.id,
        date: entry.createdAt,
        processed: entry.newValues?.processed || 0,
        replenished: entry.newValues?.replenished || 0,
        errors: entry.newValues?.errors || 0,
        duration: entry.newValues?.duration || 0,
        status: entry.status,
        details: entry.details
      }));
    } catch (error) {
      console.error('Failed to get replenishment history:', error);
      return [];
    }
  }

  /**
   * Get next scheduled replenishment date
   */
  getNextReplenishmentDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0); // 9 AM on 1st of next month
    return nextMonth;
  }

  /**
   * Get users eligible for replenishment (preview)
   */
  async getEligibleUsersPreview(): Promise<{
    count: number;
    users: Array<{
      id: string;
      name: string;
      email: string;
      invitationsRemaining: number;
      lastQuotaReplenishment: Date | null;
    }>;
  }> {
    try {
      const users = await prisma.users.findMany({
        where: {
          AND: [
            { invitationsRemaining: 0 },
            { isAdmin: false },
            { isActive: true }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          invitationsRemaining: true,
          lastQuotaReplenishment: true
        },
        take: 100, // Limit for preview
        orderBy: { lastQuotaReplenishment: 'asc' }
      });

      return {
        count: users.length,
        users
      };
    } catch (error) {
      console.error('Failed to get eligible users preview:', error);
      return { count: 0, users: [] };
    }
  }

  /**
   * Manually trigger replenishment (admin only)
   */
  async manualReplenishment(adminId: string): Promise<{ 
    success: boolean; 
    message: string;
    results?: { processed: number; replenished: number; errors: number; details: string[] };
  }> {
    try {
      // Verify admin status
      const admin = await prisma.users.findUnique({
        where: { id: adminId },
        select: { isAdmin: true, name: true }
      });

      if (!admin?.isAdmin) {
        return {
          success: false,
          message: 'Only admins can trigger manual replenishment'
        };
      }

      console.log(`🔧 Manual replenishment triggered by admin: ${admin.name}`);
      
      const results = await this.replenishMonthlyQuotas();
      
      return {
        success: true,
        message: `Manual replenishment completed: ${results.replenished}/${results.processed} users replenished`,
        results
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Manual replenishment failed:', error);
      
      return {
        success: false,
        message: `Manual replenishment failed: ${errorMessage}`
      };
    }
  }
}