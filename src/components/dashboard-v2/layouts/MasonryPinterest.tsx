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
 * MasonryPinterest layout (Layout 9)
 *
 * 3-column masonry with variable-height cards.
 * Widgets are distributed across columns to balance height,
 * naturally creating a Pinterest-style stagger effect.
 */
export function MasonryPinterest() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Onboarding banner — full width */}
      <section>
        <OnboardingJourney data={mockOnboarding} />
      </section>

      {/* 3-column masonry grid */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <KPITracker data={mockKPIs} variant="detailed" />
          <IntegrationHealth data={mockIntegrations} variant="compact" />
          <GoalProgressHeatmap data={mockGoalHeatmap} />
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="detailed" />
          <WeeklyDigest data={mockWeeklyDigest} variant="detailed" />
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-4">
          <StoryHealthMetrics data={mockStoryHealth} variant="detailed" />
          <PeerEngagement data={mockPeerEngagement} variant="detailed" />
          <MeetingsToAction data={mockMeetingsToAction} variant="compact" />
        </div>
      </section>
    </div>
  );
}
