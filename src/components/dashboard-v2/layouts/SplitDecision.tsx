import { BarChart3, Sparkles } from 'lucide-react';
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
 * SplitDecision layout (Layout 10)
 *
 * Two-pane 50/50 split: left = numerical metrics, right = qualitative insights.
 * Full-width onboarding banner at top and shared widgets below the panes.
 */
export function SplitDecision() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Onboarding banner — full width */}
      <section>
        <OnboardingJourney data={mockOnboarding} />
      </section>

      {/* Two-pane split */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left pane — Metrics & Numbers */}
        <div className="space-y-4 border-l-4 border-primary-100 pl-4">
          <div className="flex items-center gap-2 text-gray-700">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Metrics &amp; Performance</h2>
          </div>
          <KPITracker data={mockKPIs} variant="detailed" />
          <MeetingsToAction data={mockMeetingsToAction} variant="compact" />
          <GoalProgressHeatmap data={mockGoalHeatmap} variant="compact" />
        </div>

        {/* Right pane — Insights & Narratives */}
        <div className="space-y-4 rounded-lg bg-primary-50 p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Sparkles className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Insights &amp; Growth</h2>
          </div>
          <WeeklyDigest data={mockWeeklyDigest} variant="detailed" />
          <StoryHealthMetrics data={mockStoryHealth} variant="detailed" />
          <PeerEngagement data={mockPeerEngagement} variant="compact" />
        </div>
      </section>

      {/* Full-width shared widgets below both panes */}
      <section className="space-y-4">
        <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="detailed" />
        <IntegrationHealth data={mockIntegrations} variant="compact" />
      </section>
    </div>
  );
}
