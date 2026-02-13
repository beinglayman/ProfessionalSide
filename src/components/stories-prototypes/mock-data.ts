// Mock data for career stories prototype designs
// Self-contained — no imports from real app services

export type NarrativeFramework = 'STAR' | 'CAR' | 'SOAR' | 'STARL' | 'PAR' | 'SAR' | 'SHARE' | 'CARL';
export type StoryStatus = 'published' | 'draft' | 'needs-polish' | 'saved';
export type StoryCategory = 'projects-impact' | 'leadership' | 'growth' | 'external';
export type StoryArchetype = 'firefighter' | 'architect' | 'diplomat' | 'multiplier' | 'detective' | 'pioneer';
export type ToolType = 'github' | 'jira' | 'confluence' | 'slack' | 'figma' | 'google-meet';

export interface StorySection {
  key: string;
  label: string;
  text: string;
  confidence: number;
  sourceCount: number;
}

export interface MockStory {
  id: string;
  title: string;
  framework: NarrativeFramework;
  status: StoryStatus;
  category: StoryCategory;
  archetype: StoryArchetype;
  overallConfidence: number;
  sections: StorySection[];
  tools: ToolType[];
  dateRange: { start: string; end: string };
  activityCount: number;
  wordCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export const CATEGORY_META: Record<StoryCategory, { label: string; color: string; bgColor: string }> = {
  'projects-impact': { label: 'Projects & Impact', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  leadership: { label: 'Leadership', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  growth: { label: 'Growth & Learning', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  external: { label: 'External', color: 'text-amber-700', bgColor: 'bg-amber-50' },
};

export const FRAMEWORK_META: Record<NarrativeFramework, { label: string; sections: string[] }> = {
  STAR: { label: 'STAR', sections: ['Situation', 'Task', 'Action', 'Result'] },
  STARL: { label: 'STAR+L', sections: ['Situation', 'Task', 'Action', 'Result', 'Learning'] },
  CAR: { label: 'CAR', sections: ['Challenge', 'Action', 'Result'] },
  PAR: { label: 'PAR', sections: ['Problem', 'Action', 'Result'] },
  SAR: { label: 'SAR', sections: ['Situation', 'Action', 'Result'] },
  SOAR: { label: 'SOAR', sections: ['Situation', 'Obstacles', 'Actions', 'Results'] },
  SHARE: { label: 'SHARE', sections: ['Situation', 'Hindrances', 'Actions', 'Results', 'Evaluation'] },
  CARL: { label: 'CARL', sections: ['Context', 'Action', 'Result', 'Learning'] },
};

export const ARCHETYPE_META: Record<StoryArchetype, { label: string; emoji: string }> = {
  firefighter: { label: 'Firefighter', emoji: '🚒' },
  architect: { label: 'Architect', emoji: '🏗️' },
  diplomat: { label: 'Diplomat', emoji: '🤝' },
  multiplier: { label: 'Multiplier', emoji: '✨' },
  detective: { label: 'Detective', emoji: '🔍' },
  pioneer: { label: 'Pioneer', emoji: '🚀' },
};

export const TOOL_META: Record<ToolType, { name: string; color: string }> = {
  github: { name: 'GitHub', color: '#24292E' },
  jira: { name: 'Jira', color: '#0052CC' },
  confluence: { name: 'Confluence', color: '#172B4D' },
  slack: { name: 'Slack', color: '#4A154B' },
  figma: { name: 'Figma', color: '#F24E1E' },
  'google-meet': { name: 'Google Meet', color: '#00897B' },
};

export const STATUS_META: Record<StoryStatus, { label: string; color: string; bgColor: string; dotColor: string }> = {
  published: { label: 'Published', color: 'text-emerald-700', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500' },
  saved: { label: 'Saved', color: 'text-blue-700', bgColor: 'bg-blue-50', dotColor: 'bg-blue-500' },
  'needs-polish': { label: 'Needs Polish', color: 'text-amber-700', bgColor: 'bg-amber-50', dotColor: 'bg-amber-500' },
  draft: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100', dotColor: 'bg-gray-400' },
};

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

export const mockStories: MockStory[] = [
  {
    id: 's1',
    title: 'Led OAuth2 Security Overhaul Across Mobile Platform',
    framework: 'STAR',
    status: 'published',
    category: 'projects-impact',
    archetype: 'architect',
    overallConfidence: 0.89,
    sections: [
      { key: 'situation', label: 'Situation', text: 'Our mobile platform served 2.3M users but relied on an outdated implicit grant flow for OAuth authentication. Security audits flagged critical vulnerabilities: token exposure in URL fragments, no refresh token support, and susceptibility to authorization code interception attacks. With SOC 2 compliance deadlines approaching, the security team escalated this as a P0 initiative.', confidence: 0.92, sourceCount: 3 },
      { key: 'task', label: 'Task', text: 'I was tasked with designing and implementing a PKCE-based OAuth2 flow across our three mobile client platforms (iOS, Android, React Native) while maintaining backward compatibility with existing sessions and coordinating the rollout with the identity, mobile, and QA teams.', confidence: 0.88, sourceCount: 2 },
      { key: 'action', label: 'Action', text: 'I authored the technical design doc proposing PKCE with S256 code challenge, implemented the token exchange middleware in our Node.js auth service, built shared client libraries for all three platforms, and orchestrated a phased rollout with feature flags. I also conducted threat modeling sessions and added comprehensive integration tests covering 15 attack vectors.', confidence: 0.91, sourceCount: 5 },
      { key: 'result', label: 'Result', text: 'The migration completed 2 weeks ahead of the SOC 2 deadline with zero user-facing incidents. Security scan findings dropped from 12 critical to 0. Token refresh reduced re-authentication friction by 73%, improving mobile session duration by 40%. The approach was adopted as the standard for all new OAuth integrations across the company.', confidence: 0.85, sourceCount: 4 },
    ],
    tools: ['github', 'jira', 'confluence', 'slack'],
    dateRange: { start: d(45), end: d(5) },
    activityCount: 14,
    wordCount: 248,
    publishedAt: d(3),
    createdAt: d(10),
  },
  {
    id: 's2',
    title: 'Optimized Dashboard Performance: 80% Load Time Reduction',
    framework: 'STAR',
    status: 'published',
    category: 'projects-impact',
    archetype: 'detective',
    overallConfidence: 0.87,
    sections: [
      { key: 'situation', label: 'Situation', text: 'The analytics dashboard was the most-used page in our SaaS product, yet performance had degraded over 6 months to an 8-second initial load. Customer support tickets about "slow dashboard" increased 300%, and two enterprise clients raised it as a renewal blocker. The frontend team had tried quick fixes without success.', confidence: 0.90, sourceCount: 2 },
      { key: 'task', label: 'Task', text: 'As the senior engineer on the platform team, I took ownership of diagnosing root causes and delivering a measurable performance improvement within one sprint (2 weeks), targeting sub-2-second load times.', confidence: 0.85, sourceCount: 2 },
      { key: 'action', label: 'Action', text: 'I profiled the application using Chrome DevTools and server traces, identifying three bottlenecks: an N+1 query loading 400+ widget configs, synchronous rendering of 12 chart components, and uncompressed 2MB JSON payloads. I implemented batched GraphQL queries, React.lazy with Suspense boundaries for chart code-splitting, and Brotli compression on the API gateway.', confidence: 0.88, sourceCount: 4 },
      { key: 'result', label: 'Result', text: 'Load time dropped from 8s to 1.6s (80% improvement). Dashboard-related support tickets decreased by 85% within 2 weeks. Both enterprise clients confirmed renewal. The code-splitting pattern was documented and reused across 4 other pages, improving overall app performance by 35%.', confidence: 0.86, sourceCount: 3 },
    ],
    tools: ['github', 'jira', 'figma'],
    dateRange: { start: d(30), end: d(12) },
    activityCount: 9,
    wordCount: 215,
    publishedAt: d(8),
    createdAt: d(15),
  },
  {
    id: 's3',
    title: 'Designed API Rate Limiting Infrastructure from Scratch',
    framework: 'CAR',
    status: 'published',
    category: 'projects-impact',
    archetype: 'architect',
    overallConfidence: 0.84,
    sections: [
      { key: 'challenge', label: 'Challenge', text: 'Our public API experienced a 10x traffic spike from a viral integration, causing cascading failures across backend services. We had no rate limiting, and the API served 200+ third-party integrations. Adding limits without breaking legitimate high-volume partners required careful design.', confidence: 0.86, sourceCount: 3 },
      { key: 'action', label: 'Action', text: 'I researched rate limiting algorithms and selected Redis sliding window for its accuracy and low overhead. I designed a tiered system (free/pro/enterprise limits), built the middleware with per-user and per-IP tracking, added monitoring dashboards, and coordinated with developer relations to communicate changes to API consumers with a 30-day migration window.', confidence: 0.85, sourceCount: 4 },
      { key: 'result', label: 'Result', text: 'API abuse decreased by 95% while legitimate traffic remained unaffected. System stability improved from 99.1% to 99.9% uptime. The rate limiting service processed 50M+ requests/day with <1ms p99 overhead. Zero partner complaints during the rollout period.', confidence: 0.81, sourceCount: 2 },
    ],
    tools: ['github', 'confluence', 'slack'],
    dateRange: { start: d(60), end: d(35) },
    activityCount: 11,
    wordCount: 175,
    publishedAt: d(30),
    createdAt: d(40),
  },
  {
    id: 's4',
    title: 'Mentored 3 Junior Engineers Through First Production Deployments',
    framework: 'SOAR',
    status: 'saved',
    category: 'leadership',
    archetype: 'multiplier',
    overallConfidence: 0.78,
    sections: [
      { key: 'situation', label: 'Situation', text: 'Three new graduates joined the team simultaneously, each with strong academic backgrounds but no production deployment experience. The team was in a critical delivery phase, and onboarding needed to happen without slowing sprint velocity.', confidence: 0.82, sourceCount: 2 },
      { key: 'obstacles', label: 'Obstacles', text: 'Limited documentation for our deployment pipeline, no structured mentoring program, and each mentee had different learning styles and technical gaps. Balancing my own deliverables with mentoring time was the primary constraint.', confidence: 0.75, sourceCount: 1 },
      { key: 'actions', label: 'Actions', text: 'I created a "First Deploy" playbook with progressively complex exercises (staging deploy → feature flag rollout → full production). I paired with each mentee for their first 3 deployments, introduced code review as a learning tool, and established weekly 1:1s focused on growth rather than status updates.', confidence: 0.80, sourceCount: 3 },
      { key: 'results', label: 'Results', text: 'All three completed independent production deployments within 6 weeks. One mentee proposed and shipped a CI/CD improvement that reduced deploy time by 30%. Team velocity actually increased 15% as the new engineers took on feature work. The playbook was adopted as the official onboarding guide.', confidence: 0.76, sourceCount: 2 },
    ],
    tools: ['github', 'jira', 'slack', 'google-meet'],
    dateRange: { start: d(90), end: d(50) },
    activityCount: 8,
    wordCount: 198,
    publishedAt: null,
    createdAt: d(45),
  },
  {
    id: 's5',
    title: 'Completed AWS Solutions Architect Professional Certification',
    framework: 'STAR',
    status: 'needs-polish',
    category: 'growth',
    archetype: 'pioneer',
    overallConfidence: 0.72,
    sections: [
      { key: 'situation', label: 'Situation', text: 'The team was migrating from a monolithic deployment to microservices on AWS, but our collective cloud expertise was limited to basic EC2 and S3 usage. Architecture decisions were being made without deep understanding of AWS service capabilities and cost optimization strategies.', confidence: 0.78, sourceCount: 1 },
      { key: 'task', label: 'Task', text: 'I volunteered to pursue the AWS Solutions Architect Professional certification to build deep expertise and become the team\'s cloud architecture reference point, while continuing to deliver on my sprint commitments.', confidence: 0.70, sourceCount: 1 },
      { key: 'action', label: 'Action', text: 'I dedicated 8 hours per week for 3 months to studying, completing 6 practice exams, and building proof-of-concept architectures. I applied learnings directly to our migration: redesigning the VPC topology, implementing cost-saving reserved instance strategies, and introducing AWS CDK for infrastructure as code.', confidence: 0.73, sourceCount: 2 },
      { key: 'result', label: 'Result', text: 'Passed the certification with a score of 892/1000. Applied cost optimization techniques that saved $4,200/month on our AWS bill. Led 3 architecture review sessions that improved our migration plan. Two teammates subsequently pursued their own AWS certifications.', confidence: 0.68, sourceCount: 1 },
    ],
    tools: ['confluence', 'slack'],
    dateRange: { start: d(120), end: d(70) },
    activityCount: 5,
    wordCount: 192,
    publishedAt: null,
    createdAt: d(65),
  },
  {
    id: 's6',
    title: 'Presented Microservices Migration Strategy at Company All-Hands',
    framework: 'STAR',
    status: 'draft',
    category: 'external',
    archetype: 'diplomat',
    overallConfidence: 0.65,
    sections: [
      { key: 'situation', label: 'Situation', text: 'The engineering org of 80+ engineers was 6 months into a monolith-to-microservices migration with mixed results. Teams had different understanding of the strategy, timelines were slipping, and leadership requested a clear status update for the quarterly all-hands meeting.', confidence: 0.70, sourceCount: 1 },
      { key: 'task', label: 'Task', text: 'I was asked to prepare and deliver a 20-minute presentation that would align all engineering teams on the migration status, remaining challenges, and updated timeline — making it accessible to both technical and non-technical stakeholders.', confidence: 0.62, sourceCount: 1 },
      { key: 'action', label: 'Action', text: 'I collected migration metrics from all 6 teams, created visualizations showing progress per service boundary, and structured the talk around three themes: wins, blockers, and the path forward. I rehearsed with my manager and two peer leads, incorporating their feedback on messaging.', confidence: 0.65, sourceCount: 2 },
      { key: 'result', label: 'Result', text: 'The presentation was well-received — post-event survey showed 92% of attendees found it "very helpful." CTO praised the clarity and requested the slides for the board update. Two teams reached out afterward to align their timelines with the updated plan.', confidence: 0.60, sourceCount: 1 },
    ],
    tools: ['confluence', 'slack', 'google-meet'],
    dateRange: { start: d(100), end: d(85) },
    activityCount: 4,
    wordCount: 185,
    publishedAt: null,
    createdAt: d(80),
  },
];

// Summary stats
export const mockStoryStats = {
  total: mockStories.length,
  published: mockStories.filter(s => s.status === 'published').length,
  drafts: mockStories.filter(s => s.status === 'draft').length,
  avgConfidence: Math.round(mockStories.reduce((sum, s) => sum + s.overallConfidence, 0) / mockStories.length * 100),
  byCategory: Object.entries(
    mockStories.reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([category, count]) => ({ category: category as StoryCategory, count })),
  byFramework: Object.entries(
    mockStories.reduce<Record<string, number>>((acc, s) => {
      acc[s.framework] = (acc[s.framework] || 0) + 1;
      return acc;
    }, {})
  ).map(([framework, count]) => ({ framework: framework as NarrativeFramework, count })),
  totalActivities: mockStories.reduce((sum, s) => sum + s.activityCount, 0),
};

// Confidence helpers
export function getConfidenceLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 0.8) return { label: 'Strong', color: 'text-emerald-700', bgColor: 'bg-emerald-50' };
  if (score >= 0.6) return { label: 'Fair', color: 'text-amber-700', bgColor: 'bg-amber-50' };
  return { label: 'Weak', color: 'text-red-700', bgColor: 'bg-red-50' };
}

// Section color mapping
export const SECTION_COLORS: Record<string, string> = {
  situation: 'border-blue-400',
  task: 'border-amber-400',
  action: 'border-primary-400',
  result: 'border-red-400',
  learning: 'border-emerald-400',
  challenge: 'border-blue-400',
  obstacles: 'border-amber-400',
  actions: 'border-primary-400',
  results: 'border-red-400',
  hindrances: 'border-amber-400',
  evaluation: 'border-emerald-400',
  context: 'border-blue-400',
  problem: 'border-blue-400',
};
