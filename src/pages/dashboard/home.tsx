import {
  OnboardingRoadmap,
  CompetencyKPIWidget,
  IntegrationHealthWidget,
  MeetingBreakdownWidget,
  StoryHealthWidget,
} from '../../components/dashboard';

export function DashboardHomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Your career development at a glance</p>
      </div>

      {/* Row 1: Onboarding (full-width, auto-hides when complete) */}
      <OnboardingRoadmap />

      {/* Row 2: Competency / KPI toggle (full-width) */}
      <CompetencyKPIWidget />

      {/* Row 3: Integration Health + Meeting Breakdown (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IntegrationHealthWidget />
        <MeetingBreakdownWidget />
      </div>

      {/* Row 4: Story Health (full-width stat cards) */}
      <StoryHealthWidget />
    </div>
  );
}
