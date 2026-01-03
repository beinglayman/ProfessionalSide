import { AzureOpenAI } from 'openai';

/**
 * ContentSanitizerService
 *
 * Responsible for generating network-safe versions of journal entries by:
 * 1. Stripping project/client names
 * 2. Removing repository URLs and ticket IDs
 * 3. Anonymizing channel names
 * 4. Generalizing specific metrics
 * 5. Preserving the professional achievement story
 */

interface SanitizationInput {
  title: string;
  description: string;
  fullContent: string;
  format7Data: any; // Format7 structure with activities, correlations, etc.
}

interface SanitizationLog {
  itemsStripped: number;
  categories: {
    projectNames: string[];
    clientNames: string[];
    repositoryUrls: string[];
    ticketIds: string[];
    channelNames: string[];
    specificMetrics: string[];
    colleagueNames: string[];
  };
  timestamp: string;
}

interface SanitizationResult {
  networkTitle: string;
  networkContent: string;
  format7DataNetwork: any;
  sanitizationLog: SanitizationLog;
}

export class ContentSanitizerService {
  private openai: AzureOpenAI;

  constructor() {
    console.log('🔒 Initializing Content Sanitizer Service...');

    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
      const error = 'Azure OpenAI credentials not configured';
      console.error('❌', error);
      throw new Error(error);
    }

    if (!process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      const error = 'Azure OpenAI deployment name not configured';
      console.error('❌', error);
      throw new Error(error);
    }

    this.openai = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-07-18',
    });

    console.log('✅ Content Sanitizer Service initialized successfully');
  }

  async sanitizeForNetwork(input: SanitizationInput): Promise<SanitizationResult> {
    console.log('🔒 Sanitizing content for network view:', input.title);

    try {
      // Step 1: Sanitize title and description
      const sanitizedText = await this.sanitizeTextContent(
        input.title,
        input.description,
        input.fullContent
      );

      // Step 2: Sanitize Format7 data structure
      let sanitizedFormat7 = null;
      try {
        sanitizedFormat7 = await this.sanitizeFormat7Data(input.format7Data);
      } catch (format7Error: any) {
        console.error('❌ Format7 sanitization failed:', format7Error.message);
        // Continue with null - the text sanitization still worked
        // The error details are already logged in sanitizeFormat7Data
      }

      // Step 3: Build sanitization log
      const sanitizationLog = this.buildSanitizationLog(
        input,
        sanitizedText,
        sanitizedFormat7
      );

      return {
        networkTitle: sanitizedText.title,
        networkContent: sanitizedText.content,
        format7DataNetwork: sanitizedFormat7,
        sanitizationLog
      };
    } catch (error) {
      console.error('❌ Error sanitizing content:', error);
      throw error;
    }
  }

  private async sanitizeTextContent(
    title: string,
    description: string,
    fullContent: string
  ): Promise<{ title: string; content: string; strippedItems: string[] }> {
    console.log('📝 Sanitizing text content...');

    const prompt = `
You are a professional content sanitizer. Your job is to create a network-safe version of professional work entries by removing confidential information while preserving the professional achievement story.

SANITIZATION RULES:
1. **Project names** → Replace with "a project" or "an initiative"
2. **Client/company names** → Replace with "a client" or "an enterprise client" or "a Fortune 500 company"
3. **Repository URLs** (github.com/*, gitlab.com/*) → Remove entirely
4. **Ticket IDs** (JIRA-123, PROJ-456, #1234) → Remove
5. **Internal channel names** (#team-xyz, @channel) → Replace with "team channel"
6. **Specific metrics** (increased by 47%, $1.2M revenue) → Use ranges ("improved significantly", "notable revenue impact")
7. **Internal tool names** → Replace with generic terms ("internal dashboard", "team tools")
8. **Colleague names** → Replace with "team member" or "the team"

PRESERVE:
- Technical skills demonstrated
- Problem-solving approach
- Impact and outcomes (generalized)
- Technologies used (public frameworks/languages like React, Python, AWS)
- Professional tone and first-person voice

INPUT:
Title: ${title}
Description: ${description}
Full Content: ${fullContent}

OUTPUT FORMAT: Return a valid JSON object:
{
  "title": "Sanitized title (keep engaging but remove any confidential refs)",
  "content": "Sanitized full content in first person (preserve the story, remove sensitive details)",
  "strippedItems": ["list", "of", "items", "that", "were", "sanitized"]
}

Create the sanitized version:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional content sanitizer that removes confidential information while preserving the professional achievement story. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent sanitization
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('✅ Text content sanitized successfully');

      try {
        // Try to parse JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON found in response');
      } catch (parseError) {
        console.error('❌ Failed to parse sanitization JSON, using fallback');
        return this.fallbackTextSanitization(title, description, fullContent);
      }
    } catch (error) {
      console.error('❌ Azure OpenAI API error (text sanitization):', error);
      return this.fallbackTextSanitization(title, description, fullContent);
    }
  }

  private async sanitizeFormat7Data(format7Data: any): Promise<any> {
    console.log('📊 Sanitizing Format7 data structure...');
    console.log('📊 format7Data type:', typeof format7Data);
    console.log('📊 format7Data keys:', format7Data ? Object.keys(format7Data) : 'null/undefined');

    if (!format7Data) {
      console.error('❌ format7Data is falsy:', format7Data);
      throw new Error('Format7 data is required for sanitization');
    }

    try {
      // Deep clone to avoid mutating original - with explicit error handling
      let sanitized;
      try {
        sanitized = JSON.parse(JSON.stringify(format7Data));
      } catch (serializeError: any) {
        console.error('❌ Failed to serialize format7Data:', serializeError);
        console.error('❌ format7Data structure:', Object.keys(format7Data));
        throw new Error(`Failed to serialize format7Data: ${serializeError.message}`);
      }

      // Sanitize activities
      if (sanitized.activities && Array.isArray(sanitized.activities)) {
        sanitized.activities = sanitized.activities.map((activity: any) =>
          this.sanitizeActivity(activity)
        );
      }

      // Sanitize activity groups
      if (sanitized.activityGroups && Array.isArray(sanitized.activityGroups)) {
        sanitized.activityGroups = sanitized.activityGroups.map((group: any) => ({
          ...group,
          activities: group.activities?.map((activity: any) =>
            this.sanitizeActivity(activity)
          ) || []
        }));
      }

      // Sanitize correlations
      if (sanitized.correlations && Array.isArray(sanitized.correlations)) {
        sanitized.correlations = sanitized.correlations.map((correlation: any) => ({
          ...correlation,
          summary: this.sanitizeString(correlation.summary || ''),
          insights: correlation.insights?.map((insight: string) =>
            this.sanitizeString(insight)
          ) || []
        }));
      }

      // Sanitize insights
      if (sanitized.insights && Array.isArray(sanitized.insights)) {
        sanitized.insights = sanitized.insights.map((insight: string) =>
          this.sanitizeString(insight)
        );
      }

      // Sanitize summary
      if (sanitized.summary) {
        sanitized.summary = this.sanitizeString(sanitized.summary);
      }

      // Sanitize technical skills (keep them - they're public knowledge)
      // But remove any tool-specific internal references

      console.log('✅ Format7 data sanitized successfully');
      return sanitized;
    } catch (error) {
      console.error('❌ Error sanitizing Format7 data:', error);
      throw error; // Propagate error instead of returning null
    }
  }

  private sanitizeActivity(activity: any): any {
    return {
      ...activity,
      // Sanitize title
      title: this.sanitizeString(activity.title || ''),
      // Sanitize description/summary
      summary: this.sanitizeString(activity.summary || ''),
      description: this.sanitizeString(activity.description || ''),
      // Remove or sanitize URLs
      url: this.isPublicUrl(activity.url) ? activity.url : null,
      // Sanitize repository info
      repository: activity.repository ? 'a repository' : null,
      repositoryName: activity.repositoryName ? 'a project repository' : null,
      // Sanitize branch names (might contain project names)
      branch: activity.branch ? 'a feature branch' : null,
      // Remove PR/issue numbers
      prNumber: null,
      issueNumber: null,
      // Sanitize channel names
      channel: activity.channel ? 'team channel' : null,
      channelName: activity.channelName ? 'team channel' : null,
      // Sanitize project references
      project: activity.project ? 'a project' : null,
      projectKey: null,
      // Keep tool type and timestamp
      tool: activity.tool,
      toolType: activity.toolType,
      timestamp: activity.timestamp,
      // Keep skills (public knowledge)
      skills: activity.skills,
      techTags: activity.techTags,
      // Sanitize evidence
      evidence: activity.evidence?.map((e: any) => ({
        ...e,
        content: this.sanitizeString(e.content || ''),
        url: this.isPublicUrl(e.url) ? e.url : null
      })) || []
    };
  }

  private sanitizeString(text: string): string {
    if (!text) return text;

    let sanitized = text;

    // Remove URLs (except public documentation sites)
    sanitized = sanitized.replace(
      /https?:\/\/(?!docs\.|documentation\.|developer\.)[^\s]+/gi,
      '[link removed]'
    );

    // Remove ticket IDs (JIRA-123, PROJ-456, #1234, etc.)
    sanitized = sanitized.replace(
      /\b[A-Z]{2,10}-\d+\b/g,
      ''
    );
    sanitized = sanitized.replace(
      /#\d{4,}/g,
      ''
    );

    // Generalize specific percentages and metrics
    sanitized = sanitized.replace(
      /\b(\d+(\.\d+)?)\s*%/g,
      'a significant percentage'
    );
    sanitized = sanitized.replace(
      /\$\s*[\d,]+(\.\d{2})?\s*(M|K|million|thousand)?/gi,
      'notable financial impact'
    );

    // Remove @mentions
    sanitized = sanitized.replace(
      /@[\w-]+/g,
      'a team member'
    );

    // Clean up multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  private isPublicUrl(url: string | null | undefined): boolean {
    if (!url) return false;

    // List of public documentation/resource URLs to keep
    const publicDomains = [
      'docs.google.com',
      'developer.mozilla.org',
      'stackoverflow.com',
      'medium.com',
      'dev.to',
      'npmjs.com',
      'pypi.org',
      'crates.io'
    ];

    try {
      const urlObj = new URL(url);
      return publicDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  private fallbackTextSanitization(
    title: string,
    description: string,
    fullContent: string
  ): { title: string; content: string; strippedItems: string[] } {
    console.log('⚠️ Using fallback sanitization...');

    const strippedItems: string[] = [];

    const sanitize = (text: string): string => {
      let result = text;

      // Remove URLs
      const urlMatches = result.match(/https?:\/\/[^\s]+/g) || [];
      urlMatches.forEach(url => strippedItems.push(`URL: ${url.substring(0, 30)}...`));
      result = result.replace(/https?:\/\/[^\s]+/g, '[link]');

      // Remove ticket IDs
      const ticketMatches = result.match(/\b[A-Z]{2,10}-\d+\b/g) || [];
      ticketMatches.forEach(id => strippedItems.push(`Ticket: ${id}`));
      result = result.replace(/\b[A-Z]{2,10}-\d+\b/g, '');

      // Generalize percentages
      result = result.replace(/\b\d+(\.\d+)?%/g, 'a significant improvement');

      // Generalize dollar amounts
      result = result.replace(/\$[\d,]+(\.\d{2})?/g, 'notable financial impact');

      return result.replace(/\s+/g, ' ').trim();
    };

    return {
      title: sanitize(title),
      content: sanitize(fullContent || description),
      strippedItems
    };
  }

  private buildSanitizationLog(
    input: SanitizationInput,
    sanitizedText: { title: string; content: string; strippedItems: string[] },
    sanitizedFormat7: any
  ): SanitizationLog {
    // Analyze what was stripped
    const projectNames: string[] = [];
    const clientNames: string[] = [];
    const repositoryUrls: string[] = [];
    const ticketIds: string[] = [];
    const channelNames: string[] = [];
    const specificMetrics: string[] = [];
    const colleagueNames: string[] = [];

    // Extract from strippedItems
    sanitizedText.strippedItems.forEach(item => {
      if (item.startsWith('URL:')) repositoryUrls.push(item);
      else if (item.startsWith('Ticket:')) ticketIds.push(item);
      else if (item.includes('%') || item.includes('$')) specificMetrics.push(item);
    });

    return {
      itemsStripped: sanitizedText.strippedItems.length,
      categories: {
        projectNames,
        clientNames,
        repositoryUrls,
        ticketIds,
        channelNames,
        specificMetrics,
        colleagueNames
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
let sanitizerInstance: ContentSanitizerService | null = null;

export function getContentSanitizerService(): ContentSanitizerService {
  if (!sanitizerInstance) {
    sanitizerInstance = new ContentSanitizerService();
  }
  return sanitizerInstance;
}
