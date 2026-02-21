/**
 * Ephemeral Warning Annotations
 *
 * Generates synthetic StoryAnnotation objects from coverage warnings
 * (vague metrics + ungrounded claims). These are computed at render time,
 * never persisted to DB, and rendered inline via the existing annotation
 * pipeline (rough-notation underline overlays).
 *
 * IDs are prefixed with "warning-" so click/delete handlers can skip them.
 */

import type { StoryAnnotation, SourceCoverage } from '../types/career-stories';

const WARNING_COLOR = 'orange';
const WARNING_STYLE = 'underline';

type CoverageWarning = { sectionKey: string; match: string; suggestion: string };

/**
 * Build ephemeral annotations for a single section's text.
 * Finds the matched substring in the text and creates a synthetic annotation.
 */
export function buildWarningAnnotations(
  sectionKey: string,
  sectionText: string,
  warnings: CoverageWarning[],
): StoryAnnotation[] {
  const annotations: StoryAnnotation[] = [];

  for (const warning of warnings) {
    if (warning.sectionKey !== sectionKey) continue;

    const idx = sectionText.indexOf(warning.match);
    if (idx === -1) continue;

    annotations.push({
      id: `warning-${sectionKey}-${idx}`,
      storyId: null,
      derivationId: null,
      sectionKey,
      startOffset: idx,
      endOffset: idx + warning.match.length,
      annotatedText: warning.match,
      style: WARNING_STYLE,
      color: WARNING_COLOR,
      note: warning.suggestion,
      createdAt: '',
      updatedAt: '',
    });
  }

  return annotations;
}

/**
 * Merge real (DB-backed) annotations with ephemeral warning annotations.
 * Warning annotations are appended after real ones; the annotation pipeline
 * handles overlap by "first one wins" in splitTextByAnnotations.
 */
export function mergeWarningAnnotations(
  realAnnotations: StoryAnnotation[] | undefined,
  sectionKey: string,
  sectionText: string,
  sourceCoverage: SourceCoverage | undefined,
): StoryAnnotation[] {
  const real = realAnnotations || [];
  if (!sourceCoverage) return real;

  const warnings: CoverageWarning[] = [
    ...(sourceCoverage.vagueMetrics || []),
    ...(sourceCoverage.ungroundedClaims || []),
  ];

  if (warnings.length === 0) return real;

  const ephemeral = buildWarningAnnotations(sectionKey, sectionText, warnings);
  return [...real, ...ephemeral];
}
