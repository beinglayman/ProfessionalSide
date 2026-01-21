import { OpenAI } from 'openai';
import { prisma } from '../lib/prisma';

interface SkillBenchmark {
  skillName: string;
  industryAverage: number;
  juniorLevel: number;
  midLevel: number;
  seniorLevel: number;
  expertLevel: number;
  marketDemand: 'low' | 'medium' | 'high' | 'very-high';
  growthTrend: 'declining' | 'stable' | 'growing' | 'hot';
  description: string;
}

interface BenchmarkContext {
  industry?: string;
  role?: string;
  company?: string;
  location?: string;
}

export class SkillsBenchmarkService {
  private openai: OpenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    console.log('🎯 Initializing Skills Benchmark Service...');
    
    // Check if credentials are available but don't throw error if missing
    this.isConfigured = !!(
      process.env.AZURE_OPENAI_ENDPOINT && 
      process.env.AZURE_OPENAI_API_KEY && 
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    );
    
    if (this.isConfigured) {
      try {
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
        const baseURL = `${endpoint}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`;
        
        this.openai = new OpenAI({
          apiKey: process.env.AZURE_OPENAI_API_KEY!,
          baseURL: baseURL,
          defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2024-07-18' },
          defaultHeaders: {
            'api-key': process.env.AZURE_OPENAI_API_KEY!,
          },
        });

        console.log('✅ Skills Benchmark Service initialized successfully with Azure OpenAI');
      } catch (error) {
        console.error('❌ Failed to initialize Azure OpenAI for benchmarking:', error);
        this.isConfigured = false;
        this.openai = null;
      }
    } else {
      console.log('⚠️ Skills Benchmark Service initialized without Azure OpenAI credentials (will use fallback data)');
    }
  }

  /**
   * Generate skill benchmarks for a list of skills using LLM
   */
  async generateSkillBenchmarks(skills: string[], context?: BenchmarkContext): Promise<SkillBenchmark[]> {
    try {
      console.log('🎯 Generating skill benchmarks for:', skills.join(', '));
      
      // If OpenAI is not configured, return fallback benchmarks immediately
      if (!this.isConfigured || !this.openai) {
        console.log('⚠️ Azure OpenAI not configured, using fallback benchmarks');
        return this.generateFallbackBenchmarks(skills);
      }
      
      const prompt = this.buildBenchmarkPrompt(skills, context);
      
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional career analyst and skills expert with deep knowledge of technology industry standards, salary benchmarks, and skill requirements across various roles and industries. Provide accurate, up-to-date benchmark data for professional skills.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || '';
      console.log('✅ Benchmark data generated successfully');
      
      try {
        const benchmarks = JSON.parse(content) as SkillBenchmark[];
        
        // Validate the response structure
        if (!Array.isArray(benchmarks)) {
          throw new Error('Response is not an array');
        }
        
        // Store benchmarks in database for caching
        await this.storeBenchmarks(benchmarks, context);
        
        return benchmarks;
      } catch (parseError) {
        console.error('❌ Failed to parse benchmark JSON:', parseError);
        console.error('❌ Raw content:', content.substring(0, 500) + '...');
        
        // Return fallback benchmarks
        return this.generateFallbackBenchmarks(skills);
      }
    } catch (error) {
      console.error('❌ Error generating skill benchmarks:', error);
      
      // Return fallback benchmarks on error
      return this.generateFallbackBenchmarks(skills);
    }
  }

  /**
   * Get cached benchmarks from database or generate new ones
   */
  async getSkillBenchmarks(skills: string[], context?: BenchmarkContext): Promise<SkillBenchmark[]> {
    try {
      // Check for cached benchmarks first
      const cached = await this.getCachedBenchmarks(skills, context);
      
      if (cached.length === skills.length) {
        console.log('✅ Using cached skill benchmarks');
        return cached;
      }
      
      // Generate missing benchmarks
      const missingSkills = skills.filter(skill => 
        !cached.find(c => c.skillName.toLowerCase() === skill.toLowerCase())
      );
      
      if (missingSkills.length > 0) {
        console.log('🔄 Generating benchmarks for missing skills:', missingSkills.join(', '));
        const newBenchmarks = await this.generateSkillBenchmarks(missingSkills, context);
        return [...cached, ...newBenchmarks];
      }
      
      return cached;
    } catch (error) {
      console.error('❌ Error getting skill benchmarks:', error);
      return this.generateFallbackBenchmarks(skills);
    }
  }

  /**
   * Build the prompt for LLM benchmark generation
   */
  private buildBenchmarkPrompt(skills: string[], context?: BenchmarkContext): string {
    const contextInfo = context ? `
CONTEXT:
- Industry: ${context.industry || 'Technology/Software'}
- Role: ${context.role || 'Software Engineer'}
- Company: ${context.company || 'Mid-size tech company'}
- Location: ${context.location || 'United States'}
` : '';

    return `
You are analyzing professional skills for career benchmarking. For each skill listed below, provide current market intelligence and benchmarks.

${contextInfo}

SKILLS TO ANALYZE: ${skills.join(', ')}

For each skill, provide benchmarks based on current market data (2024-2025). Consider:
1. Industry standards and expectations
2. Skill demand in the job market
3. Typical proficiency levels at different career stages
4. Growth trends and future outlook
5. Market compensation correlation

OUTPUT FORMAT: Return a valid JSON array with this exact structure:
[
  {
    "skillName": "Skill name (exact match from input)",
    "industryAverage": 65,
    "juniorLevel": 35,
    "midLevel": 55,
    "seniorLevel": 75,
    "expertLevel": 90,
    "marketDemand": "high",
    "growthTrend": "growing",
    "description": "Brief market insight and benchmark explanation"
  }
]

BENCHMARK SCALE (0-100):
- 0-25: Beginner/Learning
- 25-50: Junior/Developing  
- 50-75: Mid-level/Proficient
- 75-90: Senior/Advanced
- 90-100: Expert/Industry Leader

MARKET DEMAND VALUES:
- "low": Limited job opportunities
- "medium": Steady demand
- "high": Strong market demand  
- "very-high": Critical skill, high competition

GROWTH TREND VALUES:
- "declining": Becoming less relevant
- "stable": Consistent demand
- "growing": Increasing importance
- "hot": Rapidly growing, emerging skill

Base your analysis on actual market conditions, job postings, industry reports, and professional standards. Be realistic and data-driven in your assessments.
`;
  }

  /**
   * Store benchmarks in database for caching
   */
  private async storeBenchmarks(benchmarks: SkillBenchmark[], context?: BenchmarkContext): Promise<void> {
    try {
      for (const benchmark of benchmarks) {
        await prisma.skillBenchmark.upsert({
          where: {
            skillName_industry: {
              skillName: benchmark.skillName,
              industry: context?.industry || 'general'
            }
          },
          update: {
            industryAverage: benchmark.industryAverage,
            juniorLevel: benchmark.juniorLevel,
            midLevel: benchmark.midLevel,
            seniorLevel: benchmark.seniorLevel,
            expertLevel: benchmark.expertLevel,
            marketDemand: benchmark.marketDemand,
            growthTrend: benchmark.growthTrend,
            description: benchmark.description,
            updatedAt: new Date()
          },
          create: {
            skillName: benchmark.skillName,
            industry: context?.industry || 'general',
            role: context?.role || 'general',
            industryAverage: benchmark.industryAverage,
            juniorLevel: benchmark.juniorLevel,
            midLevel: benchmark.midLevel,
            seniorLevel: benchmark.seniorLevel,
            expertLevel: benchmark.expertLevel,
            marketDemand: benchmark.marketDemand,
            growthTrend: benchmark.growthTrend,
            description: benchmark.description
          }
        });
      }
      
      console.log('✅ Stored benchmarks in database for caching');
    } catch (error) {
      console.error('❌ Failed to store benchmarks:', error);
      // Non-blocking error - continue without caching
    }
  }

  /**
   * Get cached benchmarks from database
   */
  private async getCachedBenchmarks(skills: string[], context?: BenchmarkContext): Promise<SkillBenchmark[]> {
    try {
      const cached = await prisma.skillBenchmark.findMany({
        where: {
          skillName: { in: skills },
          industry: context?.industry || 'general',
          // Only use cached data that's less than 30 days old
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });
      
      return cached.map(c => ({
        skillName: c.skillName,
        industryAverage: c.industryAverage,
        juniorLevel: c.juniorLevel,
        midLevel: c.midLevel,
        seniorLevel: c.seniorLevel,
        expertLevel: c.expertLevel,
        marketDemand: c.marketDemand as SkillBenchmark['marketDemand'],
        growthTrend: c.growthTrend as SkillBenchmark['growthTrend'],
        description: c.description
      }));
    } catch (error) {
      console.error('❌ Failed to get cached benchmarks:', error);
      return [];
    }
  }

  /**
   * Generate fallback benchmarks when LLM is unavailable
   */
  private generateFallbackBenchmarks(skills: string[]): SkillBenchmark[] {
    return skills.map(skill => ({
      skillName: skill,
      industryAverage: 65,
      juniorLevel: 35,
      midLevel: 55,
      seniorLevel: 75,
      expertLevel: 90,
      marketDemand: 'medium' as const,
      growthTrend: 'stable' as const,
      description: `Industry benchmark for ${skill}. Live data will be available when LLM service is accessible.`
    }));
  }

  /**
   * Test connection to Azure OpenAI
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Skills Benchmark Service connection...');
      
      if (!this.isConfigured || !this.openai) {
        console.log('⚠️ Azure OpenAI not configured for Skills Benchmark Service');
        return false;
      }
      
      const response = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
        messages: [
          {
            role: 'user',
            content: 'Test connection for skills benchmarking.'
          }
        ],
        max_completion_tokens: 10,
      });

      const success = !!response.choices[0]?.message?.content;
      console.log(success ? '✅ Skills Benchmark Service connection successful' : '❌ No response from Skills Benchmark Service');
      return success;
    } catch (error) {
      console.error('❌ Skills Benchmark Service connection test failed:', error);
      return false;
    }
  }
}