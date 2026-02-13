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
