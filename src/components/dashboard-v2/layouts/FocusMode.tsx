import { useState } from 'react';
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

import type { ReactNode } from 'react';

/** A focusable widget descriptor used to drive the sidebar and main panel. */
interface FocusableWidget {
  id: string;
  label: string;
  /** Render the widget at the given variant. */
  render: (variant: 'compact' | 'detailed' | 'minimal') => ReactNode;
}

/**
 * All widgets that can be focused (excludes Onboarding which is always
 * pinned to the top of the left panel).
 */
const WIDGETS: FocusableWidget[] = [
  {
    id: 'kpi-tracker',
    label: 'KPI Tracker',
    render: (v) => <KPITracker data={mockKPIs} variant={v} />,
  },
  {
    id: 'competency-matrix',
    label: 'Competency Matrix',
    render: (v) => <RoleCompetencyMatrix data={mockCompetencyMatrix} variant={v} />,
  },
  {
    id: 'story-health',
    label: 'Story Health',
    render: (v) => <StoryHealthMetrics data={mockStoryHealth} variant={v} />,
  },
  {
    id: 'integration-health',
    label: 'Integration Health',
    render: (v) => <IntegrationHealth data={mockIntegrations} variant={v} />,
  },
  {
    id: 'peer-engagement',
    label: 'Peer Engagement',
    render: (v) => <PeerEngagement data={mockPeerEngagement} variant={v} />,
  },
  {
    id: 'weekly-digest',
    label: 'Weekly Digest',
    render: (v) => <WeeklyDigest data={mockWeeklyDigest} variant={v} />,
  },
  {
    id: 'meetings-to-action',
    label: 'Meetings to Action',
    render: (v) => <MeetingsToAction data={mockMeetingsToAction} variant={v} />,
  },
  {
    id: 'goal-heatmap',
    label: 'Goal Heatmap',
    render: (v) => <GoalProgressHeatmap data={mockGoalHeatmap} variant={v} />,
  },
];

/**
 * Layout 6 — FocusMode
 *
 * 80/20 split layout. The left panel shows the currently focused widget
 * at full detail, while the right sidebar stacks every other widget as
 * clickable minimal thumbnails. Clicking a thumbnail promotes it to focus.
 */
export function FocusMode() {
  const [focusedId, setFocusedId] = useState<string>('kpi-tracker');

  const focusedWidget = WIDGETS.find((w) => w.id === focusedId)!;
  const sidebarWidgets = WIDGETS.filter((w) => w.id !== focusedId);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex gap-4">
        {/* Left panel — 80% */}
        <div className="flex w-4/5 flex-col gap-4">
          {/* Onboarding always pinned at top */}
          <OnboardingJourney data={mockOnboarding} variant="compact" />

          {/* Focused widget — detailed variant */}
          <div className="flex-1">
            {focusedWidget.render('detailed')}
          </div>
        </div>

        {/* Right sidebar — 20% */}
        <aside className="flex w-1/5 flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Widgets
          </h3>

          {sidebarWidgets.map((widget) => (
            <button
              key={widget.id}
              type="button"
              onClick={() => setFocusedId(widget.id)}
              className={`w-full rounded-lg border-2 text-left transition-all hover:shadow-md ${
                widget.id === focusedId
                  ? 'border-[#5D259F] shadow-md'
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="pointer-events-none">
                {widget.render('minimal')}
              </div>
              <p className="px-3 pb-2 text-xs font-medium text-gray-600">
                {widget.label}
              </p>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
