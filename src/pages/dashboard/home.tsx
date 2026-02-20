import {
  OnboardingRoadmap,
  CompetencyKPIWidget,
  WorkRadarWidget,
  IntegrationHealthWidget,
  MeetingBreakdownWidget,
  StoryHealthWidget,
} from '../../components/dashboard';
import { useAutoSync } from '../../hooks/useAutoSync';
import { SyncStatusIndicator } from '../../components/dashboard/SyncStatusIndicator';

export function DashboardHomePage() {
  const { isSyncing, lastSyncAt } = useAutoSync();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-gray-500">Mindful growth starts with seeing your work.</p>
          <SyncStatusIndicator isSyncing={isSyncing} lastSyncAt={lastSyncAt} />
        </div>
      </div>

      {/* Row 1: Onboarding (full-width, auto-hides when complete) */}
      <OnboardingRoadmap />

      {/* Row 2: Competency / KPI toggle (full-width) */}
      <CompetencyKPIWidget />

      {/* Row 3: Radar + Meeting Breakdown (left) | Integration Health (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <WorkRadarWidget />
          <MeetingBreakdownWidget />
        </div>
        <IntegrationHealthWidget />
      </div>

      {/* Row 4: Story Health (full-width stat cards) */}
      <StoryHealthWidget />
    </div>
  );
}
