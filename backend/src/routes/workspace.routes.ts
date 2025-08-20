import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';
import { EmailService } from '../services/email.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Extend global namespace for goals storage
declare global {
  var goalsStorage: Map<string, any[]>;
}

// Temporary in-memory storage for goals (until proper database implementation)
// Using global to share between workspace and goal routes
if (!global.goalsStorage) {
  global.goalsStorage = new Map<string, any[]>();
}
const goalsStorage = global.goalsStorage;

const router = Router();
const prisma = new PrismaClient();
const emailService = new EmailService();

// All workspace routes require authentication
router.use(authenticate);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }, // 10MB default
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Validation schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  organizationId: z.string()
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

const inviteMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
  message: z.string().optional(),
  permissions: z.object({
    canEdit: z.boolean(),
    canComment: z.boolean(),
    canInvite: z.boolean(),
    canManageSettings: z.boolean()
  }).optional()
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i)
});

// Get all workspaces for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId }
        },
        isActive: true
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        members: {
          where: { userId },
          select: { role: true }
        },
        _count: {
          select: {
            members: true,
            journalEntries: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const workspacesWithStats = workspaces.map(workspace => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      organizationId: workspace.organizationId,
      organization: workspace.organization,
      isActive: workspace.isActive,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      userRole: workspace.members[0]?.role,
      stats: {
        totalMembers: workspace._count.members,
        totalJournalEntries: workspace._count.journalEntries
      }
    }));

    sendSuccess(res, workspacesWithStats, 'Workspaces retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    sendError(res, 'Failed to fetch workspaces', 500);
  }
});

// Get specific workspace
router.get('/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: { userId }
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        members: {
          where: { userId },
          select: { role: true }
        },
        _count: {
          select: {
            members: true,
            journalEntries: true
          }
        }
      }
    });

    if (!workspace) {
      return sendError(res, 'Workspace not found or access denied', 404);
    }

    const workspaceWithStats = {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      organizationId: workspace.organizationId,
      organization: workspace.organization,
      isActive: workspace.isActive,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      userRole: workspace.members[0]?.role,
      stats: {
        totalMembers: workspace._count.members,
        totalJournalEntries: workspace._count.journalEntries
      }
    };

    sendSuccess(res, workspaceWithStats, 'Workspace retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspace:', error);
    sendError(res, 'Failed to fetch workspace', 500);
  }
});

// Get workspace members
router.get('/:workspaceId/members', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Check if user has access to workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true,
            company: true
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    sendSuccess(res, members, 'Workspace members retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    sendError(res, 'Failed to fetch workspace members', 500);
  }
});

// Get workspace categories
router.get('/:workspaceId/categories', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Check if user has access to workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    const categories = await prisma.workspaceCategory.findMany({
      where: { workspaceId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Add file counts to each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const fileCount = await prisma.workspaceFile.count({
          where: {
            workspaceId,
            category: category.name
          }
        });
        return {
          ...category,
          fileCount
        };
      })
    );

    sendSuccess(res, categoriesWithCounts, 'Workspace categories retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspace categories:', error);
    sendError(res, 'Failed to fetch workspace categories', 500);
  }
});

// Get workspace files
router.get('/:workspaceId/files', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const { page = '1', limit = '20', search } = req.query;

    // Check if user has access to workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where = {
      workspaceId,
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { originalName: { contains: search as string, mode: 'insensitive' as const } }
        ]
      })
    };

    const [files, total] = await Promise.all([
      prisma.workspaceFile.findMany({
        where,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.workspaceFile.count({ where })
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };

    sendSuccess(res, { files, pagination }, 'Workspace files retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspace files:', error);
    sendError(res, 'Failed to fetch workspace files', 500);
  }
});

// Get workspace journal entries
router.get('/:workspaceId/journal-entries', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const { 
      page = '1', 
      limit = '20', 
      category, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Check if user has access to workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where = {
      workspaceId,
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search as string, mode: 'insensitive' as const } },
          { description: { contains: search as string, mode: 'insensitive' as const } },
          { tags: { hasSome: [search as string] } }
        ]
      })
    };

    const orderBy = {
      [sortBy as string]: sortOrder
    };

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              title: true
            }
          },
          workspace: {
            select: {
              id: true,
              name: true,
              organization: {
                select: { name: true }
              }
            }
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  title: true
                }
              }
            }
          },
          reviewers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  title: true
                }
              }
            }
          },
          artifacts: true,
          outcomes: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              appreciates: true,
              rechronicles: true,
              analytics: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limitNum
      }),
      prisma.journalEntry.count({ where })
    ]);

    // Check user interactions for each entry
    const entriesWithInteractions = await Promise.all(
      entries.map(async (entry) => {
        const [hasLiked, hasAppreciated, hasRechronicled] = await Promise.all([
          prisma.journalEntryLike.findFirst({
            where: { entryId: entry.id, userId }
          }),
          prisma.journalEntryAppreciate.findFirst({
            where: { entryId: entry.id, userId }
          }),
          prisma.journalEntryRechronicle.findFirst({
            where: { entryId: entry.id, userId }
          })
        ]);

        return {
          ...entry,
          hasLiked: !!hasLiked,
          hasAppreciated: !!hasAppreciated,
          hasRechronicled: !!hasRechronicled,
          likes: entry._count.likes,
          comments: entry._count.comments,
          appreciates: entry._count.appreciates,
          rechronicles: entry._count.rechronicles,
          views: entry._count.analytics
        };
      })
    );

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    };

    sendSuccess(res, { entries: entriesWithInteractions, pagination }, 'Workspace journal entries retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspace journal entries:', error);
    sendError(res, 'Failed to fetch workspace journal entries', 500);
  }
});

// Update workspace
router.put('/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const validatedData = updateWorkspaceSchema.parse(req.body);

    // Check if user has admin permissions
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole || !['OWNER', 'admin'].includes(memberRole.role)) {
      return sendError(res, 'Only workspace owners and admins can update workspace settings', 403);
    }

    // Update the workspace
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        _count: {
          select: {
            members: true,
            journalEntries: true
          }
        }
      }
    });

    const workspaceWithStats = {
      ...updatedWorkspace,
      userRole: memberRole.role,
      stats: {
        totalMembers: updatedWorkspace._count.members,
        totalJournalEntries: updatedWorkspace._count.journalEntries
      }
    };

    sendSuccess(res, workspaceWithStats, 'Workspace updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error updating workspace:', error);
    sendError(res, 'Failed to update workspace', 500);
  }
});

// Create workspace
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = createWorkspaceSchema.parse(req.body);

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: {
        id: validatedData.organizationId
      }
    });

    if (!organization) {
      return sendError(res, 'Organization not found', 404);
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        organizationId: validatedData.organizationId,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        _count: {
          select: {
            members: true,
            journalEntries: true
          }
        }
      }
    });

    const workspaceWithStats = {
      ...workspace,
      userRole: 'OWNER',
      stats: {
        totalMembers: workspace._count.members,
        totalJournalEntries: workspace._count.journalEntries
      }
    };

    sendSuccess(res, workspaceWithStats, 'Workspace created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error creating workspace:', error);
    sendError(res, 'Failed to create workspace', 500);
  }
});

// Send workspace invitation
router.post('/:workspaceId/invitations', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const validatedData = inviteMemberSchema.parse(req.body);

    // Check if user has invite permissions
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      include: { user: true }
    });

    if (!memberRole) {
      return sendError(res, 'Access denied', 403);
    }

    // Check permissions
    const normalizedRole = memberRole.role.toLowerCase();
    const hasInvitePermission = 
      normalizedRole === 'owner' || 
      normalizedRole === 'admin' ||
      (normalizedRole === 'editor' && (memberRole.permissions as any)?.canInvite !== false);

    if (!hasInvitePermission) {
      return sendError(res, 'Insufficient permissions to invite members', 403);
    }

    // Get workspace details
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true }
    });

    if (!workspace) {
      return sendError(res, 'Workspace not found', 404);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    // Check if user is already a member
    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: existingUser.id }
      });

      if (existingMember) {
        return sendError(res, 'User is already a member of this workspace', 400);
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.workspaceInvitation.findFirst({
      where: { 
        workspaceId, 
        email: validatedData.email,
        status: 'pending'
      }
    });

    if (existingInvitation) {
      return sendError(res, 'Invitation already sent to this email', 400);
    }

    // Generate unique invitation token
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        workspaceId,
        inviterId: userId,
        role: validatedData.role,
        permissions: validatedData.permissions || getDefaultPermissions(validatedData.role),
        message: validatedData.message,
        token,
        expiresAt
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true, email: true } }
      }
    });

    // Send notification to existing user if they have an account
    if (existingUser) {
      console.log('📧 Creating notification for existing user:', {
        recipientId: existingUser.id,
        recipientEmail: existingUser.email,
        inviterName: memberRole.user.name,
        workspaceName: workspace.name
      });
      
      const notification = await prisma.notification.create({
        data: {
          type: 'WORKSPACE_INVITE',
          title: 'Workspace Invitation',
          message: `${memberRole.user.name} invited you to join "${workspace.name}"`,
          recipientId: existingUser.id,
          senderId: userId,
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: workspaceId,
          data: {
            invitationId: invitation.id,
            workspaceName: workspace.name,
            inviterName: memberRole.user.name,
            role: validatedData.role,
            message: validatedData.message
          }
        }
      });
      
      console.log('✅ Notification created successfully:', notification.id);
    } else {
      console.log('❌ No existing user found for email:', validatedData.email);
    }

    // Send email invitation
    try {
      const variables = {
        recipientName: invitation.name,
        recipientEmail: invitation.email,
        senderName: memberRole.user.name || 'A team member',
        workspaceName: workspace.name,
        actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitations/${invitation.token}`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications`,
        companyName: 'InChronicle',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@inchronicle.com',
        websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        logoUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/logo.png`
      };

      await emailService.sendNotificationEmail({
        type: 'workspace_invite',
        recipientId: invitation.email,
        senderId: invitation.inviterId,
        data: variables,
        metadata: {
          entityType: 'workspace',
          entityId: invitation.workspaceId,
          workspaceId: invitation.workspaceId
        }
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue with the response even if email fails
    }

    sendSuccess(res, {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      hasExistingAccount: !!existingUser
    }, 'Invitation sent successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error sending invitation:', error);
    sendError(res, 'Failed to send invitation', 500);
  }
});

// Get pending invitations for current user
router.get('/invitations/pending', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user's email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Find all pending invitations for the user's email
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        email: user.email,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            organization: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match frontend interface
    const transformedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspace.name,
      organizationName: invitation.workspace.organization?.name || null,
      description: invitation.workspace.description || '',
      role: invitation.role,
      invitedBy: {
        id: invitation.inviter.id,
        name: invitation.inviter.name,
        avatar: invitation.inviter.avatar || '',
        position: invitation.inviter.title || ''
      },
      invitationDate: invitation.createdAt.toISOString(),
      expirationDate: invitation.expiresAt.toISOString(),
      status: invitation.status,
      isPersonal: !invitation.workspace.organization,
      message: invitation.message
    }));

    sendSuccess(res, transformedInvitations, 'Pending invitations retrieved successfully');
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    sendError(res, 'Failed to fetch pending invitations', 500);
  }
});

// Get workspace invitations
router.get('/:workspaceId/invitations', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Check if user has access to workspace
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole || !['owner', 'admin'].includes(memberRole.role)) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    const invitations = await prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, invitations, 'Invitations retrieved successfully');
  } catch (error) {
    console.error('Error fetching invitations:', error);
    sendError(res, 'Failed to fetch invitations', 500);
  }
});

// Accept workspace invitation by token
router.post('/invitations/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    // Find invitation
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { 
        token,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      }
    });

    if (!invitation) {
      return sendError(res, 'Invalid or expired invitation', 400);
    }

    // Verify email matches current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user || user.email !== invitation.email) {
      return sendError(res, 'This invitation is not for your email address', 400);
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: invitation.workspaceId, 
        userId 
      }
    });

    if (existingMember) {
      return sendError(res, 'You are already a member of this workspace', 400);
    }

    // Accept invitation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Add user to workspace
      const newMember = await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
          permissions: invitation.permissions
        },
        include: {
          workspace: { select: { name: true } },
          user: { select: { name: true, email: true, avatar: true } }
        }
      });

      // Update invitation status
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date()
        }
      });

      // Notify inviter
      await tx.notification.create({
        data: {
          type: 'WORKSPACE_INVITE_ACCEPTED',
          title: 'Invitation Accepted',
          message: `${user.name} accepted your invitation to join "${invitation.workspace.name}"`,
          recipientId: invitation.inviterId,
          senderId: userId,
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: invitation.workspaceId
        }
      });

      return newMember;
    });

    // Trigger network connection updates for all existing workspace members
    try {
      const existingMembers = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: invitation.workspaceId,
          userId: { not: userId }
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      // In a real implementation, this would trigger the WorkspaceNetworkService
      // to automatically add the new member to existing members' networks
      console.log(`🔗 Network Update: User ${user.name} joined workspace "${invitation.workspace.name}"`);
      console.log(`🔗 Auto-adding to core network for ${existingMembers.length} existing members`);
      
      existingMembers.forEach(member => {
        console.log(`🔗 Adding ${user.name} to ${member.user.name}'s core network (workspace: ${invitation.workspace.name})`);
      });
    } catch (networkError) {
      console.error('Network update failed:', networkError);
      // Don't fail the invitation acceptance if network update fails
    }

    sendSuccess(res, result, 'Invitation accepted successfully');
  } catch (error) {
    console.error('Error accepting invitation:', error);
    sendError(res, 'Failed to accept invitation', 500);
  }
});

// Accept workspace invitation by ID (for notifications)
router.post('/invitations/:invitationId/accept-by-id', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    // Find invitation
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { 
        id: invitationId,
        status: 'pending',
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      }
    });

    if (!invitation) {
      return sendError(res, 'Invalid or expired invitation', 400);
    }

    // Verify email matches current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user || user.email !== invitation.email) {
      return sendError(res, 'This invitation is not for your email address', 400);
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: invitation.workspaceId, 
        userId 
      }
    });

    if (existingMember) {
      return sendError(res, 'You are already a member of this workspace', 400);
    }

    // Accept invitation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Add user to workspace
      const newMember = await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
          permissions: invitation.permissions
        },
        include: {
          workspace: { select: { name: true } },
          user: { select: { name: true, email: true, avatar: true } }
        }
      });

      // Update invitation status
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date()
        }
      });

      // Notify inviter
      await tx.notification.create({
        data: {
          type: 'WORKSPACE_INVITE_ACCEPTED',
          title: 'Invitation Accepted',
          message: `${user.name} accepted your invitation to join "${invitation.workspace.name}"`,
          recipientId: invitation.inviterId,
          senderId: userId,
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: invitation.workspaceId
        }
      });

      return newMember;
    });

    sendSuccess(res, result, 'Invitation accepted successfully');
  } catch (error) {
    console.error('Error accepting invitation:', error);
    sendError(res, 'Failed to accept invitation', 500);
  }
});

// Decline workspace invitation by ID (for notifications)
router.post('/invitations/:invitationId/decline-by-id', async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    // Find invitation
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { 
        id: invitationId,
        status: 'pending'
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      }
    });

    if (!invitation) {
      return sendError(res, 'Invitation not found', 404);
    }

    // Verify email matches current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user || user.email !== invitation.email) {
      return sendError(res, 'This invitation is not for your email address', 400);
    }

    // Decline invitation in transaction
    await prisma.$transaction(async (tx) => {
      // Update invitation status
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'declined',
          declinedAt: new Date()
        }
      });

      // Notify inviter
      await tx.notification.create({
        data: {
          type: 'WORKSPACE_INVITE_DECLINED',
          title: 'Invitation Declined',
          message: `${user.name} declined your invitation to join "${invitation.workspace.name}"`,
          recipientId: invitation.inviterId,
          senderId: userId,
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: invitation.workspaceId
        }
      });
    });

    sendSuccess(res, null, 'Invitation declined successfully');
  } catch (error) {
    console.error('Error declining invitation:', error);
    sendError(res, 'Failed to decline invitation', 500);
  }
});

// Decline workspace invitation by token
router.post('/invitations/:token/decline', async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    // Find invitation
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { 
        token,
        status: 'pending'
      },
      include: {
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      }
    });

    if (!invitation) {
      return sendError(res, 'Invitation not found', 404);
    }

    // Verify email matches current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user || user.email !== invitation.email) {
      return sendError(res, 'This invitation is not for your email address', 400);
    }

    // Decline invitation in transaction
    await prisma.$transaction(async (tx) => {
      // Update invitation status
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'declined',
          declinedAt: new Date()
        }
      });

      // Notify inviter
      await tx.notification.create({
        data: {
          type: 'WORKSPACE_INVITE_DECLINED',
          title: 'Invitation Declined',
          message: `${user.name} declined your invitation to join "${invitation.workspace.name}"`,
          recipientId: invitation.inviterId,
          senderId: userId,
          relatedEntityType: 'WORKSPACE',
          relatedEntityId: invitation.workspaceId
        }
      });
    });

    sendSuccess(res, null, 'Invitation declined successfully');
  } catch (error) {
    console.error('Error declining invitation:', error);
    sendError(res, 'Failed to decline invitation', 500);
  }
});

// Helper function to get default permissions based on role
function getDefaultPermissions(role: string) {
  switch (role) {
    case 'admin':
      return {
        canEdit: true,
        canComment: true,
        canInvite: true,
        canManageSettings: true
      };
    case 'editor':
      return {
        canEdit: true,
        canComment: true,
        canInvite: true,
        canManageSettings: false
      };
    case 'viewer':
      return {
        canEdit: false,
        canComment: true,
        canInvite: false,
        canManageSettings: false
      };
    default:
      return {
        canEdit: false,
        canComment: true,
        canInvite: false,
        canManageSettings: false
      };
  }
}

// Create category
router.post('/:workspaceId/categories', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    console.log('Creating category request:', { workspaceId, userId, body: req.body });
    const validatedData = createCategorySchema.parse(req.body);
    console.log('Validated data:', validatedData);

    // Check if user has admin access
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });
    console.log('Member role check:', { memberRole, hasAccess: memberRole ? ['owner', 'admin'].includes(memberRole.role) : false });

    if (!memberRole || !(['owner', 'admin', 'editor', 'member', 'OWNER', 'ADMIN', 'EDITOR', 'MEMBER'].includes(memberRole.role))) {
      console.log('Permission denied for user:', userId, 'in workspace:', workspaceId, 'role:', memberRole?.role);
      return sendError(res, 'Insufficient permissions', 403);
    }

    const category = await prisma.workspaceCategory.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color,
        workspaceId,
        createdById: userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    sendSuccess(res, category, 'Category created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error creating category:', error);
    sendError(res, 'Failed to create category', 500);
  }
});

// Delete category
router.delete('/:workspaceId/categories/:categoryId', async (req, res) => {
  try {
    const { workspaceId, categoryId } = req.params;
    const userId = req.user.id;

    // Check if user has admin access
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole || !(['owner', 'admin', 'editor', 'member', 'OWNER', 'ADMIN', 'EDITOR', 'MEMBER'].includes(memberRole.role))) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    // Check if category exists and belongs to the workspace
    const category = await prisma.workspaceCategory.findFirst({
      where: {
        id: categoryId,
        workspaceId
      }
    });

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    // Check if there are files using this category
    const fileCount = await prisma.workspaceFile.count({
      where: {
        workspaceId,
        category: category.name
      }
    });

    if (fileCount > 0) {
      return sendError(res, `Cannot delete category. ${fileCount} file(s) are still using this category. Please reassign or delete these files first.`, 400);
    }

    // Delete the category
    await prisma.workspaceCategory.delete({
      where: { id: categoryId }
    });

    sendSuccess(res, null, 'Category deleted successfully');
  } catch (error) {
    console.error('Error deleting category:', error);
    sendError(res, 'Failed to delete category', 500);
  }
});

// Update category
router.put('/:workspaceId/categories/:categoryId', async (req, res) => {
  try {
    const { workspaceId, categoryId } = req.params;
    const userId = req.user.id;
    const validatedData = createCategorySchema.parse(req.body);

    // Check if user has admin access
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole || !(['owner', 'admin', 'editor', 'member', 'OWNER', 'ADMIN', 'EDITOR', 'MEMBER'].includes(memberRole.role))) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    // Check if category exists and belongs to workspace
    const existingCategory = await prisma.workspaceCategory.findFirst({
      where: { id: categoryId, workspaceId }
    });

    if (!existingCategory) {
      return sendError(res, 'Category not found', 404);
    }

    // If the category name is changing, update all files that use the old name
    const oldCategoryName = existingCategory.name;
    const newCategoryName = validatedData.name;
    
    if (oldCategoryName !== newCategoryName) {
      await prisma.workspaceFile.updateMany({
        where: {
          workspaceId,
          category: oldCategoryName
        },
        data: {
          category: newCategoryName
        }
      });
    }

    const category = await prisma.workspaceCategory.update({
      where: { id: categoryId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    sendSuccess(res, category, 'Category updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error updating category:', error);
    sendError(res, 'Failed to update category', 500);
  }
});

// Delete category
router.delete('/:workspaceId/categories/:categoryId', async (req, res) => {
  try {
    const { workspaceId, categoryId } = req.params;
    const userId = req.user.id;

    // Check if user has admin access
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole || !(['owner', 'admin', 'editor', 'member', 'OWNER', 'ADMIN', 'EDITOR', 'MEMBER'].includes(memberRole.role))) {
      return sendError(res, 'Insufficient permissions', 403);
    }

    // Check if category exists and belongs to workspace
    const existingCategory = await prisma.workspaceCategory.findFirst({
      where: { id: categoryId, workspaceId }
    });

    if (!existingCategory) {
      return sendError(res, 'Category not found', 404);
    }

    await prisma.workspaceCategory.delete({
      where: { id: categoryId }
    });

    sendSuccess(res, null, 'Category deleted successfully');
  } catch (error) {
    console.error('Error deleting category:', error);
    sendError(res, 'Failed to delete category', 500);
  }
});

// Upload file
router.post('/:workspaceId/files', upload.single('file'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const { description, category } = req.body;

    if (!req.file) {
      return sendError(res, 'No file provided', 400);
    }

    // Check if user has access
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole) {
      return sendError(res, 'Access denied', 403);
    }

    const file = await prisma.workspaceFile.create({
      data: {
        name: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: `/uploads/${req.file.filename}`,
        uploadedById: userId,
        workspaceId,
        description,
        category
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    sendSuccess(res, file, 'File uploaded successfully', 201);
  } catch (error) {
    console.error('Error uploading file:', error);
    sendError(res, 'Failed to upload file', 500);
  }
});

// Delete file
router.delete('/:workspaceId/files/:fileId', async (req, res) => {
  try {
    const { workspaceId, fileId } = req.params;
    const userId = req.user.id;

    // Check if user has access to workspace
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole) {
      return sendError(res, 'Access denied', 403);
    }

    // Get file details first to delete from filesystem
    const file = await prisma.workspaceFile.findFirst({
      where: { 
        id: fileId, 
        workspaceId,
      }
    });

    if (!file) {
      return sendError(res, 'File not found', 404);
    }

    // Check if user can delete (file owner, admin, or owner)
    const canDelete = 
      file.uploadedById === userId || 
      memberRole.role === 'owner' || 
      memberRole.role === 'admin';

    if (!canDelete) {
      return sendError(res, 'Insufficient permissions to delete this file', 403);
    }

    // Delete file from database
    await prisma.workspaceFile.delete({
      where: { id: fileId }
    });

    // Delete file from filesystem
    const fs = require('fs');
    const filePath = file.url.replace('/uploads/', '');
    const fullPath = `${process.env.UPLOAD_DIR || 'uploads'}/${filePath}`;
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    sendSuccess(res, null, 'File deleted successfully');
  } catch (error) {
    console.error('Error deleting file:', error);
    sendError(res, 'Failed to delete file', 500);
  }
});

// Update file metadata
router.put('/:workspaceId/files/:fileId', async (req, res) => {
  try {
    const { workspaceId, fileId } = req.params;
    const userId = req.user.id;
    const { name, description, category } = req.body;

    // Check if user has access to workspace
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole) {
      return sendError(res, 'Access denied', 403);
    }

    // Get file details
    const file = await prisma.workspaceFile.findFirst({
      where: { 
        id: fileId, 
        workspaceId,
      }
    });

    if (!file) {
      return sendError(res, 'File not found', 404);
    }

    // Check if user can edit (file owner, admin, or owner, or has edit permissions)
    const canEdit = 
      file.uploadedById === userId || 
      memberRole.role === 'owner' || 
      memberRole.role === 'admin' ||
      (memberRole.permissions as any)?.canEdit;

    if (!canEdit) {
      return sendError(res, 'Insufficient permissions to edit this file', 403);
    }

    // Update file metadata
    const updatedFile = await prisma.workspaceFile.update({
      where: { id: fileId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category })
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    sendSuccess(res, updatedFile, 'File updated successfully');
  } catch (error) {
    console.error('Error updating file:', error);
    sendError(res, 'Failed to update file', 500);
  }
});

// Get workspace goals
router.get('/:workspaceId/goals', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    console.log('🎯 GET /workspaces/:workspaceId/goals called:', { workspaceId, userId });

    // Check if user has access to workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    // Get goals from in-memory storage
    const goals = goalsStorage.get(workspaceId) || [];
    console.log('🎯 Returning goals for workspace:', workspaceId, 'count:', goals.length);

    sendSuccess(res, goals, 'Workspace goals retrieved successfully');
  } catch (error) {
    console.error('Error fetching workspace goals:', error);
    sendError(res, 'Failed to fetch workspace goals', 500);
  }
});

// Archive workspace
router.put('/:workspaceId/archive', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Check if user has admin permissions
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole || !['OWNER', 'admin'].includes(memberRole.role)) {
      return sendError(res, 'Only workspace owners and admins can archive workspaces', 403);
    }

    // Archive the workspace
    const archivedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        _count: {
          select: {
            members: true,
            journalEntries: true
          }
        }
      }
    });

    // Notify all workspace members about the archival
    const allMembers = await prisma.workspaceMember.findMany({
      where: { 
        workspaceId,
        userId: { not: userId } // Exclude the user who archived it
      },
      include: {
        user: { select: { name: true } }
      }
    });

    // Create notifications for all members
    const notifications = allMembers.map(member => ({
      type: 'WORKSPACE_ARCHIVED',
      title: 'Workspace Archived',
      message: `The workspace "${archivedWorkspace.name}" has been archived by ${memberRole.role === 'OWNER' ? 'the owner' : 'an admin'}`,
      recipientId: member.userId,
      senderId: userId,
      relatedEntityType: 'WORKSPACE',
      relatedEntityId: workspaceId
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    const workspaceWithStats = {
      ...archivedWorkspace,
      userRole: memberRole.role,
      stats: {
        totalMembers: archivedWorkspace._count.members,
        totalJournalEntries: archivedWorkspace._count.journalEntries
      }
    };

    sendSuccess(res, workspaceWithStats, 'Workspace archived successfully');
  } catch (error) {
    console.error('Error archiving workspace:', error);
    sendError(res, 'Failed to archive workspace', 500);
  }
});

// Unarchive workspace
router.put('/:workspaceId/unarchive', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Check if user has admin permissions
    const memberRole = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!memberRole || !['OWNER', 'admin'].includes(memberRole.role)) {
      return sendError(res, 'Only workspace owners and admins can unarchive workspaces', 403);
    }

    // Unarchive the workspace
    const unarchivedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { 
        isActive: true,
        updatedAt: new Date()
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        _count: {
          select: {
            members: true,
            journalEntries: true
          }
        }
      }
    });

    const workspaceWithStats = {
      ...unarchivedWorkspace,
      userRole: memberRole.role,
      stats: {
        totalMembers: unarchivedWorkspace._count.members,
        totalJournalEntries: unarchivedWorkspace._count.journalEntries
      }
    };

    sendSuccess(res, workspaceWithStats, 'Workspace unarchived successfully');
  } catch (error) {
    console.error('Error unarchiving workspace:', error);
    sendError(res, 'Failed to unarchive workspace', 500);
  }
});

// Delete workspace goal
router.delete('/:workspaceId/goals/:goalId', async (req, res) => {
  try {
    const { workspaceId, goalId } = req.params;
    const userId = req.user.id;
    console.log('🎯 DELETE /workspaces/:workspaceId/goals/:goalId called:', { workspaceId, goalId, userId });

    // Check if user has access to workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    // Get existing goals
    const existingGoals = goalsStorage.get(workspaceId) || [];
    
    // Find the goal to delete
    const goalIndex = existingGoals.findIndex((goal: any) => goal.id === goalId);
    
    if (goalIndex === -1) {
      console.log('🎯 Goal not found:', goalId);
      return sendError(res, 'Goal not found', 404);
    }

    // Remove the goal from storage
    existingGoals.splice(goalIndex, 1);
    goalsStorage.set(workspaceId, existingGoals);
    
    console.log('🎯 Goal deleted successfully:', goalId);
    console.log('🎯 Remaining goals for workspace:', workspaceId, 'count:', existingGoals.length);
    
    sendSuccess(res, null, 'Goal deleted successfully');
  } catch (error) {
    console.error('Error deleting workspace goal:', error);
    sendError(res, 'Failed to delete workspace goal', 500);
  }
});

// Create workspace goal
router.post('/:workspaceId/goals', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const goalData = req.body;
    console.log('🎯 POST /workspaces/:workspaceId/goals called:', { workspaceId, userId, goalTitle: goalData.title });

    // Check if user has access to workspace
    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!hasAccess) {
      return sendError(res, 'Access denied', 403);
    }

    // Get workspace members to populate user information
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            title: true
          }
        }
      }
    });

    // Helper function to get user info by ID
    const getUserInfo = (userId: string) => {
      const member = workspaceMembers.find(m => m.userId === userId);
      if (member?.user) {
        return {
          id: member.user.id,
          name: member.user.name || member.user.email.split('@')[0],
          email: member.user.email,
          avatar: member.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.name || member.user.email.split('@')[0])}&background=random`,
          title: member.user.title || 'Team Member'
        };
      }
      return { id: userId, name: 'Unknown User', email: '', avatar: `https://ui-avatars.com/api/?name=Unknown&background=random`, title: 'Team Member' };
    };

    // Create goal with proper user information
    const mockGoal = {
      id: `goal-${Date.now()}`,
      title: goalData.title,
      description: goalData.description,
      status: 'not-started',
      priority: goalData.priority,
      targetDate: goalData.targetDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workspaceId,
      category: goalData.category,
      progressPercentage: 0,
      accountable: getUserInfo(goalData.accountableId),
      responsible: goalData.responsibleIds?.map((id: string) => getUserInfo(id)) || [],
      consulted: goalData.consultedIds?.map((id: string) => getUserInfo(id)) || [],
      informed: goalData.informedIds?.map((id: string) => getUserInfo(id)) || [],
      milestones: goalData.milestones?.map((m: any, i: number) => ({
        ...m,
        id: `milestone-${Date.now()}-${i}`,
        completed: false
      })) || [],
      linkedJournalEntries: [],
      createdBy: getUserInfo(goalData.accountableId),
      tags: goalData.tags || [],
      editHistory: []
    };

    // Store goal in in-memory storage
    const existingGoals = goalsStorage.get(workspaceId) || [];
    existingGoals.push(mockGoal);
    goalsStorage.set(workspaceId, existingGoals);
    
    console.log('🎯 Goal created and stored:', mockGoal);
    console.log('🎯 Total goals for workspace:', workspaceId, 'count:', existingGoals.length);
    sendSuccess(res, mockGoal, 'Goal created successfully', 201);
  } catch (error) {
    console.error('Error creating workspace goal:', error);
    sendError(res, 'Failed to create workspace goal', 500);
  }
});

export default router;