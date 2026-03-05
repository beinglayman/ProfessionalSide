/**
 * Shared source filtering logic for career stories.
 * Filters out excluded sources and wizard answers for public-facing views.
 */
export function filterSources<T extends { excludedAt?: Date | string | null; sourceType: string }>(
  sources: T[]
): T[] {
  return sources.filter(s => !s.excludedAt && s.sourceType !== 'wizard_answer');
}
