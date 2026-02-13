/**
 * Annotation Color Palette
 *
 * 7 preset colors for annotation marks. Any color can combine with any style.
 * `null` in DB = amber fallback (backward compatibility).
 */

export type AnnotationColorId = 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'orange' | 'cyan';

export interface AnnotationColorDef {
  id: AnnotationColorId;
  dot: string;     // swatch color
  fill: string;    // highlight background (25% opacity)
  stroke: string;  // underline / box / circle / bracket stroke
}

export const ANNOTATION_COLORS: AnnotationColorDef[] = [
  { id: 'amber',   dot: '#f59e0b', fill: 'rgba(251,191,36,0.25)',  stroke: '#d97706' },
  { id: 'rose',    dot: '#fb7185', fill: 'rgba(251,113,133,0.25)', stroke: '#e11d48' },
  { id: 'blue',    dot: '#60a5fa', fill: 'rgba(96,165,250,0.25)',  stroke: '#2563eb' },
  { id: 'emerald', dot: '#34d399', fill: 'rgba(52,211,153,0.25)',  stroke: '#059669' },
  { id: 'violet',  dot: '#a78bfa', fill: 'rgba(167,139,250,0.25)', stroke: '#7c3aed' },
  { id: 'orange',  dot: '#fb923c', fill: 'rgba(251,146,60,0.25)',  stroke: '#ea580c' },
  { id: 'cyan',    dot: '#22d3ee', fill: 'rgba(34,211,238,0.25)',  stroke: '#0891b2' },
];

export const DEFAULT_COLOR_ID: AnnotationColorId = 'amber';

const COLOR_MAP = new Map(ANNOTATION_COLORS.map((c) => [c.id, c]));

/** Look up a color def by ID. Returns amber for null/undefined/unknown values. */
export function getColorById(colorId: string | null | undefined): AnnotationColorDef {
  return COLOR_MAP.get(colorId as AnnotationColorId) ?? COLOR_MAP.get(DEFAULT_COLOR_ID)!;
}

/** Hover ring box-shadow for an annotation color (~45% opacity). */
export function hoverRingShadow(colorId: string | null | undefined): string {
  return `0 0 0 2px ${getColorById(colorId).stroke}73`;
}
