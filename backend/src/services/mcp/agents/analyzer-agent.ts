import { ModelSelectorService } from '../../ai/model-selector.service';
import {
  MCPToolType,
  SharePointActivity,
  OneDriveActivity,
  OneNoteActivity
} from '../../../types/mcp.types';
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
    // Normalize to Map if plain object was passed
    if (!(activities instanceof Map)) {
      activities = new Map(Object.entries(activities as any));
    }
    console.log('🔍 Quick analyzing activities from', activities.size, 'sources');

    // Check if there are any real activities
    const hasActivities = this.hasRealActivities(activities);
    if (!hasActivities) {
      console.log('⚠️ No real activities found - returning empty analysis');
      return {
        activities: [],
        summary: 'No activities found for the selected date range.',
        extractedSkills: [],
        suggestedFocus: '',
        totalTimeInvestment: 0
      };
    }

    const prompt = this.buildQuickAnalysisPrompt(activities);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert at analyzing professional work activities. Categorize and extract insights quickly and accurately. Always return valid JSON. IMPORTANT: Only analyze the actual activities provided. DO NOT generate fake or example activities.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.modelSelector.executeTask('analyze', messages, 'quick');

    try {
      const parsed = JSON.parse(result.content);
      // Convert timestamp strings to Date objects
      if (parsed.activities && Array.isArray(parsed.activities)) {
        parsed.activities = parsed.activities.map((act: any) => ({
          ...act,
          timestamp: act.timestamp ? new Date(act.timestamp) : new Date()
        }));
      }
      return parsed;
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
    // Normalize to Map if plain object was passed
    if (!(activities instanceof Map)) {
      activities = new Map(Object.entries(activities as any));
    }
    console.log('🔬 Deep analyzing activities from', activities.size, 'sources');

    // Check if there are any real activities
    const hasActivities = this.hasRealActivities(activities);
    if (!hasActivities) {
      console.log('⚠️ No real activities found - returning empty analysis');
      return {
        activities: [],
        summary: 'No activities found for the selected date range.',
        extractedSkills: [],
        suggestedFocus: '',
        totalTimeInvestment: 0
      };
    }

    const prompt = this.buildDeepAnalysisPrompt(activities);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert at deeply analyzing professional work activities. Extract nuanced insights, patterns, and professional growth indicators. Consider technical complexity, business impact, and skill development. Always return valid JSON. IMPORTANT: Only analyze the actual activities provided. DO NOT generate fake or example activities.'
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
      const parsed = JSON.parse(cleanedContent);
      // Convert timestamp strings to Date objects
      if (parsed.activities && Array.isArray(parsed.activities)) {
        parsed.activities = parsed.activities.map((act: any) => ({
          ...act,
          timestamp: act.timestamp ? new Date(act.timestamp) : new Date()
        }));
      }
      return parsed;
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

  /**
   * Check if there are any real activities in the data
   * Returns false if all sources have empty arrays
   */
  private hasRealActivities(activities: Map<MCPToolType, any>): boolean {
    let totalItems = 0;

    activities.forEach((data, tool) => {
      // Count items based on tool type
      if (data) {
        // Common array fields to check
        const arrayFields = [
          'pullRequests', 'commits', 'issues', 'repositories',
          'files', 'comments', 'versions',
          'meetings', 'emails', 'messages', 'threads', 'channels', 'calls',
          'pages', 'blogPosts', 'spaces',
          'docs', 'sheets', 'slides', 'driveFiles', 'meetRecordings',
          'recentFiles', 'sharedFiles', 'notebooks', 'sections'
        ];

        arrayFields.forEach(field => {
          if (Array.isArray(data[field])) {
            totalItems += data[field].length;
          }
        });

        // Check numeric fields
        const numericFields = ['recentFiles', 'sharedFiles', 'notebooks', 'pagesCreated', 'pagesUpdated'];
        numericFields.forEach(field => {
          if (typeof data[field] === 'number' && data[field] > 0) {
            totalItems += data[field];
          }
        });
      }
    });

    console.log(`[AnalyzerAgent] Total items found across all sources: ${totalItems}`);
    return totalItems > 0;
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

**CRITICAL INSTRUCTION: Only analyze activities that are actually listed above. DO NOT create, invent, or generate fake/example activities. If no activities are provided, return an empty activities array.**

**Return JSON with this EXACT structure:**
{
  "activities": [
    {
      "id": "unique-id",
      "source": "github|jira|figma|outlook|confluence|slack|teams|sharepoint|onedrive|onenote",
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

**CRITICAL INSTRUCTION: Only analyze activities that are actually listed above. DO NOT create, invent, or generate fake/example activities. If no activities are provided, return an empty activities array.**

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

        case MCPToolType.SHAREPOINT:
          if (data.recentFiles?.length > 0) {
            summaries.push(`- ${data.recentFiles.length} Recent Files`);
            data.recentFiles.slice(0, 3).forEach((file: any) => {
              summaries.push(`  • ${file.name} (${file.fileType}) - Modified: ${new Date(file.lastModifiedDateTime).toLocaleDateString()}`);
            });
          }
          if (data.sites?.length > 0) {
            summaries.push(`- ${data.sites.length} SharePoint Sites Accessed`);
          }
          if (data.lists?.length > 0) {
            summaries.push(`- ${data.lists.length} Lists`);
          }
          break;

        case MCPToolType.ONEDRIVE:
          if (data.recentFiles?.length > 0) {
            summaries.push(`- ${data.recentFiles.length} Recent Files`);
            data.recentFiles.slice(0, 3).forEach((file: any) => {
              summaries.push(`  • ${file.name} (${file.fileType}) - Modified: ${new Date(file.lastModifiedDateTime).toLocaleDateString()}`);
            });
          }
          if (data.sharedFiles?.length > 0) {
            summaries.push(`- ${data.sharedFiles.length} Shared Files`);
            data.sharedFiles.slice(0, 3).forEach((file: any) => {
              summaries.push(`  • ${file.name} shared with ${file.sharedWith.length} people`);
            });
          }
          break;

        case MCPToolType.ONENOTE:
          if (data.pages?.length > 0) {
            summaries.push(`- ${data.pages.length} OneNote Pages`);
            data.pages.slice(0, 3).forEach((page: any) => {
              summaries.push(`  • ${page.title} in ${page.notebookName}/${page.sectionName}`);
            });
          }
          if (data.notebooks?.length > 0) {
            summaries.push(`- ${data.notebooks.length} Notebooks`);
          }
          if (data.sections?.length > 0) {
            summaries.push(`- ${data.sections.length} Sections`);
          }
          break;

        case MCPToolType.GOOGLE_WORKSPACE:
          if (data.docs?.length > 0) {
            summaries.push(`- ${data.docs.length} Google Docs`);
            data.docs.slice(0, 3).forEach((doc: any) => {
              summaries.push(`  • ${doc.title} (Modified: ${new Date(doc.modifiedTime).toLocaleDateString()})`);
            });
          }
          if (data.sheets?.length > 0) {
            summaries.push(`- ${data.sheets.length} Google Sheets`);
            data.sheets.slice(0, 3).forEach((sheet: any) => {
              summaries.push(`  • ${sheet.title} (Modified: ${new Date(sheet.modifiedTime).toLocaleDateString()})`);
            });
          }
          if (data.slides?.length > 0) {
            summaries.push(`- ${data.slides.length} Google Slides`);
            data.slides.slice(0, 3).forEach((slide: any) => {
              summaries.push(`  • ${slide.title} (Modified: ${new Date(slide.modifiedTime).toLocaleDateString()})`);
            });
          }
          if (data.driveFiles?.length > 0) {
            const otherFiles = data.driveFiles.filter((f: any) =>
              f.mimeType !== 'application/vnd.google-apps.document' &&
              f.mimeType !== 'application/vnd.google-apps.spreadsheet' &&
              f.mimeType !== 'application/vnd.google-apps.presentation'
            );
            if (otherFiles.length > 0) {
              summaries.push(`- ${otherFiles.length} Other Drive Files`);
            }
          }
          if (data.meetRecordings?.length > 0) {
            summaries.push(`- ${data.meetRecordings.length} Google Meet Recordings`);
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