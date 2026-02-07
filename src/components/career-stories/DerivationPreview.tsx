/**
 * DerivationPreview Component
 *
 * Context-appropriate preview frames for each derivation type.
 * Shows generated text in a format that matches where it will be used.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2, Clock, MessageSquare, User } from 'lucide-react';
import type { DerivationType } from '../../types/career-stories';
import { DERIVATION_TYPE_META } from './constants';

interface FrameProps {
  text: string;
  charCount?: number;
  wordCount?: number;
  speakingTimeSec?: number;
}

interface DerivationPreviewProps {
  derivation: DerivationType;
  text: string | null;
  isGenerating: boolean;
  charCount?: number;
  wordCount?: number;
  speakingTimeSec?: number;
  /** Original story sections for empty-state preview */
  storySections?: Record<string, { summary: string }>;
  storyTitle?: string;
}

// =============================================================================
// SKELETON
// =============================================================================

function PreviewSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-5/6" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
    </div>
  );
}

// =============================================================================
// PREVIEW FRAMES
// =============================================================================

function LinkedInFrame({ text, charCount }: FrameProps) {
  const maxChars = 1300;
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* LinkedIn header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">You</div>
          <div className="text-xs text-gray-500">Just now</div>
        </div>
      </div>
      {/* Post body */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
      {/* Char counter */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Like</span>
          <span>Comment</span>
          <span>Repost</span>
        </div>
        <span className={cn('text-xs font-mono', charCount && charCount > maxChars ? 'text-red-500' : 'text-gray-400')}>
          {charCount ?? 0}/{maxChars}
        </span>
      </div>
    </div>
  );
}

function ResumeFrame({ text }: FrameProps) {
  return (
    <div className="bg-white rounded-lg border-l-4 border-l-gray-800 border border-gray-200 px-5 py-4 font-serif">
      <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function InterviewFrame({ text, speakingTimeSec }: FrameProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <MessageSquare className="h-4 w-4" />
          <span>Interview Answer</span>
        </div>
        {speakingTimeSec && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>~{Math.round(speakingTimeSec / 60)}m {speakingTimeSec % 60}s</span>
          </div>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function OneOnOneFrame({ text, speakingTimeSec }: FrameProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">1:1 Talking Points</span>
        {speakingTimeSec && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>~{Math.round(speakingTimeSec / 60)}m</span>
          </div>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function SelfAssessmentFrame({ text }: FrameProps) {
  return (
    <div className="bg-amber-50/50 rounded-lg border border-amber-200/60 px-5 py-4">
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

function TeamShareFrame({ text }: FrameProps) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <User className="h-4 w-4 text-green-600" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex-1">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// =============================================================================
// FRAME MAP
// =============================================================================

const FRAME_MAP: Record<DerivationType, React.FC<FrameProps>> = {
  linkedin: LinkedInFrame,
  resume: ResumeFrame,
  interview: InterviewFrame,
  'one-on-one': OneOnOneFrame,
  'self-assessment': SelfAssessmentFrame,
  'team-share': TeamShareFrame,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DerivationPreview({
  derivation,
  text,
  isGenerating,
  charCount,
  wordCount,
  speakingTimeSec,
  storySections,
  storyTitle,
}: DerivationPreviewProps) {
  const meta = DERIVATION_TYPE_META[derivation];

  // Empty state — show original story as reference + type hint
  if (!text && !isGenerating) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50/60 border border-blue-100 rounded-lg px-4 py-3">
          <div className="text-xs font-medium text-blue-700 mb-1">
            {meta.label} — {meta.maxLength}
          </div>
          <p className="text-xs text-blue-600/80">{meta.description}</p>
        </div>
        {storySections && (
          <div className="space-y-2 opacity-50">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Original story</div>
            {storyTitle && <div className="text-sm font-medium text-gray-700">{storyTitle}</div>}
            {Object.entries(storySections).map(([key, section]) => (
              <div key={key} className="text-xs text-gray-500">
                <span className="font-medium capitalize">{key}:</span>{' '}
                {section.summary?.slice(0, 120)}{section.summary?.length > 120 ? '...' : ''}
              </div>
            ))}
          </div>
        )}
        <div className="text-center text-xs text-gray-400 pt-2">
          Hit Generate to rewrite
        </div>
      </div>
    );
  }

  // Loading
  if (isGenerating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating {DERIVATION_TYPE_META[derivation].label.toLowerCase()}...</span>
        </div>
        <PreviewSkeleton />
      </div>
    );
  }

  if (!text) return null;

  // Render appropriate frame via map lookup
  const Frame = FRAME_MAP[derivation];

  return (
    <div className="space-y-3">
      <Frame text={text} charCount={charCount} wordCount={wordCount} speakingTimeSec={speakingTimeSec} />

      {/* Word/char count footer */}
      {(wordCount || charCount) && (
        <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
          {wordCount && <span>{wordCount} words</span>}
          {charCount && <span>{charCount} chars</span>}
        </div>
      )}
    </div>
  );
}
