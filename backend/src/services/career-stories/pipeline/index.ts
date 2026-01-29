/**
 * Career Stories Pipeline
 *
 * Processors:
 * - RefExtractor: Extracts cross-tool references from activity text
 * - ClusterExtractor: Groups activities by shared references
 *
 * Both processors follow the same lifecycle:
 * 1. process(input, options) → ProcessorResult<output>
 * 2. validate() → throws if misconfigured
 * 3. Consistent diagnostics and error handling
 */

export * from './types';
