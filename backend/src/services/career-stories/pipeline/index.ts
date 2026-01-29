/**
 * Career Stories Pipeline
 *
 * Processors (in order):
 * 1. RefExtractor: Extracts cross-tool references from activity text
 * 2. ClusterExtractor: Groups activities by shared references
 * 3. STARExtractor: Transforms clusters into STAR narratives
 *
 * Supporting components:
 * - ClusterHydrator: Enriches clusters with full activity data
 * - IdentityMatcher: Matches activities to user's CareerPersona
 *
 * All processors follow the same lifecycle:
 * 1. process(input, options) → ProcessorResult<output>
 * 2. validate() → throws if misconfigured
 * 3. Consistent diagnostics and error handling
 */

export * from './types';

// Processors
export { RefExtractor, refExtractor } from './ref-extractor';
export { ClusterExtractor, clusterExtractor } from './cluster-extractor';
export { STARExtractor, starExtractor } from './star-extractor';

// Supporting components
export { ClusterHydrator, clusterHydrator } from './cluster-hydrator';
export type { RawActivity, ActivityWithRefs } from './cluster-hydrator';
export { IdentityMatcher } from './identity-matcher';

// Narrative frameworks (for UI)
export {
  NARRATIVE_FRAMEWORKS,
  getAllFrameworks,
  getFramework,
  recommendFrameworks,
  QUESTION_TO_FRAMEWORK,
} from './narrative-frameworks';
export type { NarrativeFrameworkUIDefinition } from './narrative-frameworks';
