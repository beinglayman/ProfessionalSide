import { BarChart3, PenTool, Share2 } from 'lucide-react';
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
 * KanbanFlow layout
 *
 * 3 vertical lanes: Track / Create / Share.
 * Each lane has a coloured header with title and icon, then stacked cards.
 */
export function KanbanFlow() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Onboarding banner */}
      <section>
        <OnboardingJourney data={mockOnboarding} variant="compact" />
      </section>

      {/* 3-column lane grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lane: Track */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-[#5D259F]/5 px-4 py-3">
            <BarChart3 className="h-5 w-5 text-[#5D259F]" />
            <h2 className="text-sm font-semibold tracking-wide text-[#5D259F] uppercase">
              Track
            </h2>
          </div>
          <KPITracker data={mockKPIs} variant="detailed" />
          <MeetingsToAction data={mockMeetingsToAction} variant="compact" />
          <GoalProgressHeatmap data={mockGoalHeatmap} variant="compact" />
        </div>

        {/* Lane: Create */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3">
            <PenTool className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-semibold tracking-wide text-blue-600 uppercase">
              Create
            </h2>
          </div>
          <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="compact" />
          <StoryHealthMetrics data={mockStoryHealth} variant="compact" />
          <IntegrationHealth data={mockIntegrations} variant="compact" />
        </div>

        {/* Lane: Share */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
            <Share2 className="h-5 w-5 text-green-600" />
            <h2 className="text-sm font-semibold tracking-wide text-green-600 uppercase">
              Share
            </h2>
          </div>
          <WeeklyDigest data={mockWeeklyDigest} variant="detailed" />
          <PeerEngagement data={mockPeerEngagement} variant="detailed" />
        </div>
      </section>
    </div>
  );
}
