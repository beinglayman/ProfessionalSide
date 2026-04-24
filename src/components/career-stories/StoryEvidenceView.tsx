/**
 * StoryEvidenceView - Tufte-style two-column layout for a published story
 * with evidence mode enabled.
 *
 * Left column (60%): section prose.
 * Right column (35%): one margin card per StorySource, aligned to its section.
 * Gutter (5%): a hairline dashed line from each section to its margin cards.
 *
 * Phase 1 scope (this file):
 *   - Margin cards built from existing StorySource data (no backend change).
 *   - Ungrounded-section warning pill (based on coverage.ungroundedClaims).
 *   - Evidence-summary strip at the top.
 *   - NO per-claim inline underlines or witness badges yet - those need
 *     the claim-extraction content-model work (Phase 2).
 *
 * Design reference: docs/prototypes/evidence/proto-V6c-tufte-inline-badges.html
 * Design doc: docs/2026-04-24-evidence-layer-and-validation-design.md
 */

import React from 'react';
import { ExternalLink, ShieldCheck, AlertTriangle, StickyNote, FileText, UserPlus } from 'lucide-react';
import { ToolIcon } from './ToolIcon';
import { ParticipantsRow } from './ParticipantsRow';
import { EditSuggestionsPanel } from './EditSuggestionsPanel';
import type { CareerStory, StorySource, ToolType } from '../../types/career-stories';
import { cn } from '../../lib/utils';

interface StoryEvidenceViewProps {
  story: CareerStory;
  sectionKeys: string[];
  sourcesBySection: Map<string, StorySource[]>;
  isOwner?: boolean;
}

/** Short date formatter for margin card footers. */
function formatSourceDate(source: StorySource): string | null {
  // StorySource doesn't carry an activity date directly yet; use annotation
  // only if it looks date-shaped, otherwise return null.
  // Phase 2 will surface the underlying ToolActivity timestamp here.
  if (source.sourceType === 'user_note' || source.sourceType === 'wizard_answer') {
    return null;
  }
  return null;
}

function MarginCard({ source }: { source: StorySource }) {
  const isExcluded = !!source.excludedAt;
  const isWizard = source.sourceType === 'wizard_answer';
  const isNote = source.sourceType === 'user_note';
  const date = formatSourceDate(source);

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-md px-3 py-2.5 text-xs transition-all',
        'hover:border-primary-200 hover:shadow-[0_2px_8px_rgba(93,37,159,0.08)]',
        isExcluded && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {source.toolType ? (
          <ToolIcon tool={source.toolType as ToolType} className="h-3.5 w-3.5 shrink-0" />
        ) : isNote ? (
          <StickyNote className="h-3 w-3 text-amber-500 shrink-0" />
        ) : (
          <FileText className="h-3 w-3 text-gray-400 shrink-0" />
        )}
        <span className="font-medium text-gray-900 truncate flex-1">{source.label}</span>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary-600 hover:text-primary-700 shrink-0"
            aria-label="Open source"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {source.annotation && (
        <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{source.annotation}</p>
      )}
      {isWizard && (
        <p className="text-[10px] text-amber-600 italic mt-0.5">wizard answer</p>
      )}
      {date && (
        <p className="text-[10px] text-gray-400 mt-1">{date}</p>
      )}
    </div>
  );
}

export const StoryEvidenceView: React.FC<StoryEvidenceViewProps> = ({
  story,
  sectionKeys,
  sourcesBySection,
  isOwner,
}) => {
  const coverage = story.sourceCoverage;
  const totalSources = story.sources?.filter((s) => !s.excludedAt).length ?? 0;
  const groundedSections = sectionKeys.filter((k) => (sourcesBySection.get(k) ?? []).some((s) => !s.excludedAt)).length;
  const totalSections = sectionKeys.length;

  return (
    <div className="space-y-8">
      {/* Evidence summary strip */}
      <div className="flex items-center gap-5 py-2.5 px-4 bg-white rounded-lg border border-gray-200 text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
          <span className="font-medium text-gray-900">{totalSources} source{totalSources === 1 ? '' : 's'}</span>
        </div>
        <div className="h-3.5 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-gray-500">{groundedSections} of {totalSections} sections grounded</span>
        </div>
        {coverage && coverage.ungroundedClaims && coverage.ungroundedClaims.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-gray-500">{coverage.ungroundedClaims.length} ungrounded claim{coverage.ungroundedClaims.length === 1 ? '' : 's'}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-gray-400">
          <UserPlus className="h-3.5 w-3.5" />
          <span className="italic">Peer validation coming soon</span>
        </div>
      </div>

      {/* Tufte two-column layout */}
      <div className="grid grid-cols-[60fr_5fr_35fr] gap-0">
        {sectionKeys.map((key) => {
          const section = story.sections[key];
          if (!section) return null;
          const sectionLabel = key.charAt(0).toUpperCase() + key.slice(1);
          const sectionSources = (sourcesBySection.get(key) ?? []).filter((s) => !s.excludedAt);
          const ungrounded = coverage?.ungroundedClaims?.filter((v) => v.sectionKey === key) ?? [];
          const hasEvidence = sectionSources.length > 0;

          return (
            <React.Fragment key={key}>
              {/* Left: section prose */}
              <div className="pr-6 pb-10">
                <h2
                  className={cn(
                    'text-xs font-semibold uppercase tracking-[0.12em] mb-3',
                    hasEvidence ? 'text-primary-600' : 'text-amber-600',
                  )}
                >
                  {sectionLabel}
                  {!hasEvidence && (
                    <span className="ml-2 normal-case tracking-normal text-[10px] font-medium text-amber-600">
                      <AlertTriangle className="inline h-3 w-3 -mt-0.5 mr-0.5" />
                      No evidence yet
                    </span>
                  )}
                </h2>
                {section.summary ? (
                  <p className="font-serif text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {section.summary}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No content yet</p>
                )}

                {isOwner && ungrounded.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {ungrounded.map((v, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>Ungrounded: &ldquo;{v.match}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gutter: dashed hairline per section that has evidence */}
              <div className="relative">
                {hasEvidence && (
                  <div className="absolute left-1/2 top-5 -translate-x-1/2 h-[calc(100%-2.5rem)] border-l border-dashed border-gray-300" />
                )}
              </div>

              {/* Right: margin cards */}
              <div className="pl-2 pb-10 space-y-2">
                {sectionSources.length > 0 ? (
                  sectionSources.map((s) => <MarginCard key={s.id} source={s} />)
                ) : (
                  <div className="rounded-md border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2 text-[11px] text-amber-700 italic">
                    No source activities tied to this section.
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Author-only: edit suggestions awaiting accept/reject (Ship 3.3). */}
      {story.id && <EditSuggestionsPanel storyId={story.id} isOwner={isOwner} />}

      {/* Participants row. Ship 3.1b wires the "Invite to validate" picker -
          author clicks, section checkboxes open inline (auto-checked where
          the validator's activities ground the section), confirm posts +
          fires an in-app notification. Only renders for the author; Ship 3.2
          will relax for validators. */}
      {story.id && (
        <ParticipantsRow
          storyId={story.id}
          isOwner={isOwner}
          sectionKeys={sectionKeys}
          sourcesBySection={sourcesBySection}
        />
      )}
    </div>
  );
};
