import { AzureOpenAI } from 'openai';
import {
  MCPToolType,
  GitHubActivity,
  JiraActivity,
  FigmaActivity,
  OutlookActivity,
  ConfluenceActivity,
  SlackActivity,
  TeamsActivity,
  SharePointActivity,
  OneDriveActivity,
  OneNoteActivity
} from '../../types/mcp.types';
import { ModelSelectorService, modelSelector } from '../ai/model-selector.service';
import { AnalyzerAgent, CorrelatorAgent, GeneratorAgent } from './agents';
import type { AnalysisResult, CorrelationResult, GeneratedEntries } from './agents';

/**
 * Organized activity structure returned by AI
 */
export interface OrganizedActivity {
  // AI-suggested entry metadata
  suggestedEntryType: 'achievement' | 'learning' | 'reflection' | 'challenge';
  suggestedTitle: string;
  contextSummary: string;
  extractedSkills: string[];

  // Cross-tool correlations detected by AI
  correlations: Array<{
    id: string;
    type: 'pr_to_jira' | 'meeting_to_code' | 'design_to_code' | 'discussion_to_doc' | 'general';
    source1: {
      tool: MCPToolType;
      id: string;
      title: string;
      url?: string;
    };
    source2: {
      tool: MCPToolType;
      id: string;
      title: string;
      url?: string;
    };
    confidence: number; // 0-1
    reasoning: string;
  }>;

  // Unified categories across all sources
  categories: Array<{
    type: 'achievement' | 'learning' | 'collaboration' | 'documentation' | 'problem_solving';
    label: string;
    summary: string;
    suggestedEntryType: 'achievement' | 'learning' | 'reflection' | 'challenge';
    items: Array<{
      id: string;
      source: MCPToolType;
      type: string; // 'pr', 'issue', 'commit', 'meeting', 'file', etc.
      title: string;
      description: string;
      url: string;
      importance: 'high' | 'medium' | 'low';
      selected: boolean;
      metadata?: any;
    }>;
  }>;

  // Top artifacts from each source for journal entry
  artifacts: Array<{
    type: string;
    source: MCPToolType;
    title: string;
    url: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Multi-Source Organizer Service
 *
 * Uses AI to:
 * - Analyze activity from multiple MCP tools
 * - Detect cross-tool correlations (e.g., GitHub PR → Jira ticket)
 * - Categorize and rank all activity
 * - Suggest journal entry content
 */
export class MCPMultiSourceOrganizer {
  private openai: AzureOpenAI;
  private agents: {
    analyzer: AnalyzerAgent;
    correlator: CorrelatorAgent;
    generator: GeneratorAgent;
  };

  constructor() {
    console.log('🤖 Initializing MCP Multi-Source Organizer...');

    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI credentials not configured');
    }

    if (!process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      throw new Error('Azure OpenAI deployment name not configured');
    }

    this.openai = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-07-18',
    });

    // Initialize agents with model selector
    this.agents = {
      analyzer: new AnalyzerAgent(modelSelector),
      correlator: new CorrelatorAgent(modelSelector),
      generator: new GeneratorAgent(modelSelector)
    };

    console.log('✅ MCP Multi-Source Organizer initialized with AI agents');
  }

  /**
   * Organize activity from multiple MCP tools using AI
   * @param sources Map of tool type to activity data
   * @param dateRange Optional date range for context
   * @returns Organized activity with correlations and categorization
   */
  public async organizeMultiSourceActivity(
    sources: Map<MCPToolType, any>,
    dateRange?: { start: Date; end: Date }
  ): Promise<OrganizedActivity> {
    try {
      console.log(`🔍 Organizing activity from ${sources.size} sources:`, Array.from(sources.keys()));

      // Build comprehensive activity summary for AI
      const activitySummary = this.buildActivitySummary(sources);
      const sourcesConnected = Array.from(sources.keys()).join(', ');

      // AI prompt for multi-source organization
      const prompt = `
You are organizing professional work activity from multiple integrated tools for a journal entry.

**Sources Connected:** ${sourcesConnected}
**Date Range:** ${dateRange ? `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}` : 'Not specified'}

**Activity Summary:**
${activitySummary}

**Your Task:**

1. **Identify Cross-Tool Correlations:**
   - GitHub PRs linked to Jira tickets (by keywords, issue numbers, branch names)
   - Slack/Teams discussions related to design files or code changes
   - Meeting notes connected to code commits or documentation
   - Design files (Figma) linked to implementation work (GitHub)
   - Documentation (Confluence) related to code or projects

2. **Categorize ALL Activity:**
   Organize everything into these unified categories:
   - **Achievements**: Completed work, milestones, merged PRs, closed issues, shipped features
   - **Learning**: New skills, technologies learned, experiments, research
   - **Collaboration**: Meetings, discussions, code reviews, helping others
   - **Documentation**: Confluence pages, comments, technical writing
   - **Problem Solving**: Bug fixes, troubleshooting, issue resolution

3. **For Each Category:**
   - Merge related items from different sources
   - Rank items by importance (high/medium/low)
   - Show which source each item came from
   - Select the most relevant items by default

4. **Suggest Journal Entry:**
   - Entry type (achievement/learning/reflection/challenge)
   - Compelling title that captures work across all sources
   - Brief context summary (2-3 sentences)
   - Skills extracted from all tools
   - Top 5-8 artifacts to include

**Return JSON with this EXACT structure:**
{
  "suggestedEntryType": "achievement",
  "suggestedTitle": "string",
  "contextSummary": "string",
  "extractedSkills": ["skill1", "skill2"],
  "correlations": [
    {
      "id": "corr-1",
      "type": "pr_to_jira",
      "source1": { "tool": "github", "id": "pr-123", "title": "...", "url": "..." },
      "source2": { "tool": "jira", "id": "PROJ-456", "title": "...", "url": "..." },
      "confidence": 0.95,
      "reasoning": "PR title mentions PROJ-456 and commits reference the Jira issue"
    }
  ],
  "categories": [
    {
      "type": "achievement",
      "label": "Major Achievements",
      "summary": "Brief summary of this category",
      "suggestedEntryType": "achievement",
      "items": [
        {
          "id": "unique-item-id",
          "source": "github",
          "type": "pr",
          "title": "Item title",
          "description": "Item description",
          "url": "https://...",
          "importance": "high",
          "selected": true,
          "metadata": {}
        }
      ]
    }
  ],
  "artifacts": [
    {
      "type": "github_pr",
      "source": "github",
      "title": "Artifact title",
      "url": "https://...",
      "description": "Why this is important",
      "importance": "high"
    }
  ]
}

**Correlation Types:**
- "pr_to_jira": GitHub PR linked to Jira issue
- "meeting_to_code": Meeting/discussion about specific code changes
- "design_to_code": Figma design implemented in code
- "discussion_to_doc": Slack/Teams discussion documented in Confluence
- "general": Other meaningful connections

**Important Guidelines:**
- Be intelligent about correlations - look for keywords, IDs, dates, topics
- Rank importance based on impact, completion, collaboration level
- Select items that tell a coherent story together
- Extract technical skills and soft skills
- Make the title engaging and specific, not generic
- Keep correlations confidence >0.7 (only high-confidence matches)

Return ONLY valid JSON, no additional text.
`;

      console.log('📝 Calling Azure OpenAI for multi-source organization...');

      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing professional work activity across multiple tools and identifying meaningful patterns and connections. You excel at cross-referencing information and creating cohesive narratives. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 3000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('✅ Multi-source organization complete');

      try {
        // Strip markdown code blocks if present (AI often wraps JSON in ```json...```)
        const cleanedContent = this.stripMarkdownCodeBlocks(content);
        const organized: OrganizedActivity = JSON.parse(cleanedContent);

        // Enrich with source metadata
        const enriched = this.enrichWithSourceMetadata(organized, sources);

        console.log(`🎯 Found ${organized.correlations?.length || 0} cross-tool correlations`);
        console.log(`📊 Organized into ${organized.categories?.length || 0} categories`);
        console.log(`📎 Selected ${organized.artifacts?.length || 0} top artifacts`);

        return enriched;
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError);
        console.error('❌ Raw AI response (first 500 chars):', content.substring(0, 500));

        // Fallback to basic organization
        return this.createFallbackOrganization(sources);
      }
    } catch (error) {
      console.error('❌ Error organizing multi-source activity:', error);
      throw error;
    }
  }

  /**
   * Build activity summary from all sources for AI analysis
   */
  private buildActivitySummary(sources: Map<MCPToolType, any>): string {
    let summary = '';

    sources.forEach((data, toolType) => {
      switch (toolType) {
        case MCPToolType.GITHUB:
          summary += this.summarizeGitHubActivity(data as GitHubActivity);
          break;
        case MCPToolType.JIRA:
          summary += this.summarizeJiraActivity(data as JiraActivity);
          break;
        case MCPToolType.FIGMA:
          summary += this.summarizeFigmaActivity(data as FigmaActivity);
          break;
        case MCPToolType.OUTLOOK:
          summary += this.summarizeOutlookActivity(data as OutlookActivity);
          break;
        case MCPToolType.CONFLUENCE:
          summary += this.summarizeConfluenceActivity(data as ConfluenceActivity);
          break;
        case MCPToolType.SLACK:
          summary += this.summarizeSlackActivity(data as SlackActivity);
          break;
        case MCPToolType.TEAMS:
          summary += this.summarizeTeamsActivity(data as TeamsActivity);
          break;
        case MCPToolType.SHAREPOINT:
          summary += this.summarizeSharePointActivity(data as SharePointActivity);
          break;
        case MCPToolType.ONEDRIVE:
          summary += this.summarizeOneDriveActivity(data as OneDriveActivity);
          break;
        case MCPToolType.ONENOTE:
          summary += this.summarizeOneNoteActivity(data as OneNoteActivity);
          break;
      }
    });

    return summary;
  }

  /**
   * Summarize GitHub activity for AI
   */
  private summarizeGitHubActivity(activity: GitHubActivity): string {
    let summary = `\n**GitHub Activity:**\n`;
    summary += `- ${activity.commits?.length || 0} commits\n`;
    summary += `- ${activity.pullRequests?.length || 0} pull requests\n`;
    summary += `- ${activity.issues?.length || 0} issues\n`;
    summary += `- ${activity.repositories?.length || 0} active repositories\n\n`;

    // Top PRs
    if (activity.pullRequests?.length > 0) {
      summary += `Top Pull Requests:\n`;
      activity.pullRequests.slice(0, 5).forEach((pr, idx) => {
        summary += `  ${idx + 1}. [${pr.state}] ${pr.title}\n`;
        summary += `     URL: ${pr.url}\n`;
        summary += `     Labels: ${pr.labels?.join(', ') || 'none'}\n`;
      });
      summary += '\n';
    }

    // Recent commits
    if (activity.commits?.length > 0) {
      summary += `Recent Commits:\n`;
      activity.commits.slice(0, 5).forEach((commit, idx) => {
        summary += `  ${idx + 1}. ${commit.message}\n`;
        summary += `     Repo: ${commit.repository || 'unknown'}, URL: ${commit.url}\n`;
      });
      summary += '\n';
    }

    // Issues
    if (activity.issues?.length > 0) {
      summary += `Issues:\n`;
      activity.issues.slice(0, 5).forEach((issue, idx) => {
        summary += `  ${idx + 1}. [${issue.state}] ${issue.title}\n`;
        summary += `     URL: ${issue.url}\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize Jira activity for AI
   */
  private summarizeJiraActivity(activity: JiraActivity): string {
    let summary = `\n**Jira Activity:**\n`;
    summary += `- ${activity.issues?.length || 0} issues\n`;
    summary += `- ${activity.sprints?.length || 0} active sprints\n`;
    summary += `- ${activity.projects?.length || 0} projects\n\n`;

    if (activity.issues?.length > 0) {
      summary += `Issues:\n`;
      activity.issues.slice(0, 8).forEach((issue, idx) => {
        summary += `  ${idx + 1}. [${issue.status}] ${issue.key}: ${issue.summary}\n`;
        summary += `     Assignee: ${issue.assignee || 'unassigned'}, URL: ${issue.url}\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize Figma activity for AI
   */
  private summarizeFigmaActivity(activity: FigmaActivity): string {
    let summary = `\n**Figma Activity:**\n`;
    summary += `- ${activity.files?.length || 0} files edited\n`;
    summary += `- ${activity.components?.length || 0} components created/updated\n`;
    summary += `- ${activity.comments?.length || 0} comments\n\n`;

    if (activity.files?.length > 0) {
      summary += `Files:\n`;
      activity.files.slice(0, 5).forEach((file, idx) => {
        summary += `  ${idx + 1}. ${file.name}\n`;
        summary += `     URL: ${file.url}\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize Outlook activity for AI
   */
  private summarizeOutlookActivity(activity: OutlookActivity): string {
    let summary = `\n**Outlook Activity:**\n`;
    summary += `- ${activity.meetings?.length || 0} meetings attended\n`;
    summary += `- ${activity.emails?.length || 0} important emails\n\n`;

    if (activity.meetings?.length > 0) {
      summary += `Meetings:\n`;
      activity.meetings.slice(0, 5).forEach((meeting, idx) => {
        summary += `  ${idx + 1}. ${meeting.subject}\n`;
        summary += `     ${meeting.isOrganizer ? 'Organized by me' : 'Attended'}, ${meeting.attendees?.length || 0} attendees\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize Confluence activity for AI
   */
  private summarizeConfluenceActivity(activity: ConfluenceActivity): string {
    let summary = `\n**Confluence Activity:**\n`;
    summary += `- ${activity.pages?.length || 0} pages created/updated\n`;
    summary += `- ${activity.blogPosts?.length || 0} blog posts\n`;
    summary += `- ${activity.comments?.length || 0} comments\n\n`;

    if (activity.pages?.length > 0) {
      summary += `Pages:\n`;
      activity.pages.slice(0, 5).forEach((page, idx) => {
        summary += `  ${idx + 1}. ${page.title}\n`;
        summary += `     Space: ${page.space?.name}, URL: ${page.url}\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize Slack activity for AI
   */
  private summarizeSlackActivity(activity: SlackActivity): string {
    let summary = `\n**Slack Activity:**\n`;
    summary += `- ${activity.messages?.length || 0} messages sent\n`;
    summary += `- ${activity.threads?.length || 0} thread discussions\n`;
    summary += `- ${activity.channels?.length || 0} active channels\n\n`;

    if (activity.threads?.length > 0) {
      summary += `Top Threads:\n`;
      activity.threads.slice(0, 5).forEach((thread, idx) => {
        summary += `  ${idx + 1}. ${thread.originalMessage.substring(0, 100)}...\n`;
        summary += `     Channel: ${thread.channelName}, ${thread.replyCount} replies\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize Teams activity for AI
   */
  private summarizeTeamsActivity(activity: TeamsActivity): string {
    let summary = `\n**Microsoft Teams Activity:**\n`;
    summary += `- ${activity.channelMessages?.length || 0} channel messages\n`;
    summary += `- ${activity.chatMessages?.length || 0} chat messages\n`;
    summary += `- ${activity.teams?.length || 0} active teams\n\n`;

    if (activity.channelMessages?.length > 0) {
      summary += `Channel Messages:\n`;
      activity.channelMessages.slice(0, 5).forEach((msg, idx) => {
        summary += `  ${idx + 1}. ${msg.content.substring(0, 100)}...\n`;
        summary += `     Team: ${msg.teamName}, Channel: ${msg.channelName}\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize SharePoint activity for AI
   */
  private summarizeSharePointActivity(activity: SharePointActivity): string {
    let summary = `\n**SharePoint Activity:**\n`;
    summary += `- ${activity.sites?.length || 0} sites accessed\n`;
    summary += `- ${activity.recentFiles?.length || 0} recent files\n`;
    summary += `- ${activity.lists?.length || 0} lists\n\n`;

    if (activity.recentFiles?.length > 0) {
      summary += `Recent Files:\n`;
      activity.recentFiles.slice(0, 5).forEach((file, idx) => {
        summary += `  ${idx + 1}. ${file.name} (${file.fileType})\n`;
        summary += `     Site: ${file.siteName}, Last Modified: ${new Date(file.lastModifiedDateTime).toLocaleDateString()}\n`;
      });
      summary += '\n';
    }

    if (activity.sites?.length > 0) {
      summary += `Sites:\n`;
      activity.sites.slice(0, 3).forEach((site, idx) => {
        summary += `  ${idx + 1}. ${site.displayName}\n`;
        summary += `     URL: ${site.webUrl}\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize OneDrive activity for AI
   */
  private summarizeOneDriveActivity(activity: OneDriveActivity): string {
    let summary = `\n**OneDrive Activity:**\n`;
    summary += `- ${activity.recentFiles?.length || 0} recent files\n`;
    summary += `- ${activity.sharedFiles?.length || 0} shared files\n\n`;

    if (activity.recentFiles?.length > 0) {
      summary += `Recent Files:\n`;
      activity.recentFiles.slice(0, 5).forEach((file, idx) => {
        summary += `  ${idx + 1}. ${file.name} (${file.fileType})\n`;
        summary += `     Path: ${file.parentPath}, Last Modified: ${new Date(file.lastModifiedDateTime).toLocaleDateString()}\n`;
      });
      summary += '\n';
    }

    if (activity.sharedFiles?.length > 0) {
      summary += `Shared Files:\n`;
      activity.sharedFiles.slice(0, 5).forEach((file, idx) => {
        summary += `  ${idx + 1}. ${file.name} (${file.fileType})\n`;
        summary += `     Shared with: ${file.sharedWith.join(', ')}, Permissions: ${file.permissions}\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Summarize OneNote activity for AI
   */
  private summarizeOneNoteActivity(activity: OneNoteActivity): string {
    let summary = `\n**OneNote Activity:**\n`;
    summary += `- ${activity.notebooks?.length || 0} notebooks\n`;
    summary += `- ${activity.sections?.length || 0} sections\n`;
    summary += `- ${activity.pages?.length || 0} pages\n\n`;

    if (activity.pages?.length > 0) {
      summary += `Recent Pages:\n`;
      activity.pages.slice(0, 5).forEach((page, idx) => {
        summary += `  ${idx + 1}. ${page.title}\n`;
        summary += `     Notebook: ${page.notebookName}, Section: ${page.sectionName}\n`;
        summary += `     Last Modified: ${new Date(page.lastModifiedDateTime).toLocaleDateString()}\n`;
        if (page.contentPreview) {
          summary += `     Preview: ${page.contentPreview.substring(0, 100)}...\n`;
        }
      });
      summary += '\n';
    }

    if (activity.notebooks?.length > 0) {
      summary += `Notebooks:\n`;
      activity.notebooks.slice(0, 3).forEach((notebook, idx) => {
        summary += `  ${idx + 1}. ${notebook.displayName} (${notebook.sectionCount} sections)\n`;
      });
      summary += '\n';
    }

    return summary;
  }

  /**
   * Strip markdown code blocks from JSON response
   * AI models often wrap JSON in ```json...``` blocks
   */
  private stripMarkdownCodeBlocks(content: string): string {
    // Remove ```json\n...\n``` or ```\n...\n```
    const cleaned = content
      .replace(/^```(?:json)?\s*\n/i, '')  // Remove opening ```json or ```
      .replace(/\n```\s*$/, '')            // Remove closing ```
      .trim();
    return cleaned;
  }

  /**
   * Enrich organized activity with additional source metadata
   */
  private enrichWithSourceMetadata(
    organized: OrganizedActivity,
    sources: Map<MCPToolType, any>
  ): OrganizedActivity {
    // Add any additional metadata from source data that AI might have missed
    // For now, just return as-is since AI should have captured everything
    return organized;
  }

  /**
   * Create fallback organization if AI parsing fails
   */
  private createFallbackOrganization(sources: Map<MCPToolType, any>): OrganizedActivity {
    console.log('⚠️ Using fallback organization (AI parsing failed)');

    const categories: OrganizedActivity['categories'] = [];
    const artifacts: OrganizedActivity['artifacts'] = [];
    const skills = new Set<string>();

    // Extract items from each source
    sources.forEach((data, toolType) => {
      if (toolType === MCPToolType.GITHUB) {
        const githubData = data as GitHubActivity;

        // Add PRs as achievements
        if (githubData.pullRequests?.length > 0) {
          categories.push({
            type: 'achievement',
            label: 'GitHub Pull Requests',
            summary: `${githubData.pullRequests.length} pull requests`,
            suggestedEntryType: 'achievement',
            items: githubData.pullRequests.slice(0, 10).map(pr => ({
              id: `github-pr-${pr.id}`,
              source: MCPToolType.GITHUB,
              type: 'pr',
              title: pr.title,
              description: `Pull request #${pr.id} - ${pr.state}`,
              url: pr.url,
              importance: pr.state === 'merged' ? 'high' : 'medium',
              selected: pr.state === 'merged'
            }))
          });

          // Add top PRs as artifacts
          githubData.pullRequests.slice(0, 3).forEach(pr => {
            artifacts.push({
              type: 'github_pr',
              source: MCPToolType.GITHUB,
              title: pr.title,
              url: pr.url,
              description: `Pull Request #${pr.id}`,
              importance: pr.state === 'merged' ? 'high' : 'medium'
            });
          });
        }

        // Extract skills from repositories
        githubData.repositories?.forEach(repo => {
          if (repo.language) {
            skills.add(repo.language);
          }
        });
      }
    });

    return {
      suggestedEntryType: 'achievement',
      suggestedTitle: 'Work Activity Summary',
      contextSummary: `Activity from ${sources.size} connected tool(s): ${Array.from(sources.keys()).join(', ')}`,
      extractedSkills: Array.from(skills),
      correlations: [],
      categories,
      artifacts
    };
  }

  /**
   * Progressive AI-based organization using agents
   * Provides staged processing for better UX and cost optimization
   */
  async organizeWithAgents(
    sources: Map<MCPToolType, any>,
    options: {
      quality?: 'quick' | 'balanced' | 'high';
      generateContent?: boolean;
      workspaceName?: string;
      userContext?: any;
    } = {}
  ): Promise<{
    analysis?: AnalysisResult;
    correlations?: CorrelationResult;
    content?: GeneratedEntries;
    organized: OrganizedActivity;
  }> {
    const { quality = 'balanced', generateContent = false, workspaceName = 'Default', userContext } = options;
    console.log(`🚀 Starting agent-based organization with ${quality} quality`);

    // Log which tools have data and how much
    console.log('========== BACKEND: AI PROCESSING STARTING ==========');
    console.log(`[Organizer] Tools received (${sources.size}):`);
    sources.forEach((data, toolType) => {
      const itemCounts: any = {};
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key])) {
            itemCounts[key] = data[key].length;
          }
        });
        console.log(`  - ${toolType}:`, itemCounts);
      } else {
        console.log(`  - ${toolType}: ${data ? 'has data' : 'NO DATA'}`);
      }
    });

    try {
      // Stage 1: Analyze activities
      const analysis = quality === 'quick'
        ? await this.agents.analyzer.quickAnalyze(sources)
        : await this.agents.analyzer.deepAnalyze(sources);

      console.log(`✅ Analysis complete: ${analysis.activities.length} activities identified`);

      // Validate and filter activities to only include sources that were actually requested
      const requestedSources = Array.from(sources.keys());
      console.log(`[Organizer] Requested sources:`, requestedSources);
      console.log(`[Organizer] Activities before filtering:`, analysis.activities.map(a => ({ source: a.source, title: a.title })));

      const validatedActivities = analysis.activities.filter(activity => {
        const isValid = requestedSources.includes(activity.source as any);
        if (!isValid) {
          console.warn(`[Organizer] ⚠️ Filtering out hallucinated activity from ${activity.source}: "${activity.title}"`);
        }
        return isValid;
      });

      console.log(`[Organizer] Filtered ${analysis.activities.length - validatedActivities.length} hallucinated activities`);
      console.log(`[Organizer] Valid activities remaining: ${validatedActivities.length}`);

      // Replace with validated activities
      analysis.activities = validatedActivities;

      // If no valid activities remain, clear out AI-generated suggestions to prevent showing fake content
      if (validatedActivities.length === 0) {
        console.log(`[Organizer] ⚠️ No valid activities - clearing AI-generated suggestions`);
        analysis.summary = 'No activities found for the selected date range.';
        analysis.suggestedFocus = '';
        analysis.extractedSkills = [];
        analysis.totalTimeInvestment = 0;
      }

      // Stage 2: Detect correlations (only on valid activities)
      const correlations = validatedActivities.length > 0
        ? await this.agents.correlator.detectCorrelations(validatedActivities)
        : { correlations: [], avgConfidence: 0, strongCorrelations: 0, insights: [] };
      console.log(`✅ Found ${correlations.correlations.length} correlations (avg confidence: ${correlations.avgConfidence.toFixed(2)})`);

      // Convert to OrganizedActivity format
      const organized = this.convertToOrganizedActivity(analysis, correlations);

      // Stage 3: Generate content (optional)
      let content: GeneratedEntries | undefined;
      if (generateContent) {
        content = await this.agents.generator.generateEntries(organized, workspaceName, userContext);
        console.log(`✅ Generated journal entries for workspace and network`);
      }

      return {
        analysis,
        correlations,
        content,
        organized
      };
    } catch (error) {
      console.error('❌ Error in agent-based organization:', error);
      // Don't fall back to old AI-based organization which can generate fake activities
      // Instead, return an empty organized result
      return {
        organized: {
          suggestedEntryType: 'learning',
          suggestedTitle: 'No Activities Found',
          contextSummary: 'No activities found for the selected date range.',
          extractedSkills: [],
          correlations: [],
          categories: [],
          artifacts: []
        }
      };
    }
  }

  /**
   * Progressive processing for frontend
   * Allows staged API calls for better UX
   */
  async processStage(
    stage: 'analyze' | 'correlate' | 'generate',
    data: any,
    options: any = {}
  ): Promise<{
    result: any;
    nextStage?: string;
    progress: number;
  }> {
    switch (stage) {
      case 'analyze':
        const analysis = options.quality === 'deep'
          ? await this.agents.analyzer.deepAnalyze(data)
          : await this.agents.analyzer.quickAnalyze(data);
        return {
          result: analysis,
          nextStage: 'correlate',
          progress: 33
        };

      case 'correlate':
        const correlations = await this.agents.correlator.detectCorrelations(data.activities);
        return {
          result: { ...data, correlations },
          nextStage: 'generate',
          progress: 66
        };

      case 'generate':
        const organized = this.convertToOrganizedActivity(data, data.correlations);
        const content = await this.agents.generator.generateEntries(
          organized,
          options.workspaceName || 'Default',
          options.userContext
        );
        return {
          result: { ...data, content, organized },
          progress: 100
        };

      default:
        throw new Error(`Unknown processing stage: ${stage}`);
    }
  }

  /**
   * Convert agent results to OrganizedActivity format
   */
  private convertToOrganizedActivity(
    analysis: AnalysisResult,
    correlations: CorrelationResult
  ): OrganizedActivity {
    // Group activities by category
    const categorizedActivities = new Map<string, any[]>();

    analysis.activities.forEach(activity => {
      if (!categorizedActivities.has(activity.category)) {
        categorizedActivities.set(activity.category, []);
      }
      categorizedActivities.get(activity.category)!.push({
        id: activity.id,
        source: activity.source,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        url: activity.metadata?.url || '',
        importance: activity.importance,
        selected: activity.importance === 'high',
        metadata: activity.metadata
      });
    });

    // Create categories
    const categories = Array.from(categorizedActivities.entries()).map(([type, items]) => ({
      type: type as any,
      label: this.getCategoryLabel(type),
      summary: `${items.length} ${type} activities`,
      suggestedEntryType: this.getSuggestedEntryType(type),
      items
    }));

    // Extract top artifacts
    const artifacts = analysis.activities
      .filter(a => a.importance === 'high' && a.metadata?.url)
      .slice(0, 5)
      .map(a => ({
        type: a.type,
        source: a.source,
        title: a.title,
        url: a.metadata.url,
        description: a.description,
        importance: a.importance as any
      }));

    return {
      suggestedEntryType: this.determineSuggestedEntryType(analysis),
      suggestedTitle: analysis.suggestedFocus || 'Daily Work Summary',
      contextSummary: analysis.summary,
      extractedSkills: analysis.extractedSkills,
      correlations: correlations.correlations.map(c => ({
        ...c,
        type: c.type as any
      })),
      categories,
      artifacts
    };
  }

  private getCategoryLabel(type: string): string {
    const labels: Record<string, string> = {
      achievement: 'Achievements',
      learning: 'Learning & Growth',
      collaboration: 'Collaboration',
      documentation: 'Documentation',
      problem_solving: 'Problem Solving'
    };
    return labels[type] || type;
  }

  private getSuggestedEntryType(category: string): 'achievement' | 'learning' | 'reflection' | 'challenge' {
    const mapping: Record<string, any> = {
      achievement: 'achievement',
      learning: 'learning',
      collaboration: 'reflection',
      documentation: 'reflection',
      problem_solving: 'challenge'
    };
    return mapping[category] || 'reflection';
  }

  private determineSuggestedEntryType(analysis: AnalysisResult): 'achievement' | 'learning' | 'reflection' | 'challenge' {
    // Determine based on most common category
    const categoryCounts = new Map<string, number>();
    analysis.activities.forEach(a => {
      categoryCounts.set(a.category, (categoryCounts.get(a.category) || 0) + 1);
    });

    const topCategory = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return this.getSuggestedEntryType(topCategory || 'reflection');
  }
}
