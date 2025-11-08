import { ModelSelectorService } from '../../ai/model-selector.service';
import { MCPToolType } from '../../../types/mcp.types';
import { AnalyzedActivity } from './analyzer-agent';
import { ChatCompletionMessageParam } from 'openai/resources/index';

export interface Correlation {
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
  impact: 'high' | 'medium' | 'low';
}

export interface CorrelationResult {
  correlations: Correlation[];
  avgConfidence: number;
  strongCorrelations: number;
  insights: string[];
}

/**
 * Correlator Agent
 *
 * Detects relationships and connections between activities from different tools.
 * Uses AI to identify cross-tool patterns and meaningful connections.
 */
export class CorrelatorAgent {
  private correlationPatterns = {
    pr_to_jira: {
      description: 'GitHub PR linked to Jira issue',
      patterns: ['issue number', 'ticket reference', 'JIRA-XXX', 'fixes #', 'closes #']
    },
    meeting_to_code: {
      description: 'Meeting discussion related to code changes',
      patterns: ['discussed in meeting', 'as per discussion', 'meeting notes', 'sync discussion']
    },
    design_to_code: {
      description: 'Figma design implemented in code',
      patterns: ['design implementation', 'UI/UX', 'mockup', 'figma link', 'design system']
    },
    discussion_to_doc: {
      description: 'Slack/Teams discussion documented',
      patterns: ['documented', 'confluence', 'wiki', 'knowledge base', 'FAQ']
    }
  };

  constructor(private modelSelector: ModelSelectorService) {}

  /**
   * Detect correlations between analyzed activities
   */
  async detectCorrelations(activities: AnalyzedActivity[]): Promise<CorrelationResult> {
    console.log('🔗 Detecting correlations between', activities.length, 'activities');

    // Return empty result if no activities to correlate
    if (activities.length === 0) {
      console.log('⚠️ No activities to correlate - returning empty result');
      return {
        correlations: [],
        avgConfidence: 0,
        strongCorrelations: 0,
        insights: []
      };
    }

    const prompt = this.buildCorrelationPrompt(activities);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert at detecting meaningful connections between work activities across different tools.
        Look for:
        - Explicit references (ticket numbers, PR links, meeting titles)
        - Temporal proximity (activities within 2 hours)
        - Semantic similarity (similar keywords, topics, project names)
        - Cause-effect relationships
        - Collaborative patterns
        Only identify high-confidence correlations (>0.7). Always return valid JSON.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Start with quick model, upgrade if needed
    const result = await this.modelSelector.executeWithConfidenceUpgrade(
      'correlate',
      messages,
      0.7
    );

    try {
      const parsed = typeof result.content === 'string'
        ? JSON.parse(result.content)
        : result.content;

      // If average confidence is low, retry with GPT-4o
      if (parsed.avgConfidence < 0.7 && !result.upgraded) {
        console.log('🔄 Low correlation confidence, upgrading to GPT-4o for better detection');
        const premiumResult = await this.modelSelector.executeTask('correlate', messages, 'high');
        return JSON.parse(premiumResult.content);
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse correlation result:', error);
      return this.getFallbackCorrelations(activities);
    }
  }

  /**
   * Find strong correlations only (confidence > 0.85)
   */
  async findStrongCorrelations(activities: AnalyzedActivity[]): Promise<Correlation[]> {
    const result = await this.detectCorrelations(activities);
    return result.correlations.filter(c => c.confidence > 0.85);
  }

  private buildCorrelationPrompt(activities: AnalyzedActivity[]): string {
    // Group activities by source for easier correlation
    const bySource = this.groupBySource(activities);
    const activitiesJson = JSON.stringify(activities, null, 2);

    return `
Analyze these work activities and identify meaningful correlations between different tools.

**Activities by Source:**
${this.summarizeBySource(bySource)}

**Full Activity Data:**
${activitiesJson}

**Correlation Detection Rules:**
1. **PR to Jira**: Look for PR titles/descriptions mentioning JIRA ticket numbers (e.g., PROJ-123)
2. **Meeting to Code**: Match meeting subjects with PR/commit messages from same day
3. **Design to Code**: Connect Figma file updates with UI-related PRs/commits
4. **Discussion to Doc**: Link Slack/Teams conversations with Confluence documentation
5. **General**: Any other meaningful connections (same project, related features, follow-ups)

**Confidence Scoring:**
- 0.9-1.0: Explicit reference (e.g., "Fixes JIRA-123" in PR)
- 0.8-0.9: Strong match (same title, clear relationship)
- 0.7-0.8: Probable match (temporal + semantic similarity)
- Below 0.7: Don't include (too uncertain)

**Impact Assessment:**
- High: Critical feature, blocker resolution, major milestone
- Medium: Regular feature work, improvements
- Low: Minor fixes, routine updates

**Return JSON:**
{
  "correlations": [
    {
      "id": "corr-1",
      "type": "pr_to_jira|meeting_to_code|design_to_code|discussion_to_doc|general",
      "source1": {
        "tool": "github",
        "id": "activity-id",
        "title": "Activity title",
        "url": "https://..."
      },
      "source2": {
        "tool": "jira",
        "id": "activity-id",
        "title": "Activity title",
        "url": "https://..."
      },
      "confidence": 0.95,
      "reasoning": "PR title contains JIRA-123 which matches the Jira issue",
      "impact": "high|medium|low"
    }
  ],
  "avgConfidence": 0.85,
  "strongCorrelations": 3,
  "insights": [
    "Most development work is tied to Jira tickets",
    "Design reviews happening before implementation",
    "Good documentation practices with Confluence"
  ]
}

Focus on finding meaningful connections that tell a coherent story about the work accomplished.
`;
  }

  private groupBySource(activities: AnalyzedActivity[]): Map<MCPToolType, AnalyzedActivity[]> {
    const grouped = new Map<MCPToolType, AnalyzedActivity[]>();

    activities.forEach(activity => {
      if (!grouped.has(activity.source)) {
        grouped.set(activity.source, []);
      }
      grouped.get(activity.source)!.push(activity);
    });

    return grouped;
  }

  private summarizeBySource(bySource: Map<MCPToolType, AnalyzedActivity[]>): string {
    const summaries: string[] = [];

    bySource.forEach((activities, source) => {
      summaries.push(`\n${source.toUpperCase()} (${activities.length} activities):`);
      activities.slice(0, 3).forEach(a => {
        summaries.push(`  - ${a.title} (${a.type}, ${a.importance})`);
      });
      if (activities.length > 3) {
        summaries.push(`  ... and ${activities.length - 3} more`);
      }
    });

    return summaries.join('\n');
  }

  private getFallbackCorrelations(activities: AnalyzedActivity[]): CorrelationResult {
    // Basic pattern matching without AI
    const correlations: Correlation[] = [];
    const jiraPattern = /\b[A-Z]+-\d+\b/g;

    // Look for simple patterns
    activities.forEach((act1, idx1) => {
      activities.slice(idx1 + 1).forEach(act2 => {
        // Check for JIRA references in GitHub activities
        if (act1.source === MCPToolType.GITHUB && act2.source === MCPToolType.JIRA) {
          const matches = act1.title.match(jiraPattern);
          if (matches && act2.title.includes(matches[0])) {
            correlations.push({
              id: `corr-${correlations.length + 1}`,
              type: 'pr_to_jira',
              source1: {
                tool: act1.source,
                id: act1.id,
                title: act1.title
              },
              source2: {
                tool: act2.source,
                id: act2.id,
                title: act2.title
              },
              confidence: 0.9,
              reasoning: `Direct JIRA reference found: ${matches[0]}`,
              impact: act1.importance === 'high' || act2.importance === 'high' ? 'high' : 'medium'
            });
          }
        }

        // Check temporal proximity (within 2 hours)
        const timeDiff = Math.abs(act1.timestamp.getTime() - act2.timestamp.getTime());
        if (timeDiff < 2 * 60 * 60 * 1000 && act1.source !== act2.source) {
          // Check for keyword similarity
          const keywords1 = act1.title.toLowerCase().split(/\s+/);
          const keywords2 = act2.title.toLowerCase().split(/\s+/);
          const common = keywords1.filter(k => keywords2.includes(k) && k.length > 3);

          if (common.length >= 2) {
            correlations.push({
              id: `corr-${correlations.length + 1}`,
              type: 'general',
              source1: {
                tool: act1.source,
                id: act1.id,
                title: act1.title
              },
              source2: {
                tool: act2.source,
                id: act2.id,
                title: act2.title
              },
              confidence: 0.7,
              reasoning: `Temporal proximity and shared keywords: ${common.join(', ')}`,
              impact: 'medium'
            });
          }
        }
      });
    });

    const avgConfidence = correlations.length > 0
      ? correlations.reduce((sum, c) => sum + c.confidence, 0) / correlations.length
      : 0;

    return {
      correlations,
      avgConfidence,
      strongCorrelations: correlations.filter(c => c.confidence > 0.85).length,
      insights: [
        `Found ${correlations.length} correlations`,
        correlations.some(c => c.type === 'pr_to_jira') ? 'Development work linked to tickets' : '',
        'Consider adding more explicit references for better tracking'
      ].filter(Boolean)
    };
  }
}

export default CorrelatorAgent;