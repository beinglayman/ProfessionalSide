import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ChatCompletionMessageParam } from 'openai/resources/index';

export type TaskType = 'categorize' | 'analyze' | 'correlate' | 'generate' | 'summarize' | 'extract' | 'derive' | 'cluster-assign';
export type QualityLevel = 'quick' | 'balanced' | 'high';
export type ProviderType = 'anthropic' | 'openai' | 'azure';

interface TaskExecutionOptions {
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
}

interface ProviderConfig {
  type: ProviderType;
  model: string;
  costPerMillion: { input: number; output: number };
}

/**
 * Model Selector Service
 *
 * Multi-provider LLM service supporting:
 * - Anthropic Claude (Haiku/Sonnet) - Recommended for cost efficiency
 * - OpenAI GPT-4o-mini/GPT-4o
 * - Azure OpenAI
 *
 * Priority order (first available is used):
 * 1. Anthropic (ANTHROPIC_API_KEY)
 * 2. OpenAI (OPENAI_API_KEY)
 * 3. Azure OpenAI (AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT)
 *
 * Cost comparison (per 1M tokens):
 * - Claude Haiku: $0.25/$1.25 (input/output)
 * - GPT-4o-mini: $0.15/$0.60
 * - Claude Sonnet: $3.00/$15.00
 * - GPT-4o: $2.50/$10.00
 */
export class ModelSelectorService {
  private provider!: ProviderType;
  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private azureClient: AzureOpenAI | null = null;

  private quickModel!: ProviderConfig;
  private premiumModel!: ProviderConfig;

  private taskModelMap: Record<TaskType, 'quick' | 'premium'> = {
    categorize: 'quick',
    analyze: 'quick',
    extract: 'quick',
    summarize: 'quick',
    correlate: 'quick',
    generate: 'premium',
    derive: 'quick',
    'cluster-assign': 'quick',
  };

  constructor() {
    console.log('🤖 Initializing Model Selector Service...');

    // Try providers in priority order
    if (process.env.ANTHROPIC_API_KEY) {
      this.initializeAnthropic();
    } else if (process.env.OPENAI_API_KEY) {
      this.initializeOpenAI();
    } else if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
      this.initializeAzureOpenAI();
    } else {
      throw new Error(
        'No LLM provider configured. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, or AZURE_OPENAI_API_KEY+AZURE_OPENAI_ENDPOINT'
      );
    }
  }

  private initializeAnthropic(): void {
    this.provider = 'anthropic';
    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.quickModel = {
      type: 'anthropic',
      model: 'claude-3-5-haiku-latest',
      costPerMillion: { input: 0.25, output: 1.25 }
    };

    this.premiumModel = {
      type: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      costPerMillion: { input: 3.00, output: 15.00 }
    };

    console.log('✅ Using Anthropic Claude (Haiku/Sonnet)');
  }

  private initializeOpenAI(): void {
    this.provider = 'openai';
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.quickModel = {
      type: 'openai',
      model: 'gpt-4o-mini',
      costPerMillion: { input: 0.15, output: 0.60 }
    };

    this.premiumModel = {
      type: 'openai',
      model: 'gpt-4o',
      costPerMillion: { input: 2.50, output: 10.00 }
    };

    console.log('✅ Using OpenAI (GPT-4o-mini/GPT-4o)');
  }

  private initializeAzureOpenAI(): void {
    this.provider = 'azure';
    this.azureClient = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'
    });

    this.quickModel = {
      type: 'azure',
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini',
      costPerMillion: { input: 0.15, output: 0.60 }
    };

    this.premiumModel = {
      type: 'azure',
      model: process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
      costPerMillion: { input: 2.50, output: 10.00 }
    };

    console.log('✅ Using Azure OpenAI');
  }

  /**
   * Execute a task with the optimal model based on task type and quality requirements
   */
  async executeTask(
    task: TaskType,
    messages: ChatCompletionMessageParam[],
    quality: QualityLevel = 'balanced',
    options: TaskExecutionOptions = {}
  ): Promise<{ content: string; model: string; estimatedCost: number }> {
    const startTime = Date.now();
    const modelConfig = this.selectOptimalModel(task, quality);

    console.log(`🎯 Executing ${task} with ${modelConfig.model} (${quality} quality)`);

    try {
      let content: string;
      let inputTokens = 0;
      let outputTokens = 0;

      if (this.provider === 'anthropic' && this.anthropicClient) {
        const result = await this.executeWithAnthropic(messages, modelConfig.model, options);
        content = result.content;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
      } else if (this.provider === 'openai' && this.openaiClient) {
        const result = await this.executeWithOpenAI(this.openaiClient, messages, modelConfig.model, options);
        content = result.content;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
      } else if (this.provider === 'azure' && this.azureClient) {
        const result = await this.executeWithOpenAI(this.azureClient, messages, modelConfig.model, options);
        content = result.content;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
      } else {
        throw new Error('No LLM client available');
      }

      const estimatedCost = this.calculateCost(modelConfig, inputTokens, outputTokens);
      const duration = Date.now() - startTime;

      console.log(
        `✅ ${task} completed in ${duration}ms using ${modelConfig.model}`,
        `(${inputTokens}/${outputTokens} tokens, $${estimatedCost.toFixed(4)})`
      );

      return { content, model: modelConfig.model, estimatedCost };
    } catch (error) {
      console.error(`❌ Error executing ${task} with ${modelConfig.model}:`, error);

      // If premium model fails, try quick model as fallback
      if (modelConfig === this.premiumModel && modelConfig !== this.quickModel) {
        console.log('🔄 Falling back to quick model...');
        return this.executeTask(task, messages, 'quick', options);
      }

      throw error;
    }
  }

  private async executeWithAnthropic(
    messages: ChatCompletionMessageParam[],
    model: string,
    options: TaskExecutionOptions
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    // Convert OpenAI message format to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const anthropicMessages = userMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

    const response = await this.anthropicClient!.messages.create({
      model,
      max_tokens: options.maxTokens || 3000,
      system: systemMessage ? String(systemMessage.content) : undefined,
      messages: anthropicMessages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    };
  }

  private async executeWithOpenAI(
    client: OpenAI | AzureOpenAI,
    messages: ChatCompletionMessageParam[],
    model: string,
    options: TaskExecutionOptions
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens || 3000,
      temperature: options.temperature ?? 0.7,
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0
    };
  }

  private selectOptimalModel(task: TaskType, quality: QualityLevel): ProviderConfig {
    if (quality === 'high') {
      return this.premiumModel;
    }

    if (quality === 'quick') {
      return this.quickModel;
    }

    // Balanced mode: Use task mapping
    const preferredModel = this.taskModelMap[task];
    return preferredModel === 'premium' ? this.premiumModel : this.quickModel;
  }

  private calculateCost(model: ProviderConfig, inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * model.costPerMillion.input;
    const outputCost = (outputTokens / 1_000_000) * model.costPerMillion.output;
    return inputCost + outputCost;
  }

  /**
   * Execute with automatic quality upgrade if confidence is low
   */
  async executeWithConfidenceUpgrade(
    task: TaskType,
    messages: ChatCompletionMessageParam[],
    confidenceThreshold: number = 0.7
  ): Promise<{ content: any; model: string; upgraded: boolean }> {
    const quickResult = await this.executeTask(task, messages, 'quick');

    try {
      const parsed = JSON.parse(quickResult.content);

      if (parsed.confidence !== undefined && parsed.confidence < confidenceThreshold) {
        console.log(`🔄 Low confidence (${parsed.confidence}), upgrading to premium model...`);
        const premiumResult = await this.executeTask(task, messages, 'high');
        return {
          content: JSON.parse(premiumResult.content),
          model: premiumResult.model,
          upgraded: true
        };
      }

      return { content: parsed, model: quickResult.model, upgraded: false };
    } catch {
      return { content: quickResult.content, model: quickResult.model, upgraded: false };
    }
  }

  /**
   * Get cost estimate for a task
   */
  getCostEstimate(task: TaskType, quality: QualityLevel, estimatedTokens: { input: number; output: number }): number {
    const model = this.selectOptimalModel(task, quality);
    return this.calculateCost(model, estimatedTokens.input, estimatedTokens.output);
  }

  /**
   * Get current provider and model information
   */
  getModelInfo(): { provider: ProviderType; quick: string; premium: string; identical: boolean } {
    return {
      provider: this.provider,
      quick: this.quickModel.model,
      premium: this.premiumModel.model,
      identical: this.quickModel === this.premiumModel
    };
  }
}

// Lazy singleton - only created when needed
let modelSelectorInstance: ModelSelectorService | null = null;

export function getModelSelector(): ModelSelectorService | null {
  if (!modelSelectorInstance) {
    try {
      modelSelectorInstance = new ModelSelectorService();
    } catch (error) {
      console.warn('ModelSelectorService not available:', (error as Error).message);
      return null;
    }
  }
  return modelSelectorInstance;
}

// For backwards compatibility - but prefer getModelSelector()
export const modelSelector = (() => {
  try {
    return new ModelSelectorService();
  } catch {
    return null;
  }
})();
