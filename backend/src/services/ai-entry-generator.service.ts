import { OpenAI } from 'openai';

interface EntryData {
  title: string;
  description: string;
  result: string;
  primaryFocusArea: string;
  workCategory: string;
  workTypes: string[];
  skillsApplied: string[];
  artifacts: any[];
  collaborators: string[];
  reviewers: string[];
  tags: string[];
  workspaceId: string;
  projects: string[];
  departments: string[];
}

interface GeneratedEntryContent {
  title: string;
  description: string;
  outcomes: Array<{
    category: 'performance' | 'technical' | 'user-experience' | 'business';
    title: string;
    description: string;
  }>;
}

interface GeneratedEntry {
  workspaceEntry: GeneratedEntryContent;
  networkEntry: GeneratedEntryContent;
}

export class AIEntryGeneratorService {
  private openai: OpenAI;

  constructor() {
    console.log('🤖 Initializing AI Entry Generator Service...');
    console.log('🔍 Environment check:', {
      endpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: !!process.env.AZURE_OPENAI_API_KEY,
      deploymentName: !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION
    });

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

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
    
    // Try both endpoint formats for Global Standard deployments
    const baseURL = `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`;
    console.log('🔗 Azure OpenAI Base URL:', baseURL);
    console.log('🔗 Environment details:', {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION
    });

    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: baseURL,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-07-18' },
      defaultHeaders: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
    });

    console.log('✅ AI Entry Generator Service initialized successfully');
  }

  async generateEntries(entryData: EntryData): Promise<GeneratedEntry> {
    try {
      console.log('🤖 Generating AI entries for:', entryData.title);

      // Generate workspace entry (detailed)
      const workspaceEntry = await this.generateWorkspaceEntry(entryData);
      
      // Generate network entry (sanitized)
      const networkEntry = await this.generateNetworkEntry(entryData);

      return {
        workspaceEntry,
        networkEntry
      };
    } catch (error) {
      console.error('❌ Error generating AI entries:', error);
      console.error('❌ Original error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        status: error.status,
        type: error.type
      });
      throw error; // Preserve original error instead of generic message
    }
  }

  private async generateWorkspaceEntry(entryData: EntryData): Promise<GeneratedEntryContent> {
    console.log('🏢 Generating workspace entry...');
    
    const workspacePrompt = `
You are a professional journal entry writer. Create a detailed workspace journal entry based on the following work data.

WORKSPACE ENTRY RULES:
- Include specific details, metrics, and technical information (exact numbers, percentages, client names allowed)
- Mention specific tools, technologies, and methodologies used
- Include organizational intellectual property and confidential details as appropriate
- Reference specific client identifiers and project codenames
- Focus on detailed technical achievements and business impact
- Use present tense for ongoing work, past tense for completed work

OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{
  "title": "Professional title for the journal entry",
  "description": "Detailed description of the work (200-300 words)",
  "outcomes": [
    {
      "category": "performance|technical|user-experience|business",
      "title": "Outcome title",
      "description": "Detailed outcome description"
    }
  ]
}

WORK DATA:
Primary Focus Area: ${entryData.primaryFocusArea}
Work Category: ${entryData.workCategory}
Work Types: ${entryData.workTypes.join(', ')}
Skills Applied: ${entryData.skillsApplied.join(', ')}
User Title Input: ${entryData.title}
User Description Input: ${entryData.description}
User Results Input: ${entryData.result || 'Not specified'}
Artifacts: ${entryData.artifacts.map(a => a.name || 'Unnamed artifact').join(', ') || 'None'}
Collaborators: ${entryData.collaborators.length} team members
Reviewers: ${entryData.reviewers.length} reviewers
Projects: ${entryData.projects.join(', ') || 'None'}
Departments: ${entryData.departments.join(', ') || 'None'}
Tags: ${entryData.tags.join(', ') || 'None'}

Create a comprehensive workspace journal entry in JSON format:`;

    try {
      console.log('📝 Making API call to Azure OpenAI...');
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional technical writer who creates detailed workplace journal entries. Always return valid JSON with the requested structure. Include specific metrics, client details, and technical information for workspace entries.'
          },
          {
            role: 'user',
            content: workspacePrompt
          }
        ],
        max_completion_tokens: 800,
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('✅ Workspace entry generated successfully');
      
      try {
        return JSON.parse(content) as GeneratedEntryContent;
      } catch (parseError) {
        console.error('❌ Failed to parse workspace entry JSON:', parseError);
        console.error('❌ Raw content that failed to parse:', content.substring(0, 200) + '...');
        
        // Fallback to structured format using original inputs instead of raw AI content
        return {
          title: entryData.title || 'Professional Work Entry',
          description: entryData.description || 'Detailed workspace entry showcasing professional work and achievements.',
          outcomes: entryData.result ? [{
            category: 'performance' as const,
            title: 'Results & Outcomes',
            description: entryData.result
          }] : []
        };
      }
    } catch (error) {
      console.error('❌ Azure OpenAI API error (workspace):', error);
      throw error;
    }
  }

  private async generateNetworkEntry(entryData: EntryData): Promise<GeneratedEntryContent> {
    console.log('🌐 Generating network entry...');
    
    const networkPrompt = `
You are a professional journal entry writer. Create a polished, public-friendly journal entry based on the following work data.

NETWORK ENTRY RULES:
- NO specific numerical data or metrics (use general terms like "significantly improved", "enhanced performance")
- NO client identifiers or specific company names (use "enterprise client", "key stakeholder")  
- NO confidential documents or organizational intellectual property details
- KEEP intact: Skills developed, Work domains, Professional achievements, Generalized project impacts
- Focus on skills, professional growth, and general achievements
- Maintain professional tone but make it network-appropriate
- Emphasize learning and skill development

OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{
  "title": "Professional title for the journal entry (network-appropriate)",
  "description": "Network-friendly description of the work (150-250 words, no sensitive details)",
  "outcomes": [
    {
      "category": "performance|technical|user-experience|business",
      "title": "Outcome title (no specific metrics)",
      "description": "General outcome description (no confidential info)"
    }
  ]
}

WORK DATA:
Primary Focus Area: ${entryData.primaryFocusArea}
Work Category: ${entryData.workCategory}
Work Types: ${entryData.workTypes.join(', ')}
Skills Applied: ${entryData.skillsApplied.join(', ')}
User Title Input: ${entryData.title}
User Description Input: ${entryData.description}
User Results Input: ${entryData.result || 'Not specified'}
Artifacts: ${entryData.artifacts.map(a => a.name || 'Unnamed artifact').join(', ') || 'None'}
Collaborators: ${entryData.collaborators.length} team members
Reviewers: ${entryData.reviewers.length} reviewers
Projects: ${entryData.projects.join(', ') || 'None'}
Departments: ${entryData.departments.join(', ') || 'None'}
Tags: ${entryData.tags.join(', ') || 'None'}

Create a comprehensive network journal entry in JSON format that sanitizes all sensitive information:`;

    try {
      console.log('📝 Making API call to Azure OpenAI...');
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional writer who creates public-friendly journal entries for professional networks. Focus on skills, growth, and general achievements while protecting confidential information. Always return valid JSON with the requested structure.'
          },
          {
            role: 'user',
            content: networkPrompt
          }
        ],
        max_completion_tokens: 600,
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('✅ Network entry generated successfully');
      
      try {
        return JSON.parse(content) as GeneratedEntryContent;
      } catch (parseError) {
        console.error('❌ Failed to parse network entry JSON:', parseError);
        console.error('❌ Raw content that failed to parse:', content.substring(0, 200) + '...');
        
        // Fallback to structured format with sanitized content from original inputs
        const sanitizedTitle = entryData.title ? 
          entryData.title.replace(/\b\d+(\.\d+)?%?\b/g, 'significant').replace(/client|company|corp\b/gi, 'enterprise client') : 
          'Professional Development Entry';
          
        const sanitizedDescription = entryData.description ? 
          entryData.description.replace(/\b\d+(\.\d+)?%?\b/g, 'notable improvement').replace(/client|company|corp\b/gi, 'stakeholder') :
          'Professional development work showcasing skills and achievements in a network-appropriate format.';
        
        return {
          title: sanitizedTitle,
          description: sanitizedDescription,
          outcomes: entryData.result ? [{
            category: 'performance' as const,
            title: 'Professional Achievement',
            description: entryData.result.replace(/\b\d+(\.\d+)?%?\b/g, 'notable improvement').replace(/client|company|corp\b/gi, 'stakeholder')
          }] : []
        };
      }
    } catch (error) {
      console.error('❌ Azure OpenAI API error (network):', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Azure OpenAI connection...');
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message.'
          }
        ],
        max_completion_tokens: 10,
      });

      const success = !!response.choices[0]?.message?.content;
      console.log(success ? '✅ Azure OpenAI connection successful' : '❌ No response content from Azure OpenAI');
      return success;
    } catch (error) {
      console.error('❌ Azure OpenAI connection test failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        type: error.type
      });
      return false;
    }
  }
}