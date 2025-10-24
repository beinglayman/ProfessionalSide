import { ModelSelectorService } from '../../ai/model-selector.service';
import { MCPToolType } from '../../../types/mcp.types';
import { ChatCompletionMessageParam } from 'openai/resources/index';

export interface AnalyzedActivity {
  id: string;
  source: MCPToolType;
  type: 'code_change' | 'issue' | 'meeting' | 'design' | 'documentation' | 'discussion';
  title: string;
  description: string;
  timestamp: Date;
  technicalComplexity: 1 | 2 | 3 | 4 | 5;
  businessImpact: 'high' | 'medium' | 'low';
  skills: string[];
  timeInvestment: number; // estimated minutes
  category: 'achievement' | 'learning' | 'collaboration' | 'documentation' | 'problem_solving';
  importance: 'high' | 'medium' | 'low';
  metadata?: any;
}

export interface AnalysisResult {
  activities: AnalyzedActivity[];
  summary: string;
  extractedSkills: string[];
  suggestedFocus: string;
  totalTimeInvestment: number;
}

/**
 * Analyzer Agent
 *
 * Responsible for analyzing raw activities from MCP tools and extracting meaningful insights.
 * Uses AI to classify, categorize, and understand the nature of work activities.
 */
export class AnalyzerAgent {
  constructor(private modelSelector: ModelSelectorService) {}

  /**
   * Quick analysis using GPT-4o-mini for fast categorization
   */
  async quickAnalyze(activities: Map<MCPToolType, any>): Promise<AnalysisResult> {
    console.log('🔍 Quick analyzing activities from', activities.size, 'sources');

    const prompt = this.buildQuickAnalysisPrompt(activities);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert at analyzing professional work activities. Categorize and extract insights quickly and accurately. Always return valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.modelSelector.executeTask('analyze', messages, 'quick');

    try {
      return JSON.parse(result.content);
    } catch (error) {
      console.error('Failed to parse analysis result:', error);
      // Return a basic structure if parsing fails
      return this.getFallbackAnalysis(activities);
    }
  }

  /**
   * Deep analysis using GPT-4o for nuanced understanding
   */
  async deepAnalyze(activities: Map<MCPToolType, any>): Promise<AnalysisResult> {
    console.log('🔬 Deep analyzing activities from', activities.size, 'sources');

    const prompt = this.buildDeepAnalysisPrompt(activities);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert at deeply analyzing professional work activities. Extract nuanced insights, patterns, and professional growth indicators. Consider technical complexity, business impact, and skill development. Always return valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.modelSelector.executeTask('analyze', messages, 'high');

    try {
      // Strip markdown code blocks if present
      const cleanedContent = this.stripMarkdownCodeBlocks(result.content);
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Failed to parse deep analysis result:', error);
      console.error('Raw content (first 500 chars):', result.content.substring(0, 500));
      // Fallback to quick analysis
      return this.quickAnalyze(activities);
    }
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

  private buildQuickAnalysisPrompt(activities: Map<MCPToolType, any>): string {
    const activitiesSummary = this.summarizeActivities(activities);

    return `
Analyze these work activities and categorize them for a professional journal entry.

**Activities Data:**
${activitiesSummary}

**Your Task:**
1. Classify each activity by type (code_change, issue, meeting, design, documentation, discussion)
2. Determine technical complexity (1-5 scale)
3. Assess business impact (high/medium/low)
4. Extract skills demonstrated
5. Estimate time investment
6. Categorize into: achievement, learning, collaboration, documentation, or problem_solving
7. Rank importance (high/medium/low)

**Return JSON with this EXACT structure:**
{
  "activities": [
    {
      "id": "unique-id",
      "source": "github|jira|figma|outlook|confluence|slack|teams",
      "type": "code_change|issue|meeting|design|documentation|discussion",
      "title": "Activity title",
      "description": "Brief description",
      "timestamp": "2024-01-01T00:00:00Z",
      "technicalComplexity": 1-5,
      "businessImpact": "high|medium|low",
      "skills": ["skill1", "skill2"],
      "timeInvestment": 60,
      "category": "achievement|learning|collaboration|documentation|problem_solving",
      "importance": "high|medium|low",
      "metadata": {}
    }
  ],
  "summary": "Overall summary of activities",
  "extractedSkills": ["all unique skills"],
  "suggestedFocus": "Main theme or achievement to highlight",
  "totalTimeInvestment": 480
}

Focus on identifying the most impactful and journal-worthy activities.
`;
  }

  private buildDeepAnalysisPrompt(activities: Map<MCPToolType, any>): string {
    const activitiesSummary = this.summarizeActivities(activities);

    return `
Perform a deep analysis of these professional work activities, identifying patterns, growth areas, and key achievements.

**Activities Data:**
${activitiesSummary}

**Deep Analysis Requirements:**
1. Identify subtle patterns and connections between activities
2. Assess technical growth and skill progression
3. Evaluate leadership and collaboration aspects
4. Determine strategic impact on projects/organization
5. Identify learning moments and challenges overcome
6. Extract both technical and soft skills demonstrated
7. Suggest professional development insights
8. Identify potential portfolio pieces or showcase achievements

**Consider:**
- How activities demonstrate professional maturity
- Cross-functional collaboration indicators
- Innovation and problem-solving approaches
- Time management and prioritization patterns
- Technical depth vs. breadth balance

**Return comprehensive JSON analysis following the structure from quick analysis, but with richer insights in descriptions and additional metadata.**

${this.buildQuickAnalysisPrompt(activities)}
`;
  }

  private summarizeActivities(activities: Map<MCPToolType, any>): string {
    const summaries: string[] = [];

    activities.forEach((data, tool) => {
      summaries.push(`\n**${tool.toUpperCase()} Activities:**`);

      // Customize summary based on tool type
      switch (tool) {
        case MCPToolType.GITHUB:
          if (data.pullRequests?.length > 0) {
            summaries.push(`- ${data.pullRequests.length} Pull Requests`);
            data.pullRequests.slice(0, 3).forEach((pr: any) => {
              summaries.push(`  • ${pr.title} (${pr.state})`);
            });
          }
          if (data.commits?.length > 0) {
            summaries.push(`- ${data.commits.length} Commits`);
          }
          break;

        case MCPToolType.JIRA:
          if (data.issues?.length > 0) {
            summaries.push(`- ${data.issues.length} Issues`);
            data.issues.slice(0, 3).forEach((issue: any) => {
              summaries.push(`  • ${issue.key}: ${issue.summary} (${issue.status})`);
            });
          }
          break;

        case MCPToolType.FIGMA:
          if (data.files?.length > 0) {
            summaries.push(`- ${data.files.length} Design Files`);
            data.files.slice(0, 3).forEach((file: any) => {
              summaries.push(`  • ${file.name} (${file.lastModified})`);
            });
          }
          break;

        case MCPToolType.TEAMS:
        case MCPToolType.OUTLOOK:
          if (data.meetings?.length > 0) {
            summaries.push(`- ${data.meetings.length} Meetings`);
            data.meetings.slice(0, 3).forEach((meeting: any) => {
              summaries.push(`  • ${meeting.subject} (${meeting.duration}min)`);
            });
          }
          if (data.emails?.length > 0) {
            summaries.push(`- ${data.emails.length} Important Emails`);
          }
          break;

        default:
          summaries.push(`- Raw data: ${JSON.stringify(data).substring(0, 200)}...`);
      }
    });

    return summaries.join('\n');
  }

  private getFallbackAnalysis(activities: Map<MCPToolType, any>): AnalysisResult {
    // Basic fallback analysis without AI
    const analyzedActivities: AnalyzedActivity[] = [];
    const skills = new Set<string>();
    let totalTime = 0;

    activities.forEach((data, tool) => {
      // Create basic activities from raw data
      if (data.pullRequests) {
        data.pullRequests.forEach((pr: any) => {
          analyzedActivities.push({
            id: `${tool}-pr-${pr.id}`,
            source: tool,
            type: 'code_change',
            title: pr.title,
            description: pr.body || '',
            timestamp: new Date(pr.created_at),
            technicalComplexity: 3,
            businessImpact: 'medium',
            skills: ['GitHub', 'Code Review'],
            timeInvestment: 60,
            category: 'achievement',
            importance: pr.merged ? 'high' : 'medium'
          });
          skills.add('GitHub');
          skills.add('Code Review');
          totalTime += 60;
        });
      }
    });

    return {
      activities: analyzedActivities,
      summary: `Analyzed ${activities.size} sources with ${analyzedActivities.length} activities`,
      extractedSkills: Array.from(skills),
      suggestedFocus: 'Development work',
      totalTimeInvestment: totalTime
    };
  }
}

export default AnalyzerAgent;