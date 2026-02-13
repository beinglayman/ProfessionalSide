// Mock data for timeline prototype designs
// Self-contained — no imports from real app services

export type ActivitySource = 'github' | 'jira' | 'slack' | 'confluence' | 'figma' | 'google-meet';

export interface MockActivity {
  id: string;
  source: ActivitySource;
  title: string;
  description: string | null;
  timestamp: string; // ISO
  rawData?: Record<string, unknown>;
}

export interface MockDraftStory {
  id: string;
  title: string;
  description: string;
  activityCount: number;
  tools: ActivitySource[];
  topics: string[];
  dateRange: { start: string; end: string };
  dominantRole: 'Led' | 'Contributed' | 'Participated';
}

export interface TemporalGroup {
  key: string;
  label: string;
  activities: MockActivity[];
}

export const SOURCE_META: Record<ActivitySource, { name: string; color: string; icon: string }> = {
  github: { name: 'GitHub', color: '#24292E', icon: 'Github' },
  jira: { name: 'Jira', color: '#0052CC', icon: 'SquareKanban' },
  slack: { name: 'Slack', color: '#4A154B', icon: 'Hash' },
  confluence: { name: 'Confluence', color: '#172B4D', icon: 'FileText' },
  figma: { name: 'Figma', color: '#F24E1E', icon: 'Figma' },
  'google-meet': { name: 'Google Meet', color: '#00897B', icon: 'Video' },
};

const now = new Date();
const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

export const mockActivities: MockActivity[] = [
  // Today
  { id: 'a1', source: 'github', title: 'feat: add OAuth2 PKCE flow for mobile clients', description: 'Implements PKCE extension for public clients, adds token refresh logic', timestamp: h(1), rawData: { number: 342, state: 'merged', additions: 487, deletions: 52, commits: 6, reviews: 3 } },
  { id: 'a2', source: 'jira', title: 'AUTH-1204: Implement SSO integration', description: 'Configure SAML 2.0 identity provider connection', timestamp: h(2), rawData: { key: 'AUTH-1204', status: 'In Progress', priority: 'High', storyPoints: 8 } },
  { id: 'a3', source: 'slack', title: 'Shared architecture decision doc in #backend', description: 'Proposed event-driven approach for notification service, received 12 reactions', timestamp: h(3), rawData: { channelId: 'backend', reactions: 12, isThreadReply: false } },
  { id: 'a4', source: 'confluence', title: 'Updated API Rate Limiting Design Doc', description: 'Added token bucket algorithm section with capacity planning', timestamp: h(4) },
  { id: 'a5', source: 'google-meet', title: 'Sprint Planning — Q1 Roadmap Review', description: '45-minute meeting with 8 attendees, covered release milestones', timestamp: h(5), rawData: { attendees: 8, duration: 45, organizer: 'Sarah Chen' } },

  // Yesterday
  { id: 'a6', source: 'github', title: 'fix: resolve race condition in WebSocket reconnect', description: 'Mutex lock on connection state prevents duplicate connections', timestamp: h(28), rawData: { number: 339, state: 'merged', additions: 23, deletions: 8, commits: 2, reviews: 2 } },
  { id: 'a7', source: 'jira', title: 'DASH-892: Dashboard loading performance', description: 'Investigate and fix slow initial load on analytics dashboard', timestamp: h(30), rawData: { key: 'DASH-892', status: 'Done', priority: 'Critical', storyPoints: 5 } },
  { id: 'a8', source: 'figma', title: 'Reviewed onboarding flow v3 mockups', description: 'Left 6 comments on stepper component spacing and color contrast', timestamp: h(32), rawData: { commenters: ['Alex M.'], fileKey: 'onboarding-v3' } },
  { id: 'a9', source: 'slack', title: 'Helped debug production Redis issue in #incidents', description: 'Identified memory fragmentation causing OOM kills', timestamp: h(34), rawData: { channelId: 'incidents', reactions: 8, isThreadReply: true } },

  // This Week
  { id: 'a10', source: 'github', title: 'refactor: extract shared validation middleware', description: 'DRY validation logic across 12 API endpoints', timestamp: d(3), rawData: { number: 335, state: 'merged', additions: 156, deletions: 312, commits: 4, reviews: 2 } },
  { id: 'a11', source: 'confluence', title: 'Created Service Mesh Migration Runbook', description: 'Step-by-step Istio migration guide for the platform team', timestamp: d(3) },
  { id: 'a12', source: 'jira', title: 'PLAT-445: Migrate to Node 20 LTS', description: 'Update all microservices from Node 18 to Node 20', timestamp: d(4), rawData: { key: 'PLAT-445', status: 'In Review', priority: 'Medium', storyPoints: 13 } },
  { id: 'a13', source: 'google-meet', title: 'Architecture Review — Notification Service', description: '1-hour deep dive with platform and mobile teams', timestamp: d(4), rawData: { attendees: 12, duration: 60, organizer: 'You' } },
  { id: 'a14', source: 'github', title: 'chore: bump dependencies, fix 3 CVEs', description: 'Security patch for express, jsonwebtoken, and helmet', timestamp: d(5), rawData: { number: 331, state: 'merged', additions: 45, deletions: 38, commits: 1, reviews: 1 } },
  { id: 'a15', source: 'figma', title: 'Annotated KPI dashboard wireframes', description: 'Added developer notes on chart library constraints', timestamp: d(5), rawData: { commenters: ['Priya R.', 'You'], fileKey: 'kpi-dashboard' } },

  // Last Week
  { id: 'a16', source: 'github', title: 'feat: implement rate limiting with Redis sliding window', description: 'Production-ready rate limiter supporting per-user and per-IP limits', timestamp: d(8), rawData: { number: 325, state: 'merged', additions: 342, deletions: 15, commits: 8, reviews: 4 } },
  { id: 'a17', source: 'jira', title: 'SEC-201: Security audit remediation', description: 'Address findings from Q4 penetration test', timestamp: d(9), rawData: { key: 'SEC-201', status: 'Done', priority: 'Critical', storyPoints: 8 } },
  { id: 'a18', source: 'slack', title: 'Led RFC discussion on event sourcing in #architecture', description: 'Presented tradeoffs between event sourcing vs CQRS', timestamp: d(10), rawData: { channelId: 'architecture', reactions: 15, isThreadReply: false } },

  // Older
  { id: 'a19', source: 'confluence', title: 'Published Q4 Technical Retrospective', description: 'Team retrospective covering incident response improvements', timestamp: d(20) },
  { id: 'a20', source: 'google-meet', title: 'Mentoring session with junior devs', description: 'Covered testing strategies and CI/CD best practices', timestamp: d(22), rawData: { attendees: 4, duration: 30, organizer: 'You' } },
];

export const mockTemporalGroups: TemporalGroup[] = [
  { key: 'today', label: 'Today', activities: mockActivities.filter(a => ['a1','a2','a3','a4','a5'].includes(a.id)) },
  { key: 'yesterday', label: 'Yesterday', activities: mockActivities.filter(a => ['a6','a7','a8','a9'].includes(a.id)) },
  { key: 'this_week', label: 'This Week', activities: mockActivities.filter(a => ['a10','a11','a12','a13','a14','a15'].includes(a.id)) },
  { key: 'last_week', label: 'Last Week', activities: mockActivities.filter(a => ['a16','a17','a18'].includes(a.id)) },
  { key: 'older', label: 'Older', activities: mockActivities.filter(a => ['a19','a20'].includes(a.id)) },
];

export const mockDraftStories: MockDraftStory[] = [
  {
    id: 'ds1',
    title: 'Led OAuth2 Security Overhaul for Mobile Platform',
    description: 'Designed and implemented PKCE-based OAuth2 flow for mobile clients, conducted security review, and coordinated cross-team rollout affecting 3 microservices.',
    activityCount: 7,
    tools: ['github', 'jira', 'confluence', 'slack'],
    topics: ['Security', 'Authentication', 'Mobile', 'Architecture'],
    dateRange: { start: d(10), end: h(1) },
    dominantRole: 'Led',
  },
  {
    id: 'ds2',
    title: 'Dashboard Performance Optimization Sprint',
    description: 'Investigated and resolved critical performance bottleneck in analytics dashboard, achieving 80% reduction in initial load time through code splitting and query optimization.',
    activityCount: 5,
    tools: ['github', 'jira', 'figma'],
    topics: ['Performance', 'Frontend', 'Analytics'],
    dateRange: { start: d(8), end: d(1) },
    dominantRole: 'Led',
  },
  {
    id: 'ds3',
    title: 'API Rate Limiting Infrastructure',
    description: 'Contributed to designing and shipping production-grade rate limiting using Redis sliding window algorithm, reducing API abuse by 95%.',
    activityCount: 4,
    tools: ['github', 'confluence', 'slack'],
    topics: ['Infrastructure', 'Redis', 'API Design'],
    dateRange: { start: d(12), end: d(5) },
    dominantRole: 'Contributed',
  },
];

// Utility: group activities by source
export function groupBySource(activities: MockActivity[]): Record<ActivitySource, MockActivity[]> {
  const groups: Record<string, MockActivity[]> = {};
  for (const a of activities) {
    if (!groups[a.source]) groups[a.source] = [];
    groups[a.source].push(a);
  }
  return groups as Record<ActivitySource, MockActivity[]>;
}

// Utility: get day key from ISO timestamp
export function getDayKey(timestamp: string): string {
  return timestamp.slice(0, 10); // YYYY-MM-DD
}

// Summary stats
export const mockStats = {
  totalActivities: mockActivities.length,
  bySource: Object.entries(
    mockActivities.reduce<Record<string, number>>((acc, a) => {
      acc[a.source] = (acc[a.source] || 0) + 1;
      return acc;
    }, {})
  ).map(([source, count]) => ({ source: source as ActivitySource, count })),
  draftStoryCount: mockDraftStories.length,
};
