/**
 * useRoughAnnotations Hook
 *
 * Bridges React DOM refs to rough-notation annotate() calls.
 * Finds <span data-annotation-id="..."> elements within a container,
 * applies rough-notation SVG overlays, and cleans up on unmount/re-render.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { annotate, type Annotation as RNAnnotation } from 'rough-notation';
import type { StoryAnnotation, AnnotationStyle } from '../types/career-stories';
import { getColorById } from '../components/career-stories/annotation-colors';

type RNType = 'highlight' | 'underline' | 'box' | 'circle' | 'strike-through' | 'bracket';

interface StyleDef {
  rnType: RNType;
  strokeWidth: number;
  padding: number | [number, number];
  brackets?: ('left' | 'right' | 'top' | 'bottom')[];
}

const STYLE_CONFIG: Record<Exclude<AnnotationStyle, 'aside'>, StyleDef> = {
  highlight: { rnType: 'highlight', strokeWidth: 1, padding: [2, 3] },
  underline: { rnType: 'underline', strokeWidth: 2.5, padding: [0, 2] },
  box: { rnType: 'box', strokeWidth: 2, padding: 4 },
  circle: { rnType: 'circle', strokeWidth: 2, padding: 8 },
  'strike-through': { rnType: 'strike-through', strokeWidth: 2.5, padding: 0 },
  bracket: { rnType: 'bracket', strokeWidth: 2, padding: 4, brackets: ['left', 'right'] },
};

// =============================================================================
// HOOK
// =============================================================================

export function useRoughAnnotations(
  containerRef: RefObject<HTMLElement | null>,
  annotations: StoryAnnotation[],
  sectionText: string
) {
  const rnInstancesRef = useRef<RNAnnotation[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clean up previous annotations
    for (const inst of rnInstancesRef.current) {
      inst.remove();
    }
    rnInstancesRef.current = [];

    // Filter to text-anchored, non-stale annotations
    const valid = annotations.filter((a) => {
      if (a.style === 'aside') return false;
      if (a.startOffset < 0) return false;
      return sectionText.slice(a.startOffset, a.endOffset) === a.annotatedText;
    });

    for (const ann of valid) {
      const span = container.querySelector(`[data-annotation-id="${ann.id}"]`);
      if (!span || !(span instanceof HTMLElement)) continue;

      const styleDef = STYLE_CONFIG[ann.style as Exclude<AnnotationStyle, 'aside'>];
      if (!styleDef) continue;

      const colorDef = getColorById(ann.color);

      const rnOptions: Parameters<typeof annotate>[1] = {
        type: styleDef.rnType,
        color: styleDef.rnType === 'highlight' ? colorDef.fill : colorDef.stroke,
        strokeWidth: styleDef.strokeWidth,
        padding: styleDef.padding as number,
        animate: true,
        animationDuration: 300,
        multiline: true,
      };

      if (styleDef.brackets) {
        rnOptions.brackets = styleDef.brackets;
      }

      const inst = annotate(span, rnOptions);
      inst.show();
      rnInstancesRef.current.push(inst);
    }

    return () => {
      for (const inst of rnInstancesRef.current) {
        inst.remove();
      }
      rnInstancesRef.current = [];
    };
  }, [containerRef, annotations, sectionText]);
}
