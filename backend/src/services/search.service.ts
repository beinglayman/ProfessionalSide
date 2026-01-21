import { prisma } from '../lib/prisma';
import {
  SearchParams,
  SearchResponse,
  SearchResult,
  PeopleSearchResult,
  WorkspaceSearchResult,
  ContentSearchResult,
  SkillSearchResult,
  SearchSuggestion,
  SearchHistory,
  SaveSearchInput,
  SearchInteractionInput
} from '../types/search.types';

export class SearchService {
  
  /**
   * Global search across all content types with network-centric ranking
   */
  async globalSearch(userId: string, params: SearchParams): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, types, filters, sortBy = 'relevance', limit = 20, offset = 0 } = params;
    
    if (!query || query.trim().length < 2) {
      return {
        results: [],
        total: 0,
        facets: {
          types: {},
          connections: {},
          skills: {},
          companies: {},
          locations: {}
        },
        suggestions: [],
        queryTime: Date.now() - startTime
      };
    }

    // Get user's network context for network-centric ranking
    const userNetworkContext = await this.getUserNetworkContext(userId);
    
    let allResults: SearchResult[] = [];
    
    // Search people (if no type filter or 'people' included)
    if (!types || types.includes('people')) {
      const peopleResults = await this.searchPeople(userId, query, filters, userNetworkContext);
      allResults.push(...peopleResults);
    }
    
    // Search workspaces (if no type filter or 'workspaces' included)
    if (!types || types.includes('workspaces')) {
      const workspaceResults = await this.searchWorkspaces(userId, query, filters, userNetworkContext);
      allResults.push(...workspaceResults);
    }
    
    // Search content (if no type filter or 'content' included)
    if (!types || types.includes('content')) {
      const contentResults = await this.searchContent(userId, query, filters, userNetworkContext);
      allResults.push(...contentResults);
    }
    
    // Search skills (if no type filter or 'skills' included)
    if (!types || types.includes('skills')) {
      const skillResults = await this.searchSkills(userId, query, filters, userNetworkContext);
      allResults.push(...skillResults);
    }
    
    // Apply network-centric sorting
    allResults = this.applyNetworkCentricSorting(allResults, sortBy, userNetworkContext);
    
    // If no results found, add some mock data for testing
    if (allResults.length === 0) {
      console.log('🧪 No results found, adding mock data for testing');
      allResults = this.getMockResults(query);
    }
    
    // Apply pagination
    const paginatedResults = allResults.slice(offset, offset + limit);
    
    // Generate facets
    const facets = this.generateFacets(allResults);
    
    // Generate suggestions
    const suggestions = await this.generateSearchSuggestions(query);
    
    // Record search in history
    await this.recordSearchInHistory(userId, query, filters, allResults.length);
    
    const searchTime = Date.now() - startTime;
    
    return {
      results: paginatedResults,
      total: allResults.length,
      facets,
      suggestions,
      queryTime: searchTime
    };
  }

  /**
   * Get user's network context for network-centric ranking
   */
  private async getUserNetworkContext(userId: string) {
    // Get user's direct connections, workspaces, and skill interests
    console.log('🔍 Getting network context for user:', userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaceMemberships: {
          where: { isActive: true },
          include: { workspace: true }
        }
      }
    });

    const context = {
      userId,
      workspaceIds: user?.workspaceMemberships.map(m => m.workspaceId) || [],
      // Add more network context as needed
    };
    
    console.log('📊 Network context:', context);
    return context;
  }

  /**
   * Search people with network-centric ranking
   */
  private async searchPeople(userId: string, query: string, filters: any, networkContext: any): Promise<PeopleSearchResult[]> {
    console.log('👥 Searching people with query:', query);
    const whereClause: any = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ]
        },
        { isActive: true },
        { NOT: { id: userId } } // Exclude self
      ]
    };

    // Apply filters
    if (filters?.company) {
      whereClause.AND.push({ company: { contains: filters.company, mode: 'insensitive' } });
    }
    if (filters?.location) {
      whereClause.AND.push({ location: { contains: filters.location, mode: 'insensitive' } });
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        workspaceMemberships: {
          where: { isActive: true },
          include: { workspace: true }
        }
      },
      take: 50 // Get more for ranking
    });

    console.log('👥 Found', users.length, 'users matching query:', query);

    return users.map(user => {
      const matchType = this.determineMatchType(user.name, query);
      const connectionStatus = this.determineConnectionStatus(user, networkContext);
      const mutualConnections = this.calculateMutualConnections(user, networkContext);
      
      return {
        id: user.id,
        type: 'people' as const,
        title: user.name,
        subtitle: `${user.title || 'Professional'}${user.company ? ` at ${user.company}` : ''}`,
        description: user.bio,
        avatar: user.avatar,
        position: user.title || '',
        company: user.company || '',
        location: user.location,
        connectionStatus,
        mutualConnections,
        skills: [], // TODO: Add skills from user profile
        bio: user.bio,
        isVerified: false, // TODO: Add verification logic
        relevanceScore: this.calculatePeopleRelevanceScore(user, query, networkContext),
        matchType
      };
    });
  }

  /**
   * Search workspaces with access control
   */
  private async searchWorkspaces(userId: string, query: string, filters: any, networkContext: any): Promise<WorkspaceSearchResult[]> {
    const whereClause: any = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        { isActive: true },
        {
          // For now, only show workspaces where user is a member
          // TODO: Add discoverability logic when that field is added to schema
          members: { some: { userId: userId, isActive: true } }
        }
      ]
    };

    if (filters?.workspaceId) {
      whereClause.AND.push({ id: filters.workspaceId });
    }

    const workspaces = await prisma.workspace.findMany({
      where: whereClause,
      include: {
        organization: true,
        _count: {
          select: {
            members: true,
            journalEntries: true
          }
        },
        members: {
          where: { userId, isActive: true },
          take: 1
        }
      },
      take: 30
    });

    return workspaces.map(workspace => {
      const isMember = workspace.members.length > 0;
      const matchType = this.determineMatchType(workspace.name, query);
      
      return {
        id: workspace.id,
        type: 'workspaces' as const,
        title: workspace.name,
        subtitle: workspace.organization?.name || 'Workspace',
        description: workspace.description,
        organizationName: workspace.organization?.name || '',
        memberCount: workspace._count.members,
        isPrivate: false, // For now, assume all workspaces are private (user is member)
        canJoin: false, // User is already a member
        canRequestJoin: false, // User is already a member
        industry: workspace.organization?.industry,
        tags: [], // TODO: Add workspace tags
        recentActivity: new Date(workspace.updatedAt),
        relevanceScore: this.calculateWorkspaceRelevanceScore(workspace, query, networkContext),
        matchType
      };
    });
  }

  /**
   * Search content (journal entries, achievements, artifacts)
   */
  private async searchContent(userId: string, query: string, filters: any, networkContext: any): Promise<ContentSearchResult[]> {
    const whereClause: any = {
      AND: [
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { fullContent: { contains: query, mode: 'insensitive' } },
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

    // Apply content type filters
    if (filters?.contentTypes?.length) {
      // For now, we only have journal entries. In the future, add achievements and artifacts
      if (!filters.contentTypes.includes('journal_entry')) {
        return [];
      }
    }

    if (filters?.workspaceId) {
      whereClause.AND.push({ workspaceId: filters.workspaceId });
    }

    if (filters?.dateRange) {
      const dateFilter: any = {};
      if (filters.dateRange.from) dateFilter.gte = filters.dateRange.from;
      if (filters.dateRange.to) dateFilter.lte = filters.dateRange.to;
      whereClause.AND.push({ createdAt: dateFilter });
    }

    const entries = await prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        author: true,
        workspace: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      take: 50,
      orderBy: { updatedAt: 'desc' }
    });

    return entries.map(entry => {
      const snippet = this.generateSnippet(entry.description || entry.fullContent, query);
      const matchType = this.determineMatchType(entry.title, query);
      const isAccessible = this.checkContentAccessibility(entry, userId, networkContext);
      
      return {
        id: entry.id,
        type: 'content' as const,
        title: entry.title,
        subtitle: entry.category || 'Journal Entry',
        description: entry.description,
        contentType: 'journal_entry' as const,
        author: {
          id: entry.author.id,
          name: entry.author.name,
          avatar: entry.author.avatar
        },
        workspaceName: entry.workspace?.name,
        workspaceId: entry.workspaceId,
        snippet,
        publishedAt: entry.createdAt,
        likes: entry._count.likes,
        comments: entry._count.comments,
        skills: entry.skills || [],
        isAccessible,
        relevanceScore: this.calculateContentRelevanceScore(entry, query, networkContext),
        matchType
      };
    });
  }

  /**
   * Search skills with network context
   */
  private async searchSkills(userId: string, query: string, filters: any, networkContext: any): Promise<SkillSearchResult[]> {
    // Get skills from journal entries and user profiles
    const skillsFromEntries = await prisma.journalEntry.findMany({
      where: {
        skills: { has: query.toLowerCase() }
      },
      select: {
        skills: true,
        authorId: true
      }
    });

    // For now, return a simple skill search result
    // In a full implementation, you'd have a dedicated skills table
    const skillCounts = new Map<string, number>();
    const networkSkillCounts = new Map<string, number>();

    skillsFromEntries.forEach(entry => {
      entry.skills?.forEach(skill => {
        if (skill.toLowerCase().includes(query.toLowerCase())) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
          
          // Check if this is from user's network
          if (networkContext.workspaceIds.length > 0) {
            networkSkillCounts.set(skill, (networkSkillCounts.get(skill) || 0) + 1);
          }
        }
      });
    });

    return Array.from(skillCounts.entries()).map(([skill, count]) => {
      const matchType = this.determineMatchType(skill, query);
      
      return {
        id: `skill_${skill}`,
        type: 'skills' as const,
        title: skill,
        subtitle: 'Technical Skill',
        description: `Used by ${count} people in your network`,
        category: 'Technology', // TODO: Categorize skills
        endorsements: count,
        relatedSkills: [], // TODO: Add related skills logic
        trendingScore: count > 5 ? count : undefined,
        industryDemand: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
        usersWithSkill: count,
        networkUsersWithSkill: networkSkillCounts.get(skill) || 0,
        relevanceScore: this.calculateSkillRelevanceScore(skill, query, count),
        matchType
      };
    }).slice(0, 10);
  }

  /**
   * Helper methods for network-centric search
   */
  
  private determineMatchType(text: string, query: string): 'exact' | 'partial' | 'semantic' | 'fuzzy' {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (textLower === queryLower) return 'exact';
    if (textLower.startsWith(queryLower)) return 'partial';
    if (textLower.includes(queryLower)) return 'partial';
    return 'fuzzy';
  }

  private determineConnectionStatus(user: any, networkContext: any): 'core' | 'extended' | 'following' | 'none' {
    // Check if user is in same workspace (core connection)
    const isInSameWorkspace = user.workspaceMemberships.some((membership: any) => 
      networkContext.workspaceIds.includes(membership.workspaceId)
    );
    
    if (isInSameWorkspace) return 'core';
    
    // TODO: Add logic for extended connections and following
    return 'none';
  }

  private calculateMutualConnections(user: any, networkContext: any): number {
    // Calculate mutual workspace memberships for now
    const mutualWorkspaces = user.workspaceMemberships.filter((membership: any) => 
      networkContext.workspaceIds.includes(membership.workspaceId)
    );
    
    return mutualWorkspaces.length;
  }

  private checkContentAccessibility(entry: any, userId: string, networkContext: any): boolean {
    // User can access their own content
    if (entry.authorId === userId) return true;
    
    // User can access content in their workspaces
    if (entry.workspaceId && networkContext.workspaceIds.includes(entry.workspaceId)) return true;
    
    // User can access published network content
    if (entry.visibility === 'network' && entry.isPublished) return true;
    
    return false;
  }

  private applyNetworkCentricSorting(results: SearchResult[], sortBy: string, networkContext: any): SearchResult[] {
    switch (sortBy) {
      case 'recent':
        return results.sort((a, b) => {
          const dateA = 'publishedAt' in a ? new Date(a.publishedAt) : new Date();
          const dateB = 'publishedAt' in b ? new Date(b.publishedAt) : new Date();
          return dateB.getTime() - dateA.getTime();
        });
      
      case 'popular':
        return results.sort((a, b) => {
          const scoreA = ('likes' in a ? a.likes : 0) + ('endorsements' in a ? a.endorsements : 0);
          const scoreB = ('likes' in b ? b.likes : 0) + ('endorsements' in b ? b.endorsements : 0);
          return scoreB - scoreA;
        });
      
      case 'network_proximity':
        return results.sort((a, b) => {
          const proximityA = this.calculateNetworkProximity(a, networkContext);
          const proximityB = this.calculateNetworkProximity(b, networkContext);
          return proximityB - proximityA;
        });
      
      default: // relevance
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
  }

  private calculateNetworkProximity(result: SearchResult, networkContext: any): number {
    let score = 0;
    
    if (result.type === 'people') {
      const peopleResult = result as PeopleSearchResult;
      switch (peopleResult.connectionStatus) {
        case 'core': score += 10; break;
        case 'extended': score += 5; break;
        case 'following': score += 2; break;
        default: score += 0;
      }
      score += peopleResult.mutualConnections * 2;
    }
    
    if (result.type === 'content') {
      const contentResult = result as ContentSearchResult;
      if (contentResult.workspaceId && networkContext.workspaceIds.includes(contentResult.workspaceId)) {
        score += 8;
      }
    }
    
    if (result.type === 'workspaces') {
      const workspaceResult = result as WorkspaceSearchResult;
      if (networkContext.workspaceIds.includes(workspaceResult.id)) {
        score += 15;
      }
    }
    
    return score;
  }

  private calculatePeopleRelevanceScore(user: any, query: string, networkContext: any): number {
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
    
    // Network proximity bonus
    const isInNetwork = user.workspaceMemberships.some((membership: any) => 
      networkContext.workspaceIds.includes(membership.workspaceId)
    );
    if (isInNetwork) score += 5;
    
    return score;
  }

  private calculateWorkspaceRelevanceScore(workspace: any, query: string, networkContext: any): number {
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
    
    // User membership bonus
    if (networkContext.workspaceIds.includes(workspace.id)) {
      score += 8;
    }
    
    return score;
  }

  private calculateContentRelevanceScore(entry: any, query: string, networkContext: any): number {
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
    
    // Network proximity bonus
    if (entry.workspaceId && networkContext.workspaceIds.includes(entry.workspaceId)) {
      score += 5;
    }
    
    // Recency boost
    const daysSinceUpdate = (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      score += 2;
    } else if (daysSinceUpdate < 30) {
      score += 1;
    }
    
    return score;
  }

  private calculateSkillRelevanceScore(skill: string, query: string, count: number): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const skillLower = skill.toLowerCase();
    
    // Exact match
    if (skillLower === queryLower) {
      score += 20;
    } else if (skillLower.startsWith(queryLower)) {
      score += 15;
    } else if (skillLower.includes(queryLower)) {
      score += 10;
    }
    
    // Usage frequency boost
    score += Math.log(count + 1) * 2;
    
    return score;
  }

  /**
   * Generate facets for search results
   */
  private generateFacets(results: SearchResult[]): any {
    const facets = {
      types: {} as Record<string, number>,
      connections: {} as Record<string, number>,
      skills: {} as Record<string, number>,
      companies: {} as Record<string, number>,
      locations: {} as Record<string, number>
    };
    
    results.forEach(result => {
      // Type facets
      facets.types[result.type] = (facets.types[result.type] || 0) + 1;
      
      // Connection facets (for people)
      if (result.type === 'people') {
        const peopleResult = result as PeopleSearchResult;
        facets.connections[peopleResult.connectionStatus] = (facets.connections[peopleResult.connectionStatus] || 0) + 1;
        
        if (peopleResult.company) {
          facets.companies[peopleResult.company] = (facets.companies[peopleResult.company] || 0) + 1;
        }
        
        if (peopleResult.location) {
          facets.locations[peopleResult.location] = (facets.locations[peopleResult.location] || 0) + 1;
        }
        
        // Skills from people
        peopleResult.skills.forEach(skill => {
          facets.skills[skill] = (facets.skills[skill] || 0) + 1;
        });
      }
      
      // Skills from content
      if (result.type === 'content') {
        const contentResult = result as ContentSearchResult;
        contentResult.skills.forEach(skill => {
          facets.skills[skill] = (facets.skills[skill] || 0) + 1;
        });
      }
    });
    
    return facets;
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
   * Generate search suggestions
   */
  private async generateSearchSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Get popular tags
    const popularTags = await prisma.journalEntry.findMany({
      select: { tags: true },
      where: { 
        NOT: { tags: { isEmpty: true } }
      },
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

  /**
   * Get mock results for testing when no real data is found
   */
  private getMockResults(query: string): SearchResult[] {
    const queryLower = query.toLowerCase();
    const mockResults: SearchResult[] = [];

    // Mock people results
    if (queryLower.includes('john') || queryLower.includes('sarah') || queryLower.includes('test')) {
      mockResults.push({
        id: 'mock-person-1',
        type: 'people',
        title: 'Sarah Chen',
        subtitle: 'Senior UX Designer at Meta',
        description: 'Passionate about creating user-centered designs',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        position: 'Senior UX Designer',
        company: 'Meta',
        location: 'San Francisco, CA',
        connectionStatus: 'core',
        mutualConnections: 5,
        skills: ['UI/UX Design', 'Figma', 'User Research'],
        bio: 'Passionate about creating user-centered designs',
        isVerified: true,
        relevanceScore: 95,
        matchType: 'partial'
      });
    }

    // Mock workspace results
    if (queryLower.includes('design') || queryLower.includes('frontend') || queryLower.includes('test')) {
      mockResults.push({
        id: 'mock-workspace-1',
        type: 'workspaces',
        title: 'Design System Evolution',
        subtitle: 'Meta',
        description: 'Building the next generation design system',
        organizationName: 'Meta',
        memberCount: 12,
        isPrivate: false,
        canJoin: true,
        canRequestJoin: false,
        industry: 'Technology',
        tags: ['Design', 'Frontend', 'React'],
        recentActivity: new Date(),
        relevanceScore: 88,
        matchType: 'partial'
      });
    }

    // Mock content results
    if (queryLower.includes('react') || queryLower.includes('javascript') || queryLower.includes('test')) {
      mockResults.push({
        id: 'mock-content-1',
        type: 'content',
        title: 'Building Accessible React Components',
        subtitle: 'Journal Entry',
        description: 'A deep dive into creating accessible React components for better user experience',
        contentType: 'journal_entry',
        author: {
          id: 'mock-author-1',
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
        },
        workspaceName: 'Design System Evolution',
        workspaceId: 'mock-workspace-1',
        snippet: 'Creating accessible components is crucial for inclusive design...',
        publishedAt: new Date(),
        likes: 24,
        comments: 8,
        skills: ['React', 'Accessibility', 'JavaScript'],
        isAccessible: true,
        relevanceScore: 92,
        matchType: 'partial'
      });
    }

    // Mock skills results
    if (queryLower.includes('react') || queryLower.includes('javascript') || queryLower.includes('typescript')) {
      mockResults.push({
        id: 'mock-skill-1',
        type: 'skills',
        title: 'React.js',
        subtitle: 'Frontend Framework',
        description: 'A JavaScript library for building user interfaces',
        category: 'Frontend Development',
        endorsements: 156,
        relatedSkills: ['TypeScript', 'Next.js', 'Redux'],
        trendingScore: 95,
        industryDemand: 'high',
        usersWithSkill: 1250,
        networkUsersWithSkill: 45,
        relevanceScore: 98,
        matchType: 'exact'
      });
    }

    return mockResults;
  }
}