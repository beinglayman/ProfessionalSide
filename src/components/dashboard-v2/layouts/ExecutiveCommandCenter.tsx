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
 * ExecutiveCommandCenter layout
 *
 * Single-column, large hero metrics at top, cascading priority cards.
 * Clean spacing, generous padding, executive feel.
 */
export function ExecutiveCommandCenter() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      {/* Onboarding banner — full width */}
      <section>
        <OnboardingJourney data={mockOnboarding} />
      </section>

      {/* KPI Tracker hero card — full width, detailed */}
      <section>
        <KPITracker data={mockKPIs} variant="detailed" />
      </section>

      {/* 2-column row: Weekly Digest + Goal Heatmap */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <WeeklyDigest data={mockWeeklyDigest} variant="detailed" />
        <GoalProgressHeatmap data={mockGoalHeatmap} variant="detailed" />
      </section>

      {/* 2-column row: Story Health + Meetings-to-Action */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <StoryHealthMetrics data={mockStoryHealth} variant="detailed" />
        <MeetingsToAction data={mockMeetingsToAction} variant="detailed" />
      </section>

      {/* Full width: Competency Matrix (detailed) */}
      <section>
        <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="detailed" />
      </section>

      {/* 2-column row: Integration Health + Peer Engagement */}
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <IntegrationHealth data={mockIntegrations} variant="detailed" />
        <PeerEngagement data={mockPeerEngagement} variant="detailed" />
      </section>
    </div>
  );
}
