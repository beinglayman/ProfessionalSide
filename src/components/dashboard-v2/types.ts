// Dashboard V2 - Shared Types

// === Onboarding Journey ===
export interface OnboardingStep {
  id: number;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface OnboardingJourneyData {
  steps: OnboardingStep[];
  currentStepIndex: number;
  dismissed: boolean;
}

// === KPI/KRA Tracker ===
export type KPITrend = 'up' | 'down' | 'stable';
export type KPIStatus = 'on-track' | 'at-risk' | 'behind';
export type RoleTemplate = 'engineer' | 'designer' | 'pm' | 'manager' | 'custom';

export interface KPIItem {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: KPITrend;
  trendValue: number; // e.g., +12% or -5%
  status: KPIStatus;
  category: string;
}

export interface KPITrackerData {
  role: RoleTemplate;
  kpis: KPIItem[];
}

// === Role Competency Matrix ===
export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface CompetencyArea {
  name: string;
  icon: string; // lucide icon name
  weeks: IntensityLevel[];
}

export interface CompetencyMatrixData {
  areas: CompetencyArea[];
  weekLabels: string[];
  totalWeeks: number;
}

// === Story Health Metrics ===
export interface StoryHealthData {
  totalStories: number;
  publishedCount: number;
  draftCount: number;
  storiesPerQuarter: number[];
  quarterLabels: string[];
  coverageAreas: { area: string; covered: boolean }[];
  avgDaysSinceEdit: number;
  healthScore: number;
}

// === Integration Health ===
export type IntegrationStatusType = 'active' | 'stale' | 'error' | 'disconnected';

export interface Integration {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  status: IntegrationStatusType;
  lastSync: string; // ISO date
  activityVolume: number;
  sparklineData: number[];
}

export interface IntegrationHealthData {
  integrations: Integration[];
  totalConnected: number;
  totalAvailable: number;
}

// === Peer Engagement ===
export interface PeerEngagementData {
  attestationsReceived: number;
  attestationsGiven: number;
  endorsements: number;
  comments: number;
  networkGrowth: { month: string; connections: number }[];
  visibilityScore: number;
  credibilityScore: number;
}

// === Weekly Digest ===
export interface WeeklyDigestData {
  weekOf: string;
  accomplishments: string[];
  suggestedStories: { title: string; source: string; confidence: number }[];
  focusAreas: { area: string; priority: 'high' | 'medium' | 'low' }[];
  summary: string;
}

// === Meetings-to-Action Ratio ===
export interface MeetingsToActionData {
  meetingHours: number;
  totalWorkHours: number;
  meetingPercentage: number;
  actionItemsTotal: number;
  actionItemsCompleted: number;
  completionRate: number;
  previousWeekCompletion: number;
  breakdown: { category: string; hours: number; color: string }[];
}

// === Goal Progress Heatmap ===
export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  intensity: IntensityLevel;
  count: number;
  details: string[];
}

export interface GoalProgressHeatmapData {
  days: HeatmapDay[];
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

// === Widget Variant ===
export type WidgetVariant = 'compact' | 'detailed' | 'minimal';
