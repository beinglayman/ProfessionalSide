/**
 * DerivationHistory Component
 *
 * Toolbar dropdown showing saved derivations for a story.
 * - Sits next to "Use this story" button in NarrativePreview toolbar
 * - Click the button to open a dropdown with type-colored derivation items
 * - Click a row to open the full DerivationViewModal with proper preview frame
 * - Auto-opens + highlights when a new derivation appears
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Copy, Check, Trash2, Sparkles, Briefcase, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStoryDerivations, useDeleteDerivation } from '../../hooks/useCareerStories';
import { DERIVATION_TYPE_META, DERIVATION_COLOR_CLASSES } from './constants';
import { DerivationViewModal } from './DerivationViewModal';
import type { DerivationType, StoryDerivation } from '../../types/career-stories';

interface DerivationHistoryProps {
  storyId: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PACKET_TYPE_META: Record<string, { label: string; Icon: React.FC<{ className?: string }>; bg: string; text: string; iconText: string }> = {
  promotion: { label: 'Promotion', Icon: Briefcase, bg: 'bg-emerald-50', text: 'text-emerald-700', iconText: 'text-emerald-500' },
  'annual-review': { label: 'Annual Review', Icon: Clock, bg: 'bg-blue-50', text: 'text-blue-700', iconText: 'text-blue-500' },
  'skip-level': { label: 'Skip-Level', Icon: Briefcase, bg: 'bg-purple-50', text: 'text-purple-700', iconText: 'text-purple-500' },
  'portfolio-brief': { label: 'Portfolio', Icon: Briefcase, bg: 'bg-indigo-50', text: 'text-indigo-700', iconText: 'text-indigo-500' },
  'self-assessment': { label: 'Assessment', Icon: Briefcase, bg: 'bg-rose-50', text: 'text-rose-700', iconText: 'text-rose-500' },
  'one-on-one': { label: '1:1 Prep', Icon: Briefcase, bg: 'bg-amber-50', text: 'text-amber-700', iconText: 'text-amber-500' },
};

function getTypeMeta(type: string, kind: string): { label: string; Icon: React.FC<{ className?: string }>; bg: string; text: string; iconText: string } {
  if (kind === 'single') {
    const meta = DERIVATION_TYPE_META[type as DerivationType];
    if (meta) {
      const colors = DERIVATION_COLOR_CLASSES[meta.color] || { bg: 'bg-blue-50', text: 'text-blue-700', iconText: 'text-blue-500' };
      return { label: meta.label, Icon: meta.Icon, ...colors };
    }
    return { label: type, Icon: Sparkles, bg: 'bg-gray-100', text: 'text-gray-700', iconText: 'text-gray-400' };
  }
  const packetMeta = PACKET_TYPE_META[type];
  if (packetMeta) return packetMeta;
  return { label: type, Icon: Briefcase, bg: 'bg-gray-100', text: 'text-gray-700', iconText: 'text-gray-400' };
}

export function DerivationHistory({ storyId }: DerivationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [viewDerivation, setViewDerivation] = useState<StoryDerivation | null>(null);
  const prevCountRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: derivations, isLoading } = useStoryDerivations(storyId);
  const deleteMutation = useDeleteDerivation();

  const count = derivations?.length || 0;

  // Auto-open + highlight when a new derivation arrives
  useEffect(() => {
    if (count > prevCountRef.current && prevCountRef.current > 0) {
      setIsOpen(true);
      const newest = derivations?.[0];
      if (newest) {
        setNewId(newest.id);
        setTimeout(() => setNewId(null), 2000);
      }
    }
    prevCountRef.current = count;
  }, [count, derivations]);

  // Track initial count
  useEffect(() => {
    if (count > 0 && prevCountRef.current === 0) {
      prevCountRef.current = count;
    }
  }, [count]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (isLoading || count === 0) return null;

  const handleCopy = async (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Toolbar button — matches "Saved" packets dropdown on list page */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Saved
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors duration-300',
            newId ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'
          )}>
            {count}
          </span>
          <ChevronDown className={cn(
            'w-3 h-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 min-w-[280px] max-w-[380px]">
            <div className="flex flex-col gap-0.5">
              {derivations!.map((d) => {
                const meta = getTypeMeta(d.type, d.kind);
                const TypeIcon = meta.Icon;
                return (
                  <button
                    key={d.id}
                    onClick={() => { setViewDerivation(d); setIsOpen(false); }}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md hover:bg-gray-50 transition-all text-left group w-full',
                      newId === d.id && 'bg-blue-50 ring-1 ring-blue-200 animate-fade-in'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0',
                      meta.bg
                    )}>
                      <TypeIcon className={cn('w-3.5 h-3.5', meta.iconText)} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className={cn('font-medium block truncate', meta.text)}>{meta.label}</span>
                      <span className="text-gray-400 truncate block text-[11px]">
                        {d.storySnapshots?.length === 1
                          ? d.storySnapshots[0].title
                          : d.storySnapshots && d.storySnapshots.length > 1
                            ? `${d.storySnapshots.length} stories`
                            : d.text.slice(0, 50) + (d.text.length > 50 ? '...' : '')}
                      </span>
                    </div>

                    <span className="shrink-0 text-gray-400 text-[10px]">
                      {formatRelativeTime(d.createdAt)}
                    </span>

                    {/* Copy */}
                    <span
                      role="button"
                      onClick={(e) => handleCopy(e, d.text, d.id)}
                      className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                      title="Copy to clipboard"
                    >
                      {copiedId === d.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                    </span>

                    {/* Delete */}
                    <span
                      role="button"
                      onClick={(e) => handleDelete(e, d.id)}
                      className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                      title="Delete derivation"
                    >
                      <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* View modal */}
      {viewDerivation && (
        <DerivationViewModal
          isOpen={!!viewDerivation}
          onClose={() => setViewDerivation(null)}
          derivation={viewDerivation}
          onDelete={(id) => {
            deleteMutation.mutate(id);
            setViewDerivation(null);
          }}
        />
      )}
    </>
  );
}
