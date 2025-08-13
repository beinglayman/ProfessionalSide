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
    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI credentials not configured');
    }

    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
      defaultHeaders: {
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
    });
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
      throw new Error('Failed to generate AI entries');
    }
  }

  private async generateWorkspaceEntry(entryData: EntryData): Promise<string> {
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
Results/Outcomes: ${entryData.result}
Focus Area: ${entryData.primaryFocusArea}
Work Category: ${entryData.workCategory}
Work Types: ${entryData.workTypes.join(', ')}
Skills Applied: ${entryData.skillsApplied.join(', ')}
Artifacts: ${entryData.artifacts.map(a => a.name).join(', ')}
Collaborators: ${entryData.collaborators.length} team members
Tags: ${entryData.tags.join(', ')}

Write a comprehensive workspace journal entry that captures the professional nature of this work:`;

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
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Failed to generate workspace entry';
  }

  private async generateNetworkEntry(entryData: EntryData): Promise<string> {
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
Results/Outcomes: ${entryData.result}
Focus Area: ${entryData.primaryFocusArea}
Work Category: ${entryData.workCategory}
Work Types: ${entryData.workTypes.join(', ')}
Skills Applied: ${entryData.skillsApplied.join(', ')}
Tags: ${entryData.tags.join(', ')}

Write a network-appropriate journal entry that showcases professional development without revealing sensitive information:`;

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
      max_tokens: 400,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Failed to generate network entry';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message.'
          }
        ],
        max_tokens: 10,
      });

      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('❌ Azure OpenAI connection test failed:', error);
      return false;
    }
  }
}