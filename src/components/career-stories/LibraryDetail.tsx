import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Copy, Check, MoreHorizontal, Trash2, RefreshCw } from 'lucide-react';
import { formatRelativeTime } from '../../lib/utils';
import { getItemMeta } from './LibraryCard';
import { DerivationPreview } from './DerivationPreview';
import { SimpleMarkdown } from '../ui/simple-markdown';
import { Button } from '../ui/button';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import type { StoryDerivation, CareerStory, DerivationType } from '../../types/career-stories';

// =============================================================================
// HELPERS
// =============================================================================

function resolveSourceStories(item: StoryDerivation, allStories: CareerStory[]): { id: string; title: string }[] {
  // Prefer storySnapshots (they have titles baked in)
  if (item.storySnapshots && item.storySnapshots.length > 0) {
    return item.storySnapshots.map(s => ({ id: s.storyId, title: s.title }));
  }
  // Fallback: resolve from allStories by storyIds
  return item.storyIds
    .map(id => {
      const story = allStories.find(s => s.id === id);
      return story ? { id: story.id, title: story.title } : null;
    })
    .filter((s): s is { id: string; title: string } => s !== null);
}

// =============================================================================
// COMPONENT
// =============================================================================

interface LibraryDetailProps {
  item: StoryDerivation;
  allStories: CareerStory[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onRegenerate: (item: StoryDerivation) => void;
  onNavigateToStory: (storyId: string) => void;
}

export function LibraryDetail({ item, allStories, onBack, onDelete, onRegenerate, onNavigateToStory }: LibraryDetailProps) {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus back button on mount / item change
  useEffect(() => {
    backButtonRef.current?.focus();
  }, [item.id]);

  // Clean up copy timeout on unmount
  useEffect(() => {
    return () => { clearTimeout(copyTimeoutRef.current); };
  }, []);

  const label = getItemMeta(item).label;
  const sourceStories = resolveSourceStories(item, allStories);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopied(true);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      try {
        const textarea = document.createElement('textarea');
        textarea.value = item.text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        console.warn('Failed to copy to clipboard');
      }
    }
  }, [item.text]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <div className="flex flex-col h-full">
      {/* Back link */}
      <button
        ref={backButtonRef}
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 mb-4 focus:outline-none focus:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </button>

      {/* Metadata line + actions */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-900">{label}</span>
          <span>·</span>
          <span>{item.wordCount} words</span>
          <span>·</span>
          <span>{formatRelativeTime(item.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Copy — primary action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2" aria-label="More actions">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRegenerate(item)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Source stories */}
      {sourceStories.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-4 flex-wrap">
          <span>from</span>
          {sourceStories.map((story, i) => (
            <React.Fragment key={story.id}>
              {i > 0 && <span>,</span>}
              <button
                onClick={() => onNavigateToStory(story.id)}
                className="text-purple-500 hover:text-purple-700 hover:underline focus:outline-none focus:underline"
              >
                {story.title}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200 mb-4" />

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {item.kind === 'single' ? (
          <DerivationPreview
            derivation={item.type as DerivationType}
            text={item.text}
            isGenerating={false}
            wordCount={item.wordCount}
            charCount={item.charCount}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <SimpleMarkdown content={item.text} />
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete from Library"
        description={`Delete this ${label.toLowerCase()}? This can't be undone.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
