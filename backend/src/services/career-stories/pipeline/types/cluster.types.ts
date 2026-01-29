/**
 * Cluster Types
 *
 * Types for clustering activities and hydrating clusters with full data.
 */

// =============================================================================
// REF EXTRACTOR TYPES
// =============================================================================

export type ToolType =
  | 'jira'
  | 'github'
  | 'confluence'
  | 'figma'
  | 'slack'
  | 'outlook'
  | 'google'
  | 'generic';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface PatternExample {
  input: string;
  expectedRef: string;
  source?: string;
}

/**
 * Pattern definition with metadata, examples, and test cases
 */
export interface RefPattern {
  id: string;
  name: string;
  version: number;
  description: string;
  regex: RegExp;
  toolType: ToolType;
  normalizeMatch: (match: RegExpMatchArray) => string;
  confidence: ConfidenceLevel;
  examples: PatternExample[];
  negativeExamples: string[];
  supersedes?: string;
}

export interface PatternMatch {
  ref: string;
  patternId: string;
  confidence: ConfidenceLevel;
  location: {
    start: number;
    end: number;
    context: string;
  };
  rawMatch: string;
}

export interface RefExtractionInput {
  texts: (string | null | undefined)[];
  sourceUrl?: string | null;
}

export interface RefExtractionOutput {
  refs: string[];
  matches: PatternMatch[];
  patternAnalysis: PatternAnalysis[];
}

export interface PatternAnalysis {
  patternId: string;
  matchCount: number;
  noMatchReason?: 'no-input' | 'regex-no-match';
  nearMisses?: string[];
}

export interface RefExtractionOptions {
  debug?: boolean;
  patternIds?: string[];
  toolTypes?: ToolType[];
  minConfidence?: ConfidenceLevel;
  includeSourceUrl?: boolean;
}

// =============================================================================
// CLUSTER EXTRACTOR TYPES
// =============================================================================

export interface ClusterableActivity {
  id: string;
  refs: string[];
  timestamp?: Date;
  source?: string;
}

export interface ClusterExtractionInput {
  activities: ClusterableActivity[];
}

export interface Cluster {
  id: string;
  activityIds: string[];
  sharedRefs: string[];
  metrics: {
    activityCount: number;
    refCount: number;
    toolTypes: string[];
    dateRange?: {
      earliest: Date;
      latest: Date;
    };
  };
}

export interface ClusterExtractionOutput {
  clusters: Cluster[];
  unclustered: string[];
  metrics: {
    totalActivities: number;
    clusteredActivities: number;
    unclusteredActivities: number;
    clusterCount: number;
    avgClusterSize: number;
  };
}

export interface ClusterExtractionOptions {
  minClusterSize?: number;
  debug?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  idGenerator?: (index: number) => string;
}

// =============================================================================
// HYDRATED ACTIVITY TYPES
// =============================================================================

export interface HydratedActivity {
  id: string;
  source: ToolType;
  title: string;
  description?: string | null;
  timestamp: Date;
  sourceUrl?: string | null;
  rawData?: Record<string, unknown> | null;
  refs: string[];
}

export interface HydratedCluster extends Cluster {
  activities: HydratedActivity[];
}

// =============================================================================
// CAREER PERSONA
// =============================================================================

export interface CareerPersona {
  displayName: string;
  emails: string[];
  identities: {
    jira?: {
      accountId?: string;
      displayName?: string;
      emailAddress?: string;
    };
    github?: {
      login: string;
      id?: number;
    };
    confluence?: {
      accountId?: string;
      publicName?: string;
    };
    slack?: {
      userId: string;
      displayName?: string;
    };
    google?: {
      email: string;
      calendarId?: string;
    };
    figma?: {
      userId?: string;
      email?: string;
    };
    outlook?: {
      email: string;
      userId?: string;
    };
  };
}
