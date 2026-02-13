import { useMemo } from 'react';
import { capitalizeFirst, derivationSectionLabel } from './constants';
import type { StoryDerivation, CareerStory, StorySource } from '../../types/career-stories';

/**
 * Derives display data for LibraryDetail from item, stories, and sources.
 * Extracts 8 useMemo computations from the component for readability.
 */
export function useLibraryDetailData(
  item: StoryDerivation,
  allStories: CareerStory[],
  derivationSources: StorySource[],
) {
  // Section keys — prefer sectionOrder (preserves LLM order), fall back to Object.keys
  const sectionKeys = useMemo(() => {
    if (item.sectionOrder && item.sectionOrder.length > 0) {
      return item.sectionOrder;
    }
    if (item.sections) {
      return Object.keys(item.sections);
    }
    return ['content'];
  }, [item.sectionOrder, item.sections]);

  // Sources grouped by section key
  const sourcesBySection = useMemo(() => {
    const map: Record<string, StorySource[]> = {};
    for (const source of derivationSources) {
      if (source.excludedAt) continue;
      if (!map[source.sectionKey]) map[source.sectionKey] = [];
      map[source.sectionKey].push(source);
    }
    return map;
  }, [derivationSources]);

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
    const lengths = sectionKeys.map(key => (item.sections?.[key]?.summary ?? '').length);
    const totalLen = lengths.reduce((a, b) => a + b, 0) || 1;
    return sectionKeys.map((key, i) => {
      const pct = Math.round((lengths[i] / totalLen) * 100);
      const secs = Math.round((lengths[i] / totalLen) * estimatedTime);
      return { key, label: derivationSectionLabel(key), seconds: secs, percentage: pct };
    });
  }, [sectionKeys, item.sections, item.type, estimatedTime]);

  return {
    sectionKeys,
    sourcesBySection,
    activeSources,
    uniqueTools,
    activitySources,
    estimatedTime,
    sectionTimings,
  };
}
