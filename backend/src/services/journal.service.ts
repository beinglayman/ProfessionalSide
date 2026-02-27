import { prisma } from '../lib/prisma';
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
  RechronicleInput,
  JournalEntryResponse,
  JournalEntriesResponse,
  CreateDraftStoryInput,
  RegenerateNarrativeInput
} from '../types/journal.types';
import { getModelSelector, ModelSelectorService } from './ai/model-selector.service';
import {
  buildNarrativeMessages,
  formatActivitiesForPrompt,
  buildEnhancedNarrativeMessages,
  formatEnhancedActivitiesForPrompt,
  EnhancedActivity,
  GroupingContext
} from './ai/prompts/journal-narrative.prompt';
import {
  DraftStoryGenerationOutput,
  DraftStoryCategory,
  DraftStoryPhase,
  ActivityStoryEdge,
  ACTIVITY_EDGE_TYPES,
  DEFAULT_EDGE_MESSAGE,
  MAX_EDGE_MESSAGE_LENGTH,
} from '../types/journal.types';
import { skillTrackingService } from './skill-tracking.service';
import { ActivityService } from './activity.service';
import { detectArchetype } from '../cli/story-coach/services/archetype-detector';
import { JournalEntryFile } from '../cli/story-coach/types';
import { StoryArchetype } from './ai/prompts/career-story.prompt';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default values for demo mode when real data is unavailable */
const DEMO_DEFAULTS = {
  WORKSPACE_ID: 'demo-workspace',
  WORKSPACE_NAME: 'Demo Workspace',
  USER_NAME: 'Demo User',
  USER_POSITION: 'Software Engineer',
  CATEGORY: 'achievement',
  MAX_EXTRACTED_SKILLS: 10,
} as const;

/** Skill patterns for automatic extraction from content */
const SKILL_EXTRACTION_PATTERNS = [
  /\b(React|TypeScript|JavaScript|Python|Node\.js|PostgreSQL|GraphQL|REST API|Docker|Kubernetes|AWS|GCP|Azure)\b/gi,
  /\b(machine learning|data analysis|system design|performance optimization|security|testing|CI\/CD)\b/gi,
];

/** LLM temperature for narrative generation */
const NARRATIVE_TEMPERATURE = 0.7;

/** Max tokens for narrative generation */
const NARRATIVE_MAX_TOKENS = 4000;

// =============================================================================
// ACTIVITY EDGE VALIDATION HELPERS (Exported for testing)
// =============================================================================

/**
 * Validate edge type, defaulting to 'primary' for invalid values.
 * Pure function - safe for unit testing.
 */
export function validateEdgeType(type: unknown): ActivityStoryEdge['type'] {
  if (typeof type === 'string' && ACTIVITY_EDGE_TYPES.includes(type as any)) {
    return type as ActivityStoryEdge['type'];
  }
  return 'primary';
}

/**
 * Validate and truncate edge message.
 * Pure function - safe for unit testing.
 */
export function validateEdgeMessage(message: unknown): string {
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.slice(0, MAX_EDGE_MESSAGE_LENGTH);
  }
  return DEFAULT_EDGE_MESSAGE;
}

/**
 * Validate activity edges from LLM response.
 * Ensures all edges reference valid activity IDs.
 * Pure function - safe for unit testing.
 */
export function validateActivityEdges(
  edges: unknown,
  activityIds: string[]
): ActivityStoryEdge[] {
  const validIds = new Set(activityIds);

  if (!Array.isArray(edges) || edges.length === 0) {
    // Default: all activities as 'primary' with generic message
    return activityIds.map(id => ({
      activityId: id,
      type: 'primary',
      message: DEFAULT_EDGE_MESSAGE,
    }));
  }

  return edges
    .filter((edge: unknown): edge is Record<string, unknown> =>
      typeof edge === 'object' && edge !== null)
    .filter((edge) => typeof edge.activityId === 'string' && validIds.has(edge.activityId))
    .map((edge) => ({
      activityId: edge.activityId as string,
      type: validateEdgeType(edge.type),
      message: validateEdgeMessage(edge.message),
    }));
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract technology skills from content using pattern matching.
 * Used for demo entries that don't have explicit skill tags.
 */
function extractSkillsFromContent(content: string): string[] {
  const skills = new Set<string>();
  for (const pattern of SKILL_EXTRACTION_PATTERNS) {
    const matches = content.match(pattern) || [];
    matches.forEach(m => skills.add(m));
  }
  return Array.from(skills).slice(0, DEMO_DEFAULTS.MAX_EXTRACTED_SKILLS);
}

/**
 * Create empty pagination response for edge cases.
 */
function emptyPaginatedResponse(page: number, limit: number): JournalEntriesResponse {
  return {
    entries: [],
    pagination: { page, limit, total: 0, totalPages: 0 }
  };
}

export class JournalService {
  private readonly isDemoMode: boolean;

  constructor(isDemoMode = false) {
    this.isDemoMode = isDemoMode;
  }

  /**
   * Get the sourceMode based on isDemoMode flag.
   * Used for filtering JournalEntry records by source.
   */
  private get sourceMode(): 'demo' | 'production' {
    return this.isDemoMode ? 'demo' : 'production';
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Find a journal entry and validate ownership.
   * Uses sourceMode filter for DELETE operations (Cmd+E mode deletes only demo entries).
   *
   * NOTE: This is intentionally different from fetching which does NOT filter by sourceMode.
   * - Fetch (getJournalEntries): Returns ALL entries regardless of sourceMode
   * - Delete (via this method): Filters by sourceMode so Cmd+E can delete only demo entries
   *
   * @throws Error('Journal entry not found') if entry doesn't exist or wrong sourceMode
   * @throws Error('Access denied: You can only delete your own entries') if user doesn't own it
   */
  private async findEntryAndValidateOwnership(
    entryId: string,
    userId: string
  ): Promise<{ id: string }> {
    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        sourceMode: this.sourceMode // Filter by sourceMode for delete operations
      }
    });
    if (!entry) throw new Error('Journal entry not found');
    if (entry.authorId !== userId) {
      throw new Error('Access denied: You can only delete your own entries');
    }
    return entry;
  }

  /**
   * Get journal entry IDs that have activities from a specific source.
   * Used for filterBySource functionality.
   */
  private async getEntryIdsWithSource(userId: string, source: string): Promise<string[]> {
    // Get all journal entries with their activityIds
    const entries = await prisma.journalEntry.findMany({
      where: { authorId: userId },
      select: { id: true, activityIds: true, sourceMode: true }
    });

    // Collect all activity IDs by sourceMode
    const demoActivityIds: string[] = [];
    const prodActivityIds: string[] = [];

    for (const entry of entries) {
      if (!entry.activityIds || entry.activityIds.length === 0) continue;
      if (entry.sourceMode === 'demo') {
        demoActivityIds.push(...entry.activityIds);
      } else {
        prodActivityIds.push(...entry.activityIds);
      }
    }

    // Fetch activities and check source
    const activitiesWithSource = new Set<string>();

    if (demoActivityIds.length > 0) {
      const demoActivities = await prisma.demoToolActivity.findMany({
        where: { id: { in: demoActivityIds }, source },
        select: { id: true }
      });
      demoActivities.forEach(a => activitiesWithSource.add(a.id));
    }

    if (prodActivityIds.length > 0) {
      const prodActivities = await prisma.toolActivity.findMany({
        where: { id: { in: prodActivityIds }, source },
        select: { id: true }
      });
      prodActivities.forEach(a => activitiesWithSource.add(a.id));
    }

    // Find entries that have at least one activity from the source
    return entries
      .filter(entry =>
        (entry.activityIds || []).some(id => activitiesWithSource.has(id))
      )
      .map(entry => entry.id);
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

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
        sourceMode: this.sourceMode,
        visibility: data.visibility,
        category: data.category,
        tags: data.tags,
        skills: data.skills,
        // Format7 data (workspace view)
        format7Data: data.format7Data,
        // Network entry fields (dual-view system)
        networkTitle: data.networkTitle,
        networkContent: data.networkContent,
        format7DataNetwork: data.format7DataNetwork,
        generateNetworkEntry: data.generateNetworkEntry ?? true,
        networkGenerated: !!data.networkContent,
        networkGeneratedAt: data.networkContent ? new Date() : null,
        sanitizationLog: data.sanitizationLog,
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

    // Track skill usage from this journal entry (non-blocking)
    if (data.skills && data.skills.length > 0) {
      // Check if outcomes indicate positive results (metrics is a JSON string)
      const hasPositiveOutcome = data.outcomes?.some(o => {
        if (!o.metrics) return false;
        try {
          const metrics = typeof o.metrics === 'string' ? JSON.parse(o.metrics) : o.metrics;
          return metrics?.trend === 'up';
        } catch {
          return false;
        }
      }) ?? false;

      skillTrackingService.recordSkillUsage(
        authorId,
        data.skills,
        hasPositiveOutcome
      ).catch(err => {
        console.error('Failed to record skill usage (non-blocking):', err);
      });
    }

    return entry;
  }

  /**
   * Get journal entries with filtering and pagination.
   * Unified method that fetches ALL entries regardless of sourceMode.
   *
   * NOTE: sourceMode is used for seeding (demo vs real integrations) but
   * does NOT affect reading - users see all their entries in one feed.
   *
   * @param userId - The user requesting the entries
   * @param filters - Filtering and pagination options
   */
  async getJournalEntries(
    userId: string,
    filters: GetJournalEntriesInput
  ): Promise<JournalEntriesResponse> {
    // Unified fetch - demo mode no longer affects reading
    // All entries are fetched from the same table regardless of sourceMode
    return this.getUnifiedJournalEntries(userId, filters);
  }

  /**
   * Get journal entries from the unified JournalEntry table.
   * Does NOT filter by sourceMode - returns all entries for the user.
   *
   * @throws Never - returns empty array on errors to avoid breaking the UI
   */
  private async getUnifiedJournalEntries(
    userId: string,
    filters: GetJournalEntriesInput
  ): Promise<JournalEntriesResponse> {
    const { page, limit, search, sortBy, sortOrder, includeActivityMeta, filterBySource } = filters;
    const skip = (page - 1) * limit;

    try {
      // If filterBySource is specified, we need to filter entries that have activities from that source
      let filteredEntryIds: string[] | null = null;
      if (filterBySource) {
        filteredEntryIds = await this.getEntryIdsWithSource(userId, filterBySource);
        if (filteredEntryIds.length === 0) {
          return emptyPaginatedResponse(page, limit);
        }
      }

      // Build where clause - NO sourceMode filter (fetch all entries)
      const where: any = {
        authorId: userId
        // sourceMode filter removed - show all entries regardless of demo/production
      };

      console.log('🔍 getUnifiedJournalEntries query params:', {
        userId,
        page,
        limit,
        skip,
        sortBy,
        sortOrder,
        isDemoMode: this.isDemoMode,
        where: JSON.stringify(where)
      });

      // Apply source filter if specified
      if (filteredEntryIds) {
        where.id = { in: filteredEntryIds };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { fullContent: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Build orderBy - fallback to createdAt for fields that need aggregation
      const unsupportedSortFields = ['likes', 'comments', 'views'];
      const effectiveSortBy = unsupportedSortFields.includes(sortBy) ? 'createdAt' : sortBy;
      const orderBy: any = { [effectiveSortBy]: sortOrder };

      // Fetch entries and count in parallel with full relations
      const [entries, total] = await Promise.all([
        prisma.journalEntry.findMany({
          where,
          orderBy,
          skip,
          take: limit,
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
        }),
        prisma.journalEntry.count({ where })
      ]);

      // Early return if no entries
      if (entries.length === 0) {
        console.log(`📋 No entries found for user ${userId}`);
        return emptyPaginatedResponse(page, limit);
      }

      // Transform entries to response shape
      let transformedEntries: JournalEntryResponse[] = entries.map(entry =>
        this.transformJournalEntryToResponse(entry, userId)
      );

      // Enrich with activity metadata if requested
      if (includeActivityMeta) {
        const activityService = new ActivityService(this.isDemoMode);
        const entryIds = entries.map((e: any) => e.id);
        const activityMetaMap = await activityService.getActivityMetaForEntries(userId, entryIds);

        transformedEntries = transformedEntries.map(entry => ({
          ...entry,
          activityMeta: activityMetaMap.get(entry.id) || {
            totalCount: 0,
            sources: [],
            dateRange: { earliest: null, latest: null }
          }
        }));
      }

      console.log(`📋 Returning ${transformedEntries.length} entries for user ${userId}`);

      return {
        entries: transformedEntries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      // Log error but return empty result to avoid breaking the UI
      console.error('❌ Error fetching demo journal entries:', error);
      return emptyPaginatedResponse(page, limit);
    }
  }

  /**
   * Transform a JournalEntry (with includes) to the unified JournalEntryResponse shape.
   * Used for both demo and production entries from the unified table.
   */
  private transformJournalEntryToResponse(
    entry: any,
    requestingUserId: string,
    userInteractions?: {
      hasLiked: boolean;
      hasAppreciated: boolean;
      hasRechronicled: boolean;
    }
  ): JournalEntryResponse {
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      fullContent: entry.authorId === requestingUserId ? entry.fullContent : '', // Hide full content for others
      abstractContent: entry.abstractContent,

      // Workspace context
      workspaceId: entry.workspaceId,
      workspaceName: entry.workspace?.name || DEMO_DEFAULTS.WORKSPACE_NAME,
      organizationName: entry.workspace?.organization?.name || null,

      // Author info
      author: {
        id: entry.author?.id || entry.authorId,
        name: entry.author?.name || DEMO_DEFAULTS.USER_NAME,
        avatar: entry.author?.avatar || null,
        position: entry.author?.title || DEMO_DEFAULTS.USER_POSITION
      },

      // Collaborators
      collaborators: (entry.collaborators || []).map((c: any) => ({
        id: c.user.id,
        name: c.user.name || 'Unknown',
        avatar: c.user.avatar,
        role: c.role
      })),

      // Reviewers
      reviewers: (entry.reviewers || []).map((r: any) => ({
        id: r.user.id,
        name: r.user.name || 'Unknown',
        avatar: r.user.avatar,
        department: r.department
      })),

      // Artifacts
      artifacts: (entry.artifacts || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        size: a.size
      })),

      // Outcomes
      outcomes: (entry.outcomes || []).map((o: any) => ({
        category: o.category,
        title: o.title,
        description: o.description,
        highlight: o.highlight,
        metrics: o.metrics as string | null
      })),

      // Metadata
      skills: entry.skills || [],
      tags: entry.tags || [],
      category: entry.category || DEMO_DEFAULTS.CATEGORY,
      visibility: entry.visibility as 'private' | 'workspace' | 'network',
      isPublished: entry.isPublished,
      publishedAt: entry.publishedAt,

      // Timestamps
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lastModified: entry.lastModified,

      // Social counts
      likes: entry._count?.likes || 0,
      comments: entry._count?.comments || 0,
      appreciates: entry._count?.appreciates || 0,
      rechronicles: entry._count?.rechronicles || 0,

      // User interaction status
      hasLiked: userInteractions?.hasLiked || false,
      hasAppreciated: userInteractions?.hasAppreciated || false,
      hasRechronicled: userInteractions?.hasRechronicled || false,

      // Discussions
      discussCount: entry._count?.comments || 0,
      discussions: [],

      // Analytics
      analytics: {
        viewCount: entry._count?.analytics || 0,
        averageReadTime: 0,
        engagementTrend: 'stable' as const,
        trendPercentage: 0
      },

      // Achievement fields
      achievementType: entry.achievementType,
      achievementTitle: entry.achievementTitle,
      achievementDescription: entry.achievementDescription,

      // Goal links
      linkedGoals: (entry.goalLinks || []).map((gl: any) => ({
        goalId: gl.goal.id,
        goalTitle: gl.goal.title,
        contributionType: gl.contributionType,
        progressContribution: gl.progressContribution,
        linkedAt: gl.linkedAt,
        notes: null
      })),

      // Format7 data
      format7Data: entry.format7Data,
      format7DataNetwork: entry.format7DataNetwork,
      generateNetworkEntry: entry.generateNetworkEntry,

      // Network entry fields
      networkContent: entry.networkContent,
      networkTitle: entry.networkTitle,

      // Dual-path generation fields
      activityIds: entry.activityIds || [],
      groupingMethod: entry.groupingMethod,
      timeRangeStart: entry.timeRangeStart,
      timeRangeEnd: entry.timeRangeEnd,
      generatedAt: entry.generatedAt
    };
  }

  // NOTE: transformDemoEntryToResponse has been REMOVED - use transformJournalEntryToResponse instead

  /**
   * Get production journal entries with full relations and filtering.
   */
  private async getProductionJournalEntries(
    userId: string,
    filters: GetJournalEntriesInput
  ): Promise<JournalEntriesResponse> {
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

    // Build where clause - always filter by sourceMode: 'production'
    const where: any = {
      sourceMode: 'production',
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

    // Note: isPublished filter removed - visibility alone controls access
    // - private: only author sees
    // - workspace: workspace members see
    // - network: everyone in network sees

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

    // Transform production entries to unified response shape
    const transformedEntries: JournalEntryResponse[] = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      fullContent: entry.authorId === userId ? entry.fullContent : '', // Hide full content for others
      abstractContent: entry.abstractContent,

      // Workspace context
      workspaceId: entry.workspaceId,
      workspaceName: entry.workspace.name,
      organizationName: entry.workspace.organization?.name || null,

      // Author info
      author: {
        id: entry.author.id,
        name: entry.author.name || 'Unknown',
        avatar: entry.author.avatar,
        position: entry.author.title
      },

      // Collaborators
      collaborators: entry.collaborators.map(c => ({
        id: c.user.id,
        name: c.user.name || 'Unknown',
        avatar: c.user.avatar,
        role: c.role
      })),

      // Reviewers
      reviewers: entry.reviewers.map(r => ({
        id: r.user.id,
        name: r.user.name || 'Unknown',
        avatar: r.user.avatar,
        department: r.department
      })),

      // Artifacts
      artifacts: entry.artifacts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        size: a.size
      })),

      // Outcomes
      outcomes: entry.outcomes.map(o => ({
        category: o.category,
        title: o.title,
        description: o.description,
        highlight: o.highlight,
        metrics: o.metrics as string | null
      })),

      // Metadata
      skills: entry.skills,
      tags: entry.tags,
      category: entry.category,
      visibility: entry.visibility as 'private' | 'workspace' | 'network',
      isPublished: entry.isPublished,
      publishedAt: entry.publishedAt,

      // Timestamps
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lastModified: entry.lastModified,

      // Social counts
      likes: entry._count.likes,
      comments: entry._count.comments,
      appreciates: entry._count.appreciates,
      rechronicles: entry._count.rechronicles,

      // User interaction status
      hasLiked: likedEntries.has(entry.id),
      hasAppreciated: appreciatedEntries.has(entry.id),
      hasRechronicled: rechronicledEntries.has(entry.id),

      // Discussions (simplified - would need separate query for full discussion data)
      discussCount: entry._count.comments,
      discussions: [],

      // Analytics
      analytics: {
        viewCount: entry._count.analytics,
        averageReadTime: 0,
        engagementTrend: 'stable' as const,
        trendPercentage: 0
      },

      // Achievement fields
      achievementType: entry.achievementType,
      achievementTitle: entry.achievementTitle,
      achievementDescription: entry.achievementDescription,

      // Goal links
      linkedGoals: entry.goalLinks.map(gl => ({
        goalId: gl.goal.id,
        goalTitle: gl.goal.title,
        contributionType: gl.contributionType,
        progressContribution: gl.progressContribution,
        linkedAt: gl.linkedAt,
        notes: null // GoalJournalLink doesn't have notes field
      })),

      // Format7 data
      format7Data: entry.format7Data,
      format7DataNetwork: entry.format7DataNetwork,
      generateNetworkEntry: entry.generateNetworkEntry,

      // Network entry fields
      networkContent: entry.networkContent,
      networkTitle: entry.networkTitle,

      // Dual-path generation fields
      activityIds: entry.activityIds || [],
      groupingMethod: entry.groupingMethod,
      timeRangeStart: entry.timeRangeStart,
      timeRangeEnd: entry.timeRangeEnd,
      generatedAt: entry.generatedAt
    }));

    return {
      entries: transformedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single journal entry by ID.
   * Uses unified JournalEntry table - NO sourceMode filter.
   */
  async getJournalEntryById(entryId: string, userId: string) {
    // Unified fetch - no sourceMode filter
    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId
        // sourceMode filter removed - entry can be from any source
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
    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        sourceMode: this.sourceMode
      }
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    if (entry.authorId !== userId) {
      throw new Error('Access denied: You can only edit your own entries');
    }

    const updatedEntry = await prisma.journalEntry.update({
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

    // Track skill usage if skills were updated (non-blocking)
    if (data.skills && data.skills.length > 0) {
      skillTrackingService.recordSkillUsage(
        userId,
        data.skills,
        false
      ).catch(err => {
        console.error('Failed to record skill usage on update (non-blocking):', err);
      });
    }

    return updatedEntry;
  }

  /**
   * Delete journal entry.
   * Uses unified JournalEntry table - findEntryAndValidateOwnership handles sourceMode filtering.
   */
  async deleteJournalEntry(entryId: string, userId: string) {
    // Validate entry exists and user owns it (uses sourceMode filter internally)
    await this.findEntryAndValidateOwnership(entryId, userId);

    // Delete from unified JournalEntry table
    return prisma.journalEntry.delete({ where: { id: entryId } });
  }

  /**
   * Bulk delete auto-generated draft entries for a user
   */
  async bulkDeleteAutoGeneratedDrafts(userId: string, workspaceId?: string) {
    const whereClause: any = {
      authorId: userId,
      isPublished: false,
      sourceMode: this.sourceMode,
      tags: {
        has: 'auto-generated'
      }
    };

    // Optionally filter by workspace
    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    // First count how many will be deleted
    const count = await prisma.journalEntry.count({
      where: whereClause
    });

    // Delete all matching entries
    await prisma.journalEntry.deleteMany({
      where: whereClause
    });

    return { deletedCount: count };
  }

  /**
   * Clear ALL demo entries and activities for a user.
   * Used by Cmd+E "Clear Demo Data" to delete all demo data atomically.
   * Only operates when isDemoMode=true to prevent accidental deletion of production data.
   *
   * @param userId - The user whose demo data should be cleared
   * @returns Counts of deleted entries and activities
   * @throws Error if called outside demo mode
   */
  async clearAllBySourceMode(userId: string): Promise<{ deletedEntries: number; deletedActivities: number }> {
    if (!this.isDemoMode) {
      throw new Error('clearAllBySourceMode can only be called in demo mode');
    }

    console.log(`🗑️ clearAllBySourceMode: Starting transactional delete for user ${userId}`);

    // Delete both in a single transaction for atomicity
    const [entriesResult, activitiesResult] = await prisma.$transaction([
      prisma.journalEntry.deleteMany({
        where: {
          authorId: userId,
          sourceMode: 'demo',
        },
      }),
      prisma.demoToolActivity.deleteMany({
        where: { userId },
      }),
    ]);

    console.log(`🗑️ clearAllBySourceMode: Deleted ${entriesResult.count} entries, ${activitiesResult.count} activities`);

    return {
      deletedEntries: entriesResult.count,
      deletedActivities: activitiesResult.count,
    };
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
   * @param isDemoMode - Demo entries have no comments, returns empty array
   */
  async getEntryComments(entryId: string) {
    console.log('🔍 Getting comments for entry:', entryId, 'isDemoMode:', this.isDemoMode);

    // Demo mode: demo entries don't have comments
    if (this.isDemoMode) {
      console.log('📋 Demo mode: returning empty comments');
      return [];
    }

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
   * Get user feed including both journal entries and rechronicled entries.
   * Unified method that handles both demo and production modes.
   *
   * @param userId - The user requesting the feed
   * @param filters - Filtering and pagination options
   * @param isDemoMode - If true, queries demo tables instead of production
   */
  async getUserFeed(
    userId: string,
    filters: GetJournalEntriesInput
  ): Promise<JournalEntriesResponse> {
    try {
      console.log('📊 getUserFeed called for user:', userId, 'isDemoMode:', this.isDemoMode, 'with filters:', filters);

      // Route to unified getJournalEntries (uses this.isDemoMode internally)
      const result = await this.getJournalEntries(userId, filters);
      console.log('📊 getJournalEntries returned:', result.entries.length, 'entries');

      return result;
    } catch (error) {
      console.error('❌ Error in getUserFeed:', error);
      throw error;
    }
  }

  // ===========================================================================
  // DRAFT STORY CREATION (Unified for demo and production)
  // ===========================================================================

  /**
   * Create a draft story from activities.
   * Unified method that works for BOTH demo and production modes.
   *
   * The sourceMode is derived from the activity table:
   * - Demo mode: looks up activities in DemoToolActivity
   * - Production mode: looks up activities in ToolActivity
   *
   * @param authorId - The user creating the draft story
   * @param data - Draft story input data
   * @returns Created journal entry
   */
  async createDraftStory(
    authorId: string,
    data: CreateDraftStoryInput
  ): Promise<{
    id: string;
    title: string;
    description: string;
    fullContent: string;
    activityIds: string[];
    groupingMethod: string;
    timeRangeStart: Date | null;
    timeRangeEnd: Date | null;
    sourceMode: 'demo' | 'production';
  }> {
    // 1. Fetch activities from the appropriate table based on isDemoMode
    const activities = await this.fetchActivitiesForDraftStory(authorId, data.activityIds);

    if (activities.length === 0) {
      throw new Error('No activities found for the provided IDs');
    }

    // 2. Compute time range if not provided
    const timestamps = activities.map(a => a.timestamp);
    const timeRangeStart = data.timeRangeStart || new Date(Math.min(...timestamps.map(t => t.getTime())));
    const timeRangeEnd = data.timeRangeEnd || new Date(Math.max(...timestamps.map(t => t.getTime())));

    // 3. Generate title and description if not provided
    const toolSummary = this.buildToolSummary(activities);
    const title = data.title || this.generateDraftTitle(data.groupingMethod, data.clusterRef, timeRangeStart, timeRangeEnd);
    const description = data.description || `${activities.length} activities across ${toolSummary}`;

    // 4. Extract skills from title and description if not provided
    const skills = data.skills.length > 0
      ? data.skills
      : extractSkillsFromContent(`${title} ${description}`);

    // 5. Create the journal entry
    const entry = await prisma.journalEntry.create({
      data: {
        authorId,
        workspaceId: data.workspaceId,
        title,
        description,
        fullContent: `# ${title}\n\n${description}\n\n*Narrative not yet generated. Click "Generate" to create.*`,
        activityIds: data.activityIds,
        groupingMethod: data.groupingMethod,
        clusterRef: data.clusterRef,
        timeRangeStart,
        timeRangeEnd,
        generatedAt: null,
        sourceMode: this.sourceMode,
        visibility: 'workspace',
        category: 'achievement',
        tags: data.tags.length > 0 ? data.tags : ['demo', data.groupingMethod === 'cluster' ? 'cluster-based' : 'temporal'],
        skills,
      },
    });

    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      fullContent: entry.fullContent,
      activityIds: entry.activityIds,
      groupingMethod: entry.groupingMethod || data.groupingMethod,
      timeRangeStart: entry.timeRangeStart,
      timeRangeEnd: entry.timeRangeEnd,
      sourceMode: entry.sourceMode as 'demo' | 'production',
    };
  }

  /**
   * Regenerate narrative for a journal entry using LLM.
   * Unified method that works for BOTH demo and production entries.
   *
   * @param userId - The user requesting regeneration
   * @param entryId - The journal entry ID
   * @param options - Narrative generation options
   * @returns Updated journal entry with new narrative
   */
  async regenerateNarrative(
    userId: string,
    entryId: string,
    options?: RegenerateNarrativeInput
  ): Promise<{
    id: string;
    title: string;
    description: string;
    fullContent: string;
    generatedAt: Date;
    category: string | null;
    skills: string[];
    usedFallback: boolean;
  }> {
    // 1. Find the entry (uses sourceMode filter for ownership validation)
    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        authorId: userId,
        sourceMode: this.sourceMode
      },
    });

    if (!entry) {
      throw new Error('Journal entry not found');
    }

    // 2. Fetch activities for this entry
    const activities = await this.fetchActivitiesForDraftStory(userId, entry.activityIds);

    if (activities.length === 0) {
      throw new Error('No activities found for this journal entry');
    }

    // 3. Determine grouping context
    const groupingContext: GroupingContext = {
      type: entry.groupingMethod === 'cluster' ? 'cluster' : 'temporal',
      clusterRef: entry.clusterRef || undefined,
    };

    // 4. Generate narrative
    const toolSummary = this.buildToolSummary(activities);
    const selector = getModelSelector();
    let generationOutput: DraftStoryGenerationOutput | null = null;

    // Look up user email for role detection in prompt
    // In demo mode, infer persona from activities (the most frequent author/assignee)
    // so the LLM can match rawData fields to the user regardless of DB email
    let userEmail: string | undefined;
    if (this.sourceMode === 'demo') {
      userEmail = this.inferUserEmailFromActivities(activities);
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      userEmail = user?.email || undefined;
    }

    let usedFallback = false;

    // Detect archetype for narrative shaping (reuse stored if available)
    let archetype: StoryArchetype | undefined;
    const existingFormat7 = (entry.format7Data as Record<string, unknown>) || {};
    if (existingFormat7.archetype && typeof existingFormat7.archetype === 'string') {
      archetype = existingFormat7.archetype as StoryArchetype;
      console.log(`📝 Reusing stored archetype: ${archetype}`);
    } else if (selector) {
      try {
        const entryFile: JournalEntryFile = {
          id: entry.id,
          title: entry.title || 'Untitled',
          description: entry.description,
          fullContent: entry.fullContent,
          category: entry.category,
          dominantRole: null,
        };
        const detection = await detectArchetype(entryFile);
        archetype = detection.primary.archetype;
        console.log(`📝 Detected archetype: ${archetype} (confidence: ${detection.primary.confidence})`);
      } catch (error) {
        console.warn('Archetype detection failed, proceeding without', { error: (error as Error).message });
      }
    }

    if (selector) {
      try {
        generationOutput = await this.generateNarrativeWithLLM(
          selector,
          entry.title,
          activities,
          groupingContext,
          options?.style,
          userEmail,
          archetype
        );
      } catch (error) {
        console.warn('LLM narrative generation failed, using fallback', { error: (error as Error).message });
      }
    }

    // Use fallback if LLM generation failed or not available
    if (!generationOutput) {
      usedFallback = true;
      const fallback = this.generateFallbackNarrative(entry.title, activities, toolSummary);
      generationOutput = {
        description: fallback.description,
        fullContent: fallback.fullContent,
        category: 'achievement',
        topics: [],
        skills: extractSkillsFromContent(`${entry.title} ${fallback.description}`),
        impactHighlights: [],
        phases: [{
          name: 'Work',
          activityIds: activities.map(a => a.id),
          summary: 'Activities completed during this period',
        }],
        dominantRole: this.inferDominantRole(activities, userEmail),
        activityEdges: activities.map(a => ({
          activityId: a.id,
          type: 'primary' as const,
          message: DEFAULT_EDGE_MESSAGE,
        })),
      };
    }

    // 5. Merge topics into existing tags (with topic: prefix)
    const existingTags = entry.tags || [];
    const topicTags = generationOutput.topics.map(t => `topic:${t}`);
    const nonTopicTags = existingTags.filter(t => !t.startsWith('topic:'));
    const mergedTags = [...new Set([...nonTopicTags, ...topicTags])];

    // 6. Update the entry with rich output (merge format7Data inline)
    const updated = await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        description: generationOutput.description,
        fullContent: generationOutput.fullContent,
        category: generationOutput.category,
        skills: generationOutput.skills,
        tags: mergedTags,
        format7Data: {
          ...((entry.format7Data as Record<string, unknown>) || {}),
          phases: JSON.parse(JSON.stringify(generationOutput.phases)),
          impactHighlights: generationOutput.impactHighlights,
          dominantRole: generationOutput.dominantRole,
          activityEdges: JSON.parse(JSON.stringify(generationOutput.activityEdges || [])),
          ...(archetype ? { archetype } : {}),
        },
        generatedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      fullContent: updated.fullContent,
      generatedAt: updated.generatedAt!,
      category: updated.category,
      skills: updated.skills,
      usedFallback,
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS FOR DRAFT STORY CREATION
  // ===========================================================================

  /**
   * Fetch activities from the appropriate table based on isDemoMode.
   * Includes rawData, crossToolRefs, and sourceUrl for enhanced narrative generation.
   */
  private async fetchActivitiesForDraftStory(
    userId: string,
    activityIds: string[]
  ): Promise<EnhancedActivity[]> {
    const selectFields = {
      id: true,
      source: true,
      sourceId: true,
      sourceUrl: true,
      title: true,
      description: true,
      timestamp: true,
      rawData: true,
      crossToolRefs: true,
    };

    if (this.isDemoMode) {
      const results = await prisma.demoToolActivity.findMany({
        where: { id: { in: activityIds }, userId },
        orderBy: { timestamp: 'asc' },
        select: selectFields,
      });
      return results.map(r => ({
        ...r,
        rawData: r.rawData as Record<string, unknown> | null,
      }));
    } else {
      const results = await prisma.toolActivity.findMany({
        where: { id: { in: activityIds }, userId },
        orderBy: { timestamp: 'asc' },
        select: selectFields,
      });
      return results.map(r => ({
        ...r,
        rawData: r.rawData as Record<string, unknown> | null,
      }));
    }
  }

  /**
   * Build tool summary string (e.g., "3 github, 2 jira")
   */
  /**
   * Infer dominant role from activity rawData.
   * If the user's email appears as author/assignee/organizer/from in most activities → Led.
   * If in some → Contributed. Otherwise → Participated.
   */
  private inferDominantRole(
    activities: EnhancedActivity[],
    userEmail?: string
  ): 'Led' | 'Contributed' | 'Participated' {
    if (!userEmail || activities.length === 0) return 'Participated';

    let ownershipCount = 0;
    for (const a of activities) {
      const raw = a.rawData;
      if (!raw) continue;
      const ownerFields = [raw.assignee, raw.author, raw.organizer, raw.from, raw.lastModifiedBy, raw.owner];
      if (ownerFields.some(f => f === userEmail)) {
        ownershipCount++;
      }
    }

    const ratio = ownershipCount / activities.length;
    if (ratio >= 0.5) return 'Led';
    if (ratio >= 0.2) return 'Contributed';
    return 'Participated';
  }

  /**
   * Infer the user's email from activity rawData by finding the most frequent
   * author/assignee/organizer/from across all activities.
   */
  private inferUserEmailFromActivities(activities: EnhancedActivity[]): string | undefined {
    const emailCounts: Record<string, number> = {};
    for (const a of activities) {
      const raw = a.rawData;
      if (!raw) continue;
      const candidates = [raw.assignee, raw.author, raw.organizer, raw.from, raw.lastModifiedBy, raw.owner];
      for (const c of candidates) {
        if (typeof c === 'string' && c.includes('@')) {
          emailCounts[c] = (emailCounts[c] || 0) + 1;
        }
      }
    }
    const sorted = Object.entries(emailCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : undefined;
  }

  private buildToolSummary(activities: Array<{ source: string }>): string {
    const toolCounts: Record<string, number> = {};
    activities.forEach((a) => {
      toolCounts[a.source] = (toolCounts[a.source] || 0) + 1;
    });
    return Object.entries(toolCounts)
      .map(([tool, count]) => `${count} ${tool}`)
      .join(', ');
  }

  /**
   * Generate a draft title based on grouping method.
   */
  private generateDraftTitle(
    groupingMethod: string,
    clusterRef: string | undefined,
    timeRangeStart: Date,
    timeRangeEnd: Date
  ): string {
    if (groupingMethod === 'cluster' && clusterRef) {
      return `${clusterRef}: Cross-Tool Collaboration`;
    }

    const startStr = timeRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = timeRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Week of ${startStr} - ${endStr}`;
  }

  /**
   * Generate narrative using LLM (GPT-4o via ModelSelectorService)
   * Uses enhanced prompts from journal-narrative.prompt.ts
   */
  private async generateNarrativeWithLLM(
    selector: ModelSelectorService,
    title: string,
    activities: EnhancedActivity[],
    groupingContext: GroupingContext,
    style?: string,
    userEmail?: string,
    archetype?: StoryArchetype
  ): Promise<DraftStoryGenerationOutput> {
    // Cap activities sent to LLM to prevent prompt overflow on smaller models.
    // With 50-60 activities, the prompt can exceed what gpt-4o-mini handles reliably.
    // Use the most recent 30 activities for narrative; all activities get edges.
    const MAX_ACTIVITIES_FOR_LLM = 30;
    const llmActivities = activities.length > MAX_ACTIVITIES_FOR_LLM
      ? activities.slice(-MAX_ACTIVITIES_FOR_LLM) // activities are sorted asc by timestamp
      : activities;

    if (activities.length > MAX_ACTIVITIES_FOR_LLM) {
      console.log(`📝 Capping LLM input from ${activities.length} to ${llmActivities.length} activities`);
    }

    // Format activities with rawData context
    const activitiesText = formatEnhancedActivitiesForPrompt(llmActivities, groupingContext);

    // Build enhanced messages
    const messages = buildEnhancedNarrativeMessages({
      title,
      activitiesText,
      isCluster: groupingContext.type === 'cluster',
      clusterRef: groupingContext.clusterRef,
      userEmail,
      archetype,
    });

    const result = await selector.executeTask('generate', messages, 'high', {
      temperature: NARRATIVE_TEMPERATURE,
      maxTokens: NARRATIVE_MAX_TOKENS,
    });

    // Strip markdown code blocks if present
    let jsonContent = result.content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonContent);

      // Validate required fields
      if (!parsed.fullContent || !parsed.description) {
        throw new Error('Missing required fields in LLM response');
      }

      // Provide defaults for optional fields
      // Validate LLM edges against all activity IDs, then backfill any missing with defaults
      const allActivityIds = activities.map(a => a.id);
      const llmEdges = validateActivityEdges(parsed.activityEdges, allActivityIds);
      const coveredIds = new Set(llmEdges.map(e => e.activityId));
      const backfilledEdges = allActivityIds
        .filter(id => !coveredIds.has(id))
        .map(id => ({ activityId: id, type: 'supporting' as const, message: DEFAULT_EDGE_MESSAGE }));

      return {
        description: parsed.description,
        category: this.validateCategory(parsed.category) || 'achievement',
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        impactHighlights: Array.isArray(parsed.impactHighlights) ? parsed.impactHighlights : [],
        fullContent: parsed.fullContent,
        phases: this.validatePhases(parsed.phases, activities),
        dominantRole: this.validateRole(parsed.dominantRole) || 'Participated',
        activityEdges: [...llmEdges, ...backfilledEdges],
      };
    } catch (parseError) {
      console.error('Failed to parse LLM response', {
        error: (parseError as Error).message,
        contentPreview: jsonContent.substring(0, 200),
      });
      throw new Error(`LLM returned invalid JSON: ${(parseError as Error).message}`);
    }
  }

  /**
   * Validate category from LLM response
   */
  private validateCategory(category: unknown): DraftStoryCategory | null {
    const validCategories: DraftStoryCategory[] = [
      'feature', 'bug-fix', 'optimization', 'documentation',
      'learning', 'collaboration', 'problem-solving', 'achievement'
    ];
    if (typeof category === 'string' && validCategories.includes(category as DraftStoryCategory)) {
      return category as DraftStoryCategory;
    }
    return null;
  }

  /**
   * Validate role from LLM response
   */
  private validateRole(role: unknown): 'Led' | 'Contributed' | 'Participated' | null {
    const validRoles = ['Led', 'Contributed', 'Participated'];
    if (typeof role === 'string' && validRoles.includes(role)) {
      return role as 'Led' | 'Contributed' | 'Participated';
    }
    return null;
  }

  /**
   * Validate and normalize phases from LLM response
   */
  private validatePhases(phases: unknown, activities: EnhancedActivity[]): DraftStoryPhase[] {
    if (!Array.isArray(phases) || phases.length === 0) {
      // Default to single phase with all activities
      return [{
        name: 'Work',
        activityIds: activities.map(a => a.id),
        summary: 'Activities completed during this period',
      }];
    }

    return phases.map((phase: unknown) => {
      if (typeof phase !== 'object' || phase === null) {
        return { name: 'Work', activityIds: [], summary: '' };
      }
      const p = phase as Record<string, unknown>;
      return {
        name: typeof p.name === 'string' ? p.name : 'Work',
        activityIds: Array.isArray(p.activityIds) ? p.activityIds.filter((id): id is string => typeof id === 'string') : [],
        summary: typeof p.summary === 'string' ? p.summary : '',
      };
    });
  }

  /**
   * Generate fallback narrative when LLM is unavailable
   */
  private generateFallbackNarrative(
    title: string,
    activities: EnhancedActivity[],
    toolSummary: string
  ): { fullContent: string; description: string } {
    const description = `${activities.length} activities across ${toolSummary}`;

    const activitySummaries = activities.map((a) => {
      const date = a.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `- **${date}** [${a.source}]: ${a.title}`;
    });

    const fullContent = `# ${title}

## Summary
${description}

## Activities
${activitySummaries.join('\n')}

---
*This is a structured summary. Click regenerate when LLM service is available for a richer narrative.*

*Generated at ${new Date().toISOString()}*`;

    return { fullContent, description };
  }
}