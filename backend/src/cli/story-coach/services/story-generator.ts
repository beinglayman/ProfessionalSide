/**
 * Story Generator Service
 *
 * Generates career stories using archetype prompts and extracted context.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import {
  JournalEntryFile,
  CoachSessionFile,
  GeneratedStoryFile,
  FrameworkName,
  StoryArchetype,
  ExtractedContext,
} from '../types';
import { callStoryGenerator } from './llm-client';
import { v4 as uuidv4 } from 'uuid';

const PROMPTS_DIR = join(__dirname, '..', 'prompts');

// Framework section definitions
const FRAMEWORK_SECTIONS: Record<FrameworkName, string[]> = {
  STAR: ['situation', 'task', 'action', 'result'],
  STARL: ['situation', 'task', 'action', 'result', 'learning'],
  CAR: ['challenge', 'action', 'result'],
  PAR: ['problem', 'action', 'result'],
  SAR: ['situation', 'action', 'result'],
  SOAR: ['situation', 'obstacles', 'actions', 'results'],
  SHARE: ['situation', 'hindrances', 'actions', 'results', 'evaluation'],
  CARL: ['context', 'action', 'result', 'learning'],
};

/**
 * Load archetype-specific prompt
 */
function loadArchetypePrompt(archetype: StoryArchetype): string {
  const archetypePath = join(PROMPTS_DIR, 'archetypes', `${archetype}.prompt.md`);

  if (existsSync(archetypePath)) {
    return readFileSync(archetypePath, 'utf-8');
  }

  // Fallback to firefighter if archetype not found
  console.warn(`Archetype prompt not found: ${archetype}, using firefighter`);
  return readFileSync(join(PROMPTS_DIR, 'archetypes', 'firefighter.prompt.md'), 'utf-8');
}

/**
 * Build the user prompt with journal entry and extracted context
 */
function buildUserPrompt(
  entry: JournalEntryFile,
  framework: FrameworkName,
  extractedContext?: ExtractedContext
): string {
  const sections = FRAMEWORK_SECTIONS[framework];

  let prompt = `# Generate Career Story

## Framework: ${framework}
Generate sections: ${sections.join(', ')}

## Journal Entry

**Title:** ${entry.title}

**Category:** ${entry.category || 'general'}

**Description:**
${entry.description || 'No description'}

**Full Content:**
${entry.fullContent || 'No content provided'}
`;

  if (entry.phases?.length) {
    prompt += `
**Phases:**
${entry.phases.map(p => `- ${p.name}: ${p.summary}`).join('\n')}
`;
  }

  if (entry.impactHighlights?.length) {
    prompt += `
**Impact Highlights:**
${entry.impactHighlights.map(h => `- ${h}`).join('\n')}
`;
  }

  // Add extracted context if available
  if (extractedContext && Object.keys(extractedContext).length > 0) {
    prompt += `
## Extracted Context from Story Coach

The user revealed the following details through coaching conversation. Use these to enrich the story:
`;

    if (extractedContext.obstacle) {
      prompt += `
### What Almost Went Wrong
${extractedContext.obstacle}
`;
    }

    if (extractedContext.namedPeople?.length) {
      prompt += `
### Key People Involved
${extractedContext.namedPeople.map(p => `- ${p}`).join('\n')}
`;
    }

    if (extractedContext.counterfactual) {
      prompt += `
### What Would Have Happened (Counterfactual)
${extractedContext.counterfactual}
`;
    }

    if (extractedContext.metric) {
      prompt += `
### Quantified Impact
${extractedContext.metric}
`;
    }

    if (extractedContext.realStory) {
      prompt += `
### The Real Story (Buried Lede)
${extractedContext.realStory}
`;
    }

    if (extractedContext.learning) {
      prompt += `
### Key Learning
${extractedContext.learning}
`;
    }
  }

  prompt += `
## Output Requirements

Return valid JSON (no markdown code blocks):

{
  "title": "Compelling title for the story (max 60 chars)",
  "hook": "The opening line that grabs attention",
  "sections": {
${sections.map(s => `    "${s}": {
      "summary": "2-4 sentences for this section",
      "evidence": []
    }`).join(',\n')}
  },
  "reasoning": "Brief explanation of how the story was structured"
}
`;

  return prompt;
}

/**
 * Generate a career story
 */
export async function generateStory(
  entry: JournalEntryFile,
  framework: FrameworkName,
  archetype?: StoryArchetype,
  session?: CoachSessionFile
): Promise<GeneratedStoryFile> {
  // Build system prompt
  let systemPrompt = '';

  if (archetype) {
    systemPrompt = loadArchetypePrompt(archetype);
  } else {
    // Basic system prompt without archetype
    systemPrompt = `You are a career coach helping transform journal entries into compelling career stories.
Write in first person. Be specific. Use numbers and names when available.
Focus on the user's individual contributions and impact.`;
  }

  // Build user prompt
  const extractedContext = session?.extractedContext;
  const userPrompt = buildUserPrompt(entry, framework, extractedContext);

  // Call LLM
  const response = await callStoryGenerator(systemPrompt, userPrompt);

  // Parse response
  try {
    let content = response.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(content);

    return {
      id: uuidv4(),
      journalEntryId: entry.id,
      sessionId: session?.id,
      title: parsed.title || 'Career Story',
      hook: parsed.hook || '',
      framework,
      archetype,
      sections: parsed.sections || {},
      reasoning: parsed.reasoning || '',
      generatedAt: new Date().toISOString(),
      withCoaching: !!session,
    };
  } catch (error) {
    console.error('Failed to parse story response:', error);
    console.error('Raw response:', response);
    throw new Error('Failed to generate story - could not parse LLM response');
  }
}

/**
 * Generate story without coaching (for comparison)
 */
export async function generateBasicStory(
  entry: JournalEntryFile,
  framework: FrameworkName
): Promise<GeneratedStoryFile> {
  return generateStory(entry, framework, undefined, undefined);
}

/**
 * Generate story with coaching context
 */
export async function generateEnhancedStory(
  entry: JournalEntryFile,
  framework: FrameworkName,
  archetype: StoryArchetype,
  session: CoachSessionFile
): Promise<GeneratedStoryFile> {
  return generateStory(entry, framework, archetype, session);
}
