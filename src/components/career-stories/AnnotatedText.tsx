/**
 * AnnotatedText Component
 *
 * Shared annotation rendering for stories and derivations.
 * Splits text by annotation offsets, renders annotated spans with
 * rough-notation SVG overlays and emphasis pipeline.
 *
 * Extracted from NarrativeSection for reuse in:
 * - NarrativeSection (story sections)
 * - LibraryDetail (derivation content)
 */

import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { StoryAnnotation } from '../../types/career-stories';
import { splitTextByAnnotations } from './annotation-utils';
import { useRoughAnnotations } from '../../hooks/useRoughAnnotations';
import { renderEmphasisContent } from './emphasis-renderer';
import { hoverRingShadow } from './annotation-colors';

interface AnnotatedTextProps {
  text: string;
  annotations: StoryAnnotation[];
  sectionKey: string;
  showEmphasis?: boolean;
  onAnnotationClick?: (annotationId: string, element: HTMLElement) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  hoveredAnnotationId?: string | null;
  onHoverAnnotation?: (annotationId: string | null) => void;
  className?: string;
}

export const AnnotatedText: React.FC<AnnotatedTextProps> = ({
  text,
  annotations,
  sectionKey,
  showEmphasis = true,
  onAnnotationClick,
  onDeleteAnnotation,
  hoveredAnnotationId,
  onHoverAnnotation,
  className,
}) => {
  const contentRef = useRef<HTMLParagraphElement>(null);

  // Filter annotations for this section
  const sectionAnnotations = annotations.filter((a) => a.sectionKey === sectionKey);

  // Apply rough-notation SVG overlays after DOM mount
  useRoughAnnotations(contentRef, sectionAnnotations, text);

  return (
    <p ref={contentRef} className={cn('text-[15px] leading-[1.75] text-gray-800', className)}>
      {sectionAnnotations.length > 0
        ? splitTextByAnnotations(text, sectionAnnotations).map((seg, i) => {
            if (!seg.annotationId) {
              return <React.Fragment key={`seg-${i}`}>{renderEmphasisContent(seg.text, showEmphasis, sectionKey)}</React.Fragment>;
            }

            const isWarning = seg.annotationId.startsWith('warning-');

            return (
              <span
                key={`ann-${seg.annotationId}`}
                data-annotation-id={seg.annotationId}
                className={cn(
                  'relative transition-shadow duration-150 rounded-sm inline',
                  isWarning ? 'cursor-default' : 'cursor-pointer group/ann',
                )}
                style={hoveredAnnotationId === seg.annotationId
                  ? { boxShadow: hoverRingShadow(seg.annotation?.color) }
                  : undefined
                }
                title={isWarning ? seg.annotation?.note || undefined : undefined}
                onClick={isWarning ? undefined : (e) => onAnnotationClick?.(seg.annotationId!, e.currentTarget)}
                onMouseEnter={() => onHoverAnnotation?.(seg.annotationId!)}
                onMouseLeave={() => onHoverAnnotation?.(null)}
              >
                {renderEmphasisContent(seg.text, showEmphasis, sectionKey)}
                {!isWarning && onDeleteAnnotation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAnnotation(seg.annotationId!);
                    }}
                    className="hidden group-hover/ann:inline-flex items-center justify-center w-4 h-4 -mt-1 ml-0.5 rounded-full bg-white shadow-sm ring-1 ring-gray-200 text-gray-400 hover:text-red-500 hover:ring-red-200 transition-colors align-middle"
                    title="Remove highlight"
                    aria-label="Remove highlight"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            );
          })
        : renderEmphasisContent(text, showEmphasis, sectionKey)}
    </p>
  );
};
