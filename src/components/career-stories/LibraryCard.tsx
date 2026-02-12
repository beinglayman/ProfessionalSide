import React from 'react';
import { Sparkles, Briefcase } from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';
import { DERIVATION_TYPE_META, PACKET_TYPE_META } from './constants';
import type { StoryDerivation, DerivationType, PacketType } from '../../types/career-stories';

// =============================================================================
// HELPERS
// =============================================================================

function stripMarkdown(text: string): string {
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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function getItemMeta(item: StoryDerivation) {
  if (item.kind === 'single') {
    const meta = DERIVATION_TYPE_META[item.type as DerivationType];
    if (!meta) {
      if (import.meta.env.DEV) console.warn(`[LibraryCard] Unknown single derivation type: "${item.type}"`);
      return { label: item.type, Icon: Sparkles, color: 'gray' };
    }
    return meta;
  }
  const meta = PACKET_TYPE_META[item.type as PacketType];
  if (!meta) {
    if (import.meta.env.DEV) console.warn(`[LibraryCard] Unknown packet type: "${item.type}"`);
    return { label: item.type, Icon: Briefcase, color: 'gray' };
  }
  return meta;
}

function getSourceLabel(item: StoryDerivation): string | null {
  const snapshots = item.storySnapshots;
  if (!snapshots || snapshots.length === 0) return null;
  const first = snapshots[0].title;
  if (snapshots.length === 1) return `from ${first}`;
  return `from ${first} + ${snapshots.length - 1} more`;
}

// =============================================================================
// COMPONENT
// =============================================================================

interface LibraryCardProps {
  item: StoryDerivation;
  isSelected: boolean;
  onClick: () => void;
}

export function LibraryCard({ item, isSelected, onClick }: LibraryCardProps) {
  const { label, Icon } = getItemMeta(item);
  const stripped = stripMarkdown(item.text);
  const preview = stripped ? truncate(stripped, 100) : null;
  const sourceLabel = getSourceLabel(item);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}, ${item.wordCount} words, ${formatRelativeTime(item.createdAt)}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'w-full text-left p-4 transition-all duration-150 cursor-pointer rounded-2xl border',
        'focus:outline-none focus:ring-2 focus:ring-purple-500',
        isSelected
          ? 'bg-purple-50/50 border-purple-300'
          : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'
      )}
    >
      {/* Row 1: type label + date */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
        <span className="text-xs text-gray-400">{formatRelativeTime(item.createdAt)}</span>
      </div>

      {/* Row 2: preview text */}
      {preview ? (
        <p className="text-sm text-gray-600 line-clamp-1 mb-1">{preview}</p>
      ) : (
        <p className="text-sm text-gray-400 italic line-clamp-1 mb-1">No content</p>
      )}

      {/* Row 3: source + word count */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {sourceLabel && <span>{sourceLabel}</span>}
        {sourceLabel && <span>·</span>}
        <span>{item.wordCount} words</span>
      </div>
    </div>
  );
}

// Export helpers for testing
export { stripMarkdown, getItemMeta, getSourceLabel };
