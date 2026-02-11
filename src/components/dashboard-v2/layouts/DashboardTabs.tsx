import { useState } from 'react';
import { BarChart3, TrendingUp, Users, Sparkles } from 'lucide-react';
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

type TabId = 'performance' | 'growth' | 'collaboration' | 'insights';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'growth', label: 'Growth', icon: TrendingUp },
  { id: 'collaboration', label: 'Collaboration', icon: Users },
  { id: 'insights', label: 'Insights', icon: Sparkles },
];

/**
 * DashboardTabs layout (Layout 8)
 *
 * Tabbed interface with 4 views: Performance, Growth, Collaboration, Insights.
 * Onboarding banner persists above the tab bar.
 */
export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('performance');

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Onboarding banner — outside tabs, always visible */}
      <section>
        <OnboardingJourney data={mockOnboarding} />
      </section>

      {/* Tab bar */}
      <nav className="border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-sm font-medium
                  transition-colors duration-150
                  border-b-2 -mb-px
                  ${
                    isActive
                      ? 'text-primary-600 border-primary-500'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab content */}
      <section>
        {activeTab === 'performance' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <KPITracker data={mockKPIs} variant="detailed" />
            <MeetingsToAction data={mockMeetingsToAction} variant="detailed" />
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RoleCompetencyMatrix data={mockCompetencyMatrix} variant="detailed" />
            <GoalProgressHeatmap data={mockGoalHeatmap} variant="detailed" />
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PeerEngagement data={mockPeerEngagement} variant="detailed" />
            <IntegrationHealth data={mockIntegrations} variant="detailed" />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WeeklyDigest data={mockWeeklyDigest} variant="detailed" />
            <StoryHealthMetrics data={mockStoryHealth} variant="detailed" />
          </div>
        )}
      </section>
    </div>
  );
}
