/**
 * Derivation display helpers
 *
 * Shared by LibraryCard, LibraryDetail, and tests.
 * These are domain helpers for derivation metadata — not tied to any component.
 */

import { Sparkles, Briefcase } from 'lucide-react';
import { DERIVATION_TYPE_META, PACKET_TYPE_META } from './constants';
import type { StoryDerivation, DerivationType, PacketType } from '../../types/career-stories';

// =============================================================================
// MARKDOWN STRIPPING
// =============================================================================

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')           // fenced code blocks
    .replace(/`([^`]+)`/g, '$1')              // inline code
    .replace(/^#{1,6}\s+/gm, '')              // headers
    .replace(/^>\s+/gm, '')                   // blockquotes
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')    // bold+italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // bold
    .replace(/\*([^*]+)\*/g, '$1')            // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links
    .replace(/^[-*+]\s+/gm, '')              // unordered bullets
    .replace(/^\d+\.\s+/gm, '')              // ordered list items
    .replace(/\n+/g, ' ')                     // collapse newlines
    .replace(/\s+/g, ' ')                     // collapse spaces
    .trim();
}

// =============================================================================
// TEXT TRUNCATION
// =============================================================================

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// =============================================================================
// SECTION NORMALIZATION
// =============================================================================

/**
 * Detects and re-parses derivation data when the backend fallback path
 * stored raw LLM JSON as a single "content" section.
 *
 * When parseSectionsFromLLM fails (e.g. the LLM wraps JSON in unexpected text),
 * the entire raw output lands in sections.content.summary and text — both containing
 * the raw JSON string `{"sections": [...]}`. This function detects that case and
 * recovers the structured sections on the frontend.
 */
export function normalizeSections(
  sections: Record<string, { summary: string }> | undefined | null,
  sectionOrder: string[] | undefined | null,
  text: string,
): { sections: Record<string, { summary: string }>; sectionOrder: string[]; text: string } {
  // Only attempt recovery when we have a single "content" section
  const keys = sections ? Object.keys(sections) : [];
  if (keys.length !== 1 || keys[0] !== 'content') {
    return { sections: sections || {}, sectionOrder: sectionOrder || keys, text };
  }

  const raw = sections!.content.summary;

  // Quick check: does it look like JSON with a sections array?
  if (!raw.trimStart().startsWith('{') || !raw.includes('"sections"')) {
    return { sections: sections!, sectionOrder: sectionOrder || ['content'], text };
  }

  try {
    const cleaned = raw.replace(/^```[jJ][sS][oO][nN]?\s*\n?|\n?\s*```\s*$/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.sections && Array.isArray(parsed.sections)) {
      const newSections: Record<string, { summary: string }> = {};
      const newOrder: string[] = [];
      const textParts: string[] = [];

      for (const sec of parsed.sections as Array<{ key: string; title: string; content: string }>) {
        newSections[sec.key] = { summary: sec.content };
        newOrder.push(sec.key);
        textParts.push(`**${sec.title}**\n${sec.content}`);
      }

      return { sections: newSections, sectionOrder: newOrder, text: textParts.join('\n\n') };
    }
  } catch {
    // Not valid JSON — keep original
  }

  return { sections: sections!, sectionOrder: sectionOrder || ['content'], text };
}

// =============================================================================
// SOURCE DISTRIBUTION
// =============================================================================

/**
 * Group sources by section key with smart distribution.
 *
 * When sources are properly keyed (their sectionKey matches actual section keys),
 * groups normally. When sources are in a single bucket ('content', 'unassigned')
 * that doesn't match any section, distributes them evenly across sections.
 *
 * Used by both NarrativePreview (stories) and LibraryDetail (derivations).
 */
export function groupSourcesBySection<T extends { sectionKey: string }>(
  sources: T[],
  sectionKeys: string[],
): Record<string, T[]> {
  if (sources.length === 0 || sectionKeys.length === 0) return {};

  // Check if sources already match actual section keys
  const sourceKeySet = new Set(sources.map(s => s.sectionKey));
  const sectionKeySet = new Set(sectionKeys);
  const hasMatchingSections = [...sourceKeySet].some(k => sectionKeySet.has(k));

  if (hasMatchingSections) {
    const map: Record<string, T[]> = {};
    for (const source of sources) {
      if (!map[source.sectionKey]) map[source.sectionKey] = [];
      map[source.sectionKey].push(source);
    }
    return map;
  }

  // Sources are in a single bucket — distribute evenly across sections
  const map: Record<string, T[]> = {};
  const perSection = Math.ceil(sources.length / sectionKeys.length);
  sectionKeys.forEach((key, idx) => {
    const start = idx * perSection;
    const slice = sources.slice(start, start + perSection);
    if (slice.length > 0) map[key] = slice;
  });
  return map;
}

// =============================================================================
// DERIVATION METADATA
// =============================================================================

export function getItemMeta(item: StoryDerivation) {
  if (item.kind === 'single') {
    const meta = DERIVATION_TYPE_META[item.type as DerivationType];
    if (!meta) {
      if (import.meta.env.DEV) console.warn(`[derivation-helpers] Unknown single derivation type: "${item.type}"`);
      return { label: item.type, Icon: Sparkles, color: 'gray' };
    }
    return meta;
  }
  const meta = PACKET_TYPE_META[item.type as PacketType];
  if (!meta) {
    if (import.meta.env.DEV) console.warn(`[derivation-helpers] Unknown packet type: "${item.type}"`);
    return { label: item.type, Icon: Briefcase, color: 'gray' };
  }
  return meta;
}

// =============================================================================
// TITLE BUILDING
// =============================================================================

/**
 * Build a display title combining the derivation type label with source story names.
 * Used by both LibraryCard and LibraryDetail to ensure title consistency.
 *
 * Examples:
 *   "Interview Answer"                                  (no snapshots)
 *   "Interview Answer — Auth Migration"                 (single story)
 *   "Promotion — BILL-550 Double-debit Work + 2 more"  (multi-story packet)
 */
export function getTitle(item: StoryDerivation, label: string): string {
  const snapshots = item.storySnapshots;
  if (!snapshots || snapshots.length === 0) return label;
  const first = snapshots[0].title?.trim();
  if (!first) return label;
  if (snapshots.length === 1) return `${label} — ${first}`;
  return `${label} — ${first} + ${snapshots.length - 1} more`;
}
