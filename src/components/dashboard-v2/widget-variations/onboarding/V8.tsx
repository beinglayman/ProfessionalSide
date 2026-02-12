import { Check, Flag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

export function OnboardingV8() {
  const { steps, currentStepIndex } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;

  // SVG dimensions
  const width = 560;
  const height = 180;
  const padX = 40;
  const padY = 40;
  const amplitude = 40;

  // Calculate milestone X positions equally spaced
  const milestoneXs = steps.map(
    (_, i) => padX + (i / (steps.length - 1)) * (width - padX * 2)
  );

  // Build sine-wave path through milestones
  const pathPoints: string[] = [];
  const segmentCount = 200;
  const midY = height / 2;

  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const x = padX + t * (width - padX * 2);
    const y = midY + amplitude * Math.sin(t * Math.PI * 2);
    pathPoints.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
  }
  const fullPath = pathPoints.join(' ');

  // Y position on the wave for each milestone
  const milestoneYs = steps.map((_, i) => {
    const t = i / (steps.length - 1);
    return midY + amplitude * Math.sin(t * Math.PI * 2);
  });

  // Progress path: fraction along total path
  const progressFraction = currentStepIndex / (steps.length - 1);
  const progressSegments = Math.round(progressFraction * segmentCount);
  const progressPath = pathPoints.slice(0, progressSegments + 1).join(' ');

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Roadmap</CardTitle>
          <span className="text-xs text-gray-500">
            {completedCount} of {steps.length} milestones
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Future path (dashed) */}
          <path
            d={fullPath}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={3}
            strokeDasharray="8 6"
          />
          {/* Progress path (solid purple) */}
          {progressPath && (
            <path
              d={progressPath}
              fill="none"
              stroke="#5D259F"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}

          {/* Milestones */}
          {steps.map((step, i) => {
            const cx = milestoneXs[i];
            const cy = milestoneYs[i];
            const isCompleted = step.completed;
            const isCurrent = step.current;
            const isFuture = !isCompleted && !isCurrent;
            const labelAbove = i % 2 === 0;

            return (
              <g key={step.id}>
                {/* Label */}
                <text
                  x={cx}
                  y={labelAbove ? cy - 22 : cy + 30}
                  textAnchor="middle"
                  className={cn(
                    'text-[11px] font-medium',
                    isCompleted && 'fill-primary-700',
                    isCurrent && 'fill-primary-800 font-semibold',
                    isFuture && 'fill-gray-400'
                  )}
                >
                  {step.label}
                </text>

                {/* Pulsing ring for current */}
                {isCurrent && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={16}
                    fill="none"
                    stroke="#5D259F"
                    strokeWidth={2}
                    opacity={0.3}
                    className="animate-ping"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  />
                )}

                {/* Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isCurrent ? 12 : 10}
                  fill={isFuture ? '#e5e7eb' : '#5D259F'}
                  stroke="white"
                  strokeWidth={3}
                />

                {/* Icon for completed */}
                {isCompleted && (
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    className="fill-white text-[12px] font-bold"
                  >
                    &#10003;
                  </text>
                )}

                {/* Flag for current */}
                {isCurrent && (
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    className="fill-white text-[12px]"
                  >
                    &#9873;
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
