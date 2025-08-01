import { PrismaClient } from '@prisma/client';
import { 
  SearchParams, 
  SearchResponse, 
  SearchResult, 
  SearchHistory, 
  SaveSearchInput,
  SearchInteractionInput
} from '../types/search.types';

const prisma = new PrismaClient();

export class SearchService {
  
  /**
   * Global search across all content types
   */
  async globalSearch(userId: string, params: SearchParams): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, filters, page = 1, limit = 20, sortBy = 'relevance', sortOrder = 'desc' } = params;
    
    const skip = (page - 1) * limit;
    
    // Search journal entries
    const journalResults = await this.searchJournalEntries(userId, query, filters, skip, limit, sortBy, sortOrder);
    
    // Search users (if no type filter or type is 'user')
    const userResults = (!filters?.type || filters.type === 'user') 
      ? await this.searchUsers(userId, query, filters, skip, limit)
      : [];
    
    // Search workspaces (if no type filter or type is 'workspace')
    const workspaceResults = (!filters?.type || filters.type === 'workspace')
      ? await this.searchWorkspaces(userId, query, filters, skip, limit)
      : [];
    
    // Combine and sort results
    const allResults = [...journalResults, ...userResults, ...workspaceResults];
    
    // Sort by relevance or date
    if (sortBy === 'relevance') {
      allResults.sort((a, b) => sortOrder === 'desc' ? b.relevanceScore - a.relevanceScore : a.relevanceScore - b.relevanceScore);
    } else if (sortBy === 'date') {
      allResults.sort((a, b) => {
        const dateA = new Date(a.metadata.updatedAt);
        const dateB = new Date(b.metadata.updatedAt);
        return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });
    }
    
    // Paginate results
    const paginatedResults = allResults.slice(0, limit);
    
    // Generate facets
    const facets = this.generateFacets(allResults);
    
    // Generate suggestions
    const suggestions = await this.generateSearchSuggestions(query);
    
    // Record search in history
    await this.recordSearchInHistory(userId, query, filters, allResults.length);
    
    const searchTime = Date.now() - startTime;
    
    return {
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total: allResults.length,
        totalPages: Math.ceil(allResults.length / limit)
      },
      facets,
      suggestions,
      searchTime
    };
  }
  
  /**
   * Search journal entries with full-text search
   */
  private async searchJournalEntries(
    userId: string, 
    query: string, 
    filters: any, 
    skip: number, 
    limit: number,
    sortBy: string,
    sortOrder: string
  ): Promise<SearchResult[]> {
    if (filters?.type && filters.type !== 'journal_entry') {
      return [];
    }
    
    const whereClause: any = {
      AND: [
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { fullContent: { contains: query, mode: 'insensitive' } },
            { abstractContent: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
            { tags: { hasSome: [query] } },
            { skills: { hasSome: [query] } }
          ]
        },
        {
          // Visibility check - user can see their own entries, workspace entries, or published network entries
          OR: [
            { authorId: userId },
            { 
              workspace: { 
                members: { 
                  some: { 
                    userId: userId,
                    isActive: true
                  } 
                } 
              } 
            },
            { 
              visibility: 'network',
              isPublished: true
            }
          ]
        }
      ]
    };
    
    // Apply filters
    if (filters?.category) {
      whereClause.AND.push({ category: { contains: filters.category, mode: 'insensitive' } });
    }
    
    if (filters?.workspace) {
      whereClause.AND.push({ workspaceId: filters.workspace });
    }
    
    if (filters?.author) {
      whereClause.AND.push({ authorId: filters.author });
    }
    
    if (filters?.dateFrom || filters?.dateTo) {
      const dateFilter: any = {};
      if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
      if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
      whereClause.AND.push({ createdAt: dateFilter });
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      whereClause.AND.push({ tags: { hasSome: filters.tags } });
    }
    
    // Build order clause
    const orderBy: any = {};
    if (sortBy === 'date') {
      orderBy.updatedAt = sortOrder;
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else {
      // Default to relevance (we'll calculate this manually)
      orderBy.updatedAt = 'desc';
    }
    
    const entries = await prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        workspace: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            appreciates: true
          }
        }
      },
      orderBy,
      take: limit * 2 // Get more to account for relevance scoring
    });
    
    return entries.map(entry => {
      const relevanceScore = this.calculateRelevanceScore(entry, query);
      const snippet = this.generateSnippet(entry.description || entry.fullContent, query);
      
      return {
        id: entry.id,
        type: 'journal_entry' as const,
        title: entry.title,
        description: entry.description,
        snippet,
        url: `/journal/${entry.id}`,
        metadata: {
          author: entry.author,
          workspace: entry.workspace,
          category: entry.category || undefined,
          tags: entry.tags,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString()
        },
        relevanceScore
      };
    });
  }
  
  /**
   * Search users
   */
  private async searchUsers(
    userId: string, 
    query: string, 
    filters: any, 
    skip: number, 
    limit: number
  ): Promise<SearchResult[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } }
        ],
        isActive: true,
        NOT: { id: userId } // Exclude self
      },
      include: {
        workspaceMemberships: {
          where: { isActive: true },
          include: {
            workspace: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      take: limit
    });
    
    return users.map(user => {
      const relevanceScore = this.calculateUserRelevanceScore(user, query);
      const snippet = this.generateUserSnippet(user, query);
      
      return {
        id: user.id,
        type: 'user' as const,
        title: user.name,
        description: user.bio || `${user.title || 'Professional'}${user.company ? ` at ${user.company}` : ''}`,
        snippet,
        url: `/profile/${user.id}`,
        metadata: {
          author: {
            id: user.id,
            name: user.name,
            avatar: user.avatar || undefined
          },
          workspace: user.workspaceMemberships[0]?.workspace,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString()
        },
        relevanceScore
      };
    });
  }
  
  /**
   * Search workspaces
   */
  private async searchWorkspaces(
    userId: string, 
    query: string, 
    filters: any, 
    skip: number, 
    limit: number
  ): Promise<SearchResult[]> {
    const workspaces = await prisma.workspace.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          { isActive: true },
          {
            // User must be a member or workspace must be discoverable
            OR: [
              { members: { some: { userId: userId, isActive: true } } },
              // Add discoverability logic here if needed
            ]
          }
        ]
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
      },
      take: limit
    });
    
    return workspaces.map(workspace => {
      const relevanceScore = this.calculateWorkspaceRelevanceScore(workspace, query);
      const snippet = this.generateWorkspaceSnippet(workspace, query);
      
      return {
        id: workspace.id,
        type: 'workspace' as const,
        title: workspace.name,
        description: workspace.description || `${workspace._count.members} members`,
        snippet,
        url: `/workspaces/${workspace.id}`,
        metadata: {
          workspace: {
            id: workspace.id,
            name: workspace.name
          },
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString()
        },
        relevanceScore
      };
    });
  }
  
  /**
   * Calculate relevance score for journal entries
   */
  private calculateRelevanceScore(entry: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Title match (highest weight)
    if (entry.title.toLowerCase().includes(queryLower)) {
      score += 10;
      if (entry.title.toLowerCase().startsWith(queryLower)) {
        score += 5;
      }
    }
    
    // Description match
    if (entry.description?.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Content match
    if (entry.fullContent?.toLowerCase().includes(queryLower)) {
      score += 3;
    }
    
    // Category match
    if (entry.category?.toLowerCase().includes(queryLower)) {
      score += 4;
    }
    
    // Tags match
    if (entry.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
      score += 6;
    }
    
    // Skills match
    if (entry.skills?.some((skill: string) => skill.toLowerCase().includes(queryLower))) {
      score += 4;
    }
    
    // Engagement boost
    score += (entry._count?.likes || 0) * 0.1;
    score += (entry._count?.comments || 0) * 0.2;
    score += (entry._count?.appreciates || 0) * 0.3;
    
    // Recency boost
    const daysSinceUpdate = (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      score += 2;
    } else if (daysSinceUpdate < 30) {
      score += 1;
    }
    
    return score;
  }
  
  /**
   * Calculate relevance score for users
   */
  private calculateUserRelevanceScore(user: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Name match (highest weight)
    if (user.name.toLowerCase().includes(queryLower)) {
      score += 10;
      if (user.name.toLowerCase().startsWith(queryLower)) {
        score += 5;
      }
    }
    
    // Title match
    if (user.title?.toLowerCase().includes(queryLower)) {
      score += 6;
    }
    
    // Company match
    if (user.company?.toLowerCase().includes(queryLower)) {
      score += 4;
    }
    
    // Bio match
    if (user.bio?.toLowerCase().includes(queryLower)) {
      score += 3;
    }
    
    return score;
  }
  
  /**
   * Calculate relevance score for workspaces
   */
  private calculateWorkspaceRelevanceScore(workspace: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Name match (highest weight)
    if (workspace.name.toLowerCase().includes(queryLower)) {
      score += 10;
      if (workspace.name.toLowerCase().startsWith(queryLower)) {
        score += 5;
      }
    }
    
    // Description match
    if (workspace.description?.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Activity boost
    score += (workspace._count?.members || 0) * 0.1;
    score += (workspace._count?.journalEntries || 0) * 0.05;
    
    return score;
  }
  
  /**
   * Generate snippet for search results
   */
  private generateSnippet(content: string, query: string, maxLength = 200): string {
    if (!content) return '';
    
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    
    if (queryIndex === -1) {
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + query.length + 50);
    
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    // Highlight query terms
    snippet = snippet.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
    
    return snippet;
  }
  
  /**
   * Generate snippet for user search results
   */
  private generateUserSnippet(user: any, query: string): string {
    const parts = [];
    
    if (user.title) parts.push(user.title);
    if (user.company) parts.push(`at ${user.company}`);
    if (user.bio) parts.push(user.bio);
    
    const snippet = parts.join(' • ');
    return this.generateSnippet(snippet, query, 150);
  }
  
  /**
   * Generate snippet for workspace search results
   */
  private generateWorkspaceSnippet(workspace: any, query: string): string {
    const parts = [];
    
    if (workspace.description) parts.push(workspace.description);
    if (workspace.organization?.name) parts.push(`Part of ${workspace.organization.name}`);
    
    const snippet = parts.join(' • ');
    return this.generateSnippet(snippet, query, 150);
  }
  
  /**
   * Generate facets for search results
   */
  private generateFacets(results: SearchResult[]): any {
    const facets = {
      types: [] as { type: string; count: number }[],
      categories: [] as { category: string; count: number }[],
      workspaces: [] as { workspace: string; count: number }[],
      authors: [] as { author: string; count: number }[],
      tags: [] as { tag: string; count: number }[]
    };
    
    const typeCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const workspaceCounts = new Map<string, number>();
    const authorCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    
    results.forEach(result => {
      // Type facets
      typeCounts.set(result.type, (typeCounts.get(result.type) || 0) + 1);
      
      // Category facets
      if (result.metadata.category) {
        categoryCounts.set(result.metadata.category, (categoryCounts.get(result.metadata.category) || 0) + 1);
      }
      
      // Workspace facets
      if (result.metadata.workspace) {
        workspaceCounts.set(result.metadata.workspace.name, (workspaceCounts.get(result.metadata.workspace.name) || 0) + 1);
      }
      
      // Author facets
      if (result.metadata.author) {
        authorCounts.set(result.metadata.author.name, (authorCounts.get(result.metadata.author.name) || 0) + 1);
      }
      
      // Tag facets
      if (result.metadata.tags) {
        result.metadata.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });
    
    // Convert to arrays and sort by count
    facets.types = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    
    facets.categories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    facets.workspaces = Array.from(workspaceCounts.entries())
      .map(([workspace, count]) => ({ workspace, count }))
      .sort((a, b) => b.count - a.count);
    
    facets.authors = Array.from(authorCounts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count);
    
    facets.tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Limit to top 20 tags
    
    return facets;
  }
  
  /**
   * Generate search suggestions
   */
  private async generateSearchSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Get popular tags
    const popularTags = await prisma.journalEntry.findMany({
      select: { tags: true },
      where: { tags: { not: { isEmpty: true } } },
      take: 100
    });
    
    const allTags = popularTags.flatMap(entry => entry.tags);
    const tagCounts = new Map<string, number>();
    
    allTags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
    
    // Find matching tags
    const matchingTags = Array.from(tagCounts.entries())
      .filter(([tag]) => tag.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    suggestions.push(...matchingTags);
    
    // Add some common search patterns
    const commonPatterns = [
      `${query} tutorial`,
      `${query} guide`,
      `${query} best practices`,
      `${query} tips`,
      `${query} examples`
    ];
    
    suggestions.push(...commonPatterns.slice(0, 3));
    
    return suggestions.slice(0, 8);
  }
  
  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(userId: string, query: string): Promise<string[]> {
    return this.generateSearchSuggestions(query);
  }
  
  /**
   * Get search history for user
   */
  async getSearchHistory(userId: string): Promise<SearchHistory> {
    // This would typically come from a dedicated search history table
    // For now, we'll return a simple structure
    return {
      recent: [],
      popular: [],
      saved: []
    };
  }
  
  /**
   * Save a search query
   */
  async saveSearch(userId: string, input: SaveSearchInput): Promise<any> {
    // This would save to a saved searches table
    // For now, we'll return a mock response
    return {
      id: `saved_${Date.now()}`,
      name: input.name,
      query: input.query,
      filters: input.filters,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Delete saved search
   */
  async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    // This would delete from a saved searches table
    // For now, we'll just return
    return;
  }
  
  /**
   * Record search interaction
   */
  async recordSearchInteraction(userId: string, input: SearchInteractionInput): Promise<void> {
    // This would record to an analytics table
    // For now, we'll just log it
    console.log('Search interaction:', { userId, ...input });
  }
  
  /**
   * Record search in history
   */
  private async recordSearchInHistory(userId: string, query: string, filters: any, resultCount: number): Promise<void> {
    // This would record to a search history table
    // For now, we'll just log it
    console.log('Search recorded:', { userId, query, filters, resultCount });
  }
}