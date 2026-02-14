import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { useActivities } from '../../hooks/useActivities';
import { useListCareerStories, usePackets, useSingleDerivations } from '../../hooks/useCareerStories';

interface RoadmapStep {
  id: number;
  label: string;
  description: string;
  completed: boolean;
  route: string;
}

export function OnboardingRoadmap() {
  const navigate = useNavigate();

  const { data: integrationsData } = useMCPIntegrations();
  const { data: activitiesData } = useActivities({ limit: 1 });
  const { data: storiesResult } = useListCareerStories();
  const { data: packets } = usePackets();
  const { data: derivations } = useSingleDerivations();

  const stories = (storiesResult as any)?.stories ?? (Array.isArray(storiesResult) ? storiesResult : []);
  const integrations = integrationsData?.integrations ?? [];

  const steps: RoadmapStep[] = useMemo(() => {
    const hasConnection = integrations.some((i) => i.isConnected);
    const activitiesTotal =
      activitiesData && 'pagination' in activitiesData
        ? activitiesData.pagination.total
        : 0;
    const hasActivity = activitiesTotal > 0;
    const hasPublished = stories.some((s: any) => s.isPublished);
    const hasExport = (derivations?.length ?? 0) > 0 || (packets?.length ?? 0) > 0;
    const hasNarrative = stories.length >= 2;

    return [
      { id: 1, label: 'Sign Up', description: 'Create your InChronicle account', completed: true, route: '/' },
      { id: 2, label: 'Connect Tool', description: 'Link a work tool to import activity', completed: hasConnection, route: '/settings?tab=integrations' },
      { id: 3, label: 'Fetch Activity', description: 'Import your first work activities', completed: hasActivity, route: '/timeline' },
      { id: 4, label: 'Publish Story', description: 'Create and publish a career story', completed: hasPublished, route: '/stories' },
      { id: 5, label: 'Export / Share', description: 'Derive a document or packet from stories', completed: hasExport, route: '/stories' },
      { id: 6, label: 'Create Narrative', description: 'Build a portfolio with multiple stories', completed: hasNarrative, route: '/stories' },
    ];
  }, [integrations, activitiesData, stories, derivations, packets]);

  const currentStepIndex = useMemo(() => {
    const idx = steps.findIndex((s) => !s.completed);
    return idx === -1 ? steps.length - 1 : idx;
  }, [steps]);

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  // SVG dimensions (compact)
  const width = 560;
  const height = 90;
  const padX = 40;
  const amplitude = 14;
  const midY = height / 2;
  const segmentCount = 200;

  const milestoneXs = steps.map((_, i) => padX + (i / (steps.length - 1)) * (width - padX * 2));

  const pathPoints: string[] = [];
  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const x = padX + t * (width - padX * 2);
    const y = midY + amplitude * Math.sin(t * Math.PI * 2);
    pathPoints.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
  }
  const fullPath = pathPoints.join(' ');

  const milestoneYs = steps.map((_, i) => {
    const t = i / (steps.length - 1);
    return midY + amplitude * Math.sin(t * Math.PI * 2);
  });

  const progressFraction = currentStepIndex / (steps.length - 1);
  const progressSegments = Math.round(progressFraction * segmentCount);
  const progressPath = pathPoints.slice(0, progressSegments + 1).join(' ');

  if (allDone) return null;

  const currentStep = steps[currentStepIndex];

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Your Roadmap</CardTitle>
          <span className="text-[11px] text-gray-500">
            {completedCount}/{steps.length} milestones
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-3 pt-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Future path (dashed) */}
          <path d={fullPath} fill="none" stroke="#d1d5db" strokeWidth={2} strokeDasharray="6 4" />
          {/* Progress path (solid purple) */}
          {progressPath && (
            <path d={progressPath} fill="none" stroke="#5D259F" strokeWidth={2} strokeLinecap="round" />
          )}

          {/* Milestones */}
          {steps.map((step, i) => {
            const cx = milestoneXs[i];
            const cy = milestoneYs[i];
            const isCompleted = step.completed;
            const isCurrent = i === currentStepIndex;
            const isFuture = !isCompleted && !isCurrent;
            const labelAbove = i % 2 === 0;

            return (
              <g key={step.id}>
                <text
                  x={cx}
                  y={labelAbove ? cy - 14 : cy + 20}
                  textAnchor="middle"
                  className={cn(
                    'text-[9px] font-medium',
                    isCompleted && 'fill-primary-700',
                    isCurrent && 'fill-primary-800 font-semibold',
                    isFuture && 'fill-gray-400'
                  )}
                >
                  {step.label}
                </text>

                {isCurrent && (
                  <circle
                    cx={cx} cy={cy} r={10}
                    fill="none" stroke="#5D259F" strokeWidth={1.5} opacity={0.3}
                    className="animate-ping"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  />
                )}

                <circle
                  cx={cx} cy={cy}
                  r={isCurrent ? 7 : 6}
                  fill={isFuture ? '#e5e7eb' : '#5D259F'}
                  stroke="white" strokeWidth={2}
                />

                {isCompleted && (
                  <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white text-[8px] font-bold">
                    &#10003;
                  </text>
                )}

                {isCurrent && (
                  <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white text-[8px]">
                    &#9873;
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Current step description + CTA */}
        <div className="mt-1 flex flex-col items-center text-center px-4">
          <p className="text-xs text-gray-600">
            {completedCount >= steps.length - 1 ? (
              <><span className="font-medium text-primary-700">Almost there!</span> {currentStep.description}</>
            ) : (
              <><span className="font-medium text-gray-800">Next:</span> {currentStep.description}</>
            )}
          </p>
          <Button size="sm" className="mt-2" onClick={() => navigate(currentStep.route)}>
            {currentStep.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
