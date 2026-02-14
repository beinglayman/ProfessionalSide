import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { useListCareerStories, usePackets, useSingleDerivations } from '../../hooks/useCareerStories';

interface RoadmapStep {
  id: number;
  label: string;
  description: string;
  completed: boolean;
  route: string;
}

const STORAGE_KEY = 'onboarding-roadmap-minimized';

export function OnboardingRoadmap() {
  const navigate = useNavigate();
  const [minimized, setMinimized] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'true',
  );

  const { data: integrationsData } = useMCPIntegrations();
  const { data: storiesResult } = useListCareerStories();
  const { data: packets } = usePackets();
  const { data: derivations } = useSingleDerivations();

  const stories = (storiesResult as any)?.stories ?? (Array.isArray(storiesResult) ? storiesResult : []);
  const integrations = integrationsData?.integrations ?? [];

  const steps: RoadmapStep[] = useMemo(() => {
    const hasConnection = integrations.some((i) => i.isConnected);

    // "Connect All Tools" — Github + Atlassian + (Google WS or Microsoft)
    const hasGithub = integrations.some((i) => i.toolType === 'github' && i.isConnected);
    const hasAtlassian = integrations.some((i) =>
      ['jira', 'confluence'].includes(i.toolType) && i.isConnected,
    );
    const hasGoogle = integrations.some((i) => i.toolType === 'google_workspace' && i.isConnected);
    const hasMicrosoft = integrations.some((i) =>
      ['outlook', 'teams', 'sharepoint', 'onedrive', 'onenote'].includes(i.toolType) && i.isConnected,
    );
    const hasAllTools = hasGithub && hasAtlassian && (hasGoogle || hasMicrosoft);

    const hasPublished = stories.some((s: any) => s.isPublished);
    const hasExport = (derivations?.length ?? 0) > 0 || (packets?.length ?? 0) > 0;
    const hasNarrative = stories.length >= 2;

    return [
      { id: 1, label: 'Sign Up', description: 'Create your InChronicle account', completed: true, route: '/' },
      { id: 2, label: 'Connect Tool', description: 'Link a work tool to import activity', completed: hasConnection, route: '/settings?tab=integrations' },
      { id: 3, label: 'Connect All Tools', description: 'Connect Github, Atlassian, and a workspace (Google or Microsoft)', completed: hasAllTools, route: '/settings?tab=integrations' },
      { id: 4, label: 'Publish Story', description: 'Create and publish a career story', completed: hasPublished, route: '/stories' },
      { id: 5, label: 'Share Story', description: 'Derive a document or packet from stories', completed: hasExport, route: '/stories' },
      { id: 6, label: 'Create Narrative', description: 'Build a portfolio with multiple stories', completed: hasNarrative, route: '/stories' },
    ];
  }, [integrations, stories, derivations, packets]);

  const currentStepIndex = useMemo(() => {
    const idx = steps.findIndex((s) => !s.completed);
    return idx === -1 ? steps.length - 1 : idx;
  }, [steps]);

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  // SVG dimensions — compact single arch
  const width = 560;
  const height = 70;
  const padX = 36;
  const amplitude = 8;
  const midY = height / 2 + 8; // shift down to leave room for labels above
  const pointsPerSegment = 60;

  const milestoneXs = steps.map((_, i) => padX + (i / (steps.length - 1)) * (width - padX * 2));
  const milestoneYs = steps.map((_, i) => {
    const t = i / (steps.length - 1);
    return midY - amplitude * Math.sin(t * Math.PI);
  });

  // Per-segment paths (5 segments between 6 milestones)
  const segmentPaths = useMemo(() => {
    const result: { d: string; completed: boolean }[] = [];
    for (let seg = 0; seg < steps.length - 1; seg++) {
      const startT = seg / (steps.length - 1);
      const endT = (seg + 1) / (steps.length - 1);
      const points: string[] = [];
      for (let i = 0; i <= pointsPerSegment; i++) {
        const t = startT + (i / pointsPerSegment) * (endT - startT);
        const x = padX + t * (width - padX * 2);
        const y = midY - amplitude * Math.sin(t * Math.PI);
        points.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
      }
      result.push({ d: points.join(' '), completed: steps[seg].completed });
    }
    return result;
  }, [steps]);

  if (allDone) return null;

  const currentStep = steps[currentStepIndex];

  const toggleMinimized = (value: boolean) => {
    setMinimized(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  if (minimized) {
    return (
      <Card className="overflow-hidden rounded-xl">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-gray-500">
            Your Roadmap: {completedCount}/{steps.length} completed
          </span>
          <button
            onClick={() => toggleMinimized(false)}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Expand
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Your Roadmap</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">
              {completedCount}/{steps.length} milestones
            </span>
            <button
              onClick={() => toggleMinimized(true)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Minimize roadmap"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-3 pt-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Per-segment paths */}
          {segmentPaths.map((seg, i) => (
            <path
              key={i}
              d={seg.d}
              fill="none"
              stroke={seg.completed ? '#5D259F' : '#d1d5db'}
              strokeWidth={2}
              strokeDasharray={seg.completed ? 'none' : '6 4'}
              strokeLinecap="round"
            />
          ))}

          {/* Milestones */}
          {steps.map((step, i) => {
            const cx = milestoneXs[i];
            const cy = milestoneYs[i];
            const isCompleted = step.completed;
            const isCurrent = i === currentStepIndex;
            const isFuture = !isCompleted && !isCurrent;

            return (
              <g key={step.id} className="cursor-pointer" onClick={() => navigate(step.route)}>
                {/* Label — always above */}
                <text
                  x={cx}
                  y={cy - 14}
                  textAnchor="middle"
                  className={cn(
                    'text-[9px] font-medium select-none',
                    isCompleted && 'fill-primary-700',
                    isCurrent && 'fill-primary-800 font-semibold',
                    isFuture && 'fill-gray-400',
                  )}
                >
                  {step.label}
                </text>

                {/* Pulsing ring for current step */}
                {isCurrent && (
                  <circle
                    cx={cx} cy={cy} r={10}
                    fill="none" stroke="#5D259F" strokeWidth={1.5} opacity={0.3}
                    className="animate-ping"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  />
                )}

                {/* Milestone circle */}
                <circle
                  cx={cx} cy={cy}
                  r={isCurrent ? 7 : 6}
                  fill={isFuture ? '#e5e7eb' : '#5D259F'}
                  stroke="white" strokeWidth={2}
                />

                {/* Checkmark for completed */}
                {isCompleted && (
                  <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white text-[8px] font-bold">
                    &#10003;
                  </text>
                )}

                {/* Flag for current */}
                {isCurrent && (
                  <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white text-[8px]">
                    &#9873;
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Current step CTA — compact horizontal row */}
        <div className="mt-1 flex items-center justify-between px-4">
          <p className="text-xs text-gray-600">
            {completedCount >= steps.length - 1 ? (
              <><span className="font-medium text-primary-700">Almost there!</span> {currentStep.description}</>
            ) : (
              <><span className="font-medium text-gray-800">Next:</span> {currentStep.description}</>
            )}
          </p>
          <Button size="sm" variant="ghost" className="text-xs text-primary-600 hover:text-primary-700 shrink-0" onClick={() => navigate(currentStep.route)}>
            {currentStep.label} &rarr;
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
