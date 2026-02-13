// Mock data for profile prototype designs
// Self-contained — no imports from real app services

export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillCategory = 'frontend' | 'backend' | 'devops' | 'soft-skills';

export interface MockSkill {
  name: string;
  proficiency: SkillProficiency;
  category: SkillCategory;
}

export interface MockExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string | null;
  description: string;
  achievements: string[];
  skills: string[];
}

export interface MockEducation {
  id: string;
  degree: string;
  field: string;
  institution: string;
  location: string;
  startYear: number;
  endYear: number;
  grade: string;
  activities: string[];
}

export interface MockCertification {
  id: string;
  name: string;
  organization: string;
  issueDate: string;
  expiryDate: string | null;
  credentialUrl: string;
  skills: string[];
}

export interface MockStorySection {
  key: string;
  label: string;
  text: string;
  confidence: number;
}

export interface MockCareerStory {
  id: string;
  title: string;
  framework: string;
  archetype: string;
  overallConfidence: number;
  sections: MockStorySection[];
  tools: string[];
  publishedAt: string;
}

export interface MockProfile {
  name: string;
  title: string;
  company: string;
  location: string;
  industry: string;
  yearsOfExperience: number;
  avatar: string;
  bio: string;
  highlights: string[];
  specializations: string[];
  careerGoals: string[];
  professionalInterests: string[];
  skills: MockSkill[];
  experience: MockExperience[];
  education: MockEducation[];
  certifications: MockCertification[];
  careerStories: MockCareerStory[];
  networkStats: { followers: number; following: number };
  profileCompleteness: {
    overall: number;
    byCategory: { category: string; percentage: number }[];
  };
}

export const PROFICIENCY_META: Record<SkillProficiency, { label: string; color: string; bgColor: string; level: number }> = {
  beginner: { label: 'Beginner', color: 'text-gray-600', bgColor: 'bg-gray-100', level: 1 },
  intermediate: { label: 'Intermediate', color: 'text-blue-700', bgColor: 'bg-blue-50', level: 2 },
  advanced: { label: 'Advanced', color: 'text-purple-700', bgColor: 'bg-purple-50', level: 3 },
  expert: { label: 'Expert', color: 'text-emerald-700', bgColor: 'bg-emerald-50', level: 4 },
};

export const SKILL_CATEGORY_META: Record<SkillCategory, { label: string; color: string; bgColor: string }> = {
  frontend: { label: 'Frontend', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  backend: { label: 'Backend', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  devops: { label: 'DevOps', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  'soft-skills': { label: 'Soft Skills', color: 'text-purple-700', bgColor: 'bg-purple-50' },
};

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

export const mockProfile: MockProfile = {
  name: 'Alexandra Chen',
  title: 'Senior Software Engineer',
  company: 'TechVault Inc.',
  location: 'San Francisco, CA',
  industry: 'Enterprise SaaS',
  yearsOfExperience: 8,
  avatar: '',
  bio: 'Full-stack engineer with a passion for building scalable distributed systems and mentoring the next generation of developers. I thrive at the intersection of product thinking and deep technical execution, turning ambiguous requirements into elegant, maintainable solutions.',
  highlights: [
    'Led platform migration serving 2.3M users',
    'Reduced dashboard load times by 80%',
    'Built API rate limiting handling 50M+ requests/day',
    'Mentored 3 junior engineers to production independence',
  ],
  specializations: ['Distributed Systems', 'API Design', 'Performance Optimization', 'Security Architecture'],
  careerGoals: ['Staff Engineer promotion', 'Open-source maintainership', 'Technical writing'],
  professionalInterests: ['System Design', 'Developer Experience', 'Cloud Architecture', 'Tech Leadership'],

  skills: [
    { name: 'TypeScript', proficiency: 'expert', category: 'frontend' },
    { name: 'React', proficiency: 'expert', category: 'frontend' },
    { name: 'Node.js', proficiency: 'advanced', category: 'backend' },
    { name: 'PostgreSQL', proficiency: 'advanced', category: 'backend' },
    { name: 'AWS', proficiency: 'advanced', category: 'devops' },
    { name: 'Team Leadership', proficiency: 'intermediate', category: 'soft-skills' },
  ],

  experience: [
    {
      id: 'exp1',
      title: 'Senior Software Engineer',
      company: 'TechVault Inc.',
      location: 'San Francisco, CA',
      startDate: '2021-03-01',
      endDate: null,
      description: 'Lead engineer on the platform team responsible for core infrastructure, API design, and developer tooling serving 200+ internal and external consumers.',
      achievements: [
        'Designed PKCE-based OAuth2 flow for 2.3M-user mobile platform',
        'Reduced dashboard load time from 8s to 1.6s (80% improvement)',
        'Built rate limiting infrastructure handling 50M+ daily requests',
        'Improved system uptime from 99.1% to 99.9%',
      ],
      skills: ['TypeScript', 'React', 'Node.js', 'AWS', 'PostgreSQL'],
    },
    {
      id: 'exp2',
      title: 'Software Engineer II',
      company: 'DataStream Labs',
      location: 'Austin, TX',
      startDate: '2018-06-01',
      endDate: '2021-02-28',
      description: 'Full-stack developer on the analytics product team, building real-time data visualization and reporting features for enterprise customers.',
      achievements: [
        'Built real-time streaming dashboard processing 100K events/sec',
        'Led migration from REST to GraphQL, reducing API calls by 60%',
        'Implemented feature flag system adopted by 4 product teams',
      ],
      skills: ['React', 'GraphQL', 'Python', 'Redis', 'Docker'],
    },
    {
      id: 'exp3',
      title: 'Junior Developer',
      company: 'WebCraft Agency',
      location: 'Portland, OR',
      startDate: '2016-09-01',
      endDate: '2018-05-31',
      description: 'Front-end developer creating responsive web applications and e-commerce solutions for agency clients across retail and media industries.',
      achievements: [
        'Delivered 12+ client projects on time and within budget',
        'Introduced component library reducing development time by 35%',
      ],
      skills: ['JavaScript', 'React', 'CSS', 'WordPress'],
    },
  ],

  education: [
    {
      id: 'edu1',
      degree: 'Master of Science',
      field: 'Computer Science',
      institution: 'Stanford University',
      location: 'Stanford, CA',
      startYear: 2014,
      endYear: 2016,
      grade: '3.9 GPA',
      activities: ['Teaching Assistant — Distributed Systems', 'Graduate Research — Fault-tolerant Systems Lab'],
    },
    {
      id: 'edu2',
      degree: 'Bachelor of Science',
      field: 'Computer Engineering',
      institution: 'University of Washington',
      location: 'Seattle, WA',
      startYear: 2010,
      endYear: 2014,
      grade: '3.7 GPA',
      activities: ['ACM Programming Contest — 2nd Place Regional', 'Women in CS Mentorship Program Lead'],
    },
  ],

  certifications: [
    {
      id: 'cert1',
      name: 'AWS Solutions Architect — Professional',
      organization: 'Amazon Web Services',
      issueDate: '2023-06-15',
      expiryDate: '2026-06-15',
      credentialUrl: 'https://aws.amazon.com/verify/cert1',
      skills: ['AWS', 'Cloud Architecture', 'Infrastructure'],
    },
    {
      id: 'cert2',
      name: 'Certified Kubernetes Administrator',
      organization: 'Cloud Native Computing Foundation',
      issueDate: '2022-11-01',
      expiryDate: '2025-11-01',
      credentialUrl: 'https://cncf.io/verify/cert2',
      skills: ['Kubernetes', 'Docker', 'DevOps'],
    },
    {
      id: 'cert3',
      name: 'Professional Scrum Master I',
      organization: 'Scrum.org',
      issueDate: '2020-03-20',
      expiryDate: null,
      credentialUrl: 'https://scrum.org/verify/cert3',
      skills: ['Agile', 'Scrum', 'Team Leadership'],
    },
  ],

  careerStories: [
    {
      id: 'cs1',
      title: 'Led OAuth2 Security Overhaul Across Mobile Platform',
      framework: 'STAR',
      archetype: 'Architect',
      overallConfidence: 0.89,
      sections: [
        { key: 'situation', label: 'Situation', text: 'Our mobile platform served 2.3M users but relied on an outdated implicit grant flow with critical vulnerabilities flagged by security audits.', confidence: 0.92 },
        { key: 'task', label: 'Task', text: 'Design and implement PKCE-based OAuth2 flow across three mobile client platforms while maintaining backward compatibility.', confidence: 0.88 },
        { key: 'action', label: 'Action', text: 'Authored technical design doc, implemented token exchange middleware, built shared client libraries, and orchestrated phased rollout with feature flags.', confidence: 0.91 },
        { key: 'result', label: 'Result', text: 'Migration completed 2 weeks ahead of SOC 2 deadline with zero incidents. Security findings dropped from 12 critical to 0.', confidence: 0.85 },
      ],
      tools: ['GitHub', 'Jira', 'Confluence'],
      publishedAt: d(3),
    },
    {
      id: 'cs2',
      title: 'Optimized Dashboard Performance: 80% Load Time Reduction',
      framework: 'STAR',
      archetype: 'Detective',
      overallConfidence: 0.87,
      sections: [
        { key: 'situation', label: 'Situation', text: 'Analytics dashboard degraded to 8-second load time, causing 300% increase in support tickets and enterprise renewal risk.', confidence: 0.90 },
        { key: 'task', label: 'Task', text: 'Diagnose root causes and deliver sub-2-second load times within one sprint.', confidence: 0.85 },
        { key: 'action', label: 'Action', text: 'Profiled with DevTools, identified N+1 queries, synchronous renders, and uncompressed payloads. Implemented GraphQL batching, code-splitting, and Brotli compression.', confidence: 0.88 },
        { key: 'result', label: 'Result', text: 'Load time dropped from 8s to 1.6s. Support tickets decreased 85%. Both enterprise clients confirmed renewal.', confidence: 0.86 },
      ],
      tools: ['GitHub', 'Jira'],
      publishedAt: d(8),
    },
    {
      id: 'cs3',
      title: 'Designed API Rate Limiting Infrastructure from Scratch',
      framework: 'CAR',
      archetype: 'Architect',
      overallConfidence: 0.84,
      sections: [
        { key: 'challenge', label: 'Challenge', text: 'Public API experienced 10x traffic spike causing cascading failures with no rate limiting in place across 200+ integrations.', confidence: 0.86 },
        { key: 'action', label: 'Action', text: 'Selected Redis sliding window algorithm, designed tiered rate limits, built middleware with per-user tracking, and coordinated 30-day migration window.', confidence: 0.85 },
        { key: 'result', label: 'Result', text: 'API abuse decreased 95%, uptime improved from 99.1% to 99.9%, handling 50M+ requests/day with <1ms p99 overhead.', confidence: 0.81 },
      ],
      tools: ['GitHub', 'Confluence', 'Slack'],
      publishedAt: d(30),
    },
    {
      id: 'cs4',
      title: 'Mentored 3 Junior Engineers Through First Production Deployments',
      framework: 'SOAR',
      archetype: 'Multiplier',
      overallConfidence: 0.78,
      sections: [
        { key: 'situation', label: 'Situation', text: 'Three new graduates joined during a critical delivery phase with no structured mentoring program in place.', confidence: 0.82 },
        { key: 'obstacles', label: 'Obstacles', text: 'Limited deployment documentation, different learning styles per mentee, and balancing own deliverables with mentoring time.', confidence: 0.75 },
        { key: 'actions', label: 'Actions', text: 'Created "First Deploy" playbook with progressive exercises, paired on first 3 deployments each, established growth-focused 1:1s.', confidence: 0.80 },
        { key: 'results', label: 'Results', text: 'All three completed independent production deployments within 6 weeks. Team velocity increased 15%. Playbook adopted as official onboarding guide.', confidence: 0.76 },
      ],
      tools: ['GitHub', 'Slack'],
      publishedAt: d(45),
    },
  ],

  networkStats: { followers: 342, following: 187 },

  profileCompleteness: {
    overall: 87,
    byCategory: [
      { category: 'Basic Info', percentage: 100 },
      { category: 'Experience', percentage: 95 },
      { category: 'Education', percentage: 90 },
      { category: 'Skills', percentage: 80 },
      { category: 'Certifications', percentage: 85 },
      { category: 'Career Stories', percentage: 75 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Reduced-scope mock data — matches 2-step onboarding + product usage
// ---------------------------------------------------------------------------

export type ConnectedTool = 'github' | 'jira' | 'confluence' | 'slack' | 'linear' | 'notion' | 'gitlab' | 'bitbucket';

export interface MockToolActivity {
  tool: ConnectedTool;
  label: string;
  activityCount: number;
  recentItems: { title: string; date: string }[];
}

export interface MockDraftStory {
  id: string;
  title: string;
  framework: string;
  completionPercent: number;
  updatedAt: string;
}

export interface MockPlaybookItem {
  id: string;
  kind: 'single' | 'packet';
  type: string;
  typeLabel: string;
  typeColor: string;
  sourceStoryTitle: string;
  preview: string;
  wordCount: number;
  createdAt: string;
}

export interface MockReducedProfile {
  name: string;
  role: string;
  title: string;
  company: string;
  avatar: string;
  connectedTools: MockToolActivity[];
  totalActivities: number;
  publishedStories: MockCareerStory[];
  draftStories: MockDraftStory[];
  playbook: MockPlaybookItem[];
}

export const TOOL_META: Record<ConnectedTool, { label: string; color: string; bgColor: string }> = {
  github: { label: 'GitHub', color: 'text-gray-900', bgColor: 'bg-gray-100' },
  jira: { label: 'Jira', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  confluence: { label: 'Confluence', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  slack: { label: 'Slack', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  linear: { label: 'Linear', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  notion: { label: 'Notion', color: 'text-gray-800', bgColor: 'bg-gray-100' },
  gitlab: { label: 'GitLab', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  bitbucket: { label: 'Bitbucket', color: 'text-blue-800', bgColor: 'bg-blue-50' },
};

export const mockReducedProfile: MockReducedProfile = {
  name: 'Alexandra Chen',
  role: 'Team Lead',
  title: 'Senior Software Engineer',
  company: 'TechVault Inc.',
  avatar: '',

  connectedTools: [
    {
      tool: 'github',
      label: 'GitHub',
      activityCount: 47,
      recentItems: [
        { title: 'Merged PR #342 — Add PKCE auth flow', date: d(0) },
        { title: 'Reviewed PR #341 — Fix rate limiter edge case', date: d(0) },
        { title: 'Pushed 3 commits to feat/oauth-migration', date: d(1) },
        { title: 'Closed issue #298 — Token refresh race condition', date: d(2) },
      ],
    },
    {
      tool: 'jira',
      label: 'Jira',
      activityCount: 31,
      recentItems: [
        { title: 'Closed PLAT-89 — OAuth2 migration phase 2', date: d(0) },
        { title: 'Updated PLAT-91 — Rate limiter monitoring', date: d(1) },
        { title: 'Created PLAT-95 — Dashboard load time audit', date: d(2) },
      ],
    },
    {
      tool: 'confluence',
      label: 'Confluence',
      activityCount: 12,
      recentItems: [
        { title: 'Edited "API Architecture Decision Record"', date: d(1) },
        { title: 'Published "Q1 Platform Team Retrospective"', date: d(5) },
      ],
    },
    {
      tool: 'slack',
      label: 'Slack',
      activityCount: 8,
      recentItems: [
        { title: 'Shared deployment runbook in #platform-eng', date: d(0) },
        { title: 'Answered question in #help-backend', date: d(1) },
      ],
    },
  ],

  totalActivities: 98,

  publishedStories: mockProfile.careerStories,

  draftStories: [
    {
      id: 'draft1',
      title: 'API Redesign for V2 Public Endpoints',
      framework: 'STAR',
      completionPercent: 60,
      updatedAt: d(1),
    },
    {
      id: 'draft2',
      title: 'Q4 Release Coordination Across 3 Teams',
      framework: 'CAR',
      completionPercent: 40,
      updatedAt: d(3),
    },
    {
      id: 'draft3',
      title: 'Team Process Improvement Initiative',
      framework: 'SOAR',
      completionPercent: 20,
      updatedAt: d(7),
    },
  ],

  playbook: [
    {
      id: 'pb1',
      kind: 'single',
      type: 'interview',
      typeLabel: 'Interview Answer',
      typeColor: 'indigo',
      sourceStoryTitle: 'Led OAuth2 Security Overhaul Across Mobile Platform',
      preview: 'When our mobile platform serving 2.3M users faced critical security vulnerabilities, I designed and implemented a PKCE-based OAuth2 flow across three client platforms...',
      wordCount: 245,
      createdAt: d(2),
    },
    {
      id: 'pb2',
      kind: 'single',
      type: 'linkedin',
      typeLabel: 'LinkedIn Post',
      typeColor: 'sky',
      sourceStoryTitle: 'Optimized Dashboard Performance: 80% Load Time Reduction',
      preview: 'Ever had a dashboard so slow your users filed 300% more support tickets? Here\'s how I turned an 8-second load time into 1.6 seconds in a single sprint...',
      wordCount: 180,
      createdAt: d(5),
    },
    {
      id: 'pb3',
      kind: 'single',
      type: 'resume',
      typeLabel: 'Resume Bullet',
      typeColor: 'emerald',
      sourceStoryTitle: 'Designed API Rate Limiting Infrastructure from Scratch',
      preview: 'Designed and implemented Redis-based sliding window rate limiting infrastructure handling 50M+ daily requests with <1ms p99 overhead, improving API uptime from 99.1% to 99.9%.',
      wordCount: 42,
      createdAt: d(8),
    },
    {
      id: 'pb4',
      kind: 'packet',
      type: 'promotion',
      typeLabel: 'Promotion Packet',
      typeColor: 'emerald',
      sourceStoryTitle: 'Led OAuth2 Security Overhaul Across Mobile Platform',
      preview: 'Comprehensive promotion packet including technical impact analysis, cross-team influence evidence, and mentoring outcomes for Staff Engineer consideration...',
      wordCount: 1200,
      createdAt: d(10),
    },
    {
      id: 'pb5',
      kind: 'single',
      type: 'self-assessment',
      typeLabel: 'Self Assessment',
      typeColor: 'rose',
      sourceStoryTitle: 'Mentored 3 Junior Engineers Through First Production Deployments',
      preview: 'Created structured mentoring program that enabled three new graduates to achieve independent production deployment capability within 6 weeks, increasing team velocity by 15%...',
      wordCount: 320,
      createdAt: d(12),
    },
    {
      id: 'pb6',
      kind: 'single',
      type: 'team-share',
      typeLabel: 'Team Share',
      typeColor: 'violet',
      sourceStoryTitle: 'Optimized Dashboard Performance: 80% Load Time Reduction',
      preview: 'Sharing the performance investigation methodology I used: profiling with DevTools, identifying N+1 queries, implementing GraphQL batching and code-splitting...',
      wordCount: 410,
      createdAt: d(15),
    },
  ],
};

// Helper: get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// Helper: format date range for experience
export function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `${fmt(start)} — ${end ? fmt(end) : 'Present'}`;
}

// Helper: calculate duration in years
export function calculateDuration(start: string, end: string | null): string {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${remaining}mo`;
  if (remaining === 0) return `${years}yr`;
  return `${years}yr ${remaining}mo`;
}

// Helper: confidence level
export function getConfidenceLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 0.8) return { label: 'Strong', color: 'text-emerald-700', bgColor: 'bg-emerald-50' };
  if (score >= 0.6) return { label: 'Fair', color: 'text-amber-700', bgColor: 'bg-amber-50' };
  return { label: 'Weak', color: 'text-red-700', bgColor: 'bg-red-50' };
}

// Helper: certification expiry status
export function getCertExpiryStatus(expiryDate: string | null): { label: string; color: string } {
  if (!expiryDate) return { label: 'No Expiry', color: 'text-gray-500' };
  const diff = new Date(expiryDate).getTime() - Date.now();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return { label: 'Expired', color: 'text-red-600' };
  if (days < 90) return { label: `Expires in ${days}d`, color: 'text-amber-600' };
  return { label: `Valid until ${new Date(expiryDate).getFullYear()}`, color: 'text-emerald-600' };
}
