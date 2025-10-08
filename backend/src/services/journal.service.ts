import { PrismaClient } from '@prisma/client';
import {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  GetJournalEntriesInput,
  PublishJournalEntryInput,
  AddCommentInput,
  UpdateCommentInput,
  AddArtifactInput,
  LinkToGoalInput,
  RecordAnalyticsInput,
  RechronicleInput
} from '../types/journal.types';

const prisma = new PrismaClient();

export class JournalService {
  /**
   * Create a new journal entry
   */
  async createJournalEntry(authorId: string, data: CreateJournalEntryInput) {
    // Verify workspace access
    const workspace = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: authorId,
          workspaceId: data.workspaceId
        }
      }
    });

    if (!workspace || !workspace.isActive) {
      throw new Error('Access denied: Not a member of this workspace');
    }

    // Create the journal entry
    const entry = await prisma.journalEntry.create({
      data: {
        title: data.title,
        description: data.description,
        fullContent: data.fullContent,
        abstractContent: data.abstractContent,
        authorId,
        workspaceId: data.workspaceId,
        visibility: data.visibility,
        category: data.category,
        tags: data.tags,
        skills: data.skills,
        // Achievement fields
        achievementType: data.achievementType,
        achievementTitle: data.achievementTitle,
        achievementDescription: data.achievementDescription,
        // Create collaborators
        collaborators: {
          create: data.collaborators?.map(collab => ({
            userId: collab.userId,
            role: collab.role
          }))
        },
        // Create reviewers
        reviewers: {
          create: data.reviewers?.map(reviewer => ({
            userId: reviewer.userId,
            department: reviewer.department
          }))
        },
        // Create artifacts
        artifacts: {
          create: data.artifacts?.map(artifact => ({
            name: artifact.name,
            type: artifact.type,
            url: artifact.url,
            size: artifact.size,
            metadata: artifact.metadata
          }))
        },
        // Create outcomes
        outcomes: {
          create: data.outcomes?.map(outcome => ({
            category: outcome.category,
            title: outcome.title,
            description: outcome.description,
            highlight: outcome.highlight,
            metrics: outcome.metrics
          }))
        }
      },
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
            name: true
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
            rechronicles: true
          }
        }
      }
    });

    return entry;
  }

  /**
   * Get journal entries with filtering and pagination
   */
  async getJournalEntries(userId: string, filters: GetJournalEntriesInput) {
    const {
      workspaceId,
      visibility,
      category,
      tags,
      skills,
      authorId,
      search,
      sortBy,
      sortOrder,
      page,
      limit
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      AND: []
    };

    // Visibility filter - only show entries user has access to
    if (workspaceId) {
      // Check if user is a member of this workspace
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId
          }
        }
      });

      if (!membership || !membership.isActive) {
        throw new Error('Access denied: Not a member of this workspace');
      }

      where.AND.push({ workspaceId });
    } else {
      // General visibility rules
      where.AND.push({
        OR: [
          { authorId: userId }, // Own entries
          { 
            AND: [
              { visibility: 'workspace' },
              {
                workspace: {
                  members: {
                    some: {
                      userId,
                      isActive: true
                    }
                  }
                }
              }
            ]
          },
          { visibility: 'network' } // Network entries (will add network filtering later)
        ]
      });
    }

    // Additional filters
    if (visibility) {
      where.AND.push({ visibility });
    }

    if (category) {
      where.AND.push({ category });
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.AND.push({
        tags: {
          hasSome: tagArray
        }
      });
    }

    if (skills) {
      const skillArray = skills.split(',').map(skill => skill.trim());
      where.AND.push({
        skills: {
          hasSome: skillArray
        }
      });
    }

    if (authorId) {
      where.AND.push({ authorId });
    }

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { fullContent: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    // Only show published entries (except for own entries)
    where.AND.push({
      OR: [
        { authorId: userId }, // Own entries (can see unpublished)
        { isPublished: true } // Others' published entries
      ]
    });

    // Build orderBy
    let orderBy: any;
    switch (sortBy) {
      case 'likes':
        orderBy = { likes: { _count: sortOrder } };
        break;
      case 'comments':
        orderBy = { comments: { _count: sortOrder } };
        break;
      case 'views':
        orderBy = { analytics: { _count: sortOrder } };
        break;
      default:
        orderBy = { [sortBy]: sortOrder };
    }

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
                select: {
                  name: true
                }
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
        skip,
        take: limit
      }),
      prisma.journalEntry.count({ where })
    ]);

    // Add user's interaction status to each entry
    const entryIds = entries.map(entry => entry.id);
    
    const [userLikes, userAppreciates, userRechronicles] = await Promise.all([
      prisma.journalLike.findMany({
        where: {
          userId,
          entryId: { in: entryIds }
        },
        select: { entryId: true }
      }),
      prisma.journalAppreciate.findMany({
        where: {
          userId,
          entryId: { in: entryIds }
        },
        select: { entryId: true }
      }),
      prisma.journalRechronicle.findMany({
        where: {
          userId,
          entryId: { in: entryIds }
        },
        select: { entryId: true }
      })
    ]);

    const likedEntries = new Set(userLikes.map(like => like.entryId));
    const appreciatedEntries = new Set(userAppreciates.map(app => app.entryId));
    const rechronicledEntries = new Set(userRechronicles.map(rech => rech.entryId));

    // Add interaction status to entries
    const enrichedEntries = entries.map(entry => ({
      ...entry,
      hasLiked: likedEntries.has(entry.id),
      hasAppreciated: appreciatedEntries.has(entry.id),
      hasRechronicled: rechronicledEntries.has(entry.id),
      // Remove full content for list view (except for own entries)
      fullContent: entry.authorId === userId ? entry.fullContent : undefined
    }));

    return {
      entries: enrichedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single journal entry by ID
   */
  async getJournalEntryById(entryId: string, userId: string) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
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
              select: {
                name: true
              }
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
        goalLinks: {
          include: {
            goal: {
              select: {
                id: true,
                title: true,
                progress: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            appreciates: true,
            rechronicles: true,
            analytics: true
          }
        }
      }
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    // Check access permissions
    const canView = await this.canUserViewEntry(entry, userId);
    if (!canView) {
      throw new Error('Access denied');
    }

    // Get user's interaction status
    const [userLike, userAppreciate, userRechronicle] = await Promise.all([
      prisma.journalLike.findUnique({
        where: {
          entryId_userId: {
            entryId,
            userId
          }
        }
      }),
      prisma.journalAppreciate.findUnique({
        where: {
          entryId_userId: {
            entryId,
            userId
          }
        }
      }),
      prisma.journalRechronicle.findUnique({
        where: {
          entryId_userId: {
            entryId,
            userId
          }
        }
      })
    ]);

    // Record view analytics
    await this.recordAnalytics(entryId, userId, { engagementType: 'view' });

    return {
      ...entry,
      hasLiked: !!userLike,
      hasAppreciated: !!userAppreciate,
      hasRechronicled: !!userRechronicle
    };
  }

  /**
   * Update journal entry
   */
  async updateJournalEntry(entryId: string, userId: string, data: UpdateJournalEntryInput) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.authorId !== userId) {
      throw new Error('Access denied: You can only edit your own entries');
    }

    return prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        ...data,
        lastModified: new Date()
      },
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
            name: true
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
            rechronicles: true
          }
        }
      }
    });
  }

  /**
   * Delete journal entry
   */
  async deleteJournalEntry(entryId: string, userId: string) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.authorId !== userId) {
      throw new Error('Access denied: You can only delete your own entries');
    }

    return prisma.journalEntry.delete({
      where: { id: entryId }
    });
  }

  /**
   * Publish journal entry
   */
  async publishJournalEntry(entryId: string, userId: string, data: PublishJournalEntryInput) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.authorId !== userId) {
      throw new Error('Access denied: You can only publish your own entries');
    }

    return prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        visibility: data.visibility,
        ...(data.abstractContent && { abstractContent: data.abstractContent })
      }
    });
  }

  /**
   * Like/unlike journal entry
   */
  async toggleLike(entryId: string, userId: string) {
    const existingLike = await prisma.journalLike.findUnique({
      where: {
        entryId_userId: {
          entryId,
          userId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.journalLike.delete({
        where: {
          entryId_userId: {
            entryId,
            userId
          }
        }
      });
      return { liked: false };
    } else {
      // Like
      await prisma.journalLike.create({
        data: {
          entryId,
          userId
        }
      });
      
      // Record analytics
      await this.recordAnalytics(entryId, userId, { engagementType: 'like' });
      
      return { liked: true };
    }
  }

  /**
   * Appreciate journal entry
   */
  async toggleAppreciate(entryId: string, userId: string) {
    const existingAppreciate = await prisma.journalAppreciate.findUnique({
      where: {
        entryId_userId: {
          entryId,
          userId
        }
      }
    });

    if (existingAppreciate) {
      await prisma.journalAppreciate.delete({
        where: {
          entryId_userId: {
            entryId,
            userId
          }
        }
      });
      return { appreciated: false };
    } else {
      await prisma.journalAppreciate.create({
        data: {
          entryId,
          userId
        }
      });
      return { appreciated: true };
    }
  }

  /**
   * Record analytics
   */
  async recordAnalytics(entryId: string, userId: string, data: RecordAnalyticsInput) {
    return prisma.journalEntryAnalytics.create({
      data: {
        entryId,
        userId,
        readTime: data.readTime,
        engagementType: data.engagementType,
        referrer: data.referrer
      }
    });
  }

  /**
   * Get comments for a journal entry
   */
  async getEntryComments(entryId: string) {
    console.log('🔍 Getting comments for entry:', entryId);
    
    // First check if entry exists
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId }
    });

    console.log('📝 Entry found:', !!entry);

    if (!entry) {
      console.log('❌ Entry not found:', entryId);
      throw new Error('Journal entry not found');
    }

    console.log('🔍 Fetching comments from database...');
    try {
      const comments = await prisma.journalComment.findMany({
      where: {
        entryId,
        parentId: null // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                title: true
              }
            },
            _count: {
              select: {
                replies: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
      });

      console.log('✅ Comments fetched:', comments.length);
      return comments;
    } catch (dbError: any) {
      console.error('❌ Database error fetching comments:', dbError);
      throw new Error(`Failed to fetch comments: ${dbError.message}`);
    }
  }

  /**
   * Add comment to journal entry
   */
  async addComment(entryId: string, userId: string, data: AddCommentInput) {
    // Check if entry exists
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        title: true,
        authorId: true,
        visibility: true,
        workspaceId: true
      }
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    // Check if user can view/comment on this entry
    const canView = await this.canUserViewEntry(entry, userId);
    if (!canView) {
      throw new Error('Access denied');
    }

    // If parentId is provided, check if parent comment exists
    if (data.parentId) {
      const parentComment = await prisma.journalComment.findUnique({
        where: { id: data.parentId }
      });

      if (!parentComment || parentComment.entryId !== entryId) {
        throw new Error('Parent comment not found');
      }
    }

    const comment = await prisma.journalComment.create({
      data: {
        content: data.content,
        entryId,
        userId: userId,
        parentId: data.parentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    return {
      ...comment,
      entry: {
        id: entry.id,
        title: entry.title,
        authorId: entry.authorId
      }
    };
  }

  /**
   * ReChronicle (repost) journal entry
   */
  async rechronicleEntry(entryId: string, userId: string, data: RechronicleInput) {
    const existingRechronicle = await prisma.journalRechronicle.findUnique({
      where: {
        entryId_userId: {
          entryId,
          userId
        }
      }
    });

    if (existingRechronicle) {
      await prisma.journalRechronicle.delete({
        where: {
          entryId_userId: {
            entryId,
            userId
          }
        }
      });
      return { rechronicled: false };
    } else {
      await prisma.journalRechronicle.create({
        data: {
          entryId,
          userId,
          comment: data.comment
        }
      });
      
      // Record analytics
      await this.recordAnalytics(entryId, userId, { engagementType: 'share' });
      
      return { rechronicled: true };
    }
  }

  /**
   * Check if user can view entry
   */
  private async canUserViewEntry(entry: any, userId: string): Promise<boolean> {
    // Author can always view their own entries
    if (entry.authorId === userId) {
      return true;
    }

    // Check visibility
    switch (entry.visibility) {
      case 'private':
        return false;
      
      case 'workspace':
        // Check if user is a member of the workspace
        const membership = await prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId,
              workspaceId: entry.workspaceId
            }
          }
        });
        return membership?.isActive || false;
      
      case 'network':
        // For now, allow all authenticated users to view network entries
        // TODO: Implement proper network connection checking
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Get user rechronicles
   */
  async getUserRechronicles(userId: string) {
    try {
      console.log('🔄 getUserRechronicles called for user:', userId);
      
      const rechronicles = await prisma.journalRechronicle.findMany({
        where: {
          userId
        },
        include: {
          entry: {
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
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          rechronicledAt: 'desc'
        }
      });

      console.log('🔄 Found', rechronicles.length, 'rechronicles for user');
      return rechronicles;
    } catch (error) {
      console.error('❌ Error in getUserRechronicles:', error);
      throw error;
    }
  }

  /**
   * Get user feed including both journal entries and rechronicled entries
   */
  async getUserFeed(userId: string, filters: GetJournalEntriesInput) {
    try {
      console.log('📊 getUserFeed called for user:', userId, 'with filters:', filters);
      
      // For now, just return regular journal entries to test the endpoint
      // We'll add rechronicle functionality once this works
      console.log('📊 Calling getJournalEntries...');
      const result = await this.getJournalEntries(userId, filters);
      console.log('📊 getJournalEntries returned:', result.entries.length, 'entries');
      
      return result;
    } catch (error) {
      console.error('❌ Error in getUserFeed:', error);
      throw error;
    }
  }
}