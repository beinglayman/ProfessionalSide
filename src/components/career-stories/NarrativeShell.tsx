/**
 * NarrativeShell Component
 *
 * Shared document chrome for Stories (NarrativePreview) and
 * Derivations (LibraryDetail). Manages annotation state, toggle
 * state, popover rendering, and SVG connector lines.
 *
 * Uses a render prop pattern to pass typed props to children:
 *   <NarrativeShell owner={...}>
 *     {(shell) => <YourContent {...shell} />}
 *   </NarrativeShell>
 */

import React, { useState, useRef, useCallback } from 'react';
import type { StoryAnnotation, AnnotationStyle } from '../../types/career-stories';
import {
  useCreateAnnotation,
  useUpdateAnnotation,
  useDeleteAnnotation,
  useCreateDerivationAnnotation,
  useUpdateDerivationAnnotation,
  useDeleteDerivationAnnotation,
} from '../../hooks/useCareerStories';
import { SelectionPopover } from './SelectionPopover';
import { AnnotationPopover } from './AnnotationPopover';
import { getTextOffsetFromSelection } from './annotation-utils';

// =============================================================================
// TYPES
// =============================================================================

export type DocumentOwner =
  | { type: 'story'; id: string; annotations: StoryAnnotation[] }
  | { type: 'derivation'; id: string; annotations: StoryAnnotation[] };

export interface AnnotationHandlers {
  onAnnotationClick: (annotationId: string, element: HTMLElement) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  hoveredAnnotationId: string | null;
  onHoverAnnotation: (annotationId: string | null) => void;
}

export interface MarginProps {
  annotations: StoryAnnotation[];
  annotateMode: boolean;
  hasNotes: boolean;
  onCreateAside: (sectionKey: string, note: string) => void;
  onHoverAnnotation: (annotationId: string | null) => void;
  hoveredAnnotationId: string | null;
  onClearNote: (annotationId: string) => void;
  onDeleteAside: (annotationId: string) => void;
}

export interface NarrativeShellRenderProps {
  articleRef: React.RefObject<HTMLElement | null>;
  annotationHandlers: AnnotationHandlers;
  marginProps: MarginProps;
  showEmphasis: boolean;
  setShowEmphasis: (v: boolean) => void;
  practiceMode: boolean;
  setPracticeMode: (v: boolean) => void;
  timerActive: boolean;
  setTimerActive: (v: boolean) => void;
  showSourceMargin: boolean;
  setShowSourceMargin: (v: boolean) => void;
}

interface NarrativeShellProps {
  owner: DocumentOwner;
  children: (props: NarrativeShellRenderProps) => React.ReactNode;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function NarrativeShell({ owner, children, className }: NarrativeShellProps) {
  const articleRef = useRef<HTMLElement>(null);

  // Toggle state
  const [showEmphasis, setShowEmphasis] = useState(true);
  const [practiceMode, setPracticeMode] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [showSourceMargin, setShowSourceMargin] = useState(true);

  // Annotation popover state
  const [selectionPopover, setSelectionPopover] = useState<{
    position: { x: number; y: number };
    sectionKey: string;
    range: Range;
    containerEl: HTMLElement;
  } | null>(null);
  const [editPopover, setEditPopover] = useState<{
    position: { x: number; y: number };
    annotation: StoryAnnotation;
  } | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [connectorLine, setConnectorLine] = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);

  // Mutation hooks — always called (React rules), routing picks correct one
  const storyCreateMutation = useCreateAnnotation();
  const storyUpdateMutation = useUpdateAnnotation();
  const storyDeleteMutation = useDeleteAnnotation();
  const derivCreateMutation = useCreateDerivationAnnotation();
  const derivUpdateMutation = useUpdateDerivationAnnotation();
  const derivDeleteMutation = useDeleteDerivationAnnotation();

  const annotations = owner.annotations;
  const hasMarginNotes = annotations.some((a) => a.note);

  // =========================================================================
  // ANNOTATION HANDLERS
  // =========================================================================

  const handleArticleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const selectedText = range.toString().trim();
    if (!selectedText) return;

    const startNode = range.startContainer instanceof HTMLElement
      ? range.startContainer
      : range.startContainer.parentElement;
    if (!startNode) return;

    const sectionDiv = startNode.closest('[data-section-key]');
    if (!sectionDiv) return;

    const sectionKey = sectionDiv.getAttribute('data-section-key');
    if (!sectionKey) return;

    const contentParagraph = sectionDiv.querySelector('p');
    if (!contentParagraph) return;

    const rect = range.getBoundingClientRect();
    setSelectionPopover({
      position: { x: rect.left + rect.width / 2, y: rect.top },
      sectionKey,
      range: range.cloneRange(),
      containerEl: contentParagraph as HTMLElement,
    });
  }, []);

  const handleCreateAnnotation = useCallback((style: AnnotationStyle) => {
    if (!selectionPopover) return;

    const { range, containerEl, sectionKey } = selectionPopover;
    const offsets = getTextOffsetFromSelection(containerEl, range);
    if (!offsets) return;

    const annotatedText = range.toString();
    const input = {
      sectionKey,
      startOffset: offsets.start,
      endOffset: offsets.end,
      annotatedText,
      style,
    };

    if (owner.type === 'story') {
      storyCreateMutation.mutate({ storyId: owner.id, input });
    } else {
      derivCreateMutation.mutate({ derivationId: owner.id, input });
    }

    setSelectionPopover(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionPopover, owner, storyCreateMutation, derivCreateMutation]);

  const handleAnnotationClick = useCallback((annotationId: string, element: HTMLElement) => {
    const ann = annotations.find((a) => a.id === annotationId);
    if (!ann) return;

    const rect = element.getBoundingClientRect();
    setEditPopover({
      position: { x: rect.left + rect.width / 2, y: rect.bottom },
      annotation: ann,
    });
  }, [annotations]);

  const handleSaveAnnotationNote = useCallback((note: string | null) => {
    if (!editPopover) return;

    if (owner.type === 'story') {
      storyUpdateMutation.mutate({
        storyId: owner.id,
        annotationId: editPopover.annotation.id,
        input: { note },
      });
    } else {
      derivUpdateMutation.mutate({
        derivationId: owner.id,
        annotationId: editPopover.annotation.id,
        input: { note },
      });
    }

    setEditPopover(null);
  }, [editPopover, owner, storyUpdateMutation, derivUpdateMutation]);

  const handleRemoveAnnotation = useCallback(() => {
    if (!editPopover) return;

    setHoveredAnnotationId(null);
    setConnectorLine(null);

    if (owner.type === 'story') {
      storyDeleteMutation.mutate({ storyId: owner.id, annotationId: editPopover.annotation.id });
    } else {
      derivDeleteMutation.mutate({ derivationId: owner.id, annotationId: editPopover.annotation.id });
    }

    setEditPopover(null);
  }, [editPopover, owner, storyDeleteMutation, derivDeleteMutation]);

  const handleRemoveAnnotationById = useCallback((annotationId: string) => {
    setHoveredAnnotationId(null);
    setConnectorLine(null);

    if (owner.type === 'story') {
      storyDeleteMutation.mutate({ storyId: owner.id, annotationId });
    } else {
      derivDeleteMutation.mutate({ derivationId: owner.id, annotationId });
    }
  }, [owner, storyDeleteMutation, derivDeleteMutation]);

  const handleCreateAside = useCallback((sectionKey: string, note: string) => {
    const input = {
      sectionKey,
      startOffset: -1,
      endOffset: -1,
      annotatedText: '',
      style: 'aside' as AnnotationStyle,
      note,
    };

    if (owner.type === 'story') {
      storyCreateMutation.mutate({ storyId: owner.id, input });
    } else {
      derivCreateMutation.mutate({ derivationId: owner.id, input });
    }
  }, [owner, storyCreateMutation, derivCreateMutation]);

  const handleClearNote = useCallback((annotationId: string) => {
    setHoveredAnnotationId(null);
    setConnectorLine(null);

    if (owner.type === 'story') {
      storyUpdateMutation.mutate({ storyId: owner.id, annotationId, input: { note: null } });
    } else {
      derivUpdateMutation.mutate({ derivationId: owner.id, annotationId, input: { note: null } });
    }
  }, [owner, storyUpdateMutation, derivUpdateMutation]);

  const handleDeleteAside = useCallback((annotationId: string) => {
    setHoveredAnnotationId(null);
    setConnectorLine(null);

    if (owner.type === 'story') {
      storyDeleteMutation.mutate({ storyId: owner.id, annotationId });
    } else {
      derivDeleteMutation.mutate({ derivationId: owner.id, annotationId });
    }
  }, [owner, storyDeleteMutation, derivDeleteMutation]);

  const handleHoverAnnotation = useCallback((annotationId: string | null) => {
    setHoveredAnnotationId(annotationId);

    if (!annotationId || !articleRef.current) {
      setConnectorLine(null);
      return;
    }

    const articleRect = articleRef.current.getBoundingClientRect();

    const marginEl = articleRef.current.querySelector(
      `[data-margin-annotation-id="${annotationId}"]`
    ) as HTMLElement | null;

    const textEl = articleRef.current.querySelector(
      `[data-annotation-id="${annotationId}"]`
    ) as HTMLElement | null;

    if (!marginEl || !textEl) {
      setConnectorLine(null);
      return;
    }

    const marginRect = marginEl.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();

    setConnectorLine({
      x1: marginRect.right - articleRect.left,
      y1: marginRect.top + marginRect.height / 2 - articleRect.top,
      x2: textRect.left - articleRect.left,
      y2: textRect.top + textRect.height / 2 - articleRect.top,
    });
  }, []);

  // =========================================================================
  // RENDER PROPS
  // =========================================================================

  const renderProps: NarrativeShellRenderProps = {
    articleRef,
    annotationHandlers: {
      onAnnotationClick: handleAnnotationClick,
      onDeleteAnnotation: handleRemoveAnnotationById,
      hoveredAnnotationId,
      onHoverAnnotation: handleHoverAnnotation,
    },
    marginProps: {
      annotations,
      annotateMode: true,
      hasNotes: hasMarginNotes,
      onCreateAside: handleCreateAside,
      onHoverAnnotation: handleHoverAnnotation,
      hoveredAnnotationId,
      onClearNote: handleClearNote,
      onDeleteAside: handleDeleteAside,
    },
    showEmphasis,
    setShowEmphasis,
    practiceMode,
    setPracticeMode,
    timerActive,
    setTimerActive,
    showSourceMargin,
    setShowSourceMargin,
  };

  return (
    <article
      ref={articleRef}
      className={className ?? 'relative bg-white'}
      data-testid={owner.type === 'story' ? 'star-preview' : 'derivation-detail'}
      onMouseUp={handleArticleMouseUp}
    >
      {children(renderProps)}

      {/* SVG connector line between margin note and text mark */}
      {connectorLine && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          <line
            x1={connectorLine.x1}
            y1={connectorLine.y1}
            x2={connectorLine.x2}
            y2={connectorLine.y2}
            stroke="#b45309"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            opacity="0.7"
          />
        </svg>
      )}

      {/* Annotation popovers — rendered at article level */}
      {selectionPopover && (
        <SelectionPopover
          position={selectionPopover.position}
          onSelectStyle={handleCreateAnnotation}
          onClose={() => setSelectionPopover(null)}
        />
      )}

      {editPopover && (
        <AnnotationPopover
          position={editPopover.position}
          annotatedText={editPopover.annotation.annotatedText}
          initialNote={editPopover.annotation.note}
          onSave={handleSaveAnnotationNote}
          onRemove={handleRemoveAnnotation}
          onClose={() => setEditPopover(null)}
        />
      )}
    </article>
  );
}
