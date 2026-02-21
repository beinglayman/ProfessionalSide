/**
 * Client-side source coverage computation.
 *
 * Mirrors backend story-source.service.ts computeCoverage() logic
 * for use in components that don't receive server-computed coverage
 * (e.g. derivation/playbook detail views).
 */

import type { SourceCoverage, StorySource } from '../types/career-stories';

const VAGUE_PATTERNS = [
  { pattern: /significantly\s+(improved|reduced|increased|enhanced)/i, suggestion: 'Add specific numbers (e.g., "by 40%")' },
  { pattern: /greatly\s+(improved|reduced|enhanced|increased)/i, suggestion: 'Add specific numbers' },
  { pattern: /improved\s+\w+\s+(?!by\s+\d)/i, suggestion: 'Consider adding "by X%"' },
  { pattern: /reduced\s+\w+\s+(?!by\s+\d|from\s+\d)/i, suggestion: 'Consider adding "from X to Y"' },
  { pattern: /substantially\s+(improved|reduced|increased)/i, suggestion: 'Quantify the improvement' },
  { pattern: /dramatically\s+(improved|reduced|increased)/i, suggestion: 'Replace with specific numbers' },
];

const UNGROUNDED_PATTERNS = [
  { pattern: /\d+%\s*(improvement|reduction|increase|faster|better|decrease|growth)/i, suggestion: 'Add a source to verify this percentage claim' },
  { pattern: /saved\s+\$[\d,]+/i, suggestion: 'Add a source to verify this cost claim' },
  { pattern: /led\s+a\s+team\s+of\s+\d+/i, suggestion: 'Add a source to verify team size' },
  { pattern: /first\s+(ever|time|to)\b/i, suggestion: 'Add a source to verify this superlative claim' },
  { pattern: /\d+x\s*(improvement|faster|better|more)/i, suggestion: 'Add a source to verify this multiplier claim' },
];

export function computeClientCoverage(
  sources: StorySource[],
  sections: Record<string, { summary?: string }>,
  sectionKeys: string[],
): SourceCoverage {
  const activeSources = sources.filter((s) => !s.excludedAt);
  const sourcedSections = new Set<string>();

  for (const source of activeSources) {
    if (source.sectionKey !== 'unassigned') {
      sourcedSections.add(source.sectionKey);
    }
  }

  const gaps = sectionKeys.filter((key) => !sourcedSections.has(key));

  // Vague metrics — all sections
  const vagueMetrics: SourceCoverage['vagueMetrics'] = [];
  for (const key of sectionKeys) {
    const summary = sections[key]?.summary || '';
    for (const { pattern, suggestion } of VAGUE_PATTERNS) {
      const match = summary.match(pattern);
      if (match) {
        vagueMetrics.push({ sectionKey: key, match: match[0], suggestion });
        break;
      }
    }
  }

  // Ungrounded claims — unsourced sections only
  const ungroundedClaims: SourceCoverage['ungroundedClaims'] = [];
  for (const key of gaps) {
    const summary = sections[key]?.summary || '';
    for (const { pattern, suggestion } of UNGROUNDED_PATTERNS) {
      const match = summary.match(pattern);
      if (match) {
        ungroundedClaims.push({ sectionKey: key, match: match[0], suggestion });
        break;
      }
    }
  }

  return {
    total: sectionKeys.length,
    sourced: sourcedSections.size,
    gaps,
    vagueMetrics,
    ungroundedClaims,
  };
}
