/**
 * EditSuggestionsPanel - author's view of pending edit suggestions on
 * their story. Ship 3.3.
 *
 * Renders above the Participants row inside StoryEvidenceView. Shows
 * one card per awaiting suggestion with:
 *   - Who suggested it (avatar + name)
 *   - Which section it's for
 *   - Diff-style side-by-side of current vs suggested text
 *   - Accept / Reject buttons
 *
 * Accept replaces the section text in the story and marks the
 * validation APPROVED. Reject sends the validation back to PENDING so
 * the validator can try again.
 */

import React from 'react';
import { Check, X, Loader2, PencilLine, MessageSquareText } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  usePendingEditSuggestions,
  useAcceptEditSuggestion,
  useRejectEditSuggestion,
} from '../../hooks/useStoryValidations';

interface EditSuggestionsPanelProps {
  storyId: string;
  isOwner?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface SuggestionCardProps {
  validationId: string;
  storyId: string;
  sectionKey: string;
  validatorName: string;
  validatorAvatar: string | null;
  currentText: string;
  suggestedText: string;
  suggestedAt: string;
}

function SuggestionCard(props: SuggestionCardProps) {
  const accept = useAcceptEditSuggestion(props.storyId);
  const reject = useRejectEditSuggestion(props.storyId);
  const busy = accept.isPending || reject.isPending;

  const suggestedAt = new Date(props.suggestedAt);
  const relative = (() => {
    const seconds = Math.floor((Date.now() - suggestedAt.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  })();

  return (
    <div className="rounded-lg border border-primary-100 bg-white p-4">
      <div className="flex items-center gap-2.5 mb-3">
        {props.validatorAvatar ? (
          <img src={props.validatorAvatar} alt={props.validatorName} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
            {initials(props.validatorName)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            <span className="text-primary-700 font-semibold">{props.validatorName}</span>
            <span className="text-gray-500 font-normal"> suggested an edit to </span>
            <span className="font-semibold capitalize">{props.sectionKey}</span>
          </div>
          <div className="text-[11px] text-gray-400">{relative}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">Current</div>
          <div className="text-xs text-gray-600 font-serif leading-relaxed bg-gray-50 rounded p-2.5 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {props.currentText || <em className="text-gray-400">(empty)</em>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-primary-700 mb-1">Suggested</div>
          <div className="text-xs text-gray-900 font-serif leading-relaxed bg-primary-50/40 border border-primary-100 rounded p-2.5 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {props.suggestedText}
          </div>
        </div>
      </div>

      {(accept.isError || reject.isError) && (
        <p className="text-[11px] text-red-700 mb-2">
          {((accept.error || reject.error) as Error | undefined)?.message || 'Could not apply. Try again.'}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => reject.mutate(props.validationId)}
          disabled={busy}
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-medium rounded px-2.5 py-1 border',
            busy ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50',
          )}
        >
          {reject.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          Reject
        </button>
        <button
          type="button"
          onClick={() => accept.mutate(props.validationId)}
          disabled={busy}
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-medium rounded px-2.5 py-1',
            busy ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700',
          )}
        >
          {accept.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Accept &amp; replace text
        </button>
      </div>
    </div>
  );
}

export const EditSuggestionsPanel: React.FC<EditSuggestionsPanelProps> = ({ storyId, isOwner }) => {
  const { data, isLoading } = usePendingEditSuggestions(storyId, Boolean(isOwner));

  // Author-only; hide entirely if nothing pending so the story view
  // stays quiet for unaffected stories.
  if (!isOwner || isLoading) return null;
  const suggestions = data?.suggestions ?? [];
  if (suggestions.length === 0) return null;

  return (
    <section className="mt-10 border-t border-primary-100 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareText className="h-4 w-4 text-primary-600" />
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-900">
          Edit suggestions
        </h3>
        <span className="text-xs text-gray-500 ml-1">
          {suggestions.length} awaiting your response
        </span>
      </div>
      <div className="space-y-3">
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.validationId}
            validationId={s.validationId}
            storyId={s.storyId}
            sectionKey={s.sectionKey}
            validatorName={s.validatorName}
            validatorAvatar={s.validatorAvatar}
            currentText={s.currentSectionText}
            suggestedText={s.suggestedText}
            suggestedAt={s.suggestedAt}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-400 italic">
        Accept to replace the section text in your story; reject to send it back to the validator.
      </p>
    </section>
  );
};
