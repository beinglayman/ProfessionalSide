import { PrismaClient } from '@prisma/client';
import { InvitationService } from './invitation.service';
import { EmailService } from './email.service';

const prisma = new PrismaClient();
const invitationService = new InvitationService();
const emailService = new EmailService();

export interface CreateInvitationRequestInput {
  name: string;
  email: string;
  role: string;
  organization: string;
  linkedinUrl?: string;
  message?: string;
}

export interface ReviewInvitationRequestInput {
  requestId: string;
  reviewerId: string;
  status: 'approved' | 'denied';
  adminMessage?: string;
}

export class InvitationRequestService {
  /**
   * Create a new invitation request
   */
  async createRequest(input: CreateInvitationRequestInput) {
    const { name, email, role, organization, linkedinUrl, message } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if request already exists
    const existingRequest = await prisma.invitationRequest.findFirst({
      where: {
        email,
        status: 'pending'
      }
    });

    if (existingRequest) {
      throw new Error('Invitation request already pending for this email');
    }

    // Check if pending invitation exists
    const existingInvitation = await prisma.platformInvitation.findFirst({
      where: {
        email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    // Create the request
    const request = await prisma.invitationRequest.create({
      data: {
        name,
        email,
        role,
        organization,
        linkedinUrl,
        message,
        status: 'pending'
      }
    });

    // Notify all admins about the new request
    await this.notifyAdminsOfNewRequest(request);

    return request;
  }

  /**
   * Review an invitation request (approve/deny)
   */
  async reviewRequest(input: ReviewInvitationRequestInput) {
    const { requestId, reviewerId, status, adminMessage } = input;

    // Verify reviewer is admin
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { isAdmin: true, name: true, email: true }
    });

    if (!reviewer?.isAdmin) {
      throw new Error('Only admins can review invitation requests');
    }

    // Get the request
    const request = await prisma.invitationRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error('Invitation request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request has already been reviewed');
    }

    // Update request status
    const updatedRequest = await prisma.invitationRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: reviewerId
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (status === 'approved') {
      // Auto-create invitation for approved request
      try {
        await invitationService.createInvitation({
          email: request.email,
          inviterId: reviewerId,
          message: `Your request to join InChronicle has been approved! Welcome to our platform.${adminMessage ? `\n\nMessage from admin: ${adminMessage}` : ''}`
        });

        // Send approval email
        await this.sendApprovalEmail(request, reviewer.name, adminMessage);
      } catch (invitationError) {
        console.error('Failed to create invitation for approved request:', invitationError);
        // Revert the request status if invitation creation fails
        await prisma.invitationRequest.update({
          where: { id: requestId },
          data: { status: 'pending' }
        });
        throw new Error('Failed to create invitation. Please try again.');
      }
    } else {
      // Send denial email
      await this.sendDenialEmail(request, reviewer.name, adminMessage);
    }

    return updatedRequest;
  }

  /**
   * Get pending invitation requests (admin only)
   */
  async getPendingRequests(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.invitationRequest.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' }, // Oldest first for fair processing
        skip: offset,
        take: limit
      }),
      prisma.invitationRequest.count({
        where: { status: 'pending' }
      })
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all invitation requests with filters (admin only)
   */
  async getAllRequests(
    page: number = 1, 
    limit: number = 20, 
    status?: 'pending' | 'approved' | 'denied'
  ) {
    const offset = (page - 1) * limit;

    const where = status ? { status } : {};

    const [requests, total] = await Promise.all([
      prisma.invitationRequest.findMany({
        where,
        include: {
          reviewedBy: {
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
      prisma.invitationRequest.count({ where })
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get invitation request statistics (admin only)
   */
  async getRequestStats() {
    const [totalStats, recentStats] = await Promise.all([
      // Overall stats
      prisma.invitationRequest.groupBy({
        by: ['status'],
        _count: true
      }),
      // Stats for last 30 days
      prisma.invitationRequest.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: true
      })
    ]);

    const totalRequests = totalStats.reduce((sum, stat) => sum + stat._count, 0);
    const totalApproved = totalStats.find(s => s.status === 'approved')?._count || 0;
    const totalPending = totalStats.find(s => s.status === 'pending')?._count || 0;
    
    const recentRequests = recentStats.reduce((sum, stat) => sum + stat._count, 0);
    const recentApproved = recentStats.find(s => s.status === 'approved')?._count || 0;
    const recentPending = recentStats.find(s => s.status === 'pending')?._count || 0;

    return {
      total: {
        requests: totalRequests,
        approved: totalApproved,
        pending: totalPending,
        denied: totalStats.find(s => s.status === 'denied')?._count || 0,
        approvalRate: totalRequests > 0 ? Math.round((totalApproved / totalRequests) * 100 * 100) / 100 : 0
      },
      recent30Days: {
        requests: recentRequests,
        approved: recentApproved,
        pending: recentPending,
        denied: recentStats.find(s => s.status === 'denied')?._count || 0,
        approvalRate: recentRequests > 0 ? Math.round((recentApproved / recentRequests) * 100 * 100) / 100 : 0
      }
    };
  }

  /**
   * Bulk review requests (admin only)
   */
  async bulkReviewRequests(
    requestIds: string[],
    reviewerId: string,
    status: 'approved' | 'denied',
    adminMessage?: string
  ) {
    // Verify reviewer is admin
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { isAdmin: true, name: true, email: true }
    });

    if (!reviewer?.isAdmin) {
      throw new Error('Only admins can review invitation requests');
    }

    const results = [];
    const errors = [];

    for (const requestId of requestIds) {
      try {
        const result = await this.reviewRequest({
          requestId,
          reviewerId,
          status,
          adminMessage
        });
        results.push(result);
      } catch (error) {
        errors.push({ requestId, error: error.message });
      }
    }

    return {
      successful: results,
      failed: errors,
      summary: {
        total: requestIds.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * Notify admins of new request
   */
  private async notifyAdminsOfNewRequest(request: any) {
    try {
      // Get all admin users
      const admins = await prisma.user.findMany({
        where: { isAdmin: true },
        select: { id: true, email: true, name: true }
      });

      // Create notifications for admins
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            type: 'INVITATION_REQUEST',
            title: 'New Invitation Request',
            message: `${request.name} from ${request.organization} has requested access to InChronicle`,
            recipientId: admin.id,
            relatedEntityType: 'INVITATION_REQUEST',
            relatedEntityId: request.id,
            data: {
              requestId: request.id,
              requesterName: request.name,
              requesterEmail: request.email,
              organization: request.organization,
              role: request.role
            }
          }))
        });

        // Send email notifications to admins
        for (const admin of admins) {
          try {
            await emailService.sendNotificationEmail({
              type: 'new_invitation_request',
              recipientId: admin.email,
              senderId: 'system',
              data: {
                adminName: admin.name,
                requesterName: request.name,
                requesterEmail: request.email,
                requesterRole: request.role,
                organization: request.organization,
                message: request.message,
                reviewUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/requests`,
                linkedinUrl: request.linkedinUrl
              },
              metadata: {
                entityType: 'invitation_request',
                entityId: request.id
              }
            });
          } catch (emailError) {
            console.error(`Failed to send email to admin ${admin.email}:`, emailError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to notify admins of new request:', error);
    }
  }

  /**
   * Send approval email
   */
  private async sendApprovalEmail(request: any, reviewerName: string, adminMessage?: string) {
    try {
      await emailService.sendNotificationEmail({
        type: 'invitation_request_approved',
        recipientId: request.email,
        senderId: 'system',
        data: {
          requesterName: request.name,
          reviewerName,
          adminMessage,
          companyName: 'InChronicle',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com'
        },
        metadata: {
          entityType: 'invitation_request',
          entityId: request.id
        }
      });
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }
  }

  /**
   * Send denial email
   */
  private async sendDenialEmail(request: any, reviewerName: string, adminMessage?: string) {
    try {
      await emailService.sendNotificationEmail({
        type: 'invitation_request_denied',
        recipientId: request.email,
        senderId: 'system',
        data: {
          requesterName: request.name,
          reviewerName,
          adminMessage,
          companyName: 'InChronicle',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com',
          reapplyUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/request-invitation`
        },
        metadata: {
          entityType: 'invitation_request',
          entityId: request.id
        }
      });
    } catch (error) {
      console.error('Failed to send denial email:', error);
    }
  }
}