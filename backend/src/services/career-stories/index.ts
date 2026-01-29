/**
 * Career Stories Services
 *
 * Services for the career stories feature:
 * - RefExtractorService: Extract cross-tool references from text
 * - ActivityPersistenceService: Store tool activities
 * - ClusteringService: Group activities into story clusters
 */

export {
  RefExtractorService,
  refExtractor,
} from './ref-extractor.service';

export {
  ActivityPersistenceService,
  ActivityInput,
} from './activity-persistence.service';

export {
  ClusteringService,
  DateRange,
  ClusterResult,
} from './clustering.service';

export {
  generateMockActivities,
  getExpectedClusters,
} from './mock-data.service';

export {
  STARGenerationService,
  starGenerationService,
  STARGenerationOptions,
  STARGenerationResult,
} from './star-generation.service';

export {
  LLMPolisherService,
  llmPolisherService,
  PolishResult,
  PolishedSTAR,
} from './llm-polisher.service';
