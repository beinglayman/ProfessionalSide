import {
  OnboardingJourney,
  KPITracker,
  RoleCompetencyMatrix,
  StoryHealthMetrics,
  IntegrationHealth,
  PeerEngagement,
  WeeklyDigest,
  MeetingsToAction,
  GoalProgressHeatmap,
} from '../widgets';
import {
  mockOnboarding,
  mockKPIs,
  mockCompetencyMatrix,
  mockStoryHealth,
  mockIntegrations,
  mockPeerEngagement,
  mockWeeklyDigest,
  mockMeetingsToAction,
  mockGoalHeatmap,
} from '../mock-data';

/**
 * AnalyticsDashboard layout
 *
 * Dense 3-column asymmetric grid where charts and graphs dominate.
 * Tight spacing (gap-4), data-dense feel.
 */
export function AnalyticsDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      {/* Onboarding banner */}
      <section>
        <OnboardingJourney data={mockOnboarding} variant="compact" />
      </section>

      {/* 3-column asymmetric grid: 2fr 1fr 1fr */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        {/* Column 1 (large): Competency Matrix + Goal Heatmap stacked */}
        <div className="flex flex-col gap-4">
          <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="detailed" />
          <GoalProgressHeatmap data={mockGoalHeatmap} variant="detailed" />
        </div>

        {/* Column 2: Story Health + Meetings-to-Action stacked */}
        <div className="flex flex-col gap-4">
          <StoryHealthMetrics data={mockStoryHealth} variant="compact" />
          <MeetingsToAction data={mockMeetingsToAction} variant="compact" />
        </div>

        {/* Column 3: KPI Tracker + Integration Health stacked */}
        <div className="flex flex-col gap-4">
          <KPITracker data={mockKPIs} variant="compact" />
          <IntegrationHealth data={mockIntegrations} variant="compact" />
        </div>
      </section>

      {/* 2-column row: Weekly Digest + Peer Engagement */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <WeeklyDigest data={mockWeeklyDigest} variant="compact" />
        <PeerEngagement data={mockPeerEngagement} variant="compact" />
      </section>
    </div>
  );
}
