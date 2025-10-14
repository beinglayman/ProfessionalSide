import { AzureOpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index';

export type TaskType = 'categorize' | 'analyze' | 'correlate' | 'generate' | 'summarize' | 'extract';
export type QualityLevel = 'quick' | 'balanced' | 'high';

interface ModelConfig {
  client: AzureOpenAI;
  deployment: string;
  costPerMillion: { input: number; output: number };
}

interface TaskExecutionOptions {
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
}

/**
 * Model Selector Service
 *
 * Intelligently selects between GPT-4o-mini (cost-efficient) and GPT-4o (high-quality)
 * based on the task complexity and quality requirements.
 *
 * Cost optimization strategy:
 * - GPT-4o-mini: $0.15/$0.60 per 1M tokens - Used for 80% of tasks
 * - GPT-4o: $2.50/$10.00 per 1M tokens - Used only for content generation
 */
export class ModelSelectorService {
  private models: {
    quick: ModelConfig;
    premium: ModelConfig;
  };

  private taskModelMap: Record<TaskType, 'quick' | 'premium'> = {
    categorize: 'quick',    // Simple classification
    analyze: 'quick',       // Basic analysis
    extract: 'quick',       // Data extraction
    summarize: 'quick',     // Summaries
    correlate: 'quick',     // Start with quick, upgrade if needed
    generate: 'premium'     // Always use premium for content
  };

  constructor() {
    console.log('🤖 Initializing Model Selector Service...');

    // Initialize GPT-4o-mini client (existing credentials)
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      throw new Error('Azure OpenAI (GPT-4o-mini) credentials not configured');
    }

    this.models = {
      quick: {
        client: new AzureOpenAI({
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'
        }),
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o-mini',
        costPerMillion: { input: 0.15, output: 0.60 }
      },
      premium: {
        client: new AzureOpenAI({
          apiKey: process.env.AZURE_OPENAI_GPT4O_KEY || process.env.AZURE_OPENAI_API_KEY,
          endpoint: process.env.AZURE_OPENAI_GPT4O_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
          apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'
        }),
        deployment: process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || 'gpt-4o',
        costPerMillion: { input: 2.50, output: 10.00 }
      }
    };

    // Check if GPT-4o is configured
    if (!process.env.AZURE_OPENAI_GPT4O_KEY) {
      console.warn('⚠️ GPT-4o not configured. Using GPT-4o-mini for all tasks.');
      // Fall back to using mini for everything
      this.models.premium = this.models.quick;
    } else {
      console.log('✅ Model Selector initialized with hybrid GPT-4o-mini/GPT-4o');
    }
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
    const model = this.selectOptimalModel(task, quality);

    console.log(`🎯 Executing ${task} with ${model.deployment} (${quality} quality)`);

    try {
      const response = await model.client.chat.completions.create({
        model: model.deployment,
        messages,
        max_tokens: options.maxTokens || 3000,
        temperature: options.temperature ?? 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage;

      // Calculate cost
      const estimatedCost = usage ? this.calculateCost(
        model,
        usage.prompt_tokens || 0,
        usage.completion_tokens || 0
      ) : 0;

      const duration = Date.now() - startTime;
      console.log(
        `✅ ${task} completed in ${duration}ms using ${model.deployment}`,
        `(${usage?.prompt_tokens}/${usage?.completion_tokens} tokens, $${estimatedCost.toFixed(4)})`
      );

      return { content, model: model.deployment, estimatedCost };
    } catch (error) {
      console.error(`❌ Error executing ${task} with ${model.deployment}:`, error);

      // If premium model fails and we're not already using quick, try fallback
      if (model === this.models.premium && model !== this.models.quick) {
        console.log('🔄 Falling back to GPT-4o-mini...');
        return this.executeTask(task, messages, 'quick', options);
      }

      throw error;
    }
  }

  /**
   * Select the optimal model based on task and quality requirements
   */
  private selectOptimalModel(task: TaskType, quality: QualityLevel): ModelConfig {
    // Quality overrides
    if (quality === 'high') {
      return this.models.premium;
    }

    if (quality === 'quick') {
      return this.models.quick;
    }

    // Balanced mode: Use task mapping
    const preferredModel = this.taskModelMap[task];

    // Special case: content generation always uses premium if available
    if (task === 'generate' && this.models.premium !== this.models.quick) {
      return this.models.premium;
    }

    return preferredModel === 'premium' ? this.models.premium : this.models.quick;
  }

  /**
   * Calculate estimated cost for API usage
   */
  private calculateCost(model: ModelConfig, inputTokens: number, outputTokens: number): number {
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
    // First try with quick model
    const quickResult = await this.executeTask(task, messages, 'quick');

    try {
      const parsed = JSON.parse(quickResult.content);

      // Check if result has confidence score
      if (parsed.confidence !== undefined && parsed.confidence < confidenceThreshold) {
        console.log(`🔄 Low confidence (${parsed.confidence}), upgrading to GPT-4o...`);
        const premiumResult = await this.executeTask(task, messages, 'high');
        return {
          content: JSON.parse(premiumResult.content),
          model: premiumResult.model,
          upgraded: true
        };
      }

      return { content: parsed, model: quickResult.model, upgraded: false };
    } catch (error) {
      // If parsing fails or no confidence score, return as-is
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
   * Get model capabilities
   */
  getModelInfo(): { quick: string; premium: string; identical: boolean } {
    return {
      quick: this.models.quick.deployment,
      premium: this.models.premium.deployment,
      identical: this.models.quick === this.models.premium
    };
  }
}

// Export singleton instance
export const modelSelector = new ModelSelectorService();