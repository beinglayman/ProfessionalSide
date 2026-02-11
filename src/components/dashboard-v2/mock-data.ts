import type {
  OnboardingJourneyData,
  KPITrackerData,
  CompetencyMatrixData,
  IntensityLevel,
  StoryHealthData,
  IntegrationHealthData,
  PeerEngagementData,
  WeeklyDigestData,
  MeetingsToActionData,
  GoalProgressHeatmapData,
  HeatmapDay,
} from './types';

// === Helpers ===
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);

function generateWeeklyIntensities(weeks: number, bias: number): IntensityLevel[] {
  return Array.from({ length: weeks }, () => {
    const r = rand();
    if (r < 0.15) return 0 as IntensityLevel;
    if (r < 0.15 + (0.25 - bias * 0.1)) return 1 as IntensityLevel;
    if (r < 0.5) return 2 as IntensityLevel;
    if (r < 0.8) return 3 as IntensityLevel;
    return 4 as IntensityLevel;
  });
}

function getWeekLabel(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  return d.toISOString().split('T')[0];
}

// === Onboarding Journey ===
export const mockOnboarding: OnboardingJourneyData = {
  currentStepIndex: 1,
  dismissed: false,
  steps: [
    { id: 1, label: 'Sign Up', description: 'Create your InChronicle account', completed: true, current: false },
    { id: 2, label: 'Connect Tool', description: 'Add GitHub, Google Workspace, or Atlassian', completed: false, current: true },
    { id: 3, label: 'Fetch Activity', description: 'Import your work activity from connected tools', completed: false, current: false },
    { id: 4, label: 'Publish Story', description: 'Promote a draft story to published', completed: false, current: false },
    { id: 5, label: 'Export / Share', description: 'Share your story in any format', completed: false, current: false },
    { id: 6, label: 'Create Narrative', description: 'Build a career narrative from your stories', completed: false, current: false },
  ],
};

// === KPI/KRA Tracker ===
export const mockKPIs: KPITrackerData = {
  role: 'engineer',
  kpis: [
    { id: 'pr-merged', name: 'PRs Merged / Week', current: 8, target: 10, unit: 'PRs', trend: 'up', trendValue: 14, status: 'on-track', category: 'Engineering' },
    { id: 'code-review', name: 'Code Review Turnaround', current: 4.2, target: 4, unit: 'hours', trend: 'down', trendValue: -8, status: 'at-risk', category: 'Engineering' },
    { id: 'stories-published', name: 'Stories Published / Month', current: 3, target: 4, unit: 'stories', trend: 'up', trendValue: 50, status: 'on-track', category: 'Documentation' },
    { id: 'sprint-velocity', name: 'Sprint Velocity', current: 34, target: 40, unit: 'points', trend: 'stable', trendValue: 0, status: 'at-risk', category: 'Engineering' },
    { id: 'bug-resolution', name: 'Bug Resolution Time', current: 2.1, target: 2, unit: 'days', trend: 'down', trendValue: -15, status: 'at-risk', category: 'Engineering' },
    { id: 'mentoring', name: 'Mentoring Hours / Week', current: 3, target: 2, unit: 'hours', trend: 'up', trendValue: 20, status: 'on-track', category: 'Leadership' },
    { id: 'docs-written', name: 'Docs Written / Month', current: 2, target: 3, unit: 'docs', trend: 'stable', trendValue: 0, status: 'behind', category: 'Documentation' },
    { id: 'cert-progress', name: 'Certification Progress', current: 65, target: 100, unit: '%', trend: 'up', trendValue: 10, status: 'on-track', category: 'Growth' },
    { id: 'presentations', name: 'Presentations Given / Qtr', current: 1, target: 2, unit: 'talks', trend: 'stable', trendValue: 0, status: 'behind', category: 'Communication' },
    { id: 'uptime', name: 'Service Uptime', current: 99.7, target: 99.9, unit: '%', trend: 'down', trendValue: -0.1, status: 'at-risk', category: 'Engineering' },
  ],
};

// === Role Competency Matrix ===
const TOTAL_WEEKS = 26; // 6 months
const weekLabels = Array.from({ length: TOTAL_WEEKS }, (_, i) => getWeekLabel(TOTAL_WEEKS - 1 - i));

export const mockCompetencyMatrix: CompetencyMatrixData = {
  totalWeeks: TOTAL_WEEKS,
  weekLabels,
  areas: [
    { name: 'Documentation', icon: 'FileText', weeks: generateWeeklyIntensities(TOTAL_WEEKS, 0.5) },
    { name: 'Communication', icon: 'MessageSquare', weeks: generateWeeklyIntensities(TOTAL_WEEKS, 0.8) },
    { name: 'Code Quality', icon: 'Code', weeks: generateWeeklyIntensities(TOTAL_WEEKS, 1.0) },
    { name: 'Leadership', icon: 'Users', weeks: generateWeeklyIntensities(TOTAL_WEEKS, 0.3) },
    { name: 'Collaboration', icon: 'GitBranch', weeks: generateWeeklyIntensities(TOTAL_WEEKS, 0.7) },
    { name: 'Innovation', icon: 'Lightbulb', weeks: generateWeeklyIntensities(TOTAL_WEEKS, 0.2) },
  ],
};

// === Story Health Metrics ===
export const mockStoryHealth: StoryHealthData = {
  totalStories: 24,
  publishedCount: 18,
  draftCount: 6,
  storiesPerQuarter: [3, 5, 4, 6, 6],
  quarterLabels: ['Q1 \'25', 'Q2 \'25', 'Q3 \'25', 'Q4 \'25', 'Q1 \'26'],
  coverageAreas: [
    { area: 'Technical Leadership', covered: true },
    { area: 'Project Delivery', covered: true },
    { area: 'Cross-team Collaboration', covered: true },
    { area: 'Mentoring & Growth', covered: false },
    { area: 'Innovation & Research', covered: false },
    { area: 'Client Impact', covered: true },
    { area: 'Process Improvement', covered: true },
    { area: 'Crisis Management', covered: false },
  ],
  avgDaysSinceEdit: 12,
  healthScore: 74,
};

// === Integration Health ===
export const mockIntegrations: IntegrationHealthData = {
  totalConnected: 4,
  totalAvailable: 6,
  integrations: [
    { id: 'github', name: 'GitHub', icon: 'Github', connected: true, status: 'active', lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(), activityVolume: 47, sparklineData: [12, 18, 15, 22, 19, 25, 20] },
    { id: 'jira', name: 'Atlassian Jira', icon: 'SquareKanban', connected: true, status: 'stale', lastSync: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), activityVolume: 12, sparklineData: [8, 10, 6, 4, 3, 2, 1] },
    { id: 'slack', name: 'Slack', icon: 'Hash', connected: true, status: 'active', lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(), activityVolume: 156, sparklineData: [30, 28, 35, 40, 32, 38, 42] },
    { id: 'google', name: 'Google Workspace', icon: 'Mail', connected: true, status: 'active', lastSync: new Date(Date.now() - 1000 * 60 * 60).toISOString(), activityVolume: 89, sparklineData: [15, 20, 18, 22, 25, 20, 23] },
    { id: 'figma', name: 'Figma', icon: 'Figma', connected: false, status: 'disconnected', lastSync: '', activityVolume: 0, sparklineData: [0, 0, 0, 0, 0, 0, 0] },
    { id: 'zoom', name: 'Zoom', icon: 'Video', connected: false, status: 'disconnected', lastSync: '', activityVolume: 0, sparklineData: [0, 0, 0, 0, 0, 0, 0] },
  ],
};

// === Peer Engagement ===
export const mockPeerEngagement: PeerEngagementData = {
  attestationsReceived: 23,
  attestationsGiven: 18,
  endorsements: 47,
  comments: 89,
  networkGrowth: [
    { month: 'Sep', connections: 42 },
    { month: 'Oct', connections: 48 },
    { month: 'Nov', connections: 53 },
    { month: 'Dec', connections: 61 },
    { month: 'Jan', connections: 67 },
    { month: 'Feb', connections: 74 },
  ],
  visibilityScore: 72,
  credibilityScore: 85,
};

// === Weekly Digest ===
export const mockWeeklyDigest: WeeklyDigestData = {
  weekOf: '2026-02-09',
  summary: 'Strong week in code contributions with 8 PRs merged. Collaboration was high — 3 cross-team code reviews completed. Documentation was a gap this week with no new docs written.',
  accomplishments: [
    'Merged 8 pull requests including the auth refactor',
    'Completed 3 cross-team code reviews for Platform team',
    'Presented sprint demo to stakeholders',
    'Mentored 2 junior engineers on testing patterns',
  ],
  suggestedStories: [
    { title: 'Auth System Refactor — reducing login latency by 40%', source: 'GitHub PRs #142-148', confidence: 92 },
    { title: 'Cross-team collaboration on Platform API redesign', source: 'Jira PLAT-301, code reviews', confidence: 78 },
    { title: 'Mentoring junior engineers on TDD practices', source: 'Slack #mentoring, Calendar events', confidence: 65 },
  ],
  focusAreas: [
    { area: 'Documentation', priority: 'high' },
    { area: 'Innovation / R&D', priority: 'medium' },
    { area: 'Networking', priority: 'low' },
  ],
};

// === Meetings-to-Action ===
export const mockMeetingsToAction: MeetingsToActionData = {
  meetingHours: 14.5,
  totalWorkHours: 40,
  meetingPercentage: 36.25,
  actionItemsTotal: 18,
  actionItemsCompleted: 12,
  completionRate: 66.7,
  previousWeekCompletion: 58.3,
  breakdown: [
    { category: 'Standup', hours: 2.5, color: '#5D259F' },
    { category: 'Sprint Planning', hours: 2, color: '#9F5FE7' },
    { category: '1:1s', hours: 3, color: '#B787ED' },
    { category: 'Team Sync', hours: 4, color: '#CFAFF3' },
    { category: 'All Hands', hours: 1.5, color: '#E7D7F9' },
    { category: 'Ad-hoc', hours: 1.5, color: '#F3EBFC' },
  ],
};

// === Goal Progress Heatmap ===
function generateHeatmapDays(): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const r = seededRandom(123);
  for (let i = 364; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    // Lower activity on weekends
    const weekendPenalty = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.4 : 0;
    const val = r();
    let intensity: IntensityLevel;
    if (val < 0.12 + weekendPenalty) intensity = 0;
    else if (val < 0.3 + weekendPenalty * 0.5) intensity = 1;
    else if (val < 0.55) intensity = 2;
    else if (val < 0.8) intensity = 3;
    else intensity = 4;

    const count = intensity === 0 ? 0 : Math.ceil(intensity * (1 + r()));
    const detailOptions = ['Completed KPI review', 'Published story', 'Code review done', 'Doc written', 'Mentoring session', 'Sprint goal hit'];
    const details = intensity === 0 ? [] : Array.from({ length: Math.min(count, 3) }, (_, j) => detailOptions[(j + i) % detailOptions.length]);

    days.push({ date: dateStr, intensity, count, details });
  }
  return days;
}

const heatmapDays = generateHeatmapDays();

export const mockGoalHeatmap: GoalProgressHeatmapData = {
  days: heatmapDays,
  currentStreak: 14,
  longestStreak: 32,
  totalActiveDays: heatmapDays.filter(d => d.intensity > 0).length,
};
