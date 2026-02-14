import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
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

  // SVG dimensions — taller viewBox for reasonable scaling
  const width = 560;
  const height = 130;
  const padX = 40;
  const amplitude = 22;
  const midY = 65;
  const pointsPerSegment = 60;

  const milestoneXs = steps.map((_, i) => padX + (i / (steps.length - 1)) * (width - padX * 2));
  const milestoneYs = steps.map((_, i) => {
    const t = i / (steps.length - 1);
    return midY - amplitude * Math.sin(t * Math.PI * 2);
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
        const y = midY - amplitude * Math.sin(t * Math.PI * 2);
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
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#7C3AED] shadow-lg">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-white/70">
            Getting Started: {completedCount}/{steps.length} completed
          </span>
          <button
            onClick={() => toggleMinimized(false)}
            className="text-xs text-white/80 hover:text-white font-medium"
          >
            Expand
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#4C1D95] via-[#5B21B6] to-[#7C3AED] shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-4">
        <div>
          <h3 className="text-base font-semibold text-white">Getting Started</h3>
          <p className="text-xs text-white/60 mt-0.5">Complete each step to unlock your full experience</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/50">
            {completedCount}/{steps.length}
          </span>
          <button
            onClick={() => toggleMinimized(true)}
            className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
            aria-label="Minimize roadmap"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Roadmap SVG */}
      <div className="px-2 pb-1">
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
              stroke={seg.completed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'}
              strokeWidth={1.5}
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

            // Alternate label above/below based on wave position
            const labelAbove = cy >= midY;
            const labelY = labelAbove ? cy - 7 : cy + 9;

            return (
              <g key={step.id} className="cursor-pointer" onClick={() => navigate(step.route)}>
                {/* Label */}
                <text
                  x={cx}
                  y={labelY}
                  textAnchor="middle"
                  fill={isCompleted ? 'rgba(255,255,255,0.85)' : isCurrent ? 'white' : 'rgba(255,255,255,0.35)'}
                  fontSize={6}
                  fontWeight={isCurrent ? 600 : 500}
                  className="select-none"
                >
                  {step.label}
                </text>

                {/* Pulsing ring for current step */}
                {isCurrent && (
                  <circle
                    cx={cx} cy={cy} r={7}
                    fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1}
                    className="animate-ping"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  />
                )}

                {/* Milestone circle */}
                <circle
                  cx={cx} cy={cy}
                  r={isCurrent ? 3.5 : 3}
                  fill={isFuture ? 'rgba(255,255,255,0.15)' : 'white'}
                  stroke={isFuture ? 'rgba(255,255,255,0.3)' : isCompleted ? 'rgba(91,33,182,0.5)' : 'transparent'}
                  strokeWidth={1}
                />

                {/* Checkmark for completed */}
                {isCompleted && (
                  <text x={cx} y={cy + 1.5} textAnchor="middle" fill="#5B21B6" fontSize={5} fontWeight="bold">
                    &#10003;
                  </text>
                )}

                {/* Flag for current */}
                {isCurrent && (
                  <text x={cx} y={cy + 1.5} textAnchor="middle" fill="#5B21B6" fontSize={5}>
                    &#9873;
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* CTA — centered, cohesive */}
      <div className="pb-3 flex flex-col items-center text-center gap-1 px-4">
        <p className="text-xs text-white/70">
          {completedCount >= steps.length - 1 ? (
            <><span className="font-medium text-white">Almost there!</span> {currentStep.description}</>
          ) : (
            <><span className="font-medium text-white">Next:</span> {currentStep.description}</>
          )}
        </p>
        <button
          onClick={() => navigate(currentStep.route)}
          className={cn(
            'text-xs font-medium text-white/90 hover:text-white',
            'bg-white/10 hover:bg-white/20 rounded-full px-4 py-1 transition-colors',
          )}
        >
          {currentStep.label} &rarr;
        </button>
      </div>
    </div>
  );
}
