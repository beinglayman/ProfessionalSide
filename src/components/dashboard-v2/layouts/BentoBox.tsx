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
 * BentoBox layout
 *
 * Modern Apple-style bento grid with mixed card sizes.
 * Uses CSS Grid with col-span / row-span for organic tile arrangement.
 * Gap-3, rounded-2xl cards, playful and modern.
 */
export function BentoBox() {
  return (
    <div className="mx-auto max-w-7xl space-y-3 p-6">
      {/* Onboarding banner */}
      <section>
        <OnboardingJourney data={mockOnboarding} variant="minimal" />
      </section>

      {/* Bento grid */}
      <section className="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI Tracker: col-span-2, row-span-2 */}
        <div className="overflow-hidden rounded-2xl sm:col-span-2 sm:row-span-2">
          <KPITracker data={mockKPIs} variant="detailed" />
        </div>

        {/* Competency Matrix: col-span-2, row-span-2 */}
        <div className="overflow-hidden rounded-2xl sm:col-span-2 sm:row-span-2">
          <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="detailed" />
        </div>

        {/* Integration Health: col-span-2, row-span-1 */}
        <div className="overflow-hidden rounded-2xl sm:col-span-2">
          <IntegrationHealth data={mockIntegrations} variant="compact" />
        </div>

        {/* Peer Engagement: col-span-1, row-span-2 */}
        <div className="overflow-hidden rounded-2xl sm:row-span-2">
          <PeerEngagement data={mockPeerEngagement} variant="compact" />
        </div>

        {/* Story Health: col-span-1, row-span-1 */}
        <div className="overflow-hidden rounded-2xl">
          <StoryHealthMetrics data={mockStoryHealth} variant="minimal" />
        </div>

        {/* Weekly Digest: col-span-2, row-span-1 */}
        <div className="overflow-hidden rounded-2xl sm:col-span-2">
          <WeeklyDigest data={mockWeeklyDigest} variant="compact" />
        </div>

        {/* Meetings-to-Action: col-span-1, row-span-1 */}
        <div className="overflow-hidden rounded-2xl">
          <MeetingsToAction data={mockMeetingsToAction} variant="minimal" />
        </div>

        {/* Goal Heatmap: col-span-3, row-span-1 */}
        <div className="overflow-hidden rounded-2xl sm:col-span-2 lg:col-span-3">
          <GoalProgressHeatmap data={mockGoalHeatmap} variant="compact" />
        </div>
      </section>
    </div>
  );
}
