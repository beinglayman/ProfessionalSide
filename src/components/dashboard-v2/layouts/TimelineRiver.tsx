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
import type { WidgetVariant } from '../types';

/** A single node on the timeline. */
interface TimelineNode {
  id: string;
  label: string;
  timestamp: string;
  variant: WidgetVariant;
  render: (variant: WidgetVariant) => ReactNode;
}

/**
 * Timeline order and mock timestamps as specified.
 * Earlier items are "more recent", later items cover broader windows.
 */
const TIMELINE_NODES: TimelineNode[] = [
  {
    id: 'onboarding',
    label: 'Onboarding Journey',
    timestamp: 'Just now',
    variant: 'detailed',
    render: (v) => <OnboardingJourney data={mockOnboarding} variant={v} />,
  },
  {
    id: 'weekly-digest',
    label: 'Weekly Digest',
    timestamp: 'This week',
    variant: 'detailed',
    render: (v) => <WeeklyDigest data={mockWeeklyDigest} variant={v} />,
  },
  {
    id: 'goal-heatmap',
    label: 'Goal Progress Heatmap',
    timestamp: 'Last 7 days',
    variant: 'compact',
    render: (v) => <GoalProgressHeatmap data={mockGoalHeatmap} variant={v} />,
  },
  {
    id: 'kpi-tracker',
    label: 'KPI Tracker',
    timestamp: 'Last 7 days',
    variant: 'detailed',
    render: (v) => <KPITracker data={mockKPIs} variant={v} />,
  },
  {
    id: 'story-health',
    label: 'Story Health Metrics',
    timestamp: 'Last 30 days',
    variant: 'compact',
    render: (v) => <StoryHealthMetrics data={mockStoryHealth} variant={v} />,
  },
  {
    id: 'competency-matrix',
    label: 'Competency Matrix',
    timestamp: 'Last 30 days',
    variant: 'detailed',
    render: (v) => <RoleCompetencyMatrix data={mockCompetencyMatrix} variant={v} />,
  },
  {
    id: 'meetings-to-action',
    label: 'Meetings to Action',
    timestamp: 'Last quarter',
    variant: 'compact',
    render: (v) => <MeetingsToAction data={mockMeetingsToAction} variant={v} />,
  },
  {
    id: 'integration-health',
    label: 'Integration Health',
    timestamp: 'Last quarter',
    variant: 'compact',
    render: (v) => <IntegrationHealth data={mockIntegrations} variant={v} />,
  },
  {
    id: 'peer-engagement',
    label: 'Peer Engagement',
    timestamp: 'Last quarter',
    variant: 'detailed',
    render: (v) => <PeerEngagement data={mockPeerEngagement} variant={v} />,
  },
];

/**
 * Layout 7 — TimelineRiver
 *
 * A vertical chronological layout where each widget is a "node" on a
 * purple timeline running down the left side, reminiscent of a git log.
 * Each node has a circle marker, a timestamp label, and the widget content
 * extending to the right.
 */
export function TimelineRiver() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <h2 className="mb-8 text-2xl font-bold text-gray-900">
        Activity Timeline
      </h2>

      {/* Timeline container */}
      <div className="relative">
        {/* Vertical purple line */}
        <div
          className="absolute left-5 top-0 h-full w-0.5 bg-[#5D259F]/30"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-10">
          {TIMELINE_NODES.map((node, index) => (
            <div key={node.id} className="relative flex items-start gap-6">
              {/* Circle marker on the timeline */}
              <div className="relative z-10 flex flex-shrink-0 flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full border-4 border-white shadow-sm ${
                    index === 0
                      ? 'bg-[#5D259F]'
                      : 'bg-[#5D259F]/70'
                  } flex items-center justify-center`}
                >
                  <div className="h-3 w-3 rounded-full bg-white" />
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 pb-2">
                {/* Timestamp + label header */}
                <div className="mb-2 flex items-baseline gap-3">
                  <span className="rounded-full bg-[#5D259F]/10 px-3 py-0.5 text-xs font-semibold text-[#5D259F]">
                    {node.timestamp}
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                    {node.label}
                  </span>
                </div>

                {/* Widget */}
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                  {node.render(node.variant)}
                </div>
              </div>
            </div>
          ))}

          {/* Terminal dot at bottom of timeline */}
          <div className="relative flex items-start">
            <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-[#5D259F]/40" />
            </div>
            <p className="ml-6 pt-2 text-xs text-gray-400">
              End of timeline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
