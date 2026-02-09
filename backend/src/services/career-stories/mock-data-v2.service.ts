/**
 * MockDataV2Service
 *
 * Second-generation mock data for career stories demo.
 * 32 activities spanning ~28 days (2 sprints), clustering into 2 distinct stories
 * plus 8 unclustered ambient activities.
 *
 * Demo pitch: "First, I handled a production crisis. Second, I built a collab
 * feature. See how all the pieces are here? Jira, PRs, docs, emails, chat —
 * all connected."
 *
 * Primary persona: ketan2@inchronicle.com
 * Collaborators: honey, priya.sharma, marcus.chen, riya.patel, arjun.desai,
 *               nisha.gupta, vikram.rao, dev.mehta
 *
 * Stories:
 *   1. "Building Real-Time Collaboration Feature" (12 activities, day 28 → day 4)
 *   2. "Credits/Wallet Double-Debit Incident" (12 activities, day 18 → day 10)
 *   + 8 unclustered ambient activities
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
    // Span: daysAgo(28) -> daysAgo(4)
    // =========================================================================

    // F1 - Confluence design doc (day 28)
    {
      source: 'confluence',
      sourceId: '112233',
      sourceUrl: 'https://inchronicle.atlassian.net/wiki/spaces/ENG/pages/112233/Real-Time+Collaboration+Architecture',
      title: 'Real-Time Collaboration Architecture',
      description: 'Architecture design for COLLAB-101 real-time collaboration feature. Covers WebSocket layer, presence system, and conflict resolution strategy.',
      timestamp: daysAgo(28),
      rawData: {
        pageId: '112233',
        spaceKey: 'ENG',
        version: 7,
        lastModifiedBy: 'ketan2@inchronicle.com',
      },
    },

    // F2 - Jira: main feature ticket (day 26)
    {
      source: 'jira',
      sourceId: 'COLLAB-101',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/COLLAB-101',
      title: 'Implement WebSocket layer for real-time collaboration',
      description: 'Build the WebSocket connection manager and message routing layer. See design: confluence:112233',
      timestamp: daysAgo(26),
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

    // F3 - Jira: presence indicator ticket (day 25)
    {
      source: 'jira',
      sourceId: 'COLLAB-102',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/COLLAB-102',
      title: 'Build presence indicator component',
      description: 'Real-time presence indicators showing who is viewing/editing. Depends on COLLAB-101 WebSocket layer.',
      timestamp: daysAgo(25),
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

    // F4 - GitHub commit: WebSocket connection manager (day 22)
    {
      source: 'github',
      sourceId: 'commit:f1a2b3c',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/commit/f1a2b3c',
      title: 'feat(ws): add WebSocket connection manager',
      description: 'feat(ws): add WebSocket connection manager\n\nImplements connection lifecycle, heartbeat, and reconnection logic.\n\nRelated to COLLAB-101',
      timestamp: daysAgo(22),
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

    // F5 - Calendar: design review (day 21)
    {
      source: 'google-calendar',
      sourceId: 'gcal-collab-design-review',
      sourceUrl: null,
      title: 'COLLAB-101 Design Review',
      description: 'Review WebSocket architecture and presence system design for COLLAB-101.',
      timestamp: daysAgo(21),
      rawData: {
        eventId: 'collab-design-review',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'marcus.chen@inchronicle.com', 'priya.sharma@inchronicle.com', 'riya.patel@inchronicle.com'],
        duration: 60,
      },
    },

    // F6 - GitHub PR: real-time collaboration backend (day 19)
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#210',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/210',
      title: 'feat(ws): implement real-time collaboration backend',
      description: 'Closes COLLAB-101. Implements WebSocket message routing, room management, and auth integration. Design: confluence:112233',
      timestamp: daysAgo(19),
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

    // F7 - GitHub PR: presence indicators (day 16) — feature continues during crisis
    {
      source: 'github',
      sourceId: 'inchronicle/collab-ui#88',
      sourceUrl: 'https://github.com/inchronicle/collab-ui/pull/88',
      title: 'feat(presence): real-time presence indicators',
      description: 'Implements COLLAB-102 presence UI. Shows active users with avatars, typing indicators, and cursor positions. Requires COLLAB-101 WebSocket layer.',
      timestamp: daysAgo(16),
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

    // F8 - GitHub PR: cursor sharing and conflict resolution (day 13)
    {
      source: 'github',
      sourceId: 'inchronicle/collab-platform#215',
      sourceUrl: 'https://github.com/inchronicle/collab-platform/pull/215',
      title: 'feat(ws): cursor sharing and conflict resolution',
      description: 'Adds real-time cursor position sharing and OT-based conflict resolution. Builds on inchronicle/collab-platform#210. Part of COLLAB-101.',
      timestamp: daysAgo(13),
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

    // F9 - Calendar: feature demo (day 9)
    {
      source: 'google-calendar',
      sourceId: 'gcal-collab-demo',
      sourceUrl: null,
      title: 'Real-Time Collab Feature Demo',
      description: 'Demo of COLLAB-101 real-time collaboration to stakeholders.',
      timestamp: daysAgo(9),
      rawData: {
        eventId: 'collab-demo',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['riya.patel@inchronicle.com', 'vikram.rao@inchronicle.com', 'priya.sharma@inchronicle.com'],
        duration: 30,
      },
    },

    // F10 - Slack: launch announcement (day 7)
    {
      source: 'slack',
      sourceId: 'thread-collab-launch',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0PRODUCTENG/p1700000001',
      title: 'Thread in #product-eng',
      description: 'Real-time collab is live! COLLAB-101 shipped to production. Cursor sharing from inchronicle/collab-platform#215 is getting great feedback.',
      timestamp: daysAgo(7),
      rawData: {
        channelId: 'C0PRODUCTENG',
        channelName: 'product-eng',
        messageTs: '1700000001.000000',
        threadTs: '1700000001.000000',
        mentions: ['ketan2@inchronicle.com'],
        reactions: [{ name: 'rocket', count: 12 }, { name: 'tada', count: 8 }],
      },
    },

    // F11 - Outlook: kudos from VP Engineering (day 5)
    {
      source: 'outlook',
      sourceId: 'email-collab-kudos',
      sourceUrl: null,
      title: 'Re: Real-time collaboration launch',
      description: 'Great work on COLLAB-101! The real-time collaboration feature has been a huge hit with early adopters. Well done on the architecture and execution.',
      timestamp: daysAgo(5),
      rawData: {
        messageId: 'email-collab-kudos',
        from: 'vikram.rao@inchronicle.com',
        to: ['ketan2@inchronicle.com', 'eng-team@inchronicle.com'],
        subject: 'Re: Real-time collaboration launch',
      },
    },

    // F12 - Calendar: retrospective (day 4)
    {
      source: 'google-calendar',
      sourceId: 'gcal-collab-retro',
      sourceUrl: null,
      title: 'Collab Feature Retrospective',
      description: 'Retrospective on COLLAB-101 real-time collaboration feature build.',
      timestamp: daysAgo(4),
      rawData: {
        eventId: 'collab-retro',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'marcus.chen@inchronicle.com', 'priya.sharma@inchronicle.com', 'riya.patel@inchronicle.com'],
        duration: 60,
      },
    },

    // =========================================================================
    // STORY 2: Credits/Wallet Double-Debit Incident (12 activities)
    // Anchors: BILL-550, BILL-551, BILL-552,
    //          inchronicle/billing-api#140, #145
    // Span: daysAgo(18) -> daysAgo(10), compressed incident timeline
    //
    // Progression: Issue reported → Triage → Work → Post-mortem → Resolved → Closed
    // =========================================================================

    // C1 - Email: support escalation — crisis trigger (day 18)
    {
      source: 'outlook',
      sourceId: 'email-support-escalation',
      sourceUrl: null,
      title: 'Fwd: Urgent — Duplicate credit deductions reported',
      description: 'Forwarding from Customer Success: three enterprise accounts reporting duplicate deductions on their wallets. Ticket BILL-550 created. Need immediate investigation.',
      timestamp: daysAgo(18),
      rawData: {
        messageId: 'email-support-escalation',
        from: 'nisha.gupta@inchronicle.com',
        to: ['ketan2@inchronicle.com', 'arjun.desai@inchronicle.com'],
        cc: ['vikram.rao@inchronicle.com'],
        subject: 'Fwd: Urgent — Duplicate credit deductions reported',
      },
    },

    // C2 - Jira: P1 incident (day 18)
    {
      source: 'jira',
      sourceId: 'BILL-550',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/BILL-550',
      title: 'P1 Incident: Credits double-debit on concurrent wallet operations',
      description: 'Users reporting duplicate credit deductions when multiple derivations are triggered simultaneously. Race condition in wallet service.',
      timestamp: daysAgo(18),
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

    // C3 - Slack: incident triage (day 18)
    {
      source: 'slack',
      sourceId: 'thread-incident-triage',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0INCIDENTS/p1700000002',
      title: 'Thread in #incidents',
      description: 'BILL-550 triage: seeing double-debit on wallet operations. Reproduces when two derive calls hit within 50ms. Investigating race condition in optimistic update path.',
      timestamp: daysAgo(18),
      rawData: {
        channelId: 'C0INCIDENTS',
        channelName: 'incidents',
        messageTs: '1700000002.000000',
        threadTs: '1700000002.000000',
        mentions: ['ketan2@inchronicle.com', 'arjun.desai@inchronicle.com'],
        reactions: [{ name: 'eyes', count: 6 }],
      },
    },

    // C4 - Outlook: initial assessment (day 17)
    {
      source: 'outlook',
      sourceId: 'email-incident-comms',
      sourceUrl: null,
      title: 'Incident: Credits double-debit — Initial Assessment',
      description: 'BILL-550 initial assessment: root cause identified as missing row-level locking in wallet debit path. Fix in progress, ETA 4 hours.',
      timestamp: daysAgo(17),
      rawData: {
        messageId: 'email-incident-comms',
        from: 'ketan2@inchronicle.com',
        to: ['vikram.rao@inchronicle.com', 'eng-leads@inchronicle.com'],
        cc: ['arjun.desai@inchronicle.com'],
        subject: 'Incident: Credits double-debit — Initial Assessment',
      },
    },

    // C5 - GitHub PR: optimistic locking fix (day 16)
    {
      source: 'github',
      sourceId: 'inchronicle/billing-api#140',
      sourceUrl: 'https://github.com/inchronicle/billing-api/pull/140',
      title: 'fix(wallet): add optimistic locking to prevent double-debit',
      description: 'Fixes BILL-550. Adds row-level locking with SELECT FOR UPDATE on wallet balance reads. Includes retry logic for lock contention.',
      timestamp: daysAgo(16),
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

    // C6 - Jira: follow-up idempotency (day 15)
    {
      source: 'jira',
      sourceId: 'BILL-551',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/BILL-551',
      title: 'Follow-up: Add idempotency keys to credit operations',
      description: 'Follow-up to BILL-550. Add idempotency keys to all credit debit/credit operations to prevent duplicate processing at the API layer.',
      timestamp: daysAgo(15),
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

    // C7 - Jira: revenue config fix (day 15)
    {
      source: 'jira',
      sourceId: 'BILL-552',
      sourceUrl: 'https://inchronicle.atlassian.net/browse/BILL-552',
      title: 'Fix premium packet generation revenue misconfiguration',
      description: 'Discovered during BILL-550 investigation: premium packet credit cost was misconfigured, leading to undercharging.',
      timestamp: daysAgo(15),
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

    // C8 - GitHub PR: idempotency + revenue fix (day 14)
    {
      source: 'github',
      sourceId: 'inchronicle/billing-api#145',
      sourceUrl: 'https://github.com/inchronicle/billing-api/pull/145',
      title: 'fix(wallet): idempotency keys + revenue config corrections',
      description: 'Closes BILL-551 and BILL-552. Adds idempotency key header support for all wallet operations. Fixes premium packet credit cost configuration.',
      timestamp: daysAgo(14),
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

    // C9 - Google Docs: post-mortem (day 12)
    {
      source: 'google-docs',
      sourceId: 'gdoc-postmortem-doubledebit',
      sourceUrl: 'https://docs.google.com/document/d/1PostMortemBILL550/edit',
      title: 'Incident Post-Mortem: Credits Double-Debit (BILL-550)',
      description: 'Post-mortem for BILL-550. Root cause: missing row-level lock. Fix: inchronicle/billing-api#140 (locking) + inchronicle/billing-api#145 (idempotency). Impact: 23 users affected, $142 in credits refunded.',
      timestamp: daysAgo(12),
      rawData: {
        documentId: '1PostMortemBILL550',
        owner: 'ketan2@inchronicle.com',
        contributors: ['ketan2@inchronicle.com', 'arjun.desai@inchronicle.com', 'marcus.chen@inchronicle.com'],
      },
    },

    // C10 - Slack: post-mortem review (day 12)
    {
      source: 'slack',
      sourceId: 'thread-postmortem-review',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0ENGALL/p1700000003',
      title: 'Thread in #engineering-all',
      description: 'BILL-550 post-mortem published. Key takeaway: all financial operations need idempotency keys and row-level locking. Great incident response from the team.',
      timestamp: daysAgo(12),
      rawData: {
        channelId: 'C0ENGALL',
        channelName: 'engineering-all',
        messageTs: '1700000003.000000',
        threadTs: '1700000003.000000',
        mentions: ['ketan2@inchronicle.com'],
        reactions: [{ name: 'memo', count: 4 }, { name: '+1', count: 9 }],
      },
    },

    // C11 - Outlook: incident resolved (day 11)
    {
      source: 'outlook',
      sourceId: 'email-incident-resolved',
      sourceUrl: null,
      title: 'Incident Resolved: Credits double-debit — lessons learned',
      description: 'BILL-550 resolved. All affected users refunded. New idempotency layer prevents recurrence. Post-mortem action items assigned.',
      timestamp: daysAgo(11),
      rawData: {
        messageId: 'email-incident-resolved',
        from: 'ketan2@inchronicle.com',
        to: ['vikram.rao@inchronicle.com', 'eng-leads@inchronicle.com'],
        subject: 'Incident Resolved: Credits double-debit — lessons learned',
      },
    },

    // C12 - Calendar: incident review meeting (day 10) — crisis ends
    {
      source: 'google-calendar',
      sourceId: 'gcal-incident-review',
      sourceUrl: null,
      title: 'BILL-550 Incident Review Meeting',
      description: 'Review BILL-550 incident response, timeline, and action items.',
      timestamp: daysAgo(10),
      rawData: {
        eventId: 'incident-review-bill550',
        organizer: 'ketan2@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'arjun.desai@inchronicle.com', 'marcus.chen@inchronicle.com', 'vikram.rao@inchronicle.com'],
        duration: 60,
      },
    },

    // =========================================================================
    // UNCLUSTERED ACTIVITIES (8 activities)
    // No shared refs with any story or each other
    // =========================================================================

    // U1 - Calendar: 1:1 with EM (day 27)
    {
      source: 'google-calendar',
      sourceId: 'gcal-1on1-manager',
      sourceUrl: null,
      title: '1:1 with Honey (EM)',
      description: 'Weekly 1:1 with engineering manager. Discussed career growth, upcoming project assignments.',
      timestamp: daysAgo(27),
      rawData: {
        eventId: '1on1-manager-1',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'honey@inchronicle.com'],
        duration: 30,
        recurring: true,
      },
    },

    // U2 - Figma: mobile notification redesign (day 20)
    {
      source: 'figma',
      sourceId: 'FigMobileNotif',
      sourceUrl: 'https://www.figma.com/file/FigMobileNotif/Mobile-Notification-Redesign',
      title: 'Mobile Notification Redesign Explorations',
      description: 'Early-stage exploration for mobile push notification redesign. Visual concepts and interaction patterns.',
      timestamp: daysAgo(20),
      rawData: {
        fileKey: 'FigMobileNotif',
        fileName: 'Mobile-Notification-Redesign',
        lastModified: daysAgo(20).toISOString(),
        owner: 'ketan2@inchronicle.com',
      },
    },

    // U3 - Slack: dev tips thread (day 17)
    {
      source: 'slack',
      sourceId: 'thread-random-tips',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0DEVTIPS/p1700000004',
      title: 'Thread in #dev-tips',
      description: 'Shared a tip on using TypeScript discriminated unions for exhaustive pattern matching in API response handlers.',
      timestamp: daysAgo(17),
      rawData: {
        channelId: 'C0DEVTIPS',
        channelName: 'dev-tips',
        messageTs: '1700000004.000000',
        threadTs: '1700000004.000000',
        mentions: ['ketan2@inchronicle.com'],
        reactions: [{ name: 'brain', count: 7 }],
      },
    },

    // U4 - Google Sheets: interview rubric (day 14)
    {
      source: 'google-sheets',
      sourceId: 'gsheet-interview-rubric',
      sourceUrl: 'https://docs.google.com/spreadsheets/d/1InterviewRubric_abc123/edit',
      title: 'Interview Rubric — Backend Engineers',
      description: 'Structured interview rubric for backend engineering candidates. System design, coding, and behavioral assessment criteria.',
      timestamp: daysAgo(14),
      rawData: {
        spreadsheetId: '1InterviewRubric_abc123',
        owner: 'ketan2@inchronicle.com',
        lastModifiedBy: 'ketan2@inchronicle.com',
        sheets: ['System Design', 'Coding', 'Behavioral', 'Scorecard'],
      },
    },

    // U5 - GitHub: code review in different repo (day 11)
    {
      source: 'github',
      sourceId: 'inchronicle/data-pipeline#15',
      sourceUrl: 'https://github.com/inchronicle/data-pipeline/pull/15',
      title: 'review: optimize batch processing queries',
      description: 'Reviewed PR for batch processing query optimization. Suggested index improvements and query plan analysis.',
      timestamp: daysAgo(11),
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

    // U6 - Calendar: skip-level 1:1 (day 8)
    {
      source: 'google-calendar',
      sourceId: 'gcal-1on1-skip',
      sourceUrl: null,
      title: 'Skip-Level 1:1 with VP Engineering',
      description: 'Quarterly skip-level with Vikram. Discussed team health, technical direction, and growth areas.',
      timestamp: daysAgo(8),
      rawData: {
        eventId: '1on1-skip-level',
        organizer: 'vikram.rao@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'vikram.rao@inchronicle.com'],
        duration: 30,
      },
    },

    // U7 - Calendar: 1:1 with EM (day 6) — BILL-550 removed from description
    {
      source: 'google-calendar',
      sourceId: 'gcal-1on1-manager-2',
      sourceUrl: null,
      title: '1:1 with Honey (EM)',
      description: 'Weekly 1:1 with engineering manager. Sprint progress, growth areas discussion.',
      timestamp: daysAgo(6),
      rawData: {
        eventId: '1on1-manager-2',
        organizer: 'honey@inchronicle.com',
        attendees: ['ketan2@inchronicle.com', 'honey@inchronicle.com'],
        duration: 30,
        recurring: true,
      },
    },

    // U8 - Slack: tech talk (day 3) — NEW, stays unclustered
    {
      source: 'slack',
      sourceId: 'thread-tech-talk',
      sourceUrl: 'https://inchronicle.slack.com/archives/C0TECHTALKS/p1700000006',
      title: 'Thread in #tech-talks',
      description: 'Shared recording of my lightning talk on WebSocket scaling patterns. Great discussion in the thread about backpressure strategies.',
      timestamp: daysAgo(3),
      rawData: {
        channelId: 'C0TECHTALKS',
        channelName: 'tech-talks',
        messageTs: '1700000006.000000',
        threadTs: '1700000006.000000',
        mentions: ['ketan2@inchronicle.com'],
        reactions: [{ name: 'fire', count: 11 }, { name: 'bulb', count: 5 }],
      },
    },
  ];
}

/**
 * Expected clusters for V2 dataset validation.
 * 2 distinct clusters with no cross-contamination.
 */
export function getExpectedClustersV2(): { name: string; sharedRefs: string[]; activitySourceIds: string[] }[] {
  return [
    {
      name: 'Real-Time Collaboration Feature',
      sharedRefs: ['COLLAB-101', 'COLLAB-102', 'confluence:112233', 'inchronicle/collab-platform#210', 'inchronicle/collab-platform#215', 'inchronicle/collab-ui#88'],
      activitySourceIds: [
        '112233', 'COLLAB-101', 'COLLAB-102', 'commit:f1a2b3c',
        'gcal-collab-design-review', 'inchronicle/collab-platform#210',
        'inchronicle/collab-ui#88', 'inchronicle/collab-platform#215',
        'gcal-collab-demo', 'thread-collab-launch',
        'email-collab-kudos', 'gcal-collab-retro',
      ],
    },
    {
      name: 'Credits Double-Debit Incident',
      sharedRefs: ['BILL-550', 'BILL-551', 'BILL-552', 'inchronicle/billing-api#140', 'inchronicle/billing-api#145'],
      activitySourceIds: [
        'email-support-escalation', 'BILL-550', 'thread-incident-triage',
        'email-incident-comms', 'inchronicle/billing-api#140',
        'BILL-551', 'BILL-552', 'inchronicle/billing-api#145',
        'gdoc-postmortem-doubledebit', 'thread-postmortem-review',
        'email-incident-resolved', 'gcal-incident-review',
      ],
    },
  ];
}

/**
 * Expected unclustered activity sourceIds for V2 dataset validation.
 */
export function getExpectedUnclusteredV2(): string[] {
  return [
    'gcal-1on1-manager',                // 1:1, no project refs
    'FigMobileNotif',                   // Figma exploration, no shared refs
    'thread-random-tips',               // Dev tips, no project refs
    'gsheet-interview-rubric',          // Hiring, no project refs
    'inchronicle/data-pipeline#15',     // Different repo, unique ref with no pair
    'gcal-1on1-skip',                   // Skip-level, no project refs
    'gcal-1on1-manager-2',              // 1:1, no project refs (BILL-550 removed)
    'thread-tech-talk',                 // Tech talk, no project refs
  ];
}
