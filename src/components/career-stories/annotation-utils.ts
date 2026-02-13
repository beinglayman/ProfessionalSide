/**
 * Annotation Utilities
 *
 * Pure functions for text splitting and DOM offset computation.
 * Used by NarrativeSection to render annotation spans and by
 * UnifiedAnnotationPopover to compute character offsets from DOM selections.
 */

import type { StoryAnnotation } from '../../types/career-stories';

// =============================================================================
// TEXT SPLITTING
// =============================================================================

export interface TextSegment {
  text: string;
  annotationId?: string;
  annotation?: StoryAnnotation;
}

/**
 * Split section text into segments based on annotation offsets.
 * Annotated regions become separate segments with annotation metadata.
 * Non-annotated text fills the gaps between annotations.
 *
 * Stale annotations (where the text at the offset doesn't match annotatedText)
 * are silently skipped. Asides (startOffset === -1) are excluded from text splitting.
 */
export function splitTextByAnnotations(
  text: string,
  annotations: StoryAnnotation[]
): TextSegment[] {
  // Filter to text-anchored, non-stale annotations sorted by startOffset
  const valid = annotations
    .filter((a) => a.startOffset >= 0 && a.endOffset >= 0 && a.style !== 'aside')
    .filter((a) => text.slice(a.startOffset, a.endOffset) === a.annotatedText)
    .sort((a, b) => a.startOffset - b.startOffset);

  if (valid.length === 0) {
    return [{ text }];
  }

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const ann of valid) {
    // Skip overlapping annotations (first one wins)
    if (ann.startOffset < cursor) continue;

    // Gap before this annotation
    if (ann.startOffset > cursor) {
      segments.push({ text: text.slice(cursor, ann.startOffset) });
    }

    // The annotated segment
    segments.push({
      text: text.slice(ann.startOffset, ann.endOffset),
      annotationId: ann.id,
      annotation: ann,
    });

    cursor = ann.endOffset;
  }

  // Trailing text after last annotation
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

// =============================================================================
// DOM OFFSET COMPUTATION
// =============================================================================

/**
 * Convert a DOM Selection Range into character offsets relative to the raw
 * section text. This walks text nodes via TreeWalker, accumulating character
 * counts to translate Range.startContainer/startOffset into plain-text offsets.
 *
 * This is necessary because the DOM contains nested <mark>, <span>, <strong>
 * elements from the emphasis pipeline, but we need offsets into the raw text.
 */
export function getTextOffsetFromSelection(
  container: HTMLElement,
  range: Range
): { start: number; end: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let start = -1;
  let end = -1;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const len = node.textContent?.length || 0;

    if (node === range.startContainer) {
      start = charCount + range.startOffset;
    }
    if (node === range.endContainer) {
      end = charCount + range.endOffset;
      break;
    }

    charCount += len;
  }

  if (start === -1 || end === -1 || start >= end) {
    return null;
  }

  return { start, end };
}
