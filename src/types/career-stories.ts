/**
 * Career Stories Types
 *
 * Frontend types for tool activities, clusters, and STAR narratives.
 * These match the backend API contract from career-stories.controller.ts
 */

// =============================================================================
// TOOL TYPES
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

// =============================================================================
// TOOL ACTIVITIES
// =============================================================================

export interface ToolActivity {
  id: string;
  userId: string;
  source: ToolType;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  description: string | null;
  timestamp: string; // ISO date string
  clusterId: string | null;
  crossToolRefs: string[];
  rawData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CLUSTERS
// =============================================================================

export interface ClusterMetrics {
  activityCount: number;
  refCount: number;
  toolTypes: string[];
  dateRange?: {
    earliest: string; // ISO date string
    latest: string;
  };
}

export interface Cluster {
  id: string;
  userId: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  activityCount: number;
  activityIds: string[];
  metrics?: ClusterMetrics;
}

export interface ClusterWithActivities extends Cluster {
  activities: ToolActivity[];
}

// =============================================================================
// STAR NARRATIVE
// =============================================================================

export interface STARComponent {
  text: string;
  sources: string[];
  confidence: number;
}

export interface STARValidationResult {
  passed: boolean;
  score: number;
  failedGates: string[];
  warnings: string[];
}

export interface ParticipationSummary {
  initiatorCount: number;
  contributorCount: number;
  mentionedCount: number;
  observerCount: number;
}

export interface STARMetadata {
  dateRange: {
    start: string;
    end: string;
  };
  toolsCovered: ToolType[];
  totalActivities: number;
}

export interface ScoredSTAR {
  clusterId: string;
  situation: STARComponent;
  task: STARComponent;
  action: STARComponent;
  result: STARComponent;
  overallConfidence: number;
  participationSummary: ParticipationSummary;
  suggestedEdits: string[];
  metadata: STARMetadata;
  validation: STARValidationResult;
  userEdits?: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
  };
}

export type ParticipationLevel = 'initiator' | 'contributor' | 'mentioned' | 'observer';

export interface ParticipationResult {
  activityId: string;
  level: ParticipationLevel;
  signals: string[];
}

export type PolishStatus = 'success' | 'skipped' | 'failed';

export interface GenerateSTARResult {
  star: ScoredSTAR | null;
  polishStatus?: PolishStatus;
  processingTimeMs: number;
  // When star is null (validation failed)
  reason?: 'VALIDATION_GATES_FAILED';
  failedGates?: string[];
  participations?: ParticipationResult[];
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface GenerateClustersRequest {
  startDate?: string;
  endDate?: string;
  minClusterSize?: number;
}

export interface GenerateClustersResponse {
  clustersCreated: number;
  clusters: Array<{
    cluster: Cluster;
    activityIds: string[];
    activityCount: number;
  }>;
}

export type NarrativeFramework = 'STAR' | 'STARL' | 'CAR' | 'PAR' | 'SAR' | 'SOAR' | 'SHARE' | 'CARL';

export interface GenerateSTARRequest {
  personaId?: string;
  options?: {
    debug?: boolean;
    polish?: boolean;
    framework?: NarrativeFramework;
  };
}

export interface MergeClustersRequest {
  targetClusterId: string;
  sourceClusterIds: string[];
}

export interface CareerStoriesStats {
  activities: {
    total: number;
    unclustered: number;
    bySource: Record<string, number>;
  };
  clusters: number;
  stories: number;
}

// =============================================================================
// UI DISPLAY TYPES
// =============================================================================

/** Cluster display with computed UI properties */
export interface ClusterDisplay extends Cluster {
  /** Status indicator for whether a STAR has been generated */
  hasSTAR: boolean;
  /** Generated STAR if available */
  star?: ScoredSTAR;
  /** Confidence level for UI display (high/medium/low) */
  confidenceLevel: 'high' | 'medium' | 'low';
  /** Tool icons to display */
  toolIcons: ToolType[];
  /** Formatted date range for display */
  dateRangeDisplay: string;
}

/** Tool icon metadata for display */
export const TOOL_ICONS: Record<ToolType, { name: string; color: string }> = {
  jira: { name: 'Jira', color: '#0052CC' },
  github: { name: 'GitHub', color: '#24292E' },
  confluence: { name: 'Confluence', color: '#172B4D' },
  figma: { name: 'Figma', color: '#F24E1E' },
  slack: { name: 'Slack', color: '#4A154B' },
  outlook: { name: 'Outlook', color: '#0078D4' },
  google: { name: 'Google', color: '#4285F4' },
  generic: { name: 'Other', color: '#6B7280' },
};
