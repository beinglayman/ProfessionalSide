/**
 * MockDataV2Service
 *
 * Second-generation mock data for career stories demo.
 * 49 activities spanning ~3 months, clustering into 4 distinct stories
 * plus 12 unclustered ambient activities.
 *
 * Primary persona: ketan2@inchronicle.com
 * Collaborators: honey, priya.sharma, marcus.chen, riya.patel, arjun.desai,
 *               nisha.gupta, vikram.rao, dev.mehta
 *
 * Stories:
 *   1. "Building Real-Time Collaboration Feature" (12 activities)
 *   2. "Credits/Wallet Double-Debit Incident" (11 activities)
 *   3. "Current Sprint Work" (7 activities, last week)
 *   4. "Previous Sprint Work" (7 activities)
 *   + 12 unclustered ambient activities
 */

import { ActivityInput } from './activity-persistence.service';

export function generateMockActivitiesV2(): ActivityInput[] {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return [
    // =========================================================================
    // STORY 1: Building Real-Time Collaboration Feature (12 activities)
    // Anchors: COLLAB-101, COLLAB-102, confluence:112233,
    //          inchronicle/collab-platform#210, #215, inchronicle/collab-ui#88
    // Span: daysAgo(56) -> daysAgo(22), max gap 4 days
    // =========================================================================

    // #1 - Confluence design doc
    {
      source: 'confluence',
      sourceId: '112233',
      sourceUrl: 'https://inchronicle.atlassian.net/wiki/spaces/ENG/pages/112233/Real-Time+Collaboration+Architecture',
      title: 'Real-Time Collaboration Architecture',
      description: 'Architecture design for COLLAB-101 real-time collaboration feature. Covers WebSocket layer, presence system, and conflict resolution strategy.',
      timestamp: daysAgo(56),
      rawData: {
        pageId: '112233',
        spaceKey: 'ENG',
        version: 7,
        lastModifiedBy: 'ketan2@inchronicle.com',
      },
    },

    // #2 - Jira: main feature ticket
    {
      source: 'jira',
      sourceId: 'COLLAB-101',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/COLLAB-101',
      title: 'Implement WebSocket layer for real-time collaboration',
      description: 'Build the WebSocket connection manager and message routing layer. See design: confluence:112233',
      timestamp: daysAgo(52),
      rawData: {
        key: 'COLLAB-101',
        status: 'Done',
        priority: 'High',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'riya.patel@inchronicle.com',
        storyPoints: 13,
        labels: ['real-time', 'websocket'],
      },
    },

    // #3 - Jira: presence indicator ticket
    {
      source: 'jira',
      sourceId: 'COLLAB-102',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/COLLAB-102',
      title: 'Build presence indicator component',
      description: 'Real-time presence indicators showing who is viewing/editing. Depends on COLLAB-101 WebSocket layer.',
      timestamp: daysAgo(48),
      rawData: {
        key: 'COLLAB-102',
        status: 'Done',
        priority: 'Medium',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'riya.patel@inchronicle.com',
        storyPoints: 5,
        labels: ['real-time', 'frontend'],
      },
    },

    // #4 - GitHub commit: WebSocket connection manager
    {
      source: 'github',
      sourceId: 'commit:f1a2b3c',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/commit/f1a2b3c',
      title: 'feat(ws): add WebSocket connection manager',
      description: 'feat(ws): add WebSocket connection manager\n\nImplements connection lifecycle, heartbeat, and reconnection logic.\n\nRelated to COLLAB-101',
      timestamp: daysAgo(45),
      rawData: {
        sha: 'f1a2b3c4d5e6f7a8',
        author: 'ketan2@inchronicle.com',
        repository: 'inchronicle/collab-platform',
        additions: 340,
        deletions: 12,
        filesChanged: 8,
        message: 'feat(ws): add WebSocket connection manager\n\nRelated to COLLAB-101',
      },
    },

    // #5 - GitHub PR: real-time collaboration backend
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#210',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/210',
      title: 'feat(ws): implement real-time collaboration backend',
      description: 'Closes COLLAB-101. Implements WebSocket message routing, room management, and auth integration. Design: confluence:112233',
      timestamp: daysAgo(40),
      rawData: {
        number: 210,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 890,
        deletions: 45,
        changedFiles: 22,
        reviews: 4,
        commits: 11,
        headRef: 'feature/real-time-collab',
        baseRef: 'main',
        reviewers: ['marcus.chen@inchronicle.com', 'priya.sharma@inchronicle.com'],
        body: '## Summary\nImplements real-time collaboration backend for COLLAB-101.\n\n## Changes\n- WebSocket room management\n- Message routing with pub/sub\n- Auth token validation on connect\n\nDesign: confluence:112233',
      },
    },

    // #6 - Calendar: design review
    {
      source: 'google-calendar',
      sourceId: 'gcal-collab-design-review',
      sourceUrl: null,
      title: 'COLLAB-101 Design Review',
      description: 'Review WebSocket architecture and presence system design for COLLAB-101.',
      timestamp: daysAgo(43),
      rawData: {
        eventId: 'collab-design-review',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'marcus.chen@inchronicle.com', 'priya.sharma@inchronicle.com', 'riya.patel@inchronicle.com'],
        duration: 60,
      },
    },

    // #7 - GitHub PR: presence indicators
    {
      source: 'github',
      sourceId: 'inchronicle/collab-ui#88',
      sourceUrl: 'https://github.com/inchronicle/collab-ui/pull/88',
      title: 'feat(presence): real-time presence indicators',
      description: 'Implements COLLAB-102 presence UI. Shows active users with avatars, typing indicators, and cursor positions. Requires COLLAB-101 WebSocket layer.',
      timestamp: daysAgo(36),
      rawData: {
        number: 88,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 420,
        deletions: 30,
        changedFiles: 12,
        reviews: 2,
        commits: 6,
        reviewers: ['priya.sharma@inchronicle.com'],
      },
    },

    // #8 - GitHub PR: cursor sharing and conflict resolution
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#215',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/215',
      title: 'feat(ws): cursor sharing and conflict resolution',
      description: 'Adds real-time cursor position sharing and OT-based conflict resolution. Builds on inchronicle/collab-platform#210. Part of COLLAB-101.',
      timestamp: daysAgo(32),
      rawData: {
        number: 215,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 560,
        deletions: 80,
        changedFiles: 15,
        reviews: 3,
        commits: 8,
        reviewers: ['marcus.chen@inchronicle.com'],
      },
    },

    // #9 - Calendar: feature demo
    {
      source: 'google-calendar',
      sourceId: 'gcal-collab-demo',
      sourceUrl: null,
      title: 'Real-Time Collab Feature Demo',
      description: 'Demo of COLLAB-101 real-time collaboration to stakeholders.',
      timestamp: daysAgo(28),
      rawData: {
        eventId: 'collab-demo',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['riya.patel@inchronicle.com', 'vikram.rao@inchronicle.com', 'priya.sharma@inchronicle.com'],
        duration: 30,
      },
    },

    // #10 - Slack: launch announcement
    {
      source: 'slack',
      sourceId: 'thread-collab-launch',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0PRODUCTENG/p1700000001',
      title: 'Thread in #product-eng',
      description: 'Real-time collab is live! COLLAB-101 shipped to production. Cursor sharing from inchronicle/collab-platform#215 is getting great feedback.',
      timestamp: daysAgo(25),
      rawData: {
        channelId: 'C0PRODUCTENG',
        channelName: 'product-eng',
        messageTs: '1700000001.000000',
        threadTs: '1700000001.000000',
        mentions: ['ketan2@inchronicle.com'],
        reactions: [{ name: 'rocket', count: 12 }, { name: 'tada', count: 8 }],
      },
    },

    // #11 - Outlook: kudos from VP Engineering
    {
      source: 'outlook',
      sourceId: 'email-collab-kudos',
      sourceUrl: null,
      title: 'Re: Real-time collaboration launch',
      description: 'Great work on COLLAB-101! The real-time collaboration feature has been a huge hit with early adopters. Well done on the architecture and execution.',
      timestamp: daysAgo(23),
      rawData: {
        messageId: 'email-collab-kudos',
        from: 'vikram.rao@inchronicle.com',
        to: ['ketan2@inchronicle.com', 'eng-team@inchronicle.com'],
        subject: 'Re: Real-time collaboration launch',
      },
    },

    // #12 - Calendar: retrospective
    {
      source: 'google-calendar',
      sourceId: 'gcal-collab-retro',
      sourceUrl: null,
      title: 'Collab Feature Retrospective',
      description: 'Retrospective on COLLAB-101 real-time collaboration feature build.',
      timestamp: daysAgo(22),
      rawData: {
        eventId: 'collab-retro',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'marcus.chen@inchronicle.com', 'priya.sharma@inchronicle.com', 'riya.patel@inchronicle.com'],
        duration: 60,
      },
    },

    // =========================================================================
    // STORY 2: Credits/Wallet Double-Debit Incident (11 activities)
    // Anchors: BILL-550, BILL-551, BILL-552,
    //          inchronicle/billing-api#140, #145
    // Span: daysAgo(19) -> daysAgo(12), compressed incident timeline
    // =========================================================================

    // #13 - Jira: P1 incident
    {
      source: 'jira',
      sourceId: 'BILL-550',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/BILL-550',
      title: 'P1 Incident: Credits double-debit on concurrent wallet operations',
      description: 'Users reporting duplicate credit deductions when multiple derivations are triggered simultaneously. Race condition in wallet service.',
      timestamp: daysAgo(19),
      rawData: {
        key: 'BILL-550',
        status: 'Done',
        priority: 'Critical',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'nisha.gupta@inchronicle.com',
        storyPoints: 8,
        labels: ['incident', 'P1', 'billing'],
      },
    },

    // #14 - Slack: incident triage
    {
      source: 'slack',
      sourceId: 'thread-incident-triage',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0INCIDENTS/p1700000002',
      title: 'Thread in #incidents',
      description: 'BILL-550 triage: seeing double-debit on wallet operations. Reproduces when two derive calls hit within 50ms. Investigating race condition in optimistic update path.',
      timestamp: daysAgo(19),
      rawData: {
        channelId: 'C0INCIDENTS',
        channelName: 'incidents',
        messageTs: '1700000002.000000',
        threadTs: '1700000002.000000',
        mentions: ['ketan2@inchronicle.com', 'arjun.desai@inchronicle.com'],
        reactions: [{ name: 'eyes', count: 6 }],
      },
    },

    // #15 - Outlook: incident comms
    {
      source: 'outlook',
      sourceId: 'email-incident-comms',
      sourceUrl: null,
      title: 'Incident: Credits double-debit — Initial Assessment',
      description: 'BILL-550 initial assessment: root cause identified as missing row-level locking in wallet debit path. Fix in progress, ETA 4 hours.',
      timestamp: daysAgo(18),
      rawData: {
        messageId: 'email-incident-comms',
        from: 'ketan2@inchronicle.com',
        to: ['vikram.rao@inchronicle.com', 'eng-leads@inchronicle.com'],
        cc: ['arjun.desai@inchronicle.com'],
        subject: 'Incident: Credits double-debit — Initial Assessment',
      },
    },

    // #16 - GitHub PR: optimistic locking fix
    {
      source: 'github',
      sourceId: 'inchronicle/billing-api#140',
      sourceUrl: 'https://github.com/inchronicle/billing-api/pull/140',
      title: 'fix(wallet): add optimistic locking to prevent double-debit',
      description: 'Fixes BILL-550. Adds row-level locking with SELECT FOR UPDATE on wallet balance reads. Includes retry logic for lock contention.',
      timestamp: daysAgo(18),
      rawData: {
        number: 140,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 180,
        deletions: 25,
        changedFiles: 6,
        reviews: 2,
        commits: 3,
        headRef: 'fix/double-debit-locking',
        baseRef: 'main',
        reviewers: ['marcus.chen@inchronicle.com', 'arjun.desai@inchronicle.com'],
      },
    },

    // #17 - Jira: follow-up idempotency
    {
      source: 'jira',
      sourceId: 'BILL-551',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/BILL-551',
      title: 'Follow-up: Add idempotency keys to credit operations',
      description: 'Follow-up to BILL-550. Add idempotency keys to all credit debit/credit operations to prevent duplicate processing at the API layer.',
      timestamp: daysAgo(17),
      rawData: {
        key: 'BILL-551',
        status: 'Done',
        priority: 'High',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'ketan2@inchronicle.com',
        storyPoints: 5,
        labels: ['billing', 'reliability'],
      },
    },

    // #18 - Jira: revenue config fix
    {
      source: 'jira',
      sourceId: 'BILL-552',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/BILL-552',
      title: 'Fix premium packet generation revenue misconfiguration',
      description: 'Discovered during BILL-550 investigation: premium packet credit cost was misconfigured, leading to undercharging.',
      timestamp: daysAgo(16),
      rawData: {
        key: 'BILL-552',
        status: 'Done',
        priority: 'Medium',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'ketan2@inchronicle.com',
        storyPoints: 2,
        labels: ['billing', 'config'],
      },
    },

    // #19 - GitHub PR: idempotency + revenue fix
    {
      source: 'github',
      sourceId: 'inchronicle/billing-api#145',
      sourceUrl: 'https://github.com/inchronicle/billing-api/pull/145',
      title: 'fix(wallet): idempotency keys + revenue config corrections',
      description: 'Closes BILL-551 and BILL-552. Adds idempotency key header support for all wallet operations. Fixes premium packet credit cost configuration.',
      timestamp: daysAgo(15),
      rawData: {
        number: 145,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 310,
        deletions: 55,
        changedFiles: 9,
        reviews: 3,
        commits: 5,
        reviewers: ['marcus.chen@inchronicle.com', 'arjun.desai@inchronicle.com'],
      },
    },

    // #20 - Google Docs: post-mortem
    {
      source: 'google-docs',
      sourceId: 'gdoc-postmortem-doubledebit',
      sourceUrl: 'https://docs.google.com/document/d/1PostMortemBILL550/edit',
      title: 'Incident Post-Mortem: Credits Double-Debit (BILL-550)',
      description: 'Post-mortem for BILL-550. Root cause: missing row-level lock. Fix: inchronicle/billing-api#140 (locking) + inchronicle/billing-api#145 (idempotency). Impact: 23 users affected, $142 in credits refunded.',
      timestamp: daysAgo(13),
      rawData: {
        documentId: '1PostMortemBILL550',
        owner: 'ketan2@inchronicle.com',
        contributors: ['ketan2@inchronicle.com', 'arjun.desai@inchronicle.com', 'marcus.chen@inchronicle.com'],
      },
    },

    // #21 - Slack: post-mortem review
    {
      source: 'slack',
      sourceId: 'thread-postmortem-review',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0ENGALL/p1700000003',
      title: 'Thread in #engineering-all',
      description: 'BILL-550 post-mortem published. Key takeaway: all financial operations need idempotency keys and row-level locking. Great incident response from the team.',
      timestamp: daysAgo(13),
      rawData: {
        channelId: 'C0ENGALL',
        channelName: 'engineering-all',
        messageTs: '1700000003.000000',
        threadTs: '1700000003.000000',
        mentions: ['ketan2@inchronicle.com'],
        reactions: [{ name: 'memo', count: 4 }, { name: '+1', count: 9 }],
      },
    },

    // #22 - Outlook: incident resolved
    {
      source: 'outlook',
      sourceId: 'email-incident-resolved',
      sourceUrl: null,
      title: 'Incident Resolved: Credits double-debit — lessons learned',
      description: 'BILL-550 resolved. All affected users refunded. New idempotency layer prevents recurrence. Post-mortem action items assigned.',
      timestamp: daysAgo(12),
      rawData: {
        messageId: 'email-incident-resolved',
        from: 'ketan2@inchronicle.com',
        to: ['vikram.rao@inchronicle.com', 'eng-leads@inchronicle.com'],
        subject: 'Incident Resolved: Credits double-debit — lessons learned',
      },
    },

    // #23 - Calendar: incident review meeting
    {
      source: 'google-calendar',
      sourceId: 'gcal-incident-review',
      sourceUrl: null,
      title: 'BILL-550 Incident Review Meeting',
      description: 'Review BILL-550 incident response, timeline, and action items.',
      timestamp: daysAgo(12),
      rawData: {
        eventId: 'incident-review-bill550',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'arjun.desai@inchronicle.com', 'marcus.chen@inchronicle.com', 'vikram.rao@inchronicle.com'],
        duration: 60,
      },
    },

    // =========================================================================
    // STORY 3: Current Sprint Work (7 activities)
    // Anchors: PLAT-700, PLAT-701, PLAT-702,
    //          inchronicle/collab-platform#230, #232
    // Span: daysAgo(7) -> daysAgo(2) — fully within "Last Week" bucket
    // =========================================================================

    // #24 - Jira: rate limiting
    {
      source: 'jira',
      sourceId: 'PLAT-700',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/PLAT-700',
      title: 'Add rate limiting to WebSocket connections',
      description: 'Implement per-user rate limiting for WebSocket message throughput to prevent abuse and ensure fair resource usage.',
      timestamp: daysAgo(7),
      rawData: {
        key: 'PLAT-700',
        status: 'Done',
        priority: 'High',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'riya.patel@inchronicle.com',
        storyPoints: 5,
        labels: ['platform', 'security'],
      },
    },

    // #25 - Jira: connection pooling
    {
      source: 'jira',
      sourceId: 'PLAT-701',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/PLAT-701',
      title: 'Implement connection pooling for collaboration service',
      description: 'Connection pooling to handle WebSocket scale. Related to PLAT-700 rate limiting work.',
      timestamp: daysAgo(6),
      rawData: {
        key: 'PLAT-701',
        status: 'Done',
        priority: 'High',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'riya.patel@inchronicle.com',
        storyPoints: 8,
        labels: ['platform', 'scalability'],
      },
    },

    // #26 - GitHub PR: rate limiting
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#230',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/230',
      title: 'feat(ws): rate limiting for WebSocket connections',
      description: 'Closes PLAT-700. Implements sliding window rate limiter with per-user quotas and graceful backpressure.',
      timestamp: daysAgo(5),
      rawData: {
        number: 230,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 280,
        deletions: 20,
        changedFiles: 7,
        reviews: 2,
        commits: 4,
        reviewers: ['marcus.chen@inchronicle.com'],
      },
    },

    // #27 - Jira: monitoring dashboards
    {
      source: 'jira',
      sourceId: 'PLAT-702',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/PLAT-702',
      title: 'Update monitoring dashboards for collab service',
      description: 'Add Grafana dashboards for WebSocket connection metrics, rate limiting stats. Related to PLAT-700 and PLAT-701.',
      timestamp: daysAgo(4),
      rawData: {
        key: 'PLAT-702',
        status: 'In Progress',
        priority: 'Medium',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'arjun.desai@inchronicle.com',
        storyPoints: 3,
        labels: ['platform', 'observability'],
      },
    },

    // #28 - GitHub PR: connection pooling
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#232',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/232',
      title: 'feat(ws): connection pooling and health checks',
      description: 'Closes PLAT-701. Implements connection pool with configurable limits, health check endpoints, and graceful drain on shutdown.',
      timestamp: daysAgo(3),
      rawData: {
        number: 232,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 450,
        deletions: 60,
        changedFiles: 11,
        reviews: 3,
        commits: 7,
        reviewers: ['marcus.chen@inchronicle.com', 'arjun.desai@inchronicle.com'],
      },
    },

    // #29 - Calendar: daily standup
    {
      source: 'google-calendar',
      sourceId: 'gcal-standup-current',
      sourceUrl: null,
      title: 'Daily Standup',
      description: 'Sprint standup — discussed PLAT-700 rate limiting rollout and PLAT-701 connection pooling status.',
      timestamp: daysAgo(3),
      rawData: {
        eventId: 'standup-current',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'priya.sharma@inchronicle.com', 'dev.mehta@inchronicle.com', 'riya.patel@inchronicle.com'],
        duration: 15,
      },
    },

    // #30 - Calendar: sprint retro
    {
      source: 'google-calendar',
      sourceId: 'gcal-retro-current',
      sourceUrl: null,
      title: 'Sprint Retrospective',
      description: 'Sprint retro — reviewed PLAT-700 rate limiting delivery and upcoming monitoring work.',
      timestamp: daysAgo(2),
      rawData: {
        eventId: 'retro-current',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'priya.sharma@inchronicle.com', 'marcus.chen@inchronicle.com', 'riya.patel@inchronicle.com'],
        duration: 60,
      },
    },

    // =========================================================================
    // STORY 4: Previous Sprint Work (7 activities)
    // Anchors: PLAT-680, PLAT-681, PLAT-682,
    //          inchronicle/collab-platform#220, confluence:445566
    // Span: daysAgo(25) -> daysAgo(14)
    // =========================================================================

    // #31 - Jira: caching strategy
    {
      source: 'jira',
      sourceId: 'PLAT-680',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/PLAT-680',
      title: 'Design caching strategy for collaboration state',
      description: 'Design and implement caching layer for collaboration session state. Evaluate Redis vs in-memory approaches.',
      timestamp: daysAgo(25),
      rawData: {
        key: 'PLAT-680',
        status: 'Done',
        priority: 'High',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'marcus.chen@inchronicle.com',
        storyPoints: 5,
        labels: ['platform', 'caching'],
      },
    },

    // #32 - Confluence: caching design doc
    {
      source: 'confluence',
      sourceId: '445566',
      sourceUrl: 'https://inchronicle.atlassian.net/wiki/spaces/ENG/pages/445566/Collaboration+State+Caching+Design',
      title: 'Collaboration State Caching Design',
      description: 'Design doc for PLAT-680 caching strategy. Covers Redis session cache, TTL policies, and invalidation strategies.',
      timestamp: daysAgo(24),
      rawData: {
        pageId: '445566',
        spaceKey: 'ENG',
        version: 4,
        lastModifiedBy: 'ketan2@inchronicle.com',
      },
    },

    // #33 - Jira: Redis session cache
    {
      source: 'jira',
      sourceId: 'PLAT-681',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/PLAT-681',
      title: 'Implement Redis-based session cache',
      description: 'Implement Redis session cache per PLAT-680 design. Key schema, TTL, and connection pooling.',
      timestamp: daysAgo(22),
      rawData: {
        key: 'PLAT-681',
        status: 'Done',
        priority: 'High',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'ketan2@inchronicle.com',
        storyPoints: 8,
        labels: ['platform', 'redis'],
      },
    },

    // #34 - Jira: cache invalidation
    {
      source: 'jira',
      sourceId: 'PLAT-682',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/PLAT-682',
      title: 'Add cache invalidation for stale sessions',
      description: 'Implement cache invalidation when sessions end or go stale. Follow-up to PLAT-681.',
      timestamp: daysAgo(20),
      rawData: {
        key: 'PLAT-682',
        status: 'Done',
        priority: 'Medium',
        assignee: 'ketan2@inchronicle.com',
        reporter: 'ketan2@inchronicle.com',
        storyPoints: 3,
        labels: ['platform', 'caching'],
      },
    },

    // #35 - GitHub PR: Redis session cache
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#220',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/220',
      title: 'feat(cache): Redis session cache for collab state',
      description: 'Closes PLAT-681. Implements Redis-based session cache with configurable TTL, connection pooling, and graceful fallback. Design: PLAT-680.',
      timestamp: daysAgo(18),
      rawData: {
        number: 220,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 520,
        deletions: 40,
        changedFiles: 14,
        reviews: 3,
        commits: 6,
        reviewers: ['marcus.chen@inchronicle.com', 'arjun.desai@inchronicle.com'],
      },
    },

    // #36 - Calendar: sprint planning
    {
      source: 'google-calendar',
      sourceId: 'gcal-sprint-planning-prev',
      sourceUrl: null,
      title: 'Sprint Planning',
      description: 'Sprint planning — scoped PLAT-680 caching work and PLAT-682 invalidation.',
      timestamp: daysAgo(16),
      rawData: {
        eventId: 'sprint-planning-prev',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'priya.sharma@inchronicle.com', 'riya.patel@inchronicle.com'],
        duration: 90,
      },
    },

    // #37 - Calendar: daily standup
    {
      source: 'google-calendar',
      sourceId: 'gcal-standup-prev',
      sourceUrl: null,
      title: 'Daily Standup',
      description: 'Sprint standup — PLAT-681 Redis cache implementation on track.',
      timestamp: daysAgo(14),
      rawData: {
        eventId: 'standup-prev',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'priya.sharma@inchronicle.com', 'dev.mehta@inchronicle.com'],
        duration: 15,
      },
    },

    // =========================================================================
    // UNCLUSTERED ACTIVITIES (12 activities)
    // No shared refs with any story or each other
    // =========================================================================

    // #38 - GitHub: ESLint config chore
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#200',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/200',
      title: 'chore: update ESLint config and fix lint warnings',
      description: 'Updates ESLint to v9, migrates to flat config, fixes 47 lint warnings across the codebase.',
      timestamp: daysAgo(55),
      rawData: {
        number: 200,
        state: 'merged',
        author: 'ketan2@inchronicle.com',
        additions: 120,
        deletions: 85,
        changedFiles: 32,
        reviews: 1,
        commits: 2,
      },
    },

    // #39 - Calendar: 1:1 with EM
    {
      source: 'google-calendar',
      sourceId: 'gcal-1on1-manager',
      sourceUrl: null,
      title: '1:1 with Honey (EM)',
      description: 'Weekly 1:1 with engineering manager. Discussed career growth, upcoming project assignments.',
      timestamp: daysAgo(47),
      rawData: {
        eventId: '1on1-manager-1',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'honey@inchronicle.com'],
        duration: 30,
        recurring: true,
      },
    },

    // #40 - Outlook: all-hands
    {
      source: 'outlook',
      sourceId: 'email-allhands',
      sourceUrl: null,
      title: 'Engineering All-Hands — Q1 Roadmap',
      description: 'Q1 engineering all-hands presentation. Roadmap overview, hiring update, and technical debt priorities.',
      timestamp: daysAgo(42),
      rawData: {
        messageId: 'email-allhands',
        from: 'vikram.rao@inchronicle.com',
        to: ['eng-all@inchronicle.com'],
        subject: 'Engineering All-Hands — Q1 Roadmap',
      },
    },

    // #41 - Figma: mobile notification redesign
    {
      source: 'figma',
      sourceId: 'FigMobileNotif',
      sourceUrl: 'https://www.figma.com/file/FigMobileNotif/Mobile-Notification-Redesign',
      title: 'Mobile Notification Redesign Explorations',
      description: 'Early-stage exploration for mobile push notification redesign. Visual concepts and interaction patterns.',
      timestamp: daysAgo(38),
      rawData: {
        fileKey: 'FigMobileNotif',
        fileName: 'Mobile-Notification-Redesign',
        lastModified: daysAgo(38).toISOString(),
        owner: 'ketan2@inchronicle.com',
      },
    },

    // #42 - Slack: dev tips thread
    {
      source: 'slack',
      sourceId: 'thread-random-tips',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0DEVTIPS/p1700000004',
      title: 'Thread in #dev-tips',
      description: 'Shared a tip on using TypeScript discriminated unions for exhaustive pattern matching in API response handlers.',
      timestamp: daysAgo(33),
      rawData: {
        channelId: 'C0DEVTIPS',
        channelName: 'dev-tips',
        messageTs: '1700000004.000000',
        threadTs: '1700000004.000000',
        mentions: ['ketan2@inchronicle.com'],
        reactions: [{ name: 'brain', count: 7 }],
      },
    },

    // #43 - Google Sheets: interview rubric
    {
      source: 'google-sheets',
      sourceId: 'gsheet-interview-rubric',
      sourceUrl: 'https://docs.google.com/spreadsheets/d/1InterviewRubric_abc123/edit',
      title: 'Interview Rubric — Backend Engineers',
      description: 'Structured interview rubric for backend engineering candidates. System design, coding, and behavioral assessment criteria.',
      timestamp: daysAgo(27),
      rawData: {
        spreadsheetId: '1InterviewRubric_abc123',
        owner: 'ketan2@inchronicle.com',
        lastModifiedBy: 'ketan2@inchronicle.com',
        sheets: ['System Design', 'Coding', 'Behavioral', 'Scorecard'],
      },
    },

    // #44 - GitHub: code review in different repo
    {
      source: 'github',
      sourceId: 'inchronicle/data-pipeline#15',
      sourceUrl: 'https://github.com/inchronicle/data-pipeline/pull/15',
      title: 'review: optimize batch processing queries',
      description: 'Reviewed PR for batch processing query optimization. Suggested index improvements and query plan analysis.',
      timestamp: daysAgo(21),
      rawData: {
        number: 15,
        state: 'merged',
        author: 'dev.mehta@inchronicle.com',
        additions: 150,
        deletions: 40,
        changedFiles: 5,
        reviews: 2,
        reviewers: ['ketan2@inchronicle.com'],
        commits: 3,
      },
    },

    // #45 - Calendar: skip-level 1:1
    {
      source: 'google-calendar',
      sourceId: 'gcal-1on1-skip',
      sourceUrl: null,
      title: 'Skip-Level 1:1 with VP Engineering',
      description: 'Quarterly skip-level with Vikram. Discussed team health, technical direction, and growth areas.',
      timestamp: daysAgo(17),
      rawData: {
        eventId: '1on1-skip-level',
        organizer: 'vikram.rao@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'vikram.rao@inchronicle.com'],
        duration: 30,
      },
    },

    // #46 - Google Docs: reading list
    {
      source: 'google-docs',
      sourceId: 'gdoc-reading-list',
      sourceUrl: 'https://docs.google.com/document/d/1TeamReadingList_xyz/edit',
      title: 'Team Reading List — Distributed Systems',
      description: 'Curated reading list on distributed systems: CRDTs, consensus algorithms, and eventual consistency patterns.',
      timestamp: daysAgo(9),
      rawData: {
        documentId: '1TeamReadingList_xyz',
        owner: 'ketan2@inchronicle.com',
        contributors: ['ketan2@inchronicle.com', 'marcus.chen@inchronicle.com'],
      },
    },

    // #47 - Calendar: 1:1 with EM (recurring)
    {
      source: 'google-calendar',
      sourceId: 'gcal-1on1-manager-2',
      sourceUrl: null,
      title: '1:1 with Honey (EM)',
      description: 'Weekly 1:1 with engineering manager. Sprint progress, incident follow-up from BILL-550.',
      timestamp: daysAgo(4),
      rawData: {
        eventId: '1on1-manager-2',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'honey@inchronicle.com'],
        duration: 30,
        recurring: true,
      },
    },

    // #48 - Slack: offsite planning (yesterday)
    {
      source: 'slack',
      sourceId: 'thread-offsite-planning',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0TEAMSOCIAL/p1700000005',
      title: 'Thread in #team-social',
      description: 'Volunteered to organize the Q2 team offsite agenda. Coordinating venue and activities.',
      timestamp: daysAgo(1),
      rawData: {
        channelId: 'C0TEAMSOCIAL',
        channelName: 'team-social',
        messageTs: '1700000005.000000',
        threadTs: '1700000005.000000',
        mentions: ['ketan2@inchronicle.com'],
      },
    },

    // #49 - Google Drive: expense report (today)
    {
      source: 'google-drive',
      sourceId: 'gdrive-expense-report',
      sourceUrl: 'https://drive.google.com/file/d/1ExpenseQ4_abc/view',
      title: 'Q4 Conference Expense Report',
      description: 'Expense report for KubeCon attendance. Includes travel, accommodation, and registration receipts.',
      timestamp: daysAgo(0),
      rawData: {
        fileId: '1ExpenseQ4_abc',
        fileName: 'Q4_Conference_Expense_Report.pdf',
        owner: 'ketan2@inchronicle.com',
        mimeType: 'application/pdf',
      },
    },
  ];
}

/**
 * Expected clusters for V2 dataset validation.
 * 4 distinct clusters with no cross-contamination.
 */
export function getExpectedClustersV2(): { name: string; sharedRefs: string[]; activitySourceIds: string[] }[] {
  return [
    {
      name: 'Real-Time Collaboration Feature',
      sharedRefs: ['COLLAB-101', 'COLLAB-102', 'confluence:112233', 'inchronicle/collab-platform#210', 'inchronicle/collab-platform#215', 'inchronicle/collab-ui#88'],
      activitySourceIds: [
        '112233', 'COLLAB-101', 'COLLAB-102', 'commit:f1a2b3c',
        'inchronicle/collab-platform#210', 'gcal-collab-design-review',
        'inchronicle/collab-ui#88', 'inchronicle/collab-platform#215',
        'gcal-collab-demo', 'thread-collab-launch',
        'email-collab-kudos', 'gcal-collab-retro',
      ],
    },
    {
      name: 'Credits Double-Debit Incident',
      sharedRefs: ['BILL-550', 'BILL-551', 'BILL-552', 'inchronicle/billing-api#140', 'inchronicle/billing-api#145'],
      activitySourceIds: [
        'BILL-550', 'thread-incident-triage', 'email-incident-comms',
        'inchronicle/billing-api#140', 'BILL-551', 'BILL-552',
        'inchronicle/billing-api#145', 'gdoc-postmortem-doubledebit',
        'thread-postmortem-review', 'email-incident-resolved',
        'gcal-incident-review',
      ],
    },
    {
      name: 'Current Sprint — Platform Scaling',
      sharedRefs: ['PLAT-700', 'PLAT-701', 'PLAT-702', 'inchronicle/collab-platform#230', 'inchronicle/collab-platform#232'],
      activitySourceIds: [
        'PLAT-700', 'PLAT-701', 'inchronicle/collab-platform#230',
        'PLAT-702', 'inchronicle/collab-platform#232',
        'gcal-standup-current', 'gcal-retro-current',
      ],
    },
    {
      name: 'Previous Sprint — Caching Layer',
      sharedRefs: ['PLAT-680', 'PLAT-681', 'PLAT-682', 'inchronicle/collab-platform#220', 'confluence:445566'],
      activitySourceIds: [
        'PLAT-680', '445566', 'PLAT-681', 'PLAT-682',
        'inchronicle/collab-platform#220',
        'gcal-sprint-planning-prev', 'gcal-standup-prev',
      ],
    },
  ];
}

/**
 * Expected unclustered activity sourceIds for V2 dataset validation.
 */
export function getExpectedUnclusteredV2(): string[] {
  return [
    'inchronicle/collab-platform#200',  // ESLint chore, no ticket ref
    'gcal-1on1-manager',                // 1:1, no project refs
    'email-allhands',                   // All-hands, no project refs
    'FigMobileNotif',                   // Figma exploration, no shared refs
    'thread-random-tips',               // Dev tips, no project refs
    'gsheet-interview-rubric',          // Hiring, no project refs
    'inchronicle/data-pipeline#15',     // Different repo, no shared refs
    'gcal-1on1-skip',                   // Skip-level, no project refs
    'gdoc-reading-list',                // Reading list, no project refs
    'gcal-1on1-manager-2',              // 1:1, no project refs
    'thread-offsite-planning',          // Social, no project refs
    'gdrive-expense-report',            // Expense report, no project refs
  ];
}
