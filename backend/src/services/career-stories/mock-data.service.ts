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

    // Slack: Thread reply to user's original message (someone replied to honey.arora)
    {
      source: 'slack',
      sourceId: 'thread-reply-xyz',
      sourceUrl: 'https://acme.slack.com/archives/C0PLATFORM/p1234567891',
      title: 'Thread reply in #platform',
      description: 'Re: Rate limiting question - Yes, PLAT-500 needs the auth changes from AUTH-123 first.',
      timestamp: daysAgo(14),
      rawData: {
        channelId: 'C0PLATFORM',
        channelName: 'platform',
        messageTs: '1234567891.111111',
        threadTs: '1234567891.000000',  // Original thread by honey.arora
        parentAuthor: 'honey.arora',
        replyAuthor: 'bob.chen',
        isThreadReply: true,
      },
    },

    // GitHub: User was @mentioned in a PR comment
    {
      source: 'github',
      sourceId: 'acme/backend#75',
      sourceUrl: 'https://github.com/acme/backend/pull/75',
      title: 'fix(api): handle edge case in rate limiter',
      description: 'Fixes edge case found in PLAT-500 testing.',
      timestamp: daysAgo(10),
      rawData: {
        number: 75,
        state: 'merged',
        author: 'bob.chen',
        additions: 25,
        deletions: 5,
        changedFiles: 2,
        comments: [
          { author: 'bob.chen', body: '@honey.arora can you confirm this matches the AUTH-123 token validation logic?' },
          { author: 'honey.arora', body: 'Looks good! The token check here aligns with what we did in acme/backend#42' },
        ],
        mentions: ['honey.arora'],
        commits: 2,
      },
    },

    // Jira: Ticket assigned TO user (user is the assignee)
    {
      source: 'jira',
      sourceId: 'ONCALL-101',
      sourceUrl: 'https://acme.atlassian.net/browse/ONCALL-101',
      title: 'On-call: Investigate auth service latency spike',
      description: 'Assigned to honey.arora. Related to AUTH-123 OAuth2 changes. See monitoring dashboard.',
      timestamp: daysAgo(8),
      rawData: {
        key: 'ONCALL-101',
        status: 'Done',
        priority: 'Critical',
        assignee: 'honey.arora',  // User IS the assignee
        reporter: 'oncall-bot',
        storyPoints: 2,
        labels: ['oncall', 'incident'],
      },
    },

    // Jira: User is watching a ticket (not assignee or reporter)
    {
      source: 'jira',
      sourceId: 'INFRA-200',
      sourceUrl: 'https://acme.atlassian.net/browse/INFRA-200',
      title: 'Upgrade Redis cluster for caching layer',
      description: 'Needed for PERF-457 caching requirements. Watchers: honey.arora, backend-team',
      timestamp: daysAgo(6),
      rawData: {
        key: 'INFRA-200',
        status: 'In Progress',
        priority: 'High',
        assignee: 'infra-team',
        reporter: 'pm',
        watchers: ['honey.arora', 'backend-team'],
        userRole: 'watcher',
        storyPoints: 5,
      },
    },

    // Confluence: User is watching a page (not author)
    {
      source: 'confluence',
      sourceId: '777888',
      sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/777888/Redis+Cluster+Operations+Runbook',
      title: 'Redis Cluster Operations Runbook',
      description: 'Runbook for INFRA-200 Redis upgrade. Related to PERF-457 caching layer.',
      timestamp: daysAgo(5),
      rawData: {
        pageId: '777888',
        spaceKey: 'ENG',
        version: 2,
        createdBy: 'infra-team',
        lastModifiedBy: 'infra-team',
        watchers: ['honey.arora', 'backend-team'],
        userRole: 'watcher',
      },
    },

    // Google Meet: User joined a meeting about their PR
    {
      source: 'google-meet',
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
      source: 'google-docs',
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

    // Google Calendar: User organized a meeting (links to auth work)
    {
      source: 'google-calendar',
      sourceId: 'gcal-auth-review-meeting',
      sourceUrl: 'https://calendar.google.com/calendar/event?eid=YXV0aC1yZXZpZXctbWVldGluZw',
      title: 'AUTH-123 Security Review - OAuth2 Implementation',
      description: 'Deep dive into OAuth2 token handling. Attendees: security-team, bob.chen. Related: acme/backend#42',
      timestamp: daysAgo(11),
      rawData: {
        eventId: 'auth-review-meeting',
        organizer: 'honey.arora',
        attendees: ['security-lead', 'bob.chen', 'honey.arora'],
        userRole: 'organizer',
        duration: 60,
        conferenceLink: 'https://meet.google.com/auth-rev-mtg',
      },
    },

    // Google Calendar: User was invited as attendee
    {
      source: 'google-calendar',
      sourceId: 'gcal-perf-standup',
      sourceUrl: 'https://calendar.google.com/calendar/event?eid=cGVyZi1zdGFuZHVw',
      title: 'PERF-456 Daily Standup',
      description: 'Daily sync for performance optimization sprint.',
      timestamp: daysAgo(6),
      rawData: {
        eventId: 'perf-standup',
        organizer: 'pm@acme.com',
        attendees: ['honey.arora', 'frontend-dev', 'pm'],
        userRole: 'attendee',
        duration: 15,
      },
    },

    // Google Sheets: User created a spreadsheet for tracking
    {
      source: 'google-sheets',
      sourceId: 'gsheet-perf-metrics',
      sourceUrl: 'https://docs.google.com/spreadsheets/d/1PerfMetricsSheet_abcdefghij123/edit',
      title: 'PERF-456 Performance Metrics Dashboard',
      description: 'Tracking dashboard load times for PERF-456. Sharing with team for acme/backend#55 impact analysis.',
      timestamp: daysAgo(7),
      rawData: {
        spreadsheetId: '1PerfMetricsSheet_abcdefghij123',
        owner: 'honey.arora',
        lastModifiedBy: 'honey.arora',
        sheets: ['Dashboard', 'Raw Data', 'Charts'],
      },
    },

    // Google Sheets: User was tagged in a comment
    {
      source: 'google-sheets',
      sourceId: 'gsheet-capacity-planning',
      sourceUrl: 'https://docs.google.com/spreadsheets/d/1CapacityPlanSheet_xyz789012345/edit',
      title: 'Q1 Capacity Planning',
      description: '@honey.arora please update the auth team estimates for PLAT-500.',
      timestamp: daysAgo(17),
      rawData: {
        spreadsheetId: '1CapacityPlanSheet_xyz789012345',
        owner: 'pm@acme.com',
        lastModifiedBy: 'pm@acme.com',
        comments: [
          { author: 'pm', body: '@honey.arora please update auth team estimates for rate limiting work' },
        ],
        mentions: ['honey.arora'],
      },
    },

    // Google Slides: User created a presentation (using google-drive as generic doc source)
    {
      source: 'google-drive',
      sourceId: 'gslides-auth-overview',
      sourceUrl: 'https://docs.google.com/presentation/d/1AuthOverviewSlides_abcdef12345/edit',
      title: 'OAuth2 Architecture Overview',
      description: 'Presentation for AUTH-123 architecture review. Used in the security review meeting.',
      timestamp: daysAgo(12),
      rawData: {
        presentationId: '1AuthOverviewSlides_abcdef12345',
        owner: 'honey.arora',
        lastModifiedBy: 'honey.arora',
        slideCount: 15,
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

    // =========================================================================
    // HISTORICAL ACTIVITIES (30-60 days ago) - for richer journal entries
    // =========================================================================

    // Earlier project: API Versioning (35-45 days ago)
    {
      source: 'jira',
      sourceId: 'API-200',
      sourceUrl: 'https://acme.atlassian.net/browse/API-200',
      title: 'Implement API versioning strategy',
      description: 'Design and implement v2 API endpoints with backwards compatibility.',
      timestamp: daysAgo(45),
      rawData: {
        key: 'API-200',
        status: 'Done',
        priority: 'High',
        assignee: 'honey.arora',
        storyPoints: 13,
        labels: ['api', 'breaking-change'],
      },
    },
    {
      source: 'github',
      sourceId: 'acme/backend#30',
      sourceUrl: 'https://github.com/acme/backend/pull/30',
      title: 'feat(api): implement v2 endpoints with versioning',
      description: 'Closes API-200. Adds /v2 prefix and request header versioning support.',
      timestamp: daysAgo(40),
      rawData: {
        number: 30,
        state: 'merged',
        additions: 890,
        deletions: 120,
        changedFiles: 28,
        reviews: 4,
        commits: 12,
      },
    },
    {
      source: 'confluence',
      sourceId: '654321',
      sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/654321/API+Versioning+Strategy',
      title: 'API Versioning Strategy',
      description: 'Technical design for API-200. Covers URL versioning, header versioning, and deprecation policy.',
      timestamp: daysAgo(50),
      rawData: {
        pageId: '654321',
        spaceKey: 'ENG',
        version: 8,
        lastModifiedBy: 'honey.arora',
      },
    },

    // Earlier project: Database Migration (50-60 days ago)
    {
      source: 'jira',
      sourceId: 'DB-150',
      sourceUrl: 'https://acme.atlassian.net/browse/DB-150',
      title: 'Migrate user data to new schema',
      description: 'Zero-downtime migration of user table to support multi-tenancy.',
      timestamp: daysAgo(60),
      rawData: {
        key: 'DB-150',
        status: 'Done',
        priority: 'Critical',
        assignee: 'honey.arora',
        storyPoints: 21,
        labels: ['database', 'migration', 'multi-tenant'],
      },
    },
    {
      source: 'github',
      sourceId: 'acme/backend#25',
      sourceUrl: 'https://github.com/acme/backend/pull/25',
      title: 'feat(db): implement zero-downtime user schema migration',
      description: 'Closes DB-150. Uses shadow table pattern for safe migration.',
      timestamp: daysAgo(55),
      rawData: {
        number: 25,
        state: 'merged',
        additions: 650,
        deletions: 200,
        changedFiles: 18,
        reviews: 5,
        commits: 8,
      },
    },
    {
      source: 'confluence',
      sourceId: '543210',
      sourceUrl: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/543210/Database+Migration+Runbook',
      title: 'Database Migration Runbook',
      description: 'Step-by-step runbook for DB-150 migration. Includes rollback procedures.',
      timestamp: daysAgo(58),
      rawData: {
        pageId: '543210',
        spaceKey: 'ENG',
        version: 4,
        lastModifiedBy: 'honey.arora',
      },
    },

    // Earlier activities: Code review and mentoring (35-50 days ago)
    {
      source: 'github',
      sourceId: 'acme/backend#28',
      sourceUrl: 'https://github.com/acme/backend/pull/28',
      title: 'feat(users): add user preference storage',
      description: 'New feature PR. @honey.arora requested as reviewer for database design.',
      timestamp: daysAgo(42),
      rawData: {
        number: 28,
        state: 'merged',
        author: 'junior-dev',
        additions: 280,
        deletions: 15,
        changedFiles: 8,
        requestedReviewers: ['honey.arora'],
        reviews: [{ reviewer: 'honey.arora', state: 'APPROVED' }],
        commits: 4,
      },
    },
    {
      source: 'slack',
      sourceId: 'thread-mentoring-db',
      sourceUrl: 'https://acme.slack.com/archives/C0BACKEND/p1234500000',
      title: 'Thread in #backend-team',
      description: '@honey.arora thanks for the detailed code review on #28! The database indexing tips were super helpful.',
      timestamp: daysAgo(41),
      rawData: {
        channelId: 'C0BACKEND',
        channelName: 'backend-team',
        messageTs: '1234500000.123456',
        mentions: ['honey.arora'],
      },
    },

    // Q4 Planning activities (30-35 days ago)
    {
      source: 'google-docs',
      sourceId: 'gdoc-q4-okrs',
      sourceUrl: 'https://docs.google.com/document/d/1Q4OKRs_planning_doc_xyz/edit',
      title: 'Q4 Engineering OKRs',
      description: 'Team OKRs for Q4. @honey.arora owns the API reliability objective.',
      timestamp: daysAgo(35),
      rawData: {
        documentId: '1Q4OKRs_planning_doc_xyz',
        owner: 'eng-manager',
        contributors: ['honey.arora', 'tech-lead', 'senior-dev'],
      },
    },
    {
      source: 'jira',
      sourceId: 'EPIC-Q4-100',
      sourceUrl: 'https://acme.atlassian.net/browse/EPIC-Q4-100',
      title: 'Q4 API Reliability Initiative',
      description: 'Epic for Q4 reliability improvements. Includes AUTH-123, PERF-456, and monitoring work.',
      timestamp: daysAgo(32),
      rawData: {
        key: 'EPIC-Q4-100',
        issueType: 'Epic',
        status: 'In Progress',
        priority: 'High',
        assignee: 'honey.arora',
        linkedIssues: ['AUTH-123', 'PERF-456'],
      },
    },
  ];
}

/**
 * Get expected cluster results for validation
 *
 * Updated to reflect comprehensive cross-tool clustering with rawData patterns.
 * Clusters are linked by shared refs extracted from titles, descriptions, URLs, and rawData.
 *
 * Current clustering produces 3 clusters:
 * 1. DB-150 cluster (database migration work)
 * 2. Main cluster (Auth + Platform + Perf + Infra - all interconnected)
 * 3. API-200 cluster (API versioning work)
 */
export function getExpectedClusters(): { name: string; sharedRefs: string[]; activityIds: string[] }[] {
  return [
    {
      // Database migration work
      name: 'Database Migration',
      sharedRefs: ['DB-150'],
      activityIds: ['543210', 'DB-150', 'acme/backend#25'],
    },
    {
      // Main interconnected cluster - Auth + Platform + Perf + Infra
      // These are all connected through shared refs like AUTH-123, PERF-456, etc.
      name: 'Auth & Platform & Performance',
      sharedRefs: [
        'AUTH-123', 'confluence:987654', 'acme/backend#42',
        'PERF-456', 'acme/backend#55', 'acme/frontend#22',
        'PERF-457', 'PLAT-500', 'INFRA-200',
      ],
      activityIds: [
        // Platform rate limiting
        '555444', 'PLAT-500',
        // Core auth work
        'acme/backend#42', 'meeting-67890', 'thread-reply-xyz', '987654',
        'AUTH-123', 'AUTH-124', 'SEC-100', 'acme/backend#75',
        'gcal-auth-review-meeting', 'gslides-auth-overview', 'ONCALL-101',
        'acme/backend#70', 'DesignFile999XYZ',
        // Epic
        'EPIC-Q4-100',
        // Performance work
        'PERF-456', 'PERF-457', 'acme/backend#55', 'acme/frontend#22',
        'meeting-12345', 'thread-abc123',
        'gcal-perf-standup', 'gsheet-perf-metrics', 'meet-xyz-uvwx-stu',
        // Infrastructure
        '777888', 'INFRA-200',
        // Google docs
        'gdoc-1AbC123XYZ456_defGHI789jkl', 'gsheet-capacity-planning',
      ],
    },
    {
      // API versioning work
      name: 'API Versioning',
      sharedRefs: ['API-200'],
      activityIds: ['654321', 'API-200', 'acme/backend#30'],
    },
  ];
}

/**
 * Get expected unclustered activity IDs
 */
export function getExpectedUnclustered(): string[] {
  return [
    'DOC-789',           // Standalone documentation
    'acme/backend#60',   // Dependency update, no ticket refs
    'Abc123XYZ',         // Mobile redesign Figma, no cross-refs
    'acme/backend#28',   // Logging improvements, no cross-refs
    'thread-mentoring-db', // Mentoring thread, no project refs
    'gdoc-q4-okrs',      // Q4 OKRs doc, no project refs
  ];
}
