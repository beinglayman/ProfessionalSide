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
 * Layout 5 — CompactTiles
 *
 * 4-column uniform tight grid with maximum information density.
 * All widgets render in their compact variant so every metric
 * is visible at a glance without scrolling.
 */
export function CompactTiles() {
  return (
    <div className="min-h-screen bg-gray-50 p-3">
      {/* Onboarding banner — full width, compact */}
      <div className="mb-3">
        <OnboardingJourney data={mockOnboarding} variant="compact" />
      </div>

      {/* 4-column tight grid */}
      <div className="grid grid-cols-4 gap-3">
        {/* Row 1 */}
        <div className="h-full">
          <KPITracker data={mockKPIs} variant="compact" />
        </div>
        <div className="h-full">
          <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="compact" />
        </div>
        <div className="h-full">
          <StoryHealthMetrics data={mockStoryHealth} variant="compact" />
        </div>
        <div className="h-full">
          <IntegrationHealth data={mockIntegrations} variant="compact" />
        </div>

        {/* Row 2 */}
        <div className="h-full">
          <PeerEngagement data={mockPeerEngagement} variant="compact" />
        </div>
        <div className="h-full">
          <WeeklyDigest data={mockWeeklyDigest} variant="compact" />
        </div>
        <div className="h-full">
          <MeetingsToAction data={mockMeetingsToAction} variant="compact" />
        </div>
        <div className="h-full">
          <GoalProgressHeatmap data={mockGoalHeatmap} variant="compact" />
        </div>
      </div>
    </div>
  );
}
