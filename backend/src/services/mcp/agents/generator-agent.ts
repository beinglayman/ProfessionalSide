import { ModelSelectorService } from '../../ai/model-selector.service';
import { AnalysisResult } from './analyzer-agent';
import { CorrelationResult } from './correlator-agent';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import { OrganizedActivity } from '../mcp-multi-source-organizer.service';

export interface GeneratedEntry {
  title: string;
  description: string;
  outcomes: Array<{
    category: 'performance' | 'technical' | 'user-experience' | 'business';
    title: string;
    description: string;
  }>;
  skills: string[];
  artifacts: Array<{
    type: string;
    title: string;
    url: string;
  }>;
}

export interface GeneratedEntries {
  workspaceEntry: GeneratedEntry;
  networkEntry: GeneratedEntry;
  suggestedTags: string[];
  estimatedReadTime: number;
}

/**
 * Generator Agent
 *
 * Creates polished journal entries from organized activities.
 * Uses GPT-4o for high-quality content generation.
 */
export class GeneratorAgent {
  constructor(private modelSelector: ModelSelectorService) {}

  /**
   * Generate both workspace and network journal entries
   */
  async generateEntries(
    organizedData: OrganizedActivity,
    workspaceName: string,
    userContext?: {
      role?: string;
      recentFocus?: string[];
      preferredTone?: 'professional' | 'casual' | 'technical';
    }
  ): Promise<GeneratedEntries> {
    console.log('✍️ Generating journal entries for workspace:', workspaceName);

    // Generate both entries in parallel for speed
    const [workspaceEntry, networkEntry] = await Promise.all([
      this.generateWorkspaceEntry(organizedData, workspaceName, userContext),
      this.generateNetworkEntry(organizedData, userContext)
    ]);

    // Extract suggested tags from the content
    const suggestedTags = this.extractTags(organizedData, workspaceEntry, networkEntry);

    // Calculate read time (average 200 words per minute)
    const totalWords = this.countWords(workspaceEntry.description + networkEntry.description);
    const estimatedReadTime = Math.ceil(totalWords / 200);

    return {
      workspaceEntry,
      networkEntry,
      suggestedTags,
      estimatedReadTime
    };
  }

  /**
   * Generate workspace-specific entry (detailed, with IPR)
   */
  private async generateWorkspaceEntry(
    data: OrganizedActivity,
    workspaceName: string,
    userContext?: any
  ): Promise<GeneratedEntry> {
    const prompt = this.buildWorkspacePrompt(data, workspaceName, userContext);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an experienced professional writing a journal entry for your workspace team.
        Write in first person with a conversational yet professional tone.
        Include specific details, metrics, and technical information.
        Use "I" and "we" naturally. Be authentic and reflective.
        Focus on both achievements and learnings.
        Always return valid JSON.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Always use GPT-4o for content generation
    const result = await this.modelSelector.executeTask('generate', messages, 'high', {
      temperature: 0.8,
      maxTokens: 2000
    });

    try {
      return JSON.parse(result.content);
    } catch (error) {
      console.error('Failed to parse workspace entry:', error);
      return this.getFallbackEntry(data, 'workspace');
    }
  }

  /**
   * Generate network entry (abstract, skill-focused, no IPR)
   */
  private async generateNetworkEntry(
    data: OrganizedActivity,
    userContext?: any
  ): Promise<GeneratedEntry> {
    const prompt = this.buildNetworkPrompt(data, userContext);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are writing a professional journal entry for your broader network.
        Focus on skills, growth, and transferable learnings.
        Remove company-specific details, client names, and proprietary information.
        Emphasize professional development and industry insights.
        Keep it engaging but general enough for public consumption.
        Always return valid JSON.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Use GPT-4o for quality
    const result = await this.modelSelector.executeTask('generate', messages, 'high', {
      temperature: 0.8,
      maxTokens: 1500
    });

    try {
      return JSON.parse(result.content);
    } catch (error) {
      console.error('Failed to parse network entry:', error);
      return this.getFallbackEntry(data, 'network');
    }
  }

  private buildWorkspacePrompt(data: OrganizedActivity, workspaceName: string, userContext?: any): string {
    const topActivities = this.selectTopActivities(data, 5);
    const correlations = data.correlations?.slice(0, 3) || [];

    return `
Create a detailed journal entry for the "${workspaceName}" workspace based on these activities.

**Work Summary:**
${data.contextSummary}

**Key Activities:**
${topActivities.map(a => `- ${a.title}: ${a.description}`).join('\n')}

**Cross-Tool Connections:**
${correlations.map(c => `- ${c.source1.title} ↔ ${c.source2.title}: ${c.reasoning}`).join('\n')}

**Skills Applied:**
${data.extractedSkills.join(', ')}

**Entry Type:** ${data.suggestedEntryType}

**Requirements:**
1. Write a compelling title that captures the main achievement/learning
2. Create a detailed description (200-300 words) in first person
3. Include specific metrics, tools, and technical details
4. Mention team collaboration where relevant
5. Reference actual project names and technologies
6. Include 3-4 concrete outcomes with measurable impact
7. List key artifacts (PRs, documents, designs) with URLs

**Return JSON:**
{
  "title": "Professional but engaging title",
  "description": "Detailed first-person narrative with specifics",
  "outcomes": [
    {
      "category": "performance|technical|user-experience|business",
      "title": "Specific outcome",
      "description": "Detailed impact with metrics"
    }
  ],
  "skills": ["Technical skills", "Soft skills"],
  "artifacts": [
    {
      "type": "pr|document|design|meeting",
      "title": "Artifact name",
      "url": "https://..."
    }
  ]
}

Make it sound authentic, like a real professional reflecting on meaningful work.
`;
  }

  private buildNetworkPrompt(data: OrganizedActivity, userContext?: any): string {
    const topActivities = this.selectTopActivities(data, 3);

    return `
Create an abstract journal entry suitable for professional network sharing based on these activities.

**Work Theme:**
${data.contextSummary}

**Key Accomplishments:**
${topActivities.map(a => `- ${a.category}: ${this.abstractDescription(a.description)}`).join('\n')}

**Skills Demonstrated:**
${data.extractedSkills.join(', ')}

**Entry Type:** ${data.suggestedEntryType}

**Requirements:**
1. Create an inspiring title focused on growth/learning
2. Write an abstract description (150-200 words) without company specifics
3. Focus on transferable skills and industry insights
4. Remove client names, project codes, proprietary details
5. Emphasize professional development and best practices
6. Include 2-3 high-level outcomes
7. Make it valuable for other professionals in the field

**Sanitization Rules:**
- Replace specific client/project names with generic terms
- Focus on methodologies over implementations
- Highlight patterns and principles
- Make insights applicable across organizations

**Return JSON:**
{
  "title": "Growth-focused professional title",
  "description": "Abstract narrative focusing on skills and learnings",
  "outcomes": [
    {
      "category": "performance|technical|user-experience|business",
      "title": "General professional outcome",
      "description": "Industry-relevant impact"
    }
  ],
  "skills": ["Transferable skills"],
  "artifacts": []
}

Make it inspiring and valuable for professional peers.
`;
  }

  private selectTopActivities(data: OrganizedActivity, count: number) {
    const allActivities = data.categories.flatMap(c => c.items);
    return allActivities
      .filter(a => a.selected)
      .sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      })
      .slice(0, count);
  }

  private abstractDescription(description: string): string {
    // Remove specific names and numbers, keep general concepts
    return description
      .replace(/\b[A-Z]+-\d+\b/g, 'project task') // JIRA-123 -> project task
      .replace(/\bclient\s+\w+/gi, 'client') // client ABC -> client
      .replace(/\$[\d,]+/g, 'significant value') // $10,000 -> significant value
      .replace(/\d+%/g, 'substantial improvement'); // 45% -> substantial improvement
  }

  private extractTags(data: OrganizedActivity, workspace: GeneratedEntry, network: GeneratedEntry): string[] {
    const tags = new Set<string>();

    // Add skills as tags
    data.extractedSkills.slice(0, 5).forEach(skill => tags.add(skill.toLowerCase()));

    // Add entry type
    tags.add(data.suggestedEntryType);

    // Extract key technologies from descriptions
    const techKeywords = ['react', 'node', 'python', 'aws', 'docker', 'kubernetes', 'api', 'database'];
    const combinedText = (workspace.description + network.description).toLowerCase();
    techKeywords.forEach(tech => {
      if (combinedText.includes(tech)) {
        tags.add(tech);
      }
    });

    return Array.from(tags).slice(0, 10);
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private getFallbackEntry(data: OrganizedActivity, type: 'workspace' | 'network'): GeneratedEntry {
    // Basic fallback without AI
    const isWorkspace = type === 'workspace';

    return {
      title: data.suggestedTitle || 'Daily Work Update',
      description: isWorkspace
        ? `Today I worked on several important tasks. ${data.contextSummary}. Applied skills including ${data.extractedSkills.slice(0, 3).join(', ')}.`
        : `Made progress on key professional objectives. Focused on ${data.extractedSkills.slice(0, 3).join(', ')} to deliver value.`,
      outcomes: data.categories.slice(0, 3).map(cat => ({
        category: 'technical' as const,
        title: cat.label,
        description: cat.summary
      })),
      skills: data.extractedSkills.slice(0, 5),
      artifacts: isWorkspace ? data.artifacts.slice(0, 3).map(a => ({
        type: a.type,
        title: a.title,
        url: a.url
      })) : []
    };
  }

  /**
   * Generate a quick summary without full entry
   */
  async generateQuickSummary(data: OrganizedActivity): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'Create a concise 2-3 sentence summary of work activities.'
      },
      {
        role: 'user',
        content: `Summarize: ${data.contextSummary}\nKey skills: ${data.extractedSkills.join(', ')}`
      }
    ];

    const result = await this.modelSelector.executeTask('summarize', messages, 'quick', {
      maxTokens: 200
    });

    return result.content;
  }
}

export default GeneratorAgent;