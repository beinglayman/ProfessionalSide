// Sample AI-generated correlations and categories for Pair 6 (Enhanced) showcase

export const sampleCorrelations = [
  {
    id: 'corr-1',
    type: 'pr_to_jira' as const,
    source1: {
      tool: 'github',
      id: 'pr-1234',
      title: 'Implement real-time notifications',
      url: 'https://github.com/example/repo/pull/1234'
    },
    source2: {
      tool: 'jira',
      id: 'PROJ-456',
      title: 'Add WebSocket support',
      url: 'https://jira.example.com/browse/PROJ-456'
    },
    confidence: 0.95,
    reasoning: 'PR description references PROJ-456 and implements WebSocket functionality described in the Jira ticket'
  },
  {
    id: 'corr-2',
    type: 'meeting_to_code' as const,
    source1: {
      tool: 'teams',
      id: 'meeting-789',
      title: 'Architecture Review: Authentication Flow',
      url: 'https://teams.microsoft.com/meeting/789'
    },
    source2: {
      tool: 'github',
      id: 'commit-abc123',
      title: 'Refactor auth middleware',
      url: 'https://github.com/example/repo/commit/abc123'
    },
    confidence: 0.88,
    reasoning: 'Commit made 30 minutes after architecture meeting, implements changes discussed in meeting notes'
  },
  {
    id: 'corr-3',
    type: 'design_to_code' as const,
    source1: {
      tool: 'figma',
      id: 'file-xyz',
      title: 'User Dashboard Redesign',
      url: 'https://figma.com/file/xyz'
    },
    source2: {
      tool: 'github',
      id: 'pr-5678',
      title: 'Update dashboard UI components',
      url: 'https://github.com/example/repo/pull/5678'
    },
    confidence: 0.92,
    reasoning: 'PR implements design specifications from Figma file, includes references to Figma component names'
  },
  {
    id: 'corr-4',
    type: 'discussion_to_doc' as const,
    source1: {
      tool: 'slack',
      id: 'thread-456',
      title: 'Discussion: API rate limiting strategy',
      url: 'https://slack.com/archives/thread-456'
    },
    source2: {
      tool: 'confluence',
      id: 'page-123',
      title: 'API Rate Limiting Documentation',
      url: 'https://confluence.example.com/page-123'
    },
    confidence: 0.85,
    reasoning: 'Confluence page created after Slack discussion, documents the agreed-upon rate limiting approach'
  }
];

export const sampleCategories = [
  {
    type: 'achievement' as const,
    label: 'Key Achievements',
    summary: 'Major milestones and completed deliverables that moved projects forward',
    items: [
      {
        id: 'achieve-1',
        source: 'github',
        type: 'pr',
        title: 'Implement real-time notifications',
        description: 'Added WebSocket-based notification system with 99.9% uptime',
        url: 'https://github.com/example/repo/pull/1234',
        importance: 'high' as const
      },
      {
        id: 'achieve-2',
        source: 'jira',
        type: 'issue',
        title: 'Performance optimization - reduced load time by 40%',
        description: 'Optimized database queries and implemented caching strategy',
        url: 'https://jira.example.com/browse/PROJ-789',
        importance: 'high' as const
      },
      {
        id: 'achieve-3',
        source: 'confluence',
        type: 'page',
        title: 'Completed architecture documentation',
        description: 'Documented system architecture for new team members',
        url: 'https://confluence.example.com/page-456',
        importance: 'medium' as const
      }
    ]
  },
  {
    type: 'learning' as const,
    label: 'Learning & Growth',
    summary: 'New skills acquired and technical challenges that expanded expertise',
    items: [
      {
        id: 'learn-1',
        source: 'github',
        type: 'commit',
        title: 'First implementation using GraphQL subscriptions',
        description: 'Learned and applied GraphQL subscriptions for real-time data',
        url: 'https://github.com/example/repo/commit/def456',
        importance: 'medium' as const
      },
      {
        id: 'learn-2',
        source: 'teams',
        type: 'meeting',
        title: 'Workshop: Advanced TypeScript patterns',
        description: 'Attended workshop on generics and conditional types',
        url: 'https://teams.microsoft.com/meeting/workshop-123',
        importance: 'medium' as const
      }
    ]
  },
  {
    type: 'collaboration' as const,
    label: 'Team Collaboration',
    summary: 'Cross-functional work and knowledge sharing with team members',
    items: [
      {
        id: 'collab-1',
        source: 'slack',
        type: 'thread',
        title: 'Pair programming session with @jane on auth flow',
        description: 'Collaborated on refactoring authentication middleware',
        url: 'https://slack.com/archives/thread-789',
        importance: 'medium' as const
      },
      {
        id: 'collab-2',
        source: 'teams',
        type: 'meeting',
        title: 'Code review session with backend team',
        description: 'Reviewed 5 PRs and provided architectural feedback',
        url: 'https://teams.microsoft.com/meeting/review-456',
        importance: 'medium' as const
      },
      {
        id: 'collab-3',
        source: 'github',
        type: 'review',
        title: 'Reviewed microservices deployment PR',
        description: 'Provided feedback on Docker configuration and CI/CD pipeline',
        url: 'https://github.com/example/repo/pull/9012',
        importance: 'low' as const
      },
      {
        id: 'collab-4',
        source: 'jira',
        type: 'issue',
        title: 'Sprint planning with product team',
        description: 'Collaborated on prioritizing Q2 roadmap items',
        url: 'https://jira.example.com/browse/PROJ-101',
        importance: 'medium' as const
      }
    ]
  },
  {
    type: 'problem_solving' as const,
    label: 'Problem Solving',
    summary: 'Technical challenges debugged and complex issues resolved',
    items: [
      {
        id: 'problem-1',
        source: 'github',
        type: 'issue',
        title: 'Fixed critical memory leak in notification service',
        description: 'Identified and resolved WebSocket connection leak causing OOM errors',
        url: 'https://github.com/example/repo/issues/2345',
        importance: 'high' as const
      },
      {
        id: 'problem-2',
        source: 'slack',
        type: 'thread',
        title: 'Debugged production database timeout issues',
        description: 'Investigated slow queries and implemented connection pooling',
        url: 'https://slack.com/archives/thread-emergency',
        importance: 'high' as const
      }
    ]
  }
];
