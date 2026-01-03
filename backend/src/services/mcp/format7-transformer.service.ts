import { MCPToolType } from '../../types/mcp.types';
import { Format7JournalEntry, Format7Activity, Collaborator, Evidence } from './types/format7.types';

interface OrganizedActivity {
  suggestedEntryType: 'achievement' | 'learning' | 'reflection' | 'challenge';
  suggestedTitle: string;
  contextSummary: string;
  extractedSkills: string[];
  categories: Array<{
    type: string;
    label: string;
    summary: string;
    suggestedEntryType: string;
    items: Array<{
      id: string;
      source: MCPToolType;
      type: string;
      title: string;
      description: string;
      url: string;
      importance: 'high' | 'medium' | 'low';
      selected: boolean;
      metadata: any;
      skills?: string[];  // Per-activity skills from analyzer
    }>;
  }>;
  correlations?: Array<{
    id: string;
    type: string;
    source1: { tool: MCPToolType; id: string; title: string; url: string };
    source2: { tool: MCPToolType; id: string; title: string; url: string };
    confidence: number;
    reasoning: string;
  }>;
  artifacts?: Array<{
    type: string;
    source: MCPToolType;
    title: string;
    url: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
  }>;
}

interface TransformOptions {
  userId: string;
  workspaceName: string;
  privacy?: 'private' | 'team' | 'network' | 'public';
  dateRange: { start: Date; end: Date };
}

export class Format7TransformerService {
  /**
   * Transform MCP organized activity data to Format7 journal entry structure
   */
  transformToFormat7(
    organizedActivity: OrganizedActivity,
    rawToolData: Map<MCPToolType, any>,
    options: TransformOptions
  ): Format7JournalEntry {
    // Extract only selected activities
    const selectedActivities = this.extractSelectedActivities(organizedActivity);

    // Build activities with evidence
    const activities = selectedActivities.map(item =>
      this.buildActivity(item, rawToolData, organizedActivity.correlations || [])
    );

    // Extract collaborators and reviewers
    const { collaborators, reviewers } = this.extractCollaborators(activities, rawToolData);

    // Calculate time metrics from user-selected date range
    const timeSpanHours = this.calculateTimeSpan(options.dateRange);

    // Build aggregations
    const activitiesByType = this.aggregateByType(activities);
    const activitiesBySource = this.aggregateBySource(activities);

    // Filter technical skills
    const technologies = this.filterTechnicalSkills(organizedActivity.extractedSkills);

    // Map correlations to Format7 structure
    const correlations = this.mapCorrelations(organizedActivity.correlations || []);

    return {
      entry_metadata: {
        title: organizedActivity.suggestedTitle,
        date: new Date().toISOString().split('T')[0],
        type: organizedActivity.suggestedEntryType,
        workspace: options.workspaceName,
        privacy: options.privacy || 'team',
        isAutomated: true,
        created_at: new Date().toISOString()
      },

      context: {
        date_range: {
          start: options.dateRange.start.toISOString(),
          end: options.dateRange.end.toISOString()
        },
        sources_included: Array.from(rawToolData.keys()),
        total_activities: activities.length,
        primary_focus: organizedActivity.contextSummary
      },

      activities,

      summary: {
        total_time_range_hours: timeSpanHours,
        activities_by_type: activitiesByType,
        activities_by_source: activitiesBySource,
        unique_collaborators: collaborators,
        unique_reviewers: reviewers,
        technologies_used: technologies,
        skills_demonstrated: organizedActivity.extractedSkills
      },

      correlations,

      categories: organizedActivity.categories || [],

      artifacts: organizedActivity.artifacts || []
    };
  }

  /**
   * Extract only selected activities from categories
   */
  private extractSelectedActivities(organizedActivity: OrganizedActivity): any[] {
    const selected: any[] = [];

    organizedActivity.categories.forEach(category => {
      category.items.forEach(item => {
        if (item.selected) {
          selected.push(item);
        }
      });
    });

    return selected;
  }

  /**
   * Build Format7 activity with evidence
   */
  private buildActivity(
    item: any,
    rawToolData: Map<MCPToolType, any>,
    correlations: any[]
  ): Format7Activity {
    console.log('[Format7Transformer] Building activity for item:', {
      id: item.id,
      title: item.title,
      source: item.source,
      type: item.type
    });

    const evidence = this.buildEvidence(item, rawToolData.get(item.source));
    const relatedActivities = this.findRelatedActivities(item.id, correlations);
    const technologies = this.extractActivityTechnologies(item);

    console.log('[Format7Transformer] Built activity with technologies:', {
      id: item.id,
      technologiesCount: technologies.length,
      technologies: technologies
    });

    const activity = {
      id: item.id,
      source: item.source,
      type: item.type,
      action: this.generateActionString(item),
      description: item.description,
      timestamp: item.metadata?.timestamp || item.metadata?.createdAt || new Date().toISOString(),
      evidence,
      related_activities: relatedActivities,
      technologies,
      collaborators: [], // Will be populated by extractCollaborators
      reviewers: [], // Will be populated by extractCollaborators
      importance: item.importance
    };

    console.log('[Format7Transformer] Final activity object:', {
      id: activity.id,
      hasTechnologies: !!activity.technologies,
      technologiesLength: activity.technologies?.length || 0,
      technologies: activity.technologies
    });

    return activity;
  }

  /**
   * Build evidence object with metadata
   */
  private buildEvidence(item: any, toolData: any): Evidence {
    const evidenceType = this.getEvidenceType(item.type, item.source);

    return {
      type: evidenceType,
      url: item.url,
      title: item.title,
      links: this.collectEvidenceLinks(item, toolData),
      metadata: this.extractEvidenceMetadata(item, toolData)
    };
  }

  /**
   * Get evidence type based on activity type and source
   */
  private getEvidenceType(activityType: string, source: MCPToolType): string {
    const typeMap: Record<string, string> = {
      'pr': 'pull_request',
      'commit': 'code_change',
      'issue': 'issue_ticket',
      'meeting': 'meeting_recording',
      'message': 'discussion_thread',
      'design': 'design_file',
      'document': 'documentation'
    };

    return typeMap[activityType] || 'general';
  }

  /**
   * Collect all related evidence links
   */
  private collectEvidenceLinks(item: any, toolData: any): string[] {
    const links: string[] = [item.url];

    // Add tool-specific additional links
    if (item.source === 'github' && item.type === 'pr') {
      links.push(`${item.url}/files`);
      links.push(`${item.url}/checks`);
    }

    if (item.metadata?.relatedUrls) {
      links.push(...item.metadata.relatedUrls);
    }

    return links.filter(Boolean);
  }

  /**
   * Extract tool-specific evidence metadata
   */
  private extractEvidenceMetadata(item: any, toolData: any): Record<string, any> {
    const metadata: Record<string, any> = {};

    // GitHub PR metadata
    if (item.source === 'github' && item.type === 'pr') {
      metadata.lines_added = item.metadata?.additions || 0;
      metadata.lines_deleted = item.metadata?.deletions || 0;
      metadata.files_changed = item.metadata?.filesChanged || 0;
      metadata.comments = item.metadata?.comments || 0;
    }

    // Jira issue metadata
    if (item.source === 'jira') {
      metadata.comments = item.metadata?.commentCount || 0;
      metadata.time_spent_minutes = item.metadata?.timeSpent ? Math.floor(item.metadata.timeSpent / 60) : 0;
    }

    // Slack thread metadata
    if (item.source === 'slack' && item.type === 'thread') {
      metadata.messages_count = item.metadata?.replyCount || 0;
      metadata.reactions = item.metadata?.reactions || 0;
    }

    // Meeting metadata
    if (item.type === 'meeting') {
      metadata.duration_minutes = item.metadata?.duration || 0;
      metadata.participants = item.metadata?.participants || [];
    }

    return metadata;
  }

  /**
   * Find activities related through correlations
   */
  private findRelatedActivities(activityId: string, correlations: any[]): string[] {
    const related: string[] = [];

    // Ensure correlations is an array
    if (!Array.isArray(correlations)) {
      return related;
    }

    correlations.forEach(corr => {
      if (corr.source1.id === activityId) {
        related.push(corr.source2.id);
      } else if (corr.source2.id === activityId) {
        related.push(corr.source1.id);
      }
    });

    return related;
  }

  /**
   * Extract technologies for specific activity
   * Always derives from content to ensure unique, relevant skills per activity
   * (AI skills are often duplicated across all activities)
   */
  private extractActivityTechnologies(item: any): string[] {
    console.log('[Format7Transformer] Extracting technologies for item:', {
      id: item.id,
      title: item.title,
      source: item.source,
      hasSkills: !!item.skills,
      skillsArray: item.skills,
      hasMetadataTechs: !!item.metadata?.technologies,
      metadataTechs: item.metadata?.technologies,
      hasLanguage: !!item.metadata?.language,
      language: item.metadata?.language,
      hasLabels: !!item.metadata?.labels,
      labels: item.metadata?.labels
    });

    const techs: string[] = [];

    // ALWAYS derive from content first - gives unique, relevant skills per activity
    // (AI skills are often the same for all activities, not useful for differentiation)
    const derivedTechs = this.deriveSkillsFromContent(item);
    if (derivedTechs.length > 0) {
      console.log('[Format7Transformer] Derived technologies from content:', derivedTechs);
      techs.push(...derivedTechs);
    }

    // From metadata technologies (if available and not already covered)
    if (item.metadata?.technologies && techs.length < 3) {
      console.log('[Format7Transformer] Adding technologies from metadata:', item.metadata.technologies);
      techs.push(...item.metadata.technologies);
    }

    // From GitHub repo language (if available and not already covered)
    if (item.source === 'github' && item.metadata?.language && techs.length < 3) {
      console.log('[Format7Transformer] Adding language from GitHub:', item.metadata.language);
      techs.push(item.metadata.language);
    }

    // From Jira labels (if available and not already covered)
    if (item.source === 'jira' && item.metadata?.labels && techs.length < 3) {
      console.log('[Format7Transformer] Adding labels from Jira:', item.metadata.labels);
      techs.push(...item.metadata.labels);
    }

    const deduped = [...new Set(techs)].slice(0, 3);
    console.log('[Format7Transformer] Extracted technologies (deduplicated):', deduped);
    return deduped;
  }

  /**
   * Derive skills/technologies from activity title and description
   */
  private deriveSkillsFromContent(item: any): string[] {
    const derived: string[] = [];
    const combinedText = `${item.title || ''} ${item.description || ''}`.toLowerCase();

    // Common technology keywords to detect
    const techKeywords: Record<string, string> = {
      'react': 'React',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'node': 'Node.js',
      'python': 'Python',
      'java': 'Java',
      'api': 'API Development',
      'rest': 'REST API',
      'graphql': 'GraphQL',
      'database': 'Database',
      'sql': 'SQL',
      'mongodb': 'MongoDB',
      'postgres': 'PostgreSQL',
      'redis': 'Redis',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'aws': 'AWS',
      'azure': 'Azure',
      'gcp': 'Google Cloud',
      'ci/cd': 'CI/CD',
      'pipeline': 'CI/CD',
      'testing': 'Testing',
      'unit test': 'Unit Testing',
      'integration': 'Integration',
      'frontend': 'Frontend',
      'backend': 'Backend',
      'css': 'CSS',
      'html': 'HTML',
      'security': 'Security',
      'authentication': 'Authentication',
      'oauth': 'OAuth',
      'performance': 'Performance',
      'optimization': 'Optimization',
      'bug': 'Bug Fixing',
      'fix': 'Bug Fixing',
      'feature': 'Feature Development',
      'refactor': 'Refactoring',
      'documentation': 'Documentation',
      'design': 'Design',
      'architecture': 'Architecture',
      'review': 'Code Review',
      'meeting': 'Collaboration',
      'confluence': 'Documentation',
      'jira': 'Project Management'
    };

    // Check for technology matches
    for (const [keyword, tech] of Object.entries(techKeywords)) {
      if (combinedText.includes(keyword) && !derived.includes(tech)) {
        derived.push(tech);
        if (derived.length >= 3) break; // Limit to 3 derived skills
      }
    }

    // Add source-based skill if still empty
    if (derived.length === 0) {
      const sourceSkills: Record<string, string> = {
        'github': 'Code Development',
        'jira': 'Project Management',
        'confluence': 'Documentation',
        'slack': 'Team Collaboration',
        'teams': 'Team Collaboration',
        'outlook': 'Communication',
        'figma': 'Design',
        'sharepoint': 'Document Management',
        'onedrive': 'File Management',
        'onenote': 'Note Taking'
      };
      if (sourceSkills[item.source]) {
        derived.push(sourceSkills[item.source]);
      }
    }

    return derived;
  }

  /**
   * Generate action string from activity
   */
  private generateActionString(item: any): string {
    const actionMap: Record<string, Record<string, string>> = {
      github: {
        pr: 'Merged PR',
        commit: 'Committed code',
        issue: 'Resolved issue',
        review: 'Reviewed PR'
      },
      jira: {
        issue: 'Resolved issue',
        story: 'Completed story',
        bug: 'Fixed bug'
      },
      slack: {
        message: 'Sent message',
        thread: 'Discussed in thread'
      },
      teams: {
        message: 'Sent message',
        meeting: 'Attended meeting'
      }
    };

    const toolActions = actionMap[item.source];
    if (toolActions && toolActions[item.type]) {
      return `${toolActions[item.type]} ${item.metadata?.number || item.metadata?.key || ''}`.trim();
    }

    return item.title;
  }

  /**
   * Extract and deduplicate collaborators
   */
  private extractCollaborators(
    activities: Format7Activity[],
    rawToolData: Map<MCPToolType, any>
  ): { collaborators: Collaborator[]; reviewers: Collaborator[] } {
    const collaboratorMap = new Map<string, Collaborator>();
    const reviewerMap = new Map<string, Collaborator>();

    activities.forEach(activity => {
      // Extract people from metadata
      const people = this.extractPeopleFromActivity(activity, rawToolData);

      people.collaborators.forEach(person => {
        if (!collaboratorMap.has(person.name)) {
          collaboratorMap.set(person.name, this.createCollaborator(person));
        }
      });

      people.reviewers.forEach(person => {
        if (!reviewerMap.has(person.name)) {
          reviewerMap.set(person.name, this.createCollaborator(person));
        }
      });
    });

    // Log extraction summary
    console.log(`[Format7] Extracted ${collaboratorMap.size} unique collaborators and ${reviewerMap.size} unique reviewers from ${activities.length} activities`);
    if (collaboratorMap.size === 0 && reviewerMap.size === 0) {
      console.warn('[Format7] No collaborators or reviewers found - check raw data structure and metadata extraction');
    }

    return {
      collaborators: Array.from(collaboratorMap.values()),
      reviewers: Array.from(reviewerMap.values())
    };
  }

  /**
   * Extract people from activity metadata
   */
  private extractPeopleFromActivity(
    activity: Format7Activity,
    rawToolData: Map<MCPToolType, any>
  ): { collaborators: any[]; reviewers: any[] } {
    const collaborators: any[] = [];
    const reviewers: any[] = [];

    // GitHub - Use raw data as primary source
    if (activity.source === 'github') {
      const githubData = rawToolData.get(MCPToolType.GITHUB);

      // Try to find the PR/issue in raw data by matching URL
      let found = false;
      if (githubData?.pullRequests) {
        const pr = githubData.pullRequests.find((p: any) =>
          p.url === activity.evidence?.url ||
          activity.description?.includes(p.title)
        );

        if (pr) {
          found = true;
          // Extract author as collaborator
          if (pr.author) {
            collaborators.push({ name: pr.author });
          }
          // Extract reviewers
          if (Array.isArray(pr.reviewers)) {
            pr.reviewers.forEach((r: string) => reviewers.push({ name: r }));
          }
        }
      }

      // Fallback to metadata if not found in raw data
      if (!found && activity.metadata) {
        if (activity.metadata.author) {
          collaborators.push({ name: activity.metadata.author });
        }
        if (activity.metadata.reviewers) {
          activity.metadata.reviewers.forEach((r: string) => reviewers.push({ name: r }));
        }
        if (activity.metadata.assignees) {
          activity.metadata.assignees.forEach((a: string) => collaborators.push({ name: a }));
        }
      }
    }

    // Jira - Use raw data as primary source
    if (activity.source === 'jira') {
      const jiraData = rawToolData.get(MCPToolType.JIRA);

      let found = false;
      if (jiraData?.issues) {
        const issue = jiraData.issues.find((i: any) =>
          i.url === activity.evidence?.url ||
          activity.description?.includes(i.key)
        );

        if (issue) {
          found = true;
          if (issue.assignee) {
            collaborators.push({ name: issue.assignee });
          }
          if (issue.reporter) {
            collaborators.push({ name: issue.reporter });
          }
        }
      }

      // Fallback to metadata
      if (!found && activity.metadata) {
        if (activity.metadata.assignee) {
          collaborators.push({ name: activity.metadata.assignee });
        }
        if (activity.metadata.reporter) {
          collaborators.push({ name: activity.metadata.reporter });
        }
      }
    }

    // Slack/Teams - Use raw data as primary source
    if (activity.source === 'slack' || activity.source === 'teams') {
      const toolData = rawToolData.get(activity.source);

      let found = false;
      if (toolData?.messages) {
        const message = toolData.messages.find((m: any) =>
          activity.description?.includes(m.text?.substring(0, 50)) ||
          m.timestamp === activity.timestamp
        );

        if (message) {
          found = true;
          if (message.from) {
            collaborators.push({ name: message.from });
          }
          if (Array.isArray(message.participants)) {
            message.participants.forEach((p: string) => collaborators.push({ name: p }));
          }
        }
      }

      // Fallback to metadata
      if (!found && activity.metadata) {
        if (activity.metadata.from) {
          collaborators.push({ name: activity.metadata.from });
        }
        if (activity.metadata.participants) {
          activity.metadata.participants.forEach((p: string) => collaborators.push({ name: p }));
        }
      }
    }

    // Outlook - Extract meeting attendees and organizers
    if (activity.source === 'outlook') {
      const outlookData = rawToolData.get(MCPToolType.OUTLOOK);

      let found = false;
      if (outlookData?.meetings) {
        const meeting = outlookData.meetings.find((m: any) =>
          m.url === activity.evidence?.url ||
          activity.description?.includes(m.subject)
        );

        if (meeting) {
          found = true;
          // Extract organizer as collaborator
          if (meeting.organizer) {
            collaborators.push({ name: meeting.organizer });
          }
          // Extract all attendees as collaborators
          if (Array.isArray(meeting.attendees)) {
            meeting.attendees.forEach((a: string) => collaborators.push({ name: a }));
          }
        }
      }

      // Fallback to metadata
      if (!found && activity.metadata) {
        if (activity.metadata.organizer) {
          collaborators.push({ name: activity.metadata.organizer });
        }
        if (activity.metadata.attendees) {
          activity.metadata.attendees.forEach((a: string) => collaborators.push({ name: a }));
        }
      }
    }

    // Confluence - Extract page authors and contributors
    if (activity.source === 'confluence') {
      const confluenceData = rawToolData.get(MCPToolType.CONFLUENCE);

      let found = false;
      if (confluenceData?.pages) {
        const page = confluenceData.pages.find((p: any) =>
          p.url === activity.evidence?.url ||
          activity.description?.includes(p.title)
        );

        if (page) {
          found = true;
          if (page.author) {
            collaborators.push({ name: page.author });
          }
          if (page.lastModifiedBy && page.lastModifiedBy !== page.author) {
            collaborators.push({ name: page.lastModifiedBy });
          }
        }
      }

      // Fallback to metadata
      if (!found && activity.metadata) {
        if (activity.metadata.author) {
          collaborators.push({ name: activity.metadata.author });
        }
        if (activity.metadata.lastModifiedBy) {
          collaborators.push({ name: activity.metadata.lastModifiedBy });
        }
      }
    }

    // Log extraction results for debugging
    if (collaborators.length === 0 && reviewers.length === 0) {
      console.log(`[Format7] No people extracted from ${activity.source} activity: ${activity.description?.substring(0, 50)}`);
    }

    return { collaborators, reviewers };
  }

  /**
   * Create collaborator object with display properties
   */
  private createCollaborator(person: any): Collaborator {
    return {
      id: this.generatePersonId(person.name),
      name: person.name,
      initials: this.extractInitials(person.name),
      avatar: person.avatar || null,
      color: this.assignConsistentColor(person.name),
      role: person.role || '',
      department: person.department || ''
    };
  }

  /**
   * Generate consistent ID from name
   */
  private generatePersonId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Extract initials from name
   */
  private extractInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Assign consistent color gradient to user
   */
  private assignConsistentColor(name: string): string {
    const gradients = [
      'from-purple-400 to-pink-400',
      'from-blue-400 to-cyan-400',
      'from-green-400 to-teal-400',
      'from-orange-400 to-red-400',
      'from-indigo-400 to-purple-400',
      'from-yellow-400 to-orange-400',
      'from-pink-400 to-rose-400',
      'from-teal-400 to-cyan-400'
    ];

    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  }

  /**
   * Calculate time span in hours from the user-selected date range
   */
  private calculateTimeSpan(dateRange: { start: Date; end: Date }): number {
    const diffMs = dateRange.end.getTime() - dateRange.start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60)); // hours
  }

  /**
   * Aggregate activities by type
   */
  private aggregateByType(activities: Format7Activity[]): Record<string, number> {
    const byType: Record<string, number> = {};

    activities.forEach(activity => {
      byType[activity.type] = (byType[activity.type] || 0) + 1;
    });

    return byType;
  }

  /**
   * Aggregate activities by source
   */
  private aggregateBySource(activities: Format7Activity[]): Record<string, number> {
    const bySource: Record<string, number> = {};

    activities.forEach(activity => {
      bySource[activity.source] = (bySource[activity.source] || 0) + 1;
    });

    return bySource;
  }

  /**
   * Filter technical skills from all skills
   */
  private filterTechnicalSkills(skills: string[]): string[] {
    const softSkills = [
      'communication',
      'collaboration',
      'leadership',
      'teamwork',
      'problem solving',
      'critical thinking',
      'time management',
      'adaptability'
    ];

    return skills.filter(skill =>
      !softSkills.some(soft => skill.toLowerCase().includes(soft.toLowerCase()))
    );
  }

  /**
   * Map correlations to Format7 structure
   */
  private mapCorrelations(correlations: any[]): any[] {
    // Ensure correlations is an array
    if (!Array.isArray(correlations)) {
      return [];
    }

    // Map to format expected by JournalEnhanced component
    return correlations.map(corr => ({
      id: corr.id,
      type: corr.type,
      source1: corr.source1,  // Keep original { tool, id, title, url } structure
      source2: corr.source2,  // Keep original { tool, id, title, url } structure
      confidence: corr.confidence,
      reasoning: corr.reasoning  // Use "reasoning" field, not "description"
    }));
  }
}

export const format7Transformer = new Format7TransformerService();
