/**
 * LLM Client for Story Coach CLI
 *
 * Wraps Azure OpenAI calls for the CLI tools.
 * Uses same configuration as the rest of the backend.
 */

import { AzureOpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Lazy-load client to avoid errors when just showing help
let azureClient: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (!azureClient) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!apiKey || !endpoint) {
      throw new Error(
        'Azure OpenAI not configured. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in backend/.env'
      );
    }

    azureClient = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21',
      deployment: deploymentName,
    });

    console.log(`✅ Using Azure OpenAI (deployment: ${deploymentName})`);
  }
  return azureClient;
}

export interface LLMCallOptions {
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call LLM and return the response content
 */
export async function callLLM(options: LLMCallOptions): Promise<string> {
  const {
    messages,
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  try {
    const client = getClient();
    // Azure OpenAI uses deployment name set in client, not model parameter
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('LLM call failed:', error);
    throw error;
  }
}

/**
 * Call LLM for interactive coaching (streaming could be added later)
 */
export async function callCoach(
  systemPrompt: string,
  conversationHistory: ChatCompletionMessageParam[],
  userMessage: string
): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  return callLLM({
    messages,
    temperature: 0.7,
  });
}

/**
 * Call LLM for story generation
 */
export async function callStoryGenerator(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 3000,
  });
}
