// Sample Format 7 Journal Entry Data for Design Showcase

export interface Format7JournalEntry {
  entry_metadata: {
    title: string;
    date: string;
    type: 'achievement' | 'learning' | 'challenge' | 'reflection';
    workspace: string;
    privacy: 'private' | 'team' | 'network' | 'public';
    isAutomated?: boolean;
  };
  context: {
    date_range: {
      start: string;
      end: string;
    };
    sources_included: string[];
    total_activities: number;
    primary_focus: string;
  };
  activities: Activity[];
  correlations: Correlation[];
  summary: Summary;
  artifacts: Artifact[];
}

export interface Activity {
  id: string;
  source: string;
  type: 'code_change' | 'issue' | 'meeting' | 'design' | 'documentation' | 'discussion' | 'review';
  action: string;
  description: string; // One-line description for accordion view
  timestamp: string;
  evidence: {
    type: string;
    url: string;
    title: string;
    links: string[]; // Array of evidence URLs
    metadata?: {
      lines_added?: number;
      lines_deleted?: number;
      files_changed?: number;
      comments?: number;
      participants?: string[];
      duration_minutes?: number;
      pages_created?: number;
      components_designed?: number;
      messages_count?: number;
    };
  };
  related_activities: string[];
  technologies: string[];
  collaborators: Collaborator[];
  reviewers: Collaborator[]; // Separate reviewers list
  importance: 'high' | 'medium' | 'low';
}

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  role?: string; // Also serves as designation
  department?: string;
  initials?: string;
  color?: string; // For gradient backgrounds when no avatar
}

export interface Correlation {
  id: string;
  type: 'pr_to_jira' | 'meeting_to_code' | 'design_to_code' | 'discussion_to_doc' | 'general';
  activities: string[];
  description: string;
  confidence: number;
  evidence: string;
}

export interface Summary {
  total_time_range_hours: number;
  activities_by_type: Record<string, number>;
  activities_by_source: Record<string, number>;
  unique_collaborators: Collaborator[];
  unique_reviewers: Collaborator[]; // Separate reviewers summary
  technologies_used: string[];
  skills_demonstrated: string[];
}

export interface Artifact {
  activity_id: string;
  type: string;
  title: string;
  url: string;
  source: string;
  importance: 'high' | 'medium' | 'low';
  description: string;
}

// Sample collaborators with realistic data
export const sampleCollaborators: Record<string, Collaborator> = {
  sarah: {
    id: 'user-1',
    name: 'Sarah Chen',
    avatar: 'https://i.pravatar.cc/150?img=1',
    role: 'Senior Frontend Engineer',
    department: 'Engineering',
    initials: 'SC',
    color: 'from-purple-400 to-pink-400'
  },
  michael: {
    id: 'user-2',
    name: 'Michael Rodriguez',
    avatar: 'https://i.pravatar.cc/150?img=2',
    role: 'Backend Lead',
    department: 'Engineering',
    initials: 'MR',
    color: 'from-blue-400 to-cyan-400'
  },
  emily: {
    id: 'user-3',
    name: 'Emily Thompson',
    avatar: 'https://i.pravatar.cc/150?img=3',
    role: 'Product Designer',
    department: 'Design',
    initials: 'ET',
    color: 'from-green-400 to-teal-400'
  },
  david: {
    id: 'user-4',
    name: 'David Kim',
    avatar: 'https://i.pravatar.cc/150?img=4',
    role: 'DevOps Engineer',
    department: 'Infrastructure',
    initials: 'DK',
    color: 'from-orange-400 to-red-400'
  },
  jessica: {
    id: 'user-5',
    name: 'Jessica Liu',
    avatar: 'https://i.pravatar.cc/150?img=5',
    role: 'QA Engineer',
    department: 'Quality',
    initials: 'JL',
    color: 'from-indigo-400 to-purple-400'
  },
  alex: {
    id: 'user-6',
    name: 'Alex Johnson',
    avatar: 'https://i.pravatar.cc/150?img=6',
    role: 'Tech Lead',
    department: 'Engineering',
    initials: 'AJ',
    color: 'from-yellow-400 to-orange-400'
  },
  rachel: {
    id: 'user-7',
    name: 'Rachel Martinez',
    avatar: 'https://i.pravatar.cc/150?img=7',
    role: 'Engineering Manager',
    department: 'Engineering',
    initials: 'RM',
    color: 'from-pink-400 to-rose-400'
  },
  james: {
    id: 'user-8',
    name: 'James Wilson',
    avatar: 'https://i.pravatar.cc/150?img=8',
    role: 'Principal Engineer',
    department: 'Engineering',
    initials: 'JW',
    color: 'from-teal-400 to-cyan-400'
  }
};

// Sample Format 7 Journal Entry with rich data
export const sampleFormat7Entry: Format7JournalEntry = {
  entry_metadata: {
    title: 'Implemented Real-time Collaboration Features and Fixed Critical Performance Issues',
    date: '2025-01-15',
    type: 'achievement',
    workspace: 'InChronicle Development Team',
    privacy: 'team',
    isAutomated: true
  },

  context: {
    date_range: {
      start: '2025-01-15',
      end: '2025-01-15'
    },
    sources_included: ['github', 'jira', 'slack', 'teams', 'figma', 'confluence'],
    total_activities: 12,
    primary_focus: 'Shipped real-time collaboration features including live cursors, presence indicators, and collaborative editing while resolving performance bottlenecks in the data synchronization layer'
  },

  activities: [
    {
      id: 'act-1',
      source: 'github',
      type: 'code_change',
      action: 'Merged PR #456: Add WebSocket support for real-time collaboration',
      description: 'Implemented bidirectional WebSocket connection handling with Socket.io for real-time presence and cursor synchronization across 23 files',
      timestamp: '2025-01-15T10:30:00Z',
      evidence: {
        type: 'pr',
        url: 'https://github.com/company/repo/pull/456',
        title: 'feat: WebSocket integration for real-time updates',
        links: [
          'https://github.com/company/repo/pull/456',
          'https://github.com/company/repo/pull/456/files',
          'https://github.com/company/repo/pull/456/checks'
        ],
        metadata: {
          lines_added: 1247,
          lines_deleted: 89,
          files_changed: 23,
          comments: 12,
          participants: ['sarah', 'michael', 'alex']
        }
      },
      related_activities: ['act-2', 'act-5', 'act-7'],
      technologies: ['TypeScript', 'Socket.io', 'React', 'Redis'],
      collaborators: [sampleCollaborators.sarah, sampleCollaborators.michael],
      reviewers: [sampleCollaborators.alex, sampleCollaborators.rachel],
      importance: 'high'
    },
    {
      id: 'act-2',
      source: 'jira',
      type: 'issue',
      action: 'Completed FEAT-789: Real-time collaboration for journal entries',
      description: 'Tracked and coordinated epic completion covering WebSocket integration, UI components, and documentation with 24 team comments',
      timestamp: '2025-01-15T11:00:00Z',
      evidence: {
        type: 'issue',
        url: 'https://jira.company.com/browse/FEAT-789',
        title: 'Epic: Real-time collaboration features',
        links: [
          'https://jira.company.com/browse/FEAT-789',
          'https://jira.company.com/browse/FEAT-789?focusedCommentId=12345'
        ],
        metadata: {
          comments: 24
        }
      },
      related_activities: ['act-1', 'act-7'],
      technologies: [],
      collaborators: [sampleCollaborators.sarah],
      reviewers: [sampleCollaborators.rachel],
      importance: 'high'
    },
    {
      id: 'act-3',
      source: 'github',
      type: 'code_change',
      action: 'Merged PR #457: Optimize database queries for 10x performance improvement',
      description: 'Refactored data loading layer to use batch queries and indexing, reducing activity feed load time from 3s to 300ms',
      timestamp: '2025-01-15T14:15:00Z',
      evidence: {
        type: 'pr',
        url: 'https://github.com/company/repo/pull/457',
        title: 'perf: Optimize N+1 queries in activity feed',
        links: [
          'https://github.com/company/repo/pull/457',
          'https://github.com/company/repo/pull/457/files',
          'https://github.com/company/repo/compare/main...perf/optimize-queries'
        ],
        metadata: {
          lines_added: 145,
          lines_deleted: 267,
          files_changed: 8,
          comments: 6,
          participants: ['michael', 'david']
        }
      },
      related_activities: ['act-4'],
      technologies: ['PostgreSQL', 'Prisma', 'Node.js'],
      collaborators: [sampleCollaborators.michael],
      reviewers: [sampleCollaborators.david, sampleCollaborators.james],
      importance: 'high'
    },
    {
      id: 'act-4',
      source: 'jira',
      type: 'issue',
      action: 'Resolved BUG-234: Activity feed loading slowly for users with 100+ entries',
      description: 'Performance bug resolution with database query optimization resulting in 10x speed improvement validated across test accounts',
      timestamp: '2025-01-15T14:45:00Z',
      evidence: {
        type: 'issue',
        url: 'https://jira.company.com/browse/BUG-234',
        title: 'Performance: Slow loading activity feed',
        links: [
          'https://jira.company.com/browse/BUG-234',
          'https://jira.company.com/browse/BUG-234/activity'
        ],
        metadata: {
          comments: 8
        }
      },
      related_activities: ['act-3'],
      technologies: [],
      collaborators: [sampleCollaborators.michael],
      reviewers: [sampleCollaborators.rachel],
      importance: 'high'
    },
    {
      id: 'act-5',
      source: 'figma',
      type: 'design',
      action: 'Finalized designs for presence indicators and live cursor UI',
      description: 'Designed comprehensive component system for real-time collaboration including 12 UI components with hover states and animations',
      timestamp: '2025-01-15T09:00:00Z',
      evidence: {
        type: 'design',
        url: 'https://figma.com/file/abc123/collaboration-ui',
        title: 'Collaboration UI Components v2.0',
        links: [
          'https://figma.com/file/abc123/collaboration-ui',
          'https://figma.com/proto/abc123/collaboration-ui'
        ],
        metadata: {
          components_designed: 12
        }
      },
      related_activities: ['act-1', 'act-2'],
      technologies: ['Figma'],
      collaborators: [sampleCollaborators.emily],
      reviewers: [sampleCollaborators.sarah, sampleCollaborators.alex],
      importance: 'medium'
    },
    {
      id: 'act-6',
      source: 'teams',
      type: 'meeting',
      action: 'Sprint Planning: Collaboration Features Review',
      description: 'Kickoff meeting for Sprint 23 covering real-time features roadmap, resource allocation, and timeline with full engineering team',
      timestamp: '2025-01-15T08:00:00Z',
      evidence: {
        type: 'meeting',
        url: 'https://teams.microsoft.com/meeting/123',
        title: 'Sprint 23 Planning Meeting',
        links: [
          'https://teams.microsoft.com/meeting/123',
          'https://teams.microsoft.com/meeting/123/recording'
        ],
        metadata: {
          duration_minutes: 45,
          participants: ['sarah', 'michael', 'emily', 'david', 'jessica', 'alex']
        }
      },
      related_activities: [],
      technologies: [],
      collaborators: [
        sampleCollaborators.sarah,
        sampleCollaborators.michael,
        sampleCollaborators.emily,
        sampleCollaborators.david,
        sampleCollaborators.jessica
      ],
      reviewers: [sampleCollaborators.alex, sampleCollaborators.rachel],
      importance: 'low'
    },
    {
      id: 'act-7',
      source: 'confluence',
      type: 'documentation',
      action: 'Published technical documentation for WebSocket API',
      description: 'Created comprehensive API documentation covering connection lifecycle, message protocols, and error handling across 3 pages',
      timestamp: '2025-01-15T16:00:00Z',
      evidence: {
        type: 'doc',
        url: 'https://confluence.company.com/display/DEV/websocket-api',
        title: 'WebSocket API Documentation',
        links: [
          'https://confluence.company.com/display/DEV/websocket-api',
          'https://confluence.company.com/display/DEV/websocket-api/examples'
        ],
        metadata: {
          pages_created: 3
        }
      },
      related_activities: ['act-1', 'act-2'],
      technologies: ['Confluence'],
      collaborators: [sampleCollaborators.sarah],
      reviewers: [sampleCollaborators.alex, sampleCollaborators.michael],
      importance: 'medium'
    },
    {
      id: 'act-8',
      source: 'slack',
      type: 'discussion',
      action: 'Discussed optimization strategies in #backend channel',
      description: 'Technical discussion on query optimization approaches including batching, indexing, and caching strategies with backend team',
      timestamp: '2025-01-15T13:00:00Z',
      evidence: {
        type: 'message',
        url: 'https://slack.com/archives/C123/p456',
        title: 'Database optimization discussion',
        links: [
          'https://slack.com/archives/C123/p456',
          'https://slack.com/archives/C123/p456/thread'
        ],
        metadata: {
          messages_count: 23
        }
      },
      related_activities: ['act-3'],
      technologies: [],
      collaborators: [sampleCollaborators.michael, sampleCollaborators.david],
      reviewers: [],
      importance: 'low'
    },
    {
      id: 'act-9',
      source: 'github',
      type: 'review',
      action: 'Reviewed PR #458: Add unit tests for WebSocket handlers',
      description: 'Code review for test coverage on WebSocket connection handling, message broadcasting, and error scenarios using Jest',
      timestamp: '2025-01-15T15:30:00Z',
      evidence: {
        type: 'pr',
        url: 'https://github.com/company/repo/pull/458',
        title: 'test: WebSocket handler unit tests',
        links: [
          'https://github.com/company/repo/pull/458',
          'https://github.com/company/repo/pull/458/files'
        ],
        metadata: {
          comments: 4,
          participants: ['sarah', 'jessica']
        }
      },
      related_activities: ['act-1'],
      technologies: ['Jest', 'TypeScript'],
      collaborators: [sampleCollaborators.jessica],
      reviewers: [sampleCollaborators.sarah, sampleCollaborators.alex],
      importance: 'medium'
    },
    {
      id: 'act-10',
      source: 'github',
      type: 'code_change',
      action: 'Merged PR #459: Add Redis caching for presence data',
      description: 'Implemented Redis caching layer for user presence information to reduce database load and improve real-time performance',
      timestamp: '2025-01-15T17:00:00Z',
      evidence: {
        type: 'pr',
        url: 'https://github.com/company/repo/pull/459',
        title: 'feat: Redis caching layer for presence',
        links: [
          'https://github.com/company/repo/pull/459',
          'https://github.com/company/repo/pull/459/files'
        ],
        metadata: {
          lines_added: 234,
          lines_deleted: 12,
          files_changed: 6,
          comments: 3,
          participants: ['david']
        }
      },
      related_activities: ['act-1'],
      technologies: ['Redis', 'Node.js', 'TypeScript'],
      collaborators: [sampleCollaborators.david],
      reviewers: [sampleCollaborators.michael, sampleCollaborators.james],
      importance: 'medium'
    }
  ],

  correlations: [
    {
      id: 'corr-1',
      type: 'design_to_code',
      activities: ['act-5', 'act-1'],
      description: 'Figma designs implemented in WebSocket PR',
      confidence: 0.95,
      evidence: 'PR description references Figma file and implements all designed components'
    },
    {
      id: 'corr-2',
      type: 'pr_to_jira',
      activities: ['act-1', 'act-2'],
      description: 'PR #456 completes the collaboration epic FEAT-789',
      confidence: 0.98,
      evidence: 'PR title includes FEAT-789 and Jira ticket marked as Done after merge'
    },
    {
      id: 'corr-3',
      type: 'pr_to_jira',
      activities: ['act-3', 'act-4'],
      description: 'Performance optimization PR resolves slow loading bug',
      confidence: 0.92,
      evidence: 'BUG-234 closed with reference to PR #457 in comments'
    },
    {
      id: 'corr-4',
      type: 'discussion_to_doc',
      activities: ['act-8', 'act-7'],
      description: 'Slack discussion insights documented in Confluence',
      confidence: 0.85,
      evidence: 'Documentation includes optimization strategies discussed in Slack'
    }
  ],

  summary: {
    total_time_range_hours: 9,
    activities_by_type: {
      code_change: 3,
      issue: 2,
      meeting: 1,
      design: 1,
      documentation: 1,
      discussion: 1,
      review: 1
    },
    activities_by_source: {
      github: 4,
      jira: 2,
      figma: 1,
      teams: 1,
      confluence: 1,
      slack: 1
    },
    unique_collaborators: [
      sampleCollaborators.sarah,
      sampleCollaborators.michael,
      sampleCollaborators.emily,
      sampleCollaborators.david,
      sampleCollaborators.jessica
    ],
    unique_reviewers: [
      sampleCollaborators.alex,
      sampleCollaborators.rachel,
      sampleCollaborators.james
    ],
    technologies_used: [
      'TypeScript', 'Socket.io', 'React', 'Redis',
      'PostgreSQL', 'Prisma', 'Node.js', 'Figma',
      'Confluence', 'Jest'
    ],
    skills_demonstrated: [
      'Real-time Systems',
      'Performance Optimization',
      'Database Design',
      'API Documentation',
      'Code Review',
      'System Architecture'
    ]
  },

  artifacts: [
    {
      activity_id: 'act-1',
      type: 'pr',
      title: 'WebSocket integration for real-time updates',
      url: 'https://github.com/company/repo/pull/456',
      source: 'github',
      importance: 'high',
      description: 'Core implementation of real-time collaboration features'
    },
    {
      activity_id: 'act-3',
      type: 'pr',
      title: 'Database query optimization',
      url: 'https://github.com/company/repo/pull/457',
      source: 'github',
      importance: 'high',
      description: '10x performance improvement in activity feed loading'
    },
    {
      activity_id: 'act-5',
      type: 'design',
      title: 'Collaboration UI Components',
      url: 'https://figma.com/file/abc123/collaboration-ui',
      source: 'figma',
      importance: 'medium',
      description: 'Complete design system for real-time collaboration features'
    },
    {
      activity_id: 'act-7',
      type: 'doc',
      title: 'WebSocket API Documentation',
      url: 'https://confluence.company.com/display/DEV/websocket-api',
      source: 'confluence',
      importance: 'medium',
      description: 'Technical documentation for WebSocket implementation'
    },
    {
      activity_id: 'act-10',
      type: 'pr',
      title: 'Redis caching layer',
      url: 'https://github.com/company/repo/pull/459',
      source: 'github',
      importance: 'medium',
      description: 'Caching layer for presence data optimization'
    }
  ]
};

// Helper function to get activity by ID
export function getActivityById(id: string): Activity | undefined {
  return sampleFormat7Entry.activities.find(a => a.id === id);
}

// Helper function to get correlated activities
export function getCorrelatedActivities(activityId: string): Activity[] {
  const correlations = sampleFormat7Entry.correlations.filter(c =>
    c.activities.includes(activityId)
  );

  const relatedIds = new Set<string>();
  correlations.forEach(c => {
    c.activities.forEach(id => {
      if (id !== activityId) relatedIds.add(id);
    });
  });

  return Array.from(relatedIds)
    .map(id => getActivityById(id))
    .filter(a => a !== undefined) as Activity[];
}

// Color mappings for different activity types
export const activityTypeColors = {
  code_change: 'bg-blue-100 text-blue-800 border-blue-200',
  issue: 'bg-purple-100 text-purple-800 border-purple-200',
  meeting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  design: 'bg-pink-100 text-pink-800 border-pink-200',
  documentation: 'bg-green-100 text-green-800 border-green-200',
  discussion: 'bg-orange-100 text-orange-800 border-orange-200',
  review: 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

// Importance level styles
export const importanceStyles = {
  high: 'border-l-4 border-l-red-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-gray-400'
};

// Source/tool colors for badges
export const sourceColors = {
  github: 'bg-gray-900 text-white',
  jira: 'bg-blue-600 text-white',
  slack: 'bg-purple-600 text-white',
  teams: 'bg-indigo-600 text-white',
  figma: 'bg-pink-600 text-white',
  confluence: 'bg-blue-500 text-white'
};