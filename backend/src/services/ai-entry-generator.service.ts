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

interface GeneratedEntry {
  workspaceEntry: string;
  networkEntry: string;
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
    const baseURL = `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`;
    console.log('🔗 Azure OpenAI Base URL:', baseURL);

    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: baseURL,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-10-21' },
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

  private async generateWorkspaceEntry(entryData: EntryData): Promise<string> {
    console.log('🏢 Generating workspace entry...');
    
    const workspacePrompt = `
You are a professional journal entry writer. Create a polished, detailed workspace journal entry based on the following work data.

REQUIREMENTS:
- Write in a professional, accomplishment-focused tone
- Include specific details, metrics, and technical information
- Mention artifacts, tools, and collaborative aspects
- Focus on skills developed and professional growth
- Include project impact and outcomes
- Use present tense for ongoing work, past tense for completed work
- Structure with clear paragraphs
- Length: 150-300 words

WORK DATA:
Title: ${entryData.title}
Description: ${entryData.description}
Results/Outcomes: ${entryData.result || 'N/A'}
Focus Area: ${entryData.primaryFocusArea}
Work Category: ${entryData.workCategory}
Work Types: ${entryData.workTypes.join(', ')}
Skills Applied: ${entryData.skillsApplied.join(', ')}
Artifacts: ${entryData.artifacts.map(a => a.name || 'Unnamed artifact').join(', ') || 'None'}
Collaborators: ${entryData.collaborators.length} team members
Tags: ${entryData.tags.join(', ') || 'None'}

Write a comprehensive workspace journal entry that captures the professional nature of this work:`;

    try {
      console.log('📝 Making API call to Azure OpenAI...');
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional technical writer who creates polished journal entries for workplace documentation. Focus on achievements, skills, and professional growth.'
          },
          {
            role: 'user',
            content: workspacePrompt
          }
        ],
        max_completion_tokens: 500,
      });

      console.log('✅ Workspace entry generated successfully');
      return response.choices[0]?.message?.content || 'Failed to generate workspace entry content';
    } catch (error) {
      console.error('❌ Azure OpenAI API error (workspace):', error);
      throw error;
    }
  }

  private async generateNetworkEntry(entryData: EntryData): Promise<string> {
    console.log('🌐 Generating network entry...');
    
    const networkPrompt = `
You are a professional journal entry writer. Create a polished, public-friendly journal entry based on the following work data.

REQUIREMENTS:
- Remove all sensitive information (client names, specific metrics, confidential data)
- Focus on skills, professional growth, and general achievements
- Generalize project impacts without specific details
- Maintain professional tone but make it network-appropriate
- Emphasize learning and skill development
- Use general terms for outcomes (e.g., "improved efficiency" instead of "reduced costs by 25%")
- Length: 100-200 words

WORK DATA:
Title: ${entryData.title}
Description: ${entryData.description} 
Results/Outcomes: ${entryData.result || 'N/A'}
Focus Area: ${entryData.primaryFocusArea}
Work Category: ${entryData.workCategory}
Work Types: ${entryData.workTypes.join(', ')}
Skills Applied: ${entryData.skillsApplied.join(', ')}
Tags: ${entryData.tags.join(', ') || 'None'}

Write a network-appropriate journal entry that showcases professional development without revealing sensitive information:`;

    try {
      console.log('📝 Making API call to Azure OpenAI...');
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional writer who creates public-friendly journal entries for professional networks. Focus on skills, growth, and general achievements while protecting confidential information.'
          },
          {
            role: 'user',
            content: networkPrompt
          }
        ],
        max_completion_tokens: 400,
      });

      console.log('✅ Network entry generated successfully');
      return response.choices[0]?.message?.content || 'Failed to generate network entry content';
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