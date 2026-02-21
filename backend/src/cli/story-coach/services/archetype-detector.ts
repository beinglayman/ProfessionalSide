/**
 * Archetype Detection Service
 *
 * Analyzes journal entry content to recommend story archetypes.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { JournalEntryFile, ArchetypeDetection } from '../types';
import { compileSafe } from '../../../services/ai/prompts/handlebars-safe';
import { getModelSelector } from '../../../services/ai/model-selector.service';

const PROMPTS_DIR = join(__dirname, '..', 'prompts');

// Load and compile template
const detectionTemplateRaw = readFileSync(
  join(PROMPTS_DIR, 'archetype-detection.prompt.md'),
  'utf-8'
);
const detectionTemplate = compileSafe(detectionTemplateRaw);

/**
 * Detect the best archetype for a journal entry
 */
export async function detectArchetype(
  entry: JournalEntryFile
): Promise<ArchetypeDetection> {
  const defaultFallback: ArchetypeDetection = {
    primary: {
      archetype: 'firefighter',
      confidence: 0.5,
      reasoning: 'Default fallback - LLM not available or response could not be parsed',
    },
    alternatives: [],
    signals: {
      hasCrisis: false,
      hasArchitecture: false,
      hasStakeholders: false,
      hasMultiplication: false,
      hasMystery: false,
      hasPioneering: false,
      hasTurnaround: false,
      hasPrevention: false,
    },
  };

  const modelSelector = getModelSelector();
  if (!modelSelector) {
    return defaultFallback;
  }

  const prompt = detectionTemplate({
    title: entry.title,
    category: entry.category || 'general',
    fullContent: entry.fullContent || entry.description || 'No content provided',
    phases: entry.phases,
    impactHighlights: entry.impactHighlights,
  });

  try {
    const result = await modelSelector.executeTask(
      'analyze',
      [{ role: 'user', content: prompt }],
      'quick',
      { temperature: 0.3 },
    );

    // Parse JSON response
    let content = result.content.trim();
    // Remove markdown code blocks if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const detection = JSON.parse(content) as ArchetypeDetection;
    return detection;
  } catch (error) {
    console.error('Failed to detect archetype:', error);
    return defaultFallback;
  }
}
