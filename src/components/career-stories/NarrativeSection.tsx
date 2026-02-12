import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DELIVERY_CUES,
  SECTION_COACHING,
  SECTION_FIX,
} from './constants';
import type { StoryAnnotation } from '../../types/career-stories';
import { AnnotatedText } from './AnnotatedText';

interface NarrativeSectionProps {
  sectionKey: string;
  label: string;
  content: string;
  confidence: number;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  isFirst?: boolean;
  showCoaching?: boolean;
  showDeliveryCues?: boolean;
  showEmphasis?: boolean;
  hideHeader?: boolean;
  annotations?: StoryAnnotation[];
  onAnnotationClick?: (annotationId: string, element: HTMLElement) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  hoveredAnnotationId?: string | null;
  onHoverAnnotation?: (annotationId: string | null) => void;
}

export const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  sectionKey,
  label,
  content,
  confidence,
  isEditing,
  editValue,
  onEditChange,
  isFirst = false,
  showCoaching = false,
  showDeliveryCues = false,
  showEmphasis = true,
  hideHeader = false,
  annotations = [],
  onAnnotationClick,
  onDeleteAnnotation,
  hoveredAnnotationId,
  onHoverAnnotation,
}) => {
  const [showTip, setShowTip] = useState(false);

  const coaching = SECTION_COACHING[sectionKey.toLowerCase()];
  const deliveryCue = DELIVERY_CUES[sectionKey.toLowerCase()];

  // Confidence rating label + tooltip text
  const ratingLabel = confidence >= 0.75 ? 'Strong' : confidence >= 0.5 ? 'Fair' : confidence >= 0.3 ? 'Weak' : 'Missing';
  const ratingClass = confidence >= 0.75 ? 'bg-emerald-50 text-emerald-700' : confidence >= 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
  const ratingTooltip = confidence >= 0.75
    ? `Strong section — specific details, clear ownership, quantified impact.`
    : confidence >= 0.5
    ? `Fair section — has structure but needs more specifics. ${coaching?.tip || 'Add concrete numbers and details.'}`
    : confidence >= 0.3
    ? `Weak section — too vague for interviews. ${coaching?.tip || 'Be specific about what YOU did and the measurable result.'}`
    : `Missing content — this section needs to be filled in. ${coaching?.tip || 'Add details to strengthen your story.'}`;

  return (
    <div className="relative">
      {/* Section header row — Datawrapper style: label + rating badge */}
      {!hideHeader && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-gray-200">
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-bold uppercase tracking-[1px] text-gray-500">{label}</span>
            {showCoaching && coaching && (
              <button
                onClick={() => setShowTip(!showTip)}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 transition-colors',
                  showTip
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                )}
                aria-expanded={showTip}
              >
                <Lightbulb className="w-3 h-3" />
                <span className="hidden sm:inline">Review</span>
              </button>
            )}
          </div>
          <span
            className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded cursor-help', ratingClass)}
            title={ratingTooltip}
          >
            {ratingLabel}
          </span>
        </div>
      )}

      {/* Coach review panel — callout box style (matches journal Achievement/Reasoning boxes) */}
      {showTip && coaching && (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-800">Interview Coach</span>
          </div>
          <ul className="space-y-1.5 ml-6">
            <li className="text-xs text-amber-700 leading-relaxed">
              {coaching.tip}
            </li>
            <li className="text-xs text-amber-700 leading-relaxed">
              {coaching.interviewNote}
            </li>
          </ul>
          <div className="mt-3 ml-6 pt-2 border-t border-amber-200/60">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">How to fix</span>
            <p className="text-xs text-gray-700 leading-relaxed mt-0.5">
              {SECTION_FIX[sectionKey.toLowerCase()] || 'Be specific and quantify wherever possible.'}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className={cn(
              'w-full p-3.5 border border-gray-200 rounded text-[14px] resize-none',
              'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'bg-white transition-shadow'
            )}
            rows={4}
            placeholder={`Describe the ${label.toLowerCase()}...`}
          />
          {coaching && (
            <p className="mt-2 text-[11px] text-gray-500 italic">
              {coaching.tip}
            </p>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Opening delivery cue */}
          {showDeliveryCues && deliveryCue && (
            <div className="mb-2.5 text-[10px] text-gray-400 italic flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {deliveryCue.openingCue}
            </div>
          )}

          <AnnotatedText
            text={content}
            annotations={annotations}
            sectionKey={sectionKey}
            showEmphasis={showEmphasis}
            onAnnotationClick={onAnnotationClick}
            onDeleteAnnotation={onDeleteAnnotation}
            hoveredAnnotationId={hoveredAnnotationId}
            onHoverAnnotation={onHoverAnnotation}
          />

          {/* Closing delivery cue */}
          {showDeliveryCues && deliveryCue && (
            <div className="mt-2.5 text-[10px] text-gray-400 italic flex items-center gap-1.5 justify-end">
              {deliveryCue.closingCue}
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
