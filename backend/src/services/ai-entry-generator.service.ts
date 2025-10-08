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
        message: (error as any).message,
        stack: (error as any).stack,
        name: (error as any).name,
        status: (error as any).status,
        type: (error as any).type
      });
      throw error; // Preserve original error instead of generic message
    }
  }

  private async generateWorkspaceEntry(entryData: EntryData): Promise<GeneratedEntryContent> {
    console.log('🏢 Generating workspace entry...');
    
    const workspacePrompt = `
You are an experienced professional writing a personal journal entry about your work. Write in first person with a conversational yet professional tone - the way a skilled professional would describe their work to a trusted colleague.

WORKSPACE ENTRY RULES:
- Write naturally, as if speaking to a colleague who understands your field
- Include specific details, metrics, and technical information (exact numbers, percentages, client names allowed)
- Use "I" statements and personal voice (e.g., "I implemented", "We discovered", "The team and I")
- Balance technical accuracy with human insight and reflection
- Include organizational intellectual property and confidential details as appropriate
- Reference specific client identifiers and project codenames
- Focus on both technical achievements and personal learning/growth
- Use present tense for ongoing work, past tense for completed work
- Sound competent but approachable, not overly formal or robotic

TONE EXAMPLES:
- Instead of: "Implementation of the optimization algorithm resulted in performance improvements"
- Write: "I implemented a new optimization algorithm that really improved our performance"
- Instead of: "Collaborative efforts with cross-functional teams"  
- Write: "Working closely with the design and product teams"

OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{
  "title": "Professional title for the journal entry (natural, not overly formal)",
  "description": "Detailed description of the work in first person (200-300 words, conversational but professional)",
  "outcomes": [
    {
      "category": "performance|technical|user-experience|business",
      "title": "Outcome title (natural language)",
      "description": "Detailed outcome description (personal voice, specific but conversational)"
    }
  ]
}

CATEGORY GUIDELINES:
- "performance": Speed improvements, efficiency gains, performance optimization, response times
- "business": Cost savings, revenue increases, business growth, ROI, profit improvements  
- "user-experience": UI/UX improvements, user satisfaction, usability enhancements, accessibility
- "technical": Code quality, architecture, infrastructure, technical debt, system reliability

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
            content: 'You are an experienced professional writing your own work journal. Write in first person with a natural, conversational tone while maintaining technical accuracy. Be human and relatable, not robotic or overly formal. Always return valid JSON with the requested structure.'
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
You are a professional sharing your work experience on a professional network. Write in first person with an engaging, authentic tone - the way you'd describe your work when networking or in a professional LinkedIn post.

NETWORK ENTRY RULES:
- Write personally and authentically, but professionally appropriate for public sharing
- NO specific numerical data or metrics (use general terms like "significantly improved", "enhanced performance")
- NO client identifiers or specific company names (use "enterprise client", "key stakeholder")  
- NO confidential documents or organizational intellectual property details
- KEEP intact: Skills developed, Work domains, Professional achievements, Generalized project impacts
- Focus on personal growth, skills development, and lessons learned
- Use "I" statements and show personality while staying professional
- Sound approachable and human, not corporate or overly polished
- Emphasize learning journey and professional development

TONE EXAMPLES:
- Instead of: "Successful implementation of optimization strategies resulted in enhanced system performance"
- Write: "I worked on optimizing our system performance and learned so much about scalable architecture in the process"
- Instead of: "Facilitated cross-functional collaboration to achieve project objectives"
- Write: "Collaborating with different teams taught me new perspectives on problem-solving"

OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{
  "title": "Professional title for the journal entry (engaging, network-appropriate)",
  "description": "Network-friendly description in first person (150-250 words, authentic but no sensitive details)",
  "outcomes": [
    {
      "category": "performance|technical|user-experience|business", 
      "title": "Outcome title (natural language, no specific metrics)",
      "description": "General outcome description (personal voice, no confidential info)"
    }
  ]
}

CATEGORY GUIDELINES:
- "performance": Speed improvements, efficiency gains, performance optimization, response times
- "business": Cost savings, revenue increases, business growth, ROI, profit improvements  
- "user-experience": UI/UX improvements, user satisfaction, usability enhancements, accessibility
- "technical": Code quality, architecture, infrastructure, technical debt, system reliability

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
            content: 'You are a professional sharing authentic work experiences on a professional network. Write in first person with a genuine, engaging tone that shows personality while staying professional. Focus on growth, learning, and achievements. Always return valid JSON with the requested structure.'
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
        message: (error as any).message,
        status: (error as any).status,
        type: (error as any).type
      });
      return false;
    }
  }
}