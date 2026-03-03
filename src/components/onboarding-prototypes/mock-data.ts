// Mock data for onboarding prototype variants
// Self-contained — no imports from real app services

export type ToolId = 'github' | 'jira' | 'confluence' | 'slack' | 'figma' | 'google-meet';

export interface MockTool {
  id: ToolId;
  name: string;
  icon: string; // lucide icon name
  description: string;
  color: string; // hex
  activityCount: number;
  activityLabel: string;
}

export interface MockActivity {
  tool: ToolId;
  type: string;
  title: string;
  date: string;
  meta?: string;
}

export interface MockStorySection {
  label: string;
  text: string;
  evidenceCount: number;
}

export interface MockStory {
  id: string;
  title: string;
  sections: MockStorySection[];
  tools: ToolId[];
  confidence: number;
  dateRange: string;
}

// ─── Tool Definitions ──────────────────────────────────────

export const mockTools: MockTool[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: 'GitBranch',
    description: 'Code commits, pull requests & reviews',
    color: '#24292f',
    activityCount: 147,
    activityLabel: 'commits & PRs',
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: 'KanbanSquare',
    description: 'Tickets, sprints & project tracking',
    color: '#0052CC',
    activityCount: 83,
    activityLabel: 'tickets resolved',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    icon: 'FileText',
    description: 'Documentation, RFCs & knowledge base',
    color: '#172B4D',
    activityCount: 24,
    activityLabel: 'pages authored',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: 'Hash',
    description: 'Messages, threads & collaboration',
    color: '#4A154B',
    activityCount: 512,
    activityLabel: 'messages sent',
  },
  {
    id: 'figma',
    name: 'Figma',
    icon: 'Figma',
    description: 'Design files, comments & iterations',
    color: '#F24E1E',
    activityCount: 31,
    activityLabel: 'design reviews',
  },
  {
    id: 'google-meet',
    name: 'Google Meet',
    icon: 'Video',
    description: 'Meetings, stand-ups & presentations',
    color: '#00897B',
    activityCount: 62,
    activityLabel: 'meetings attended',
  },
];

// ─── Sample Activities ─────────────────────────────────────

export const mockActivities: MockActivity[] = [
  { tool: 'github', type: 'PR Merged', title: 'feat: add OAuth2 PKCE flow for mobile clients', date: '2 days ago', meta: '+342 / −28' },
  { tool: 'github', type: 'Code Review', title: 'Reviewed: API rate limiting middleware', date: '3 days ago', meta: '12 comments' },
  { tool: 'jira', type: 'Ticket Closed', title: 'AUTH-1234: Implement token refresh endpoint', date: '1 day ago' },
  { tool: 'jira', type: 'Sprint Complete', title: 'Sprint 14 — Auth Hardening', date: '1 week ago', meta: '18/20 points' },
  { tool: 'confluence', type: 'Page Published', title: 'RFC: Microservices Migration Strategy', date: '5 days ago', meta: '14 views' },
  { tool: 'slack', type: 'Thread', title: 'Helped debug production Redis connection issue', date: '4 days ago', meta: '23 replies' },
  { tool: 'figma', type: 'Design Review', title: 'Dashboard v3 — reviewed mobile breakpoints', date: '6 days ago' },
  { tool: 'google-meet', type: 'Presentation', title: 'All-Hands: Q3 Platform Architecture Update', date: '1 week ago', meta: '45 attendees' },
];

// ─── Generated Stories ─────────────────────────────────────

export const mockStories: MockStory[] = [
  {
    id: 'story-1',
    title: 'Led OAuth2 Security Overhaul Across Mobile Platform',
    confidence: 0.89,
    dateRange: 'Oct 2025 – Dec 2025',
    tools: ['github', 'jira', 'confluence'],
    sections: [
      {
        label: 'Situation',
        text: 'Our mobile platform relied on an outdated OAuth1 token flow that was flagged in a security audit. With 2M+ active users, any authentication vulnerability posed significant risk to customer trust and compliance.',
        evidenceCount: 4,
      },
      {
        label: 'Task',
        text: 'I was tasked with leading the migration to OAuth2 with PKCE across all mobile clients while maintaining backward compatibility during the transition period.',
        evidenceCount: 3,
      },
      {
        label: 'Action',
        text: 'Designed a phased rollout strategy documented in an RFC, implemented the PKCE flow with comprehensive test coverage (147 commits, 12 PRs), and coordinated with the mobile team to ship feature flags for gradual activation.',
        evidenceCount: 8,
      },
      {
        label: 'Result',
        text: 'Completed migration 2 weeks ahead of schedule with zero authentication-related incidents. Reduced token refresh failures by 94% and passed the subsequent security audit with no findings.',
        evidenceCount: 5,
      },
    ],
  },
  {
    id: 'story-2',
    title: 'Mentored 3 Junior Engineers Through First Production Deployments',
    confidence: 0.78,
    dateRange: 'Nov 2025 – Jan 2026',
    tools: ['github', 'slack', 'google-meet'],
    sections: [
      {
        label: 'Situation',
        text: 'Three new graduates joined the platform team simultaneously. None had experience with production deployments, CI/CD pipelines, or on-call responsibilities.',
        evidenceCount: 2,
      },
      {
        label: 'Task',
        text: 'Created a structured onboarding program to get all three engineers independently deploying to production within their first quarter.',
        evidenceCount: 2,
      },
      {
        label: 'Action',
        text: 'Established pair programming sessions (62 meetings logged), created a deployment runbook in Confluence, and set up progressive ownership where each engineer led increasingly complex deployments with my review.',
        evidenceCount: 6,
      },
      {
        label: 'Result',
        text: 'All three engineers completed independent production deployments by week 10. Team velocity increased 35% the following quarter as the expanded team took on parallel workstreams.',
        evidenceCount: 3,
      },
    ],
  },
  {
    id: 'story-3',
    title: 'Designed API Rate Limiting Infrastructure from Scratch',
    confidence: 0.84,
    dateRange: 'Sep 2025 – Nov 2025',
    tools: ['github', 'jira', 'confluence', 'slack'],
    sections: [
      {
        label: 'Challenge',
        text: 'API abuse from scrapers and misconfigured integrations caused cascading failures during peak traffic, leading to 3 P1 incidents in Q2.',
        evidenceCount: 3,
      },
      {
        label: 'Action',
        text: 'Researched token bucket vs sliding window algorithms, prototyped both approaches, and built a Redis-backed rate limiter with per-tenant configuration. Wrote the RFC and got buy-in from 4 team leads.',
        evidenceCount: 7,
      },
      {
        label: 'Result',
        text: 'Zero P1 incidents related to API abuse in the 3 months since launch. Reduced 99th percentile latency by 40% during peak hours. The rate limiting service now handles 50K req/sec.',
        evidenceCount: 4,
      },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────

export const TOOL_ICON_MAP: Record<string, string> = {
  GitBranch: 'GitBranch',
  KanbanSquare: 'KanbanSquare',
  FileText: 'FileText',
  Hash: 'Hash',
  Figma: 'Figma',
  Video: 'Video',
};

export const STEP_LABELS = ['Welcome', 'Connect Tools', 'Syncing', 'Your Story', 'Export'] as const;
export type StepId = (typeof STEP_LABELS)[number];

/** Simulated loading delay in ms */
export const SYNC_DELAY = 2000;
export const CONNECT_DELAY = 800;

export function getToolById(id: ToolId): MockTool {
  return mockTools.find((t) => t.id === id)!;
}

export const totalActivityCount = mockTools.reduce((sum, t) => sum + t.activityCount, 0);
