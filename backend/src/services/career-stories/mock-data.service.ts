/**
 * MockDataService
 *
 * Generates realistic mock tool activities for testing the career stories pipeline.
 * Creates activities with cross-tool references that should cluster together.
 */

import { ActivityInput } from './activity-persistence.service';

/**
 * Mock data representing a real project workflow:
 *
 * Project 1: "Authentication System Overhaul" (AUTH-123)
 * - Jira ticket: AUTH-123
 * - GitHub PR: acme/backend#42
 * - Confluence design doc: pages/987654
 *
 * Project 2: "Performance Optimization" (PERF-456)
 * - Jira tickets: PERF-456, PERF-457
 * - GitHub PRs: acme/backend#55, acme/frontend#22
 *
 * Project 3: "API Documentation" (DOC-789)
 * - Standalone activity (no cross-refs, should NOT cluster)
 */
export function generateMockActivities(): ActivityInput[] {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return [
    // =========================================================================
    // PROJECT 1: Authentication System Overhaul (should cluster together)
    // =========================================================================

    // Jira ticket for the auth work
    {
      source: 'jira',
      sourceId: 'AUTH-123',
      sourceUrl: 'https://acme.atlassian.net/browse/AUTH-123',
      title: 'Implement OAuth2 authentication flow',
      description: 'Replace legacy session-based auth with OAuth2. See design doc: https://acme.atlassian.net/wiki/spaces/ENG/pages/987654',
      timestamp: daysAgo(14),
      rawData: {
        key: 'AUTH-123',
        status: 'Done',
        priority: 'High',
        assignee: 'honey.arora',
        storyPoints: 8,
        labels: ['security', 'breaking-change'],
      },
    },

    // GitHub PR implementing the auth work
    {
      source: 'github',
      sourceId: 'acme/backend#42',
      sourceUrl: 'https://github.com/acme/backend/pull/42',
      title: 'feat(auth): implement OAuth2 authentication flow',
      description: 'Closes AUTH-123. Implements the design from https://acme.atlassian.net/wiki/spaces/ENG/pages/987654',
      timestamp: daysAgo(10),
      rawData: {
        number: 42,
        state: 'merged',
        additions: 450,
        deletions: 120,
        changedFiles: 15,
        reviews: 3,
        commits: 8,
      },
    },

    // Confluence design doc for auth
    {
      source: 'confluence',
      sourceId: '987654',
      sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/987654/OAuth2+Authentication+Design',
      title: 'OAuth2 Authentication Design',
      description: 'Design document for AUTH-123. Implementation in acme/backend#42.',
      timestamp: daysAgo(21),
      rawData: {
        pageId: '987654',
        spaceKey: 'ENG',
        version: 5,
        lastModifiedBy: 'honey.arora',
      },
    },

    // Second Jira ticket linked to same PR
    {
      source: 'jira',
      sourceId: 'AUTH-124',
      sourceUrl: 'https://acme.atlassian.net/browse/AUTH-124',
      title: 'Add refresh token support',
      description: 'Follow-up to AUTH-123. Also addressed in acme/backend#42.',
      timestamp: daysAgo(12),
      rawData: {
        key: 'AUTH-124',
        status: 'Done',
        priority: 'Medium',
        assignee: 'honey.arora',
        storyPoints: 3,
      },
    },

    // =========================================================================
    // PROJECT 2: Performance Optimization (should cluster together)
    // =========================================================================

    // Main Jira ticket
    {
      source: 'jira',
      sourceId: 'PERF-456',
      sourceUrl: 'https://acme.atlassian.net/browse/PERF-456',
      title: 'Optimize database queries for dashboard',
      description: 'Dashboard load time > 5s. Backend fix in acme/backend#55, frontend caching in acme/frontend#22.',
      timestamp: daysAgo(7),
      rawData: {
        key: 'PERF-456',
        status: 'Done',
        priority: 'Critical',
        assignee: 'honey.arora',
        storyPoints: 5,
        labels: ['performance'],
      },
    },

    // Related Jira ticket
    {
      source: 'jira',
      sourceId: 'PERF-457',
      sourceUrl: 'https://acme.atlassian.net/browse/PERF-457',
      title: 'Add database query caching layer',
      description: 'Related to PERF-456. Implements Redis caching for frequently accessed data.',
      timestamp: daysAgo(6),
      rawData: {
        key: 'PERF-457',
        status: 'Done',
        priority: 'High',
        assignee: 'honey.arora',
        storyPoints: 5,
      },
    },

    // Backend PR for performance
    {
      source: 'github',
      sourceId: 'acme/backend#55',
      sourceUrl: 'https://github.com/acme/backend/pull/55',
      title: 'perf: optimize dashboard queries with proper indexing',
      description: 'Closes PERF-456. Also addresses PERF-457 caching requirements. Reduces dashboard load from 5s to 200ms.',
      timestamp: daysAgo(5),
      rawData: {
        number: 55,
        state: 'merged',
        additions: 280,
        deletions: 45,
        changedFiles: 8,
        reviews: 2,
        commits: 4,
      },
    },

    // Frontend PR for performance
    {
      source: 'github',
      sourceId: 'acme/frontend#22',
      sourceUrl: 'https://github.com/acme/frontend/pull/22',
      title: 'perf: add client-side caching for dashboard data',
      description: 'Part of PERF-456. Works with acme/backend#55 to achieve <300ms load times.',
      timestamp: daysAgo(4),
      rawData: {
        number: 22,
        state: 'merged',
        additions: 150,
        deletions: 30,
        changedFiles: 5,
        reviews: 1,
        commits: 3,
      },
    },

    // =========================================================================
    // PROJECT 3: Standalone activities (should NOT cluster - no shared refs)
    // =========================================================================

    // Documentation ticket with no cross-refs
    {
      source: 'jira',
      sourceId: 'DOC-789',
      sourceUrl: 'https://acme.atlassian.net/browse/DOC-789',
      title: 'Update API documentation for v2 endpoints',
      description: 'Update Swagger/OpenAPI docs for the new v2 API endpoints.',
      timestamp: daysAgo(3),
      rawData: {
        key: 'DOC-789',
        status: 'Done',
        priority: 'Low',
        assignee: 'honey.arora',
        storyPoints: 2,
      },
    },

    // Standalone PR with no ticket reference
    {
      source: 'github',
      sourceId: 'acme/backend#60',
      sourceUrl: 'https://github.com/acme/backend/pull/60',
      title: 'chore: update dependencies',
      description: 'Routine dependency updates for security patches.',
      timestamp: daysAgo(2),
      rawData: {
        number: 60,
        state: 'merged',
        additions: 500,
        deletions: 400,
        changedFiles: 2,
        reviews: 1,
        commits: 1,
      },
    },

    // Figma design with no refs
    {
      source: 'figma',
      sourceId: 'Abc123XYZ',
      sourceUrl: 'https://www.figma.com/file/Abc123XYZ/Mobile-Redesign',
      title: 'Mobile App Redesign Explorations',
      description: 'Early explorations for mobile app redesign. Not linked to any tickets yet.',
      timestamp: daysAgo(1),
      rawData: {
        fileKey: 'Abc123XYZ',
        fileName: 'Mobile-Redesign',
        lastModified: daysAgo(1).toISOString(),
      },
    },

    // Outlook meeting that mentions a ticket
    {
      source: 'outlook',
      sourceId: 'meeting-12345',
      sourceUrl: null,
      title: 'Sprint Planning - Performance Review',
      description: 'Discussed PERF-456 blockers and timeline.',
      timestamp: daysAgo(8),
      rawData: {
        meetingId: 'meeting-12345',
        duration: 60,
        attendees: 5,
        organizer: 'pm@acme.com',
      },
    },

    // =========================================================================
    // PARTICIPANT ENTRIES: User was tagged/mentioned (not initiator)
    // These demonstrate evidence of collaboration and impact
    // =========================================================================

    // Jira: User was tagged as reviewer on someone else's ticket
    {
      source: 'jira',
      sourceId: 'PLAT-500',
      sourceUrl: 'https://acme.atlassian.net/browse/PLAT-500',
      title: 'Implement rate limiting for API',
      description: 'CC @honey.arora for security review. Blocked by AUTH-123 completion.',
      timestamp: daysAgo(13),
      rawData: {
        key: 'PLAT-500',
        status: 'In Review',
        priority: 'High',
        assignee: 'bob.chen',
        watchers: ['honey.arora', 'security-team'],
        mentions: ['honey.arora'],
        storyPoints: 5,
      },
    },

    // Jira: User mentioned in comments (pulling AUTH-123 into this cluster)
    {
      source: 'jira',
      sourceId: 'SEC-100',
      sourceUrl: 'https://acme.atlassian.net/browse/SEC-100',
      title: 'Security audit for authentication module',
      description: 'Audit the new OAuth2 implementation from AUTH-123. @honey.arora please provide architecture overview.',
      timestamp: daysAgo(9),
      rawData: {
        key: 'SEC-100',
        status: 'Done',
        priority: 'Critical',
        assignee: 'security-team',
        mentions: ['honey.arora'],
        comments: [
          { author: 'security-lead', body: '@honey.arora can you walk us through the token storage?' },
          { author: 'honey.arora', body: 'Sure, see the design doc confluence:987654' },
        ],
      },
    },

    // Confluence: User was tagged for review
    {
      source: 'confluence',
      sourceId: '555444',
      sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/555444/API+Rate+Limiting+Design',
      title: 'API Rate Limiting Design',
      description: 'Design doc for PLAT-500. @honey.arora please review the security considerations section.',
      timestamp: daysAgo(15),
      rawData: {
        pageId: '555444',
        spaceKey: 'ENG',
        version: 3,
        createdBy: 'bob.chen',
        lastModifiedBy: 'bob.chen',
        mentions: ['honey.arora'],
      },
    },

    // Outlook: User was invited to meeting (attendee, not organizer)
    {
      source: 'outlook',
      sourceId: 'meeting-67890',
      sourceUrl: null,
      title: 'AUTH-123 Code Review Deep Dive',
      description: 'Review session for OAuth2 implementation. Attendees: honey.arora, bob.chen, security-team',
      timestamp: daysAgo(11),
      rawData: {
        meetingId: 'meeting-67890',
        duration: 90,
        organizer: 'bob.chen',
        attendees: ['honey.arora', 'bob.chen', 'security-lead'],
        userRole: 'attendee',  // User was invited, not organizer
      },
    },

    // Slack: User was mentioned in thread about performance work
    {
      source: 'slack',
      sourceId: 'thread-abc123',
      sourceUrl: 'https://acme.slack.com/archives/C0ENGINEERING/p1234567890',
      title: 'Thread in #engineering',
      description: '@honey.arora your backend#55 changes fixed our dashboard! PERF-456 is looking good in staging.',
      timestamp: daysAgo(4),
      rawData: {
        channelId: 'C0ENGINEERING',
        channelName: 'engineering',
        messageTs: '1234567890.123456',
        threadTs: '1234567890.000000',
        mentions: ['honey.arora'],
        reactions: [{ name: 'tada', count: 5 }],
      },
    },

    // Google Meet: User joined a meeting about their PR
    {
      source: 'google',
      sourceId: 'meet-xyz-uvwx-stu',
      sourceUrl: 'https://meet.google.com/xyz-uvwx-stu',
      title: 'Backend PR Review - Performance Optimization',
      description: 'Reviewing acme/backend#55 with the team. Agenda: https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      timestamp: daysAgo(5),
      rawData: {
        meetCode: 'xyz-uvwx-stu',
        duration: 45,
        organizer: 'tech-lead@acme.com',
        participants: ['honey.arora', 'tech-lead', 'senior-dev'],
      },
    },

    // Google Docs: User was tagged for feedback on a design doc
    {
      source: 'google',
      sourceId: 'gdoc-1AbC123XYZ456_defGHI789jkl',
      sourceUrl: 'https://docs.google.com/document/d/1AbC123XYZ456_defGHI789jkl/edit',
      title: 'Microservices Migration Plan',
      description: 'PLAT-500 depends on this. @honey.arora please review the auth service section.',
      timestamp: daysAgo(16),
      rawData: {
        documentId: '1AbC123XYZ456_defGHI789jkl',
        title: 'Microservices Migration Plan',
        owner: 'architect@acme.com',
        lastModifiedBy: 'architect@acme.com',
        suggestedEditors: ['honey.arora'],
        comments: [
          { author: 'architect', body: '@honey.arora what do you think about the auth service boundaries?' },
        ],
      },
    },

    // GitHub: User was requested as reviewer
    {
      source: 'github',
      sourceId: 'acme/backend#70',
      sourceUrl: 'https://github.com/acme/backend/pull/70',
      title: 'feat(auth): add MFA support',
      description: 'Builds on AUTH-123 OAuth2 work. @honey.arora requesting review for security aspects.',
      timestamp: daysAgo(3),
      rawData: {
        number: 70,
        state: 'open',
        author: 'bob.chen',
        additions: 350,
        deletions: 20,
        changedFiles: 12,
        requestedReviewers: ['honey.arora'],
        reviews: [],
        commits: 5,
      },
    },

    // Figma: User was tagged in design feedback
    {
      source: 'figma',
      sourceId: 'DesignFile999XYZ',
      sourceUrl: 'https://www.figma.com/file/DesignFile999XYZ/Auth-Flow-Mockups',
      title: 'Auth Flow Mockups',
      description: 'UI mockups for AUTH-123 OAuth2 flow. @honey.arora please review the error states.',
      timestamp: daysAgo(20),
      rawData: {
        file_key: 'DesignFile999XYZ',
        fileName: 'Auth-Flow-Mockups',
        lastModified: daysAgo(18).toISOString(),
        owner: 'designer@acme.com',
        commenters: ['honey.arora', 'product-manager'],
      },
    },
  ];
}

/**
 * Get expected cluster results for validation
 */
export function getExpectedClusters(): { name: string; refs: string[]; activityCount: number }[] {
  return [
    {
      name: 'Authentication System',
      refs: ['AUTH-123', 'AUTH-124', 'acme/backend#42', 'confluence:987654'],
      activityCount: 4,
    },
    {
      name: 'Performance Optimization',
      refs: ['PERF-456', 'PERF-457', 'acme/backend#55', 'acme/frontend#22'],
      activityCount: 5, // Includes the meeting that mentions PERF-456
    },
    // DOC-789, acme/backend#60, and Figma file should remain unclustered
  ];
}
