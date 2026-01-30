/**
 * Career Stories Demo Data
 *
 * Mock clusters and STAR narratives for demo/showcase purposes.
 * Used when no real data exists in production.
 */

import {
  Cluster,
  ClusterWithActivities,
  ToolActivity,
  ScoredSTAR,
  ToolType,
} from '../types/career-stories';

// =============================================================================
// DEMO ACTIVITIES
// =============================================================================

const DEMO_USER_ID = 'demo-user';

function createActivity(
  id: string,
  source: ToolType,
  title: string,
  description: string,
  daysAgo: number,
  clusterId: string
): ToolActivity {
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - daysAgo);

  return {
    id,
    userId: DEMO_USER_ID,
    source,
    sourceId: `${source}-${id}`,
    sourceUrl: null,
    title,
    description,
    timestamp: timestamp.toISOString(),
    clusterId,
    crossToolRefs: [],
    rawData: null,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
  };
}

// =============================================================================
// DEMO CLUSTERS
// =============================================================================

const cluster1Activities: ToolActivity[] = [
  createActivity('act-1', 'jira', 'PROJ-123: Implement user authentication', 'Add OAuth2 login flow with Google and GitHub providers', 30, 'cluster-1'),
  createActivity('act-2', 'github', 'PR #456: Auth service implementation', 'Implemented JWT token generation and validation', 28, 'cluster-1'),
  createActivity('act-3', 'confluence', 'Authentication Architecture Doc', 'Documented the authentication flow and security considerations', 27, 'cluster-1'),
  createActivity('act-4', 'slack', 'Security review discussion', 'Coordinated with security team on token expiration policies', 25, 'cluster-1'),
  createActivity('act-5', 'github', 'PR #478: Add refresh token rotation', 'Implemented secure refresh token rotation mechanism', 22, 'cluster-1'),
];

const cluster2Activities: ToolActivity[] = [
  createActivity('act-6', 'jira', 'PROJ-200: Dashboard performance optimization', 'Reduce initial load time from 4s to under 1s', 45, 'cluster-2'),
  createActivity('act-7', 'github', 'PR #389: Implement virtual scrolling', 'Added react-window for efficient list rendering', 43, 'cluster-2'),
  createActivity('act-8', 'figma', 'Dashboard loading skeleton designs', 'Created skeleton UI components for better perceived performance', 42, 'cluster-2'),
  createActivity('act-9', 'slack', 'Performance metrics discussion', 'Shared Lighthouse scores with team, 40% improvement', 40, 'cluster-2'),
];

const cluster3Activities: ToolActivity[] = [
  createActivity('act-10', 'jira', 'PROJ-301: API rate limiting implementation', 'Implement rate limiting to prevent abuse', 60, 'cluster-3'),
  createActivity('act-11', 'github', 'PR #290: Redis-based rate limiter', 'Implemented sliding window rate limiting with Redis', 58, 'cluster-3'),
  createActivity('act-12', 'confluence', 'Rate Limiting Strategy', 'Documented rate limits per endpoint and tier', 57, 'cluster-3'),
  createActivity('act-13', 'github', 'PR #295: Rate limit headers', 'Added X-RateLimit headers for client feedback', 55, 'cluster-3'),
  createActivity('act-14', 'slack', 'Rate limiting rollout plan', 'Coordinated gradual rollout with DevOps team', 53, 'cluster-3'),
  createActivity('act-15', 'jira', 'PROJ-310: Monitor rate limit metrics', 'Set up Datadog dashboards for rate limit monitoring', 50, 'cluster-3'),
];

// =============================================================================
// DEMO CLUSTERS WITH METRICS
// =============================================================================

export const DEMO_CLUSTERS: Cluster[] = [
  {
    id: 'cluster-1',
    userId: DEMO_USER_ID,
    name: 'User Authentication System',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    activityCount: 5,
    activityIds: cluster1Activities.map(a => a.id),
    metrics: {
      activityCount: 5,
      refCount: 3,
      toolTypes: ['jira', 'github', 'confluence', 'slack'],
      dateRange: {
        earliest: cluster1Activities[0].timestamp,
        latest: cluster1Activities[4].timestamp,
      },
    },
  },
  {
    id: 'cluster-2',
    userId: DEMO_USER_ID,
    name: 'Dashboard Performance',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    activityCount: 4,
    activityIds: cluster2Activities.map(a => a.id),
    metrics: {
      activityCount: 4,
      refCount: 2,
      toolTypes: ['jira', 'github', 'figma', 'slack'],
      dateRange: {
        earliest: cluster2Activities[0].timestamp,
        latest: cluster2Activities[3].timestamp,
      },
    },
  },
  {
    id: 'cluster-3',
    userId: DEMO_USER_ID,
    name: 'API Rate Limiting',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    activityCount: 6,
    activityIds: cluster3Activities.map(a => a.id),
    metrics: {
      activityCount: 6,
      refCount: 4,
      toolTypes: ['jira', 'github', 'confluence', 'slack'],
      dateRange: {
        earliest: cluster3Activities[0].timestamp,
        latest: cluster3Activities[5].timestamp,
      },
    },
  },
];

// =============================================================================
// DEMO CLUSTER DETAILS (with activities)
// =============================================================================

export const DEMO_CLUSTER_DETAILS: Record<string, ClusterWithActivities> = {
  'cluster-1': {
    ...DEMO_CLUSTERS[0],
    activities: cluster1Activities,
  },
  'cluster-2': {
    ...DEMO_CLUSTERS[1],
    activities: cluster2Activities,
  },
  'cluster-3': {
    ...DEMO_CLUSTERS[2],
    activities: cluster3Activities,
  },
};

// =============================================================================
// DEMO STAR NARRATIVES
// =============================================================================

export const DEMO_STARS: Record<string, ScoredSTAR> = {
  'cluster-1': {
    clusterId: 'cluster-1',
    situation: {
      text: 'Our platform needed a secure, scalable authentication system to support growing user base and enterprise clients requiring SSO integration. The existing basic auth was a security risk and barrier to B2B sales.',
      sources: ['act-1', 'act-3'],
      confidence: 0.92,
    },
    task: {
      text: 'Design and implement OAuth2-based authentication with support for Google and GitHub providers, including secure token management and refresh token rotation.',
      sources: ['act-1', 'act-2'],
      confidence: 0.88,
    },
    action: {
      text: 'Led the architecture design and implementation of the auth service. Implemented JWT token generation with secure refresh token rotation. Collaborated with security team to define token expiration policies. Created comprehensive documentation for the team.',
      sources: ['act-2', 'act-3', 'act-4', 'act-5'],
      confidence: 0.85,
    },
    result: {
      text: 'Successfully launched OAuth2 authentication supporting 2 providers. Reduced security incidents by 90%. Enabled 3 enterprise deals worth $500K ARR. System handles 10K+ authentications daily with 99.9% uptime.',
      sources: ['act-4', 'act-5'],
      confidence: 0.78,
    },
    overallConfidence: 0.86,
    participationSummary: {
      initiatorCount: 3,
      contributorCount: 2,
      mentionedCount: 0,
      observerCount: 0,
    },
    suggestedEdits: [
      'Add specific metrics on authentication latency improvement',
      'Mention any compliance certifications achieved (SOC2, etc.)',
    ],
    metadata: {
      dateRange: {
        start: cluster1Activities[0].timestamp,
        end: cluster1Activities[4].timestamp,
      },
      toolsCovered: ['jira', 'github', 'confluence', 'slack'],
      totalActivities: 5,
    },
    validation: {
      passed: true,
      score: 8.5,
      failedGates: [],
      warnings: ['Consider adding more quantitative results'],
    },
  },
  'cluster-2': {
    clusterId: 'cluster-2',
    situation: {
      text: 'The main dashboard was experiencing 4+ second load times, causing user frustration and increased bounce rates. Performance issues were impacting customer retention and NPS scores.',
      sources: ['act-6'],
      confidence: 0.90,
    },
    task: {
      text: 'Optimize dashboard performance to achieve sub-1-second initial load time while maintaining feature parity and improving perceived performance.',
      sources: ['act-6', 'act-8'],
      confidence: 0.87,
    },
    action: {
      text: 'Implemented virtual scrolling using react-window for efficient list rendering. Designed and built skeleton UI components for better perceived performance. Conducted performance audits and shared improvements with the team.',
      sources: ['act-7', 'act-8', 'act-9'],
      confidence: 0.89,
    },
    result: {
      text: 'Reduced initial load time from 4s to 800ms (80% improvement). Lighthouse performance score improved from 45 to 92. User engagement increased by 25% and bounce rate decreased by 15%.',
      sources: ['act-9'],
      confidence: 0.82,
    },
    overallConfidence: 0.87,
    participationSummary: {
      initiatorCount: 2,
      contributorCount: 2,
      mentionedCount: 0,
      observerCount: 0,
    },
    suggestedEdits: [
      'Add before/after Core Web Vitals metrics',
    ],
    metadata: {
      dateRange: {
        start: cluster2Activities[0].timestamp,
        end: cluster2Activities[3].timestamp,
      },
      toolsCovered: ['jira', 'github', 'figma', 'slack'],
      totalActivities: 4,
    },
    validation: {
      passed: true,
      score: 9.0,
      failedGates: [],
      warnings: [],
    },
  },
  'cluster-3': {
    clusterId: 'cluster-3',
    situation: {
      text: 'Our public API was vulnerable to abuse with no rate limiting in place. Several incidents of API abuse were impacting service stability and increasing infrastructure costs.',
      sources: ['act-10', 'act-12'],
      confidence: 0.91,
    },
    task: {
      text: 'Implement a robust, scalable rate limiting system that protects the API while providing clear feedback to legitimate users and supporting different rate limits per subscription tier.',
      sources: ['act-10', 'act-12'],
      confidence: 0.88,
    },
    action: {
      text: 'Designed and implemented Redis-based sliding window rate limiter. Added standard X-RateLimit headers for client feedback. Created comprehensive documentation of rate limits per endpoint and tier. Coordinated gradual rollout with DevOps and set up monitoring dashboards.',
      sources: ['act-11', 'act-12', 'act-13', 'act-14', 'act-15'],
      confidence: 0.90,
    },
    result: {
      text: 'Successfully deployed rate limiting across all API endpoints. Reduced abuse incidents by 95%. Infrastructure costs decreased by 30% due to blocked abusive traffic. Zero complaints from legitimate users due to clear rate limit headers and documentation.',
      sources: ['act-14', 'act-15'],
      confidence: 0.80,
    },
    overallConfidence: 0.87,
    participationSummary: {
      initiatorCount: 4,
      contributorCount: 2,
      mentionedCount: 0,
      observerCount: 0,
    },
    suggestedEdits: [],
    metadata: {
      dateRange: {
        start: cluster3Activities[0].timestamp,
        end: cluster3Activities[5].timestamp,
      },
      toolsCovered: ['jira', 'github', 'confluence', 'slack'],
      totalActivities: 6,
    },
    validation: {
      passed: true,
      score: 8.8,
      failedGates: [],
      warnings: [],
    },
  },
};

// =============================================================================
// DEMO MODE HELPER - Re-export from global service for backwards compatibility
// =============================================================================

export {
  isDemoMode,
  enableDemoMode,
  disableDemoMode,
  toggleDemoMode,
} from './demo-mode.service';
