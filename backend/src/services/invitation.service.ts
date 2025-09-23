import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { EmailService } from './email.service';

const prisma = new PrismaClient();
const emailService = new EmailService();

export interface CreateInvitationInput {
  email: string;
  inviterId: string;
  message?: string;
}

export interface InvitationStats {
  totalSent: number;
  totalAccepted: number;
  totalPending: number;
  totalExpired: number;
  acceptanceRate: number;
}

export class InvitationService {
  /**
   * Check if user has remaining invitation quota
   */
  async checkInvitationQuota(userId: string): Promise<{ hasQuota: boolean; remaining: number; isAdmin: boolean }> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { invitationsRemaining: true, isAdmin: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Admins have unlimited invitations
    if (user.isAdmin) {
      return {
        hasQuota: true,
        remaining: 999,
        isAdmin: true
      };
    }

    return {
      hasQuota: user.invitationsRemaining > 0,
      remaining: user.invitationsRemaining,
      isAdmin: false
    };
  }

  /**
   * Create a new platform invitation
   */
  async createInvitation(input: CreateInvitationInput): Promise<{ invitation: any; hasQuota: boolean }> {
    const { email, inviterId, message } = input;

    // Check invitation quota
    const quotaCheck = await this.checkInvitationQuota(inviterId);
    if (!quotaCheck.hasQuota) {
      throw new Error('No invitation quota remaining');
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.platform_invitations.findFirst({
      where: {
        email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      throw new Error('Pending invitation already exists for this email');
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the invitation
      const invitation = await tx.platformInvitation.create({
        data: {
          email,
          inviterId,
          token,
          expiresAt,
          status: 'pending'
        },
        include: {
          inviter: {
            select: {
              id: true,
              name: true,
              email: true,
              title: true
            }
          }
        }
      });

      // Decrease inviter's quota (skip for admins)
      if (!quotaCheck.isAdmin) {
        await tx.user.update({
          where: { id: inviterId },
          data: {
            invitationsRemaining: { decrement: 1 },
            totalInvitationsSent: { increment: 1 }
          }
        });
      } else {
        // Still track total sent for admins
        await tx.user.update({
          where: { id: inviterId },
          data: {
            totalInvitationsSent: { increment: 1 }
          }
        });
      }

      return invitation;
    });

    // Send invitation email
    try {
      const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${token}`;
      
      await emailService.sendNotificationEmail({
        type: 'platform_invitation',
        recipientId: email,
        senderId: inviterId,
        data: {
          recipientEmail: email,
          senderName: result.inviter.name,
          senderTitle: result.inviter.title,
          invitationUrl,
          message,
          expiresAt: expiresAt.toISOString(),
          companyName: 'InChronicle',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com'
        },
        metadata: {
          entityType: 'platform_invitation',
          entityId: result.id
        }
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the invitation creation if email fails
    }

    return {
      invitation: result,
      hasQuota: quotaCheck.hasQuota
    };
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, acceptingUserId: string): Promise<any> {
    const invitation = await prisma.platform_invitations.findFirst({
      where: {
        token,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Update invitation status
    const updatedInvitation = await prisma.platform_invitations.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedById: acceptingUserId
      },
      include: {
        inviter: true,
        acceptedBy: true
      }
    });

    // Create notification for inviter
    await prisma.notification.create({
      data: {
        type: 'PLATFORM_INVITATION_ACCEPTED',
        title: 'Invitation Accepted',
        message: `Someone accepted your invitation and joined InChronicle!`,
        recipientId: invitation.inviterId,
        senderId: acceptingUserId,
        relatedEntityType: 'USER',
        relatedEntityId: acceptingUserId
      }
    });

    return updatedInvitation;
  }

  /**
   * Get user's invitation history
   */
  async getUserInvitations(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [invitations, total] = await Promise.all([
      prisma.platform_invitations.findMany({
        where: { inviterId: userId },
        include: {
          acceptedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.platform_invitations.count({
        where: { inviterId: userId }
      })
    ]);

    return {
      invitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get invitation statistics for a user
   */
  async getUserInvitationStats(userId: string): Promise<InvitationStats> {
    const stats = await prisma.platform_invitations.groupBy({
      by: ['status'],
      where: { inviterId: userId },
      _count: true
    });

    const totalSent = stats.reduce((sum, stat) => sum + stat._count, 0);
    const totalAccepted = stats.find(s => s.status === 'accepted')?._count || 0;
    const totalPending = stats.find(s => s.status === 'pending')?._count || 0;
    const totalExpired = stats.find(s => s.status === 'expired')?._count || 0;
    
    const acceptanceRate = totalSent > 0 ? (totalAccepted / totalSent) * 100 : 0;

    return {
      totalSent,
      totalAccepted,
      totalPending,
      totalExpired,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100
    };
  }

  /**
   * Get platform-wide invitation statistics (admin only)
   */
  async getPlatformInvitationStats() {
    const [totalStats, recentStats] = await Promise.all([
      // Overall stats
      prisma.platform_invitations.groupBy({
        by: ['status'],
        _count: true
      }),
      // Stats for last 30 days
      prisma.platform_invitations.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: true
      })
    ]);

    const totalSent = totalStats.reduce((sum, stat) => sum + stat._count, 0);
    const totalAccepted = totalStats.find(s => s.status === 'accepted')?._count || 0;
    const recentSent = recentStats.reduce((sum, stat) => sum + stat._count, 0);
    const recentAccepted = recentStats.find(s => s.status === 'accepted')?._count || 0;

    return {
      total: {
        sent: totalSent,
        accepted: totalAccepted,
        acceptanceRate: totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100 * 100) / 100 : 0
      },
      recent30Days: {
        sent: recentSent,
        accepted: recentAccepted,
        acceptanceRate: recentSent > 0 ? Math.round((recentAccepted / recentSent) * 100 * 100) / 100 : 0
      }
    };
  }

  /**
   * Expire old invitations (called by cron)
   */
  async expireOldInvitations(): Promise<number> {
    const result = await prisma.platform_invitations.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() }
      },
      data: {
        status: 'expired'
      }
    });

    console.log(`Expired ${result.count} old invitations`);
    return result.count;
  }

  /**
   * Validate invitation token without accepting
   */
  async validateInvitationToken(token: string): Promise<{ valid: boolean; email?: string; inviter?: any }> {
    const invitation = await prisma.platform_invitations.findFirst({
      where: {
        token,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            title: true
          }
        }
      }
    });

    if (!invitation) {
      return { valid: false };
    }

    return {
      valid: true,
      email: invitation.email,
      inviter: invitation.inviter
    };
  }
}