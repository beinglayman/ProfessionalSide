import { z } from 'zod';

// Create journal entry schema
export const createJournalEntrySchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim(),
  fullContent: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters'),
  abstractContent: z.string()
    .max(1000, 'Abstract content must be less than 1,000 characters')
    .optional(),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  visibility: z.enum(['private', 'workspace', 'network'])
    .default('workspace'),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .optional(),
  tags: z.array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .default([]),
  skills: z.array(z.string().max(100))
    .max(20, 'Maximum 20 skills allowed')
    .default([]),
  // Format7 data for rich journal entries
  format7Data: z.any().optional(), // JSON data with Format7 structure
  // Collaborators and reviewers
  collaborators: z.array(z.object({
    userId: z.string().min(1, 'User ID is required'),
    role: z.string().max(50).default('collaborator')
  })).optional().default([]),
  reviewers: z.array(z.object({
    userId: z.string().min(1, 'User ID is required'),
    department: z.string().max(100).optional()
  })).optional().default([]),
  // Artifacts
  artifacts: z.array(z.object({
    name: z.string().min(1).max(200),
    type: z.enum(['code', 'document', 'design', 'video', 'link']),
    url: z.string().url(),
    size: z.string().optional(),
    metadata: z.string().optional() // JSON string
  })).optional().default([]),
  // Outcomes
  outcomes: z.array(z.object({
    category: z.enum(['performance', 'technical', 'user-experience', 'business']),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
    highlight: z.string().max(200).optional(),
    metrics: z.string().optional() // JSON string for metrics data
  })).optional().default([]),
  // Achievement fields (optional - for achievement entries)
  achievementType: z.enum(['certification', 'award', 'milestone', 'recognition']).optional(),
  achievementTitle: z.string().min(1).max(200).optional(),
  achievementDescription: z.string().max(1000).optional(),
  linkedGoalId: z.string().optional(), // Optional goal linking

  // Network entry fields (dual-view system)
  networkContent: z.string()
    .max(50000, 'Network content must be less than 50,000 characters')
    .optional(),
  networkTitle: z.string()
    .max(200, 'Network title must be less than 200 characters')
    .optional(),
  format7DataNetwork: z.any().optional(), // Sanitized Format7 structure for network view
  generateNetworkEntry: z.boolean().default(true), // Toggle from Step 4
  sanitizationLog: z.any().optional() // What was stripped and why (for debugging)
});

// Update journal entry schema
export const updateJournalEntrySchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  fullContent: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters')
    .optional(),
  abstractContent: z.string()
    .max(1000, 'Abstract content must be less than 1,000 characters')
    .optional(),
  visibility: z.enum(['private', 'workspace', 'network']).optional(),
  category: z.string()
    .max(100, 'Category must be less than 100 characters')
    .optional(),
  tags: z.array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  skills: z.array(z.string().max(100))
    .max(20, 'Maximum 20 skills allowed')
    .optional(),
  // Achievement fields (optional - for achievement entries)
  achievementType: z.enum(['certification', 'award', 'milestone', 'recognition']).optional(),
  achievementTitle: z.string().min(1).max(200).optional(),
  achievementDescription: z.string().max(1000).optional(),

  // Network entry fields (dual-view system)
  networkContent: z.string()
    .max(50000, 'Network content must be less than 50,000 characters')
    .optional(),
  networkTitle: z.string()
    .max(200, 'Network title must be less than 200 characters')
    .optional(),
  format7DataNetwork: z.any().optional(),
  generateNetworkEntry: z.boolean().optional()
});

// Get journal entries schema (query parameters)
export const getJournalEntriesSchema = z.object({
  workspaceId: z.string().cuid().optional(),
  visibility: z.enum(['private', 'workspace', 'network']).optional(),
  category: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  skills: z.string().optional(), // Comma-separated skills
  authorId: z.string().cuid().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'likes', 'comments', 'views'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  // Activity stream enhancements
  includeActivityMeta: z.boolean().optional().default(false),
  filterBySource: z.string().optional() // Filter by activity source (github, jira, etc.)
});

// Publish journal entry schema
export const publishJournalEntrySchema = z.object({
  visibility: z.enum(['workspace', 'network']),
  abstractContent: z.string()
    .min(1, 'Abstract content is required for publishing')
    .max(1000, 'Abstract content must be less than 1,000 characters')
    .optional()
});

// Add comment schema
export const addCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2,000 characters')
    .trim(),
  parentId: z.string().cuid().optional() // For threaded comments
});

// Update comment schema
export const updateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2,000 characters')
    .trim()
});

// Add artifact schema
export const addArtifactSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['code', 'document', 'design', 'video', 'link']),
  url: z.string().url(),
  size: z.string().optional(),
  metadata: z.string().optional() // JSON string
});

// Link to goal schema
export const linkToGoalSchema = z.object({
  goalId: z.string().cuid(),
  contributionType: z.enum(['milestone', 'progress', 'blocker', 'update']),
  progressContribution: z.number()
    .min(0, 'Progress contribution must be 0 or greater')
    .max(100, 'Progress contribution must be 100 or less')
    .default(0)
});

// Analytics schema
export const recordAnalyticsSchema = z.object({
  readTime: z.number().min(0).optional(),
  engagementType: z.enum(['view', 'like', 'comment', 'share']).optional(),
  referrer: z.string().max(200).optional()
});

// Rechronicle schema
export const rechronicleSchema = z.object({
  comment: z.string()
    .max(500, 'Rechronicle comment must be less than 500 characters')
    .optional()
});

// Type exports
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
export type GetJournalEntriesInput = z.infer<typeof getJournalEntriesSchema>;
export type PublishJournalEntryInput = z.infer<typeof publishJournalEntrySchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type AddArtifactInput = z.infer<typeof addArtifactSchema>;
export type LinkToGoalInput = z.infer<typeof linkToGoalSchema>;
export type RecordAnalyticsInput = z.infer<typeof recordAnalyticsSchema>;
export type RechronicleInput = z.infer<typeof rechronicleSchema>;

// =============================================================================
// UNIFIED JOURNAL ENTRY RESPONSE TYPE
// =============================================================================

/**
 * Unified response type for journal entries.
 * Used by BOTH demo and production queries to ensure consistent API contracts.
 * Frontend receives this same shape regardless of data source.
 */
export interface JournalEntryResponse {
  id: string;
  title: string;
  description: string;
  fullContent: string;
  abstractContent: string | null;

  // Workspace context
  workspaceId: string;
  workspaceName: string;
  organizationName: string | null;

  // Author info
  author: {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
  };

  // Collaborators and reviewers
  collaborators: Array<{
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  }>;
  reviewers: Array<{
    id: string;
    name: string;
    avatar: string | null;
    department: string | null;
  }>;

  // Artifacts and outcomes
  artifacts: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: string | null;
  }>;
  outcomes: Array<{
    category: string;
    title: string;
    description: string;
    highlight: string | null;
    metrics: string | null;
  }>;

  // Metadata
  skills: string[];
  tags: string[];
  category: string | null;
  visibility: 'private' | 'workspace' | 'network';
  isPublished: boolean;
  publishedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;

  // Social counts
  likes: number;
  comments: number;
  appreciates: number;
  rechronicles: number;

  // User interaction status
  hasLiked: boolean;
  hasAppreciated: boolean;
  hasRechronicled: boolean;

  // Discussions
  discussCount: number;
  discussions: Array<{
    id: string;
    author: { name: string; avatar: string | null };
    content: string;
    createdAt: Date;
  }>;

  // Analytics
  analytics: {
    viewCount: number;
    averageReadTime: number;
    engagementTrend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  };

  // Achievement fields (optional)
  achievementType: string | null;
  achievementTitle: string | null;
  achievementDescription: string | null;

  // Goal links
  linkedGoals: Array<{
    goalId: string;
    goalTitle: string;
    contributionType: string;
    progressContribution: number;
    linkedAt: Date;
    notes: string | null;
  }>;

  // Format7 data
  format7Data: any | null;
  format7DataNetwork: any | null;
  generateNetworkEntry: boolean;

  // Network entry fields
  networkContent: string | null;
  networkTitle: string | null;

  // Rechronicle metadata (when this is a rechronicled entry)
  isRechronicle?: boolean;
  rechronicleComment?: string | null;
  rechronicledAt?: Date | null;
  rechronicledBy?: {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
  } | null;
  originalEntry?: JournalEntryResponse | null;

  // Dual-path generation fields
  activityIds: string[];
  groupingMethod: string | null;
  timeRangeStart: Date | null;
  timeRangeEnd: Date | null;
  generatedAt: Date | null;

  // Activity metadata (optional, only included when includeActivityMeta=true)
  activityMeta?: {
    totalCount: number;
    sources: Array<{
      source: string;
      count: number;
    }>;
    dateRange: {
      earliest: string | null; // ISO 8601
      latest: string | null;   // ISO 8601
    };
  };
}

/**
 * Paginated response for journal entry lists
 */
export interface JournalEntriesResponse {
  entries: JournalEntryResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}