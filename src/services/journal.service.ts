import { api, ApiResponse } from '../lib/api';
import { JournalEntry } from '../types/journal';

export interface CreateJournalEntryRequest {
  title: string;
  description: string;
  fullContent: string;
  abstractContent?: string;
  workspaceId: string;
  visibility: 'private' | 'workspace' | 'network';
  category?: string;
  tags: string[];
  skills: string[];
  collaborators?: Array<{
    userId: string;
    role: string;
  }>;
  reviewers?: Array<{
    userId: string;
    department?: string;
  }>;
  artifacts?: Array<{
    name: string;
    type: 'code' | 'document' | 'design' | 'video' | 'link';
    url: string;
    size?: string;
    metadata?: string;
  }>;
  outcomes?: Array<{
    category: 'performance' | 'technical' | 'user-experience' | 'business';
    title: string;
    description: string;
    highlight?: string;
    metrics?: string;
  }>;
  linkedGoalId?: string; // Optional goal to link this entry to
  achievementType?: 'certification' | 'award' | 'milestone' | 'recognition'; // For achievement entries
  achievementTitle?: string; // Achievement title
  achievementDescription?: string; // Achievement description
  format7Data?: any; // Format7 structure for rich journal entries
  format7DataNetwork?: any; // Sanitized Format7 structure for network view
  networkTitle?: string; // Sanitized title for network view
  networkContent?: string; // Sanitized content for network view
  sanitizationLog?: any; // Log of what was sanitized
  generateNetworkEntry?: boolean; // Whether network version was generated
}

export interface UpdateJournalEntryRequest {
  title?: string;
  description?: string;
  fullContent?: string;
  abstractContent?: string;
  visibility?: 'private' | 'workspace' | 'network';
  category?: string;
  tags?: string[];
  skills?: string[];
}

export interface GetJournalEntriesParams {
  workspaceId?: string;
  visibility?: 'private' | 'workspace' | 'network';
  category?: string;
  tags?: string;
  skills?: string;
  authorId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'likes' | 'comments' | 'views';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PublishJournalEntryRequest {
  visibility: 'workspace' | 'network';
  abstractContent?: string;
}

export interface ApiJournalEntry {
  id: string;
  title: string;
  description: string;
  fullContent: string;
  abstractContent?: string;
  authorId: string;
  workspaceId: string;
  visibility: 'private' | 'workspace' | 'network';
  isPublished: boolean;
  publishedAt?: string;
  category?: string;
  tags: string[];
  skills: string[];
  format7Data?: any; // Format7 structure for rich journal entries
  format7DataNetwork?: any; // Sanitized Format7 structure for network view
  createdAt: string;
  updatedAt: string;
  lastModified: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
  };
  workspace: {
    id: string;
    name: string;
    organization?: {
      name: string;
    };
  };
  collaborators: Array<{
    id: string;
    entryId: string;
    userId: string;
    role: string;
    addedAt: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
      title?: string;
    };
  }>;
  reviewers: Array<{
    id: string;
    entryId: string;
    userId: string;
    department?: string;
    addedAt: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
      title?: string;
    };
  }>;
  artifacts: Array<{
    id: string;
    entryId: string;
    name: string;
    type: 'code' | 'document' | 'design' | 'video' | 'link';
    url: string;
    size?: string;
    metadata?: string;
    uploadedAt: string;
  }>;
  outcomes: Array<{
    id: string;
    entryId: string;
    category: 'performance' | 'technical' | 'user-experience' | 'business';
    title: string;
    description: string;
    highlight?: string;
    metrics?: string;
  }>;
  _count: {
    likes: number;
    comments: number;
    appreciates: number;
    rechronicles: number;
    analytics: number;
  };
  hasLiked: boolean;
  hasAppreciated: boolean;
  hasRechronicled: boolean;
  // Achievement fields for achievement entries
  achievementType?: 'certification' | 'award' | 'milestone' | 'recognition';
  achievementTitle?: string;
  achievementDescription?: string;
  // Network entry toggle
  generateNetworkEntry?: boolean;
}

export class JournalService {
  /**
   * Transform API journal entry to application format
   */
  private static transformJournalEntry(apiEntry: ApiJournalEntry): JournalEntry {
    return {
      id: apiEntry.id,
      title: apiEntry.title,
      workspaceId: apiEntry.workspaceId,
      workspaceName: apiEntry.workspace?.name || 'Unknown Workspace',
      organizationName: apiEntry.workspace?.organization?.name || null,
      description: apiEntry.description,
      fullContent: apiEntry.fullContent,
      abstractContent: apiEntry.abstractContent || apiEntry.description,
      createdAt: new Date(apiEntry.createdAt),
      lastModified: new Date(apiEntry.lastModified),
      author: {
        id: apiEntry.author?.id || '',
        name: apiEntry.author?.name || 'Unknown',
        avatar: apiEntry.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        position: apiEntry.author?.title || 'Professional',
      },
      collaborators: (apiEntry.collaborators || []).map(collab => ({
        id: collab.id,
        name: collab.user?.name || 'Unknown',
        avatar: collab.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        role: collab.role,
      })),
      reviewers: (apiEntry.reviewers || []).map(reviewer => ({
        id: reviewer.id,
        name: reviewer.user?.name || 'Unknown',
        avatar: reviewer.user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        department: reviewer.department || 'Unknown Department',
      })),
      artifacts: (apiEntry.artifacts || []).map(artifact => ({
        id: artifact.id,
        name: artifact.name,
        type: artifact.type as 'document' | 'code' | 'design' | 'data' | 'presentation',
        url: artifact.url,
        size: artifact.size,
        isConfidential: false,
      })),
      skills: apiEntry.skills || [],
      outcomes: (apiEntry.outcomes || []).map(outcome => {
        let parsedMetrics = undefined;
        if (outcome.metrics) {
          try {
            parsedMetrics = JSON.parse(outcome.metrics);
          } catch {
            // If parsing fails, keep undefined
          }
        }
        return {
          category: outcome.category as 'performance' | 'user-experience' | 'business' | 'technical' | 'team',
          title: outcome.title,
          description: outcome.description,
          metrics: parsedMetrics,
          highlight: outcome.highlight,
        };
      }),
      visibility: apiEntry.visibility,
      isPublished: apiEntry.isPublished,
      publishedAt: apiEntry.publishedAt ? new Date(apiEntry.publishedAt) : undefined,
      likes: apiEntry._count?.likes || 0,
      comments: apiEntry._count?.comments || 0,
      hasLiked: apiEntry.hasLiked || false,
      tags: apiEntry.tags || [],
      category: apiEntry.category || 'General',
      appreciates: apiEntry._count?.appreciates || 0,
      hasAppreciated: apiEntry.hasAppreciated || false,
      discussCount: apiEntry._count?.comments || 0,
      discussions: [], // TODO: Load separately if needed
      rechronicles: apiEntry._count?.rechronicles || 0,
      hasReChronicled: apiEntry.hasRechronicled || false,
      analytics: {
        viewCount: apiEntry._count?.analytics || 0,
        averageReadTime: 120, // Default to 2 minutes
        engagementTrend: 'stable' as const,
        trendPercentage: 0,
      },
      // Map achievement fields from API response
      achievementType: apiEntry.achievementType,
      achievementTitle: apiEntry.achievementTitle,
      achievementDescription: apiEntry.achievementDescription,
      // Format7 rich journal entry data
      format7Data: apiEntry.format7Data,
      format7DataNetwork: apiEntry.format7DataNetwork,
      // Network entry toggle
      generateNetworkEntry: apiEntry.generateNetworkEntry,
    };
  }

  /**
   * Get journal entries with filtering and pagination
   */
  static async getJournalEntries(params: GetJournalEntriesParams = {}): Promise<ApiResponse<JournalEntry[]>> {
    try {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      
      const response = await api.get<ApiResponse<ApiJournalEntry[]>>(
        `/journal/entries?${searchParams.toString()}`
      );
      
      if (response.data.success && response.data.data) {
        const transformedData = response.data.data.map(entry => this.transformJournalEntry(entry));
        return {
          ...response.data,
          data: transformedData,
        };
      }
      
      return response.data as unknown as ApiResponse<JournalEntry[]>;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get single journal entry by ID
   */
  static async getJournalEntryById(id: string): Promise<ApiResponse<JournalEntry>> {
    const response = await api.get<ApiResponse<ApiJournalEntry>>(`/journal/entries/${id}`);
    
    if (response.data.success && response.data.data) {
      const transformedData = this.transformJournalEntry(response.data.data);
      return {
        ...response.data,
        data: transformedData,
      };
    }
    
    return response.data as unknown as ApiResponse<JournalEntry>;
  }

  /**
   * Create new journal entry
   */
  static async createJournalEntry(data: CreateJournalEntryRequest): Promise<ApiResponse<JournalEntry>> {
    const response = await api.post<ApiResponse<ApiJournalEntry>>('/journal/entries', data);
    
    if (response.data.success && response.data.data) {
      const transformedData = this.transformJournalEntry(response.data.data);
      return {
        ...response.data,
        data: transformedData,
      };
    }
    
    return response.data as unknown as ApiResponse<JournalEntry>;
  }

  /**
   * Update journal entry
   */
  static async updateJournalEntry(id: string, data: UpdateJournalEntryRequest): Promise<ApiResponse<JournalEntry>> {
    const response = await api.put<ApiResponse<ApiJournalEntry>>(`/journal/entries/${id}`, data);
    
    if (response.data.success && response.data.data) {
      const transformedData = this.transformJournalEntry(response.data.data);
      return {
        ...response.data,
        data: transformedData,
      };
    }
    
    return response.data as unknown as ApiResponse<JournalEntry>;
  }

  /**
   * Delete journal entry
   */
  static async deleteJournalEntry(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/journal/entries/${id}`);
    return response.data;
  }

  /**
   * Bulk delete auto-generated draft entries
   */
  static async bulkDeleteAutoGeneratedDrafts(workspaceId?: string): Promise<ApiResponse<{ deletedCount: number }>> {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    const response = await api.delete<ApiResponse<{ deletedCount: number }>>(`/journal/entries/bulk/auto-generated${params}`);
    return response.data;
  }

  /**
   * Publish journal entry
   */
  static async publishJournalEntry(id: string, data: PublishJournalEntryRequest): Promise<ApiResponse<JournalEntry>> {
    const response = await api.post<ApiResponse<ApiJournalEntry>>(`/journal/entries/${id}/publish`, data);
    
    if (response.data.success && response.data.data) {
      const transformedData = this.transformJournalEntry(response.data.data);
      return {
        ...response.data,
        data: transformedData,
      };
    }
    
    return response.data as unknown as ApiResponse<JournalEntry>;
  }


  /**
   * Record analytics
   */
  static async recordAnalytics(id: string, data: {
    readTime?: number;
    engagementType?: 'view' | 'like' | 'comment' | 'share';
    referrer?: string;
  }): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/journal/entries/${id}/analytics`, data);
    return response.data;
  }

  /**
   * Get entry comments (placeholder)
   */
  static async getEntryComments(id: string): Promise<ApiResponse<any[]>> {
    const response = await api.get<ApiResponse<any[]>>(`/journal/entries/${id}/comments`);
    return response.data;
  }

  /**
   * Add comment to entry (placeholder)
   */
  static async addComment(id: string, content: string, parentId?: string): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>(`/journal/entries/${id}/comments`, {
      content,
      parentId
    });
    return response.data;
  }

  /**
   * Toggle like on journal entry
   */
  static async toggleLike(id: string): Promise<ApiResponse<{ liked: boolean }>> {
    try {
      const response = await api.post<ApiResponse<{ liked: boolean }>>(`/journal/entries/${id}/like`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Toggle appreciate on journal entry
   */
  static async toggleAppreciate(id: string): Promise<ApiResponse<{ appreciated: boolean }>> {
    try {
      const response = await api.post<ApiResponse<{ appreciated: boolean }>>(`/journal/entries/${id}/appreciate`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * ReChronicle (repost) journal entry
   */
  static async rechronicleEntry(id: string, comment?: string): Promise<ApiResponse<{ rechronicled: boolean }>> {
    try {
      const response = await api.post<ApiResponse<{ rechronicled: boolean }>>(`/journal/entries/${id}/rechronicle`, {
        comment: comment || undefined
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Add artifact to entry (placeholder)
   */
  static async addArtifact(id: string, artifact: {
    name: string;
    type: 'code' | 'document' | 'design' | 'video' | 'link';
    url: string;
    size?: string;
    metadata?: string;
  }): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>(`/journal/entries/${id}/artifacts`, artifact);
    return response.data;
  }

  /**
   * Get user rechronicles
   */
  static async getUserRechronicles(): Promise<ApiResponse<any[]>> {
    try {
      // This endpoint should return the user's rechronicled entries
      // For now, we'll use a placeholder that returns empty array
      return {
        success: true,
        data: [],
        message: 'Rechronicles retrieved'
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get user feed including both original entries and rechronicled entries.
   * In demo mode (X-Demo-Mode header), backend returns demo journal entries.
   */
  static async getUserFeed(params: GetJournalEntriesParams = {}): Promise<ApiResponse<JournalEntry[]>> {
    try {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      const url = `/journal/feed${queryString ? `?${queryString}` : ''}`;

      // X-Demo-Mode header is automatically added by api interceptor
      // Backend will route to demo tables if header is present
      const response = await api.get<ApiResponse<JournalEntry[]>>(url);

      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data.map((entry: ApiJournalEntry) => this.transformJournalEntry(entry)),
          pagination: response.data.pagination,
        };
      }

      return response.data;
    } catch (error: any) {
      // If the error is related to workspace filtering, try again without workspace filter
      if (error.response?.status === 400 && params.workspaceId) {
        const fallbackParams = { ...params };
        delete fallbackParams.workspaceId;
        return this.getUserFeed(fallbackParams);
      }

      throw error;
    }
  }

  // NOTE: getDemoJournalEntries() has been REMOVED.
  // Demo mode is now handled by the unified getUserFeed() method.
  // The X-Demo-Mode header (added by api interceptor) tells the backend
  // to query demo tables instead of production tables.
  // Both modes return the same JournalEntry shape.
}