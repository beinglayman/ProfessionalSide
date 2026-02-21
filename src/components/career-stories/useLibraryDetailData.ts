import { useMemo } from 'react';
import { capitalizeFirst, derivationSectionLabel } from './constants';
import { normalizeSections, groupSourcesBySection } from './derivation-helpers';
import type { StoryDerivation, CareerStory, StorySource, SourceCoverage } from '../../types/career-stories';
import { computeClientCoverage } from '../../lib/coverage';

/**
 * Derives display data for LibraryDetail from item, stories, and sources.
 * Extracts 8 useMemo computations from the component for readability.
 *
 * Normalizes sections on entry — recovers structured sections when
 * parseSectionsFromLLM fell through and stored raw JSON as a single "content" section.
 */
export function useLibraryDetailData(
  item: StoryDerivation,
  allStories: CareerStory[],
  derivationSources: StorySource[],
) {
  // Normalize sections — recover structured data from raw JSON fallback
  const normalized = useMemo(
    () => normalizeSections(item.sections, item.sectionOrder, item.text),
    [item.sections, item.sectionOrder, item.text],
  );

  // Section keys — prefer sectionOrder (preserves LLM order), fall back to Object.keys
  const sectionKeys = useMemo(() => {
    if (normalized.sectionOrder.length > 0) {
      return normalized.sectionOrder;
    }
    const keys = Object.keys(normalized.sections);
    return keys.length > 0 ? keys : ['content'];
  }, [normalized.sectionOrder, normalized.sections]);

  // Sources grouped by section key (with smart distribution for unmatched keys)
  const sourcesBySection = useMemo(() => {
    const active = derivationSources.filter(s => !s.excludedAt);
    return groupSourcesBySection(active, sectionKeys);
  }, [derivationSources, sectionKeys]);

  // Source coverage (vague metrics + ungrounded claims)
  const sourceCoverage = useMemo<SourceCoverage>(
    () => computeClientCoverage(derivationSources, normalized.sections, sectionKeys),
    [derivationSources, normalized.sections, sectionKeys],
  );

  // All active sources (for provenance icon stack)
  const activeSources = useMemo(
    () => derivationSources.filter(s => !s.excludedAt),
    [derivationSources],
  );

  // Fallback: old derivations (pre-sections) have no snapshotted sources.
  // Show parent story sources instead for the provenance icon stack.
  const fallbackSources = useMemo(() => {
    if (activeSources.length > 0) return activeSources;
    const sources: StorySource[] = [];
    const seen = new Set<string>();
    for (const sid of item.storyIds) {
      const story = allStories.find(s => s.id === sid);
      if (!story?.sources) continue;
      for (const src of story.sources) {
        if (src.excludedAt || seen.has(src.id)) continue;
        seen.add(src.id);
        sources.push(src);
      }
    }
    return sources;
  }, [activeSources, item.storyIds, allStories]);

  // Unique tool types for provenance icon stack
  const uniqueTools = useMemo(() => {
    const tools = new Set<string>();
    for (const src of fallbackSources) {
      if (src.toolType) tools.add(src.toolType);
    }
    return [...tools].slice(0, 4);
  }, [fallbackSources]);

  // Activity sources only (for mobile footnotes)
  const activitySources = useMemo(
    () => fallbackSources.filter(s => s.sourceType === 'activity'),
    [fallbackSources],
  );

  // Practice timer: total estimated speaking time
  const estimatedTime = useMemo(
    () => Math.ceil((item.wordCount / 150) * 60),
    [item.wordCount],
  );

  // Practice timer: per-section timings
  const sectionTimings = useMemo(() => {
    if (sectionKeys.length === 1) {
      return [{ key: sectionKeys[0], label: capitalizeFirst(item.type), seconds: estimatedTime, percentage: 100 }];
    }
    const lengths = sectionKeys.map(key => (normalized.sections[key]?.summary ?? '').length);
    const totalLen = lengths.reduce((a, b) => a + b, 0) || 1;
    return sectionKeys.map((key, i) => {
      const pct = Math.round((lengths[i] / totalLen) * 100);
      const secs = Math.round((lengths[i] / totalLen) * estimatedTime);
      return { key, label: derivationSectionLabel(key), seconds: secs, percentage: pct };
    });
  }, [sectionKeys, normalized.sections, item.type, estimatedTime]);

  return {
    sectionKeys,
    normalized,
    sourcesBySection,
    sourceCoverage,
    activeSources,
    uniqueTools,
    activitySources,
    estimatedTime,
    sectionTimings,
  };
}
