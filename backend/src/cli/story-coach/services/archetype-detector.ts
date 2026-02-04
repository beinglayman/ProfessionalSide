/**
 * Archetype Detection Service
 *
 * Analyzes journal entry content to recommend story archetypes.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { JournalEntryFile, ArchetypeDetection } from '../types';
import { callLLM } from './llm-client';

const PROMPTS_DIR = join(__dirname, '..', 'prompts');

// Load and compile template
const detectionTemplateRaw = readFileSync(
  join(PROMPTS_DIR, 'archetype-detection.prompt.md'),
  'utf-8'
);
const detectionTemplate = Handlebars.compile(detectionTemplateRaw);

/**
 * Detect the best archetype for a journal entry
 */
export async function detectArchetype(
  entry: JournalEntryFile
): Promise<ArchetypeDetection> {
  const prompt = detectionTemplate({
    title: entry.title,
    category: entry.category || 'general',
    fullContent: entry.fullContent || entry.description || 'No content provided',
    phases: entry.phases,
    impactHighlights: entry.impactHighlights,
  });

  const response = await callLLM({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3, // Lower temperature for more consistent detection
  });

  try {
    // Parse JSON response
    let content = response.trim();
    // Remove markdown code blocks if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const detection = JSON.parse(content) as ArchetypeDetection;
    return detection;
  } catch (error) {
    console.error('Failed to parse archetype detection response:', error);
    console.error('Raw response:', response);

    // Return default firefighter if parsing fails
    return {
      primary: {
        archetype: 'firefighter',
        confidence: 0.5,
        reasoning: 'Default fallback - could not parse LLM response',
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
  }
}
