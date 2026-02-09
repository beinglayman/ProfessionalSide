/**
 * DerivationHistory Component
 *
 * Collapsible section showing saved derivations for a story.
 * - Auto-expands + highlights when a new derivation appears
 * - Click a row to open the full DerivationViewModal with proper preview frame
 * - Displayed in NarrativePreview between sections and footer
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Trash2, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStoryDerivations, useDeleteDerivation } from '../../hooks/useCareerStories';
import { DERIVATION_TYPE_META } from './constants';
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

function getTypeLabel(type: string, kind: string): string {
  if (kind === 'single') {
    const meta = DERIVATION_TYPE_META[type as DerivationType];
    return meta?.label || type;
  }
  const packetLabels: Record<string, string> = {
    promotion: 'Promotion Packet',
    'annual-review': 'Annual Review',
    'skip-level': 'Skip-Level',
    'portfolio-brief': 'Portfolio Brief',
    'self-assessment': 'Self Assessment',
    'one-on-one': '1:1 Prep',
  };
  return packetLabels[type] || type;
}

export function DerivationHistory({ storyId }: DerivationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [viewDerivation, setViewDerivation] = useState<StoryDerivation | null>(null);
  const prevCountRef = useRef<number>(0);

  const { data: derivations, isLoading } = useStoryDerivations(storyId);
  const deleteMutation = useDeleteDerivation();

  const count = derivations?.length || 0;

  // Auto-expand + highlight when a new derivation arrives
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

  // Also auto-expand on first load if derivations exist
  useEffect(() => {
    if (count > 0 && prevCountRef.current === 0) {
      prevCountRef.current = count;
    }
  }, [count]);

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
      <div className="border-t border-gray-100 animate-fade-in">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-6 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-90'
          )} />
          <Sparkles className="h-3 w-3 text-blue-400" />
          <span className="font-medium">Derivations</span>
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-300',
            newId ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          )}>
            {count}
          </span>
        </button>

        <div className={cn(
          'grid transition-all duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}>
          <div className="overflow-hidden">
            <div className="px-6 pb-3 space-y-1">
              {derivations!.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setViewDerivation(d)}
                  className={cn(
                    'flex items-center gap-2 group text-xs cursor-pointer rounded-md px-2 py-1.5 -mx-2',
                    'hover:bg-gray-50 transition-all duration-200',
                    newId === d.id && 'bg-blue-50 ring-1 ring-blue-200 animate-fade-in'
                  )}
                >
                  {/* Type pill */}
                  <span
                    className={cn(
                      'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                      d.kind === 'single'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    )}
                  >
                    {getTypeLabel(d.type, d.kind)}
                  </span>

                  {/* Truncated preview */}
                  <span className="text-gray-500 truncate min-w-0 flex-1">
                    {d.text.slice(0, 80)}{d.text.length > 80 ? '...' : ''}
                  </span>

                  {/* Timestamp */}
                  <span className="shrink-0 text-gray-400 text-[10px]">
                    {formatRelativeTime(d.createdAt)}
                  </span>

                  {/* Copy button */}
                  <button
                    onClick={(e) => handleCopy(e, d.text, d.id)}
                    className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                    title="Copy to clipboard"
                  >
                    {copiedId === d.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-400" />
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, d.id)}
                    className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                    title="Delete derivation"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
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
