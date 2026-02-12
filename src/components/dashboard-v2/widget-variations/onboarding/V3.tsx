import { cn } from '../../../../lib/utils';
import { Card, CardContent } from '../../../ui/card';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

export function OnboardingV3() {
  const { steps } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = completedCount / steps.length;

  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const center = size / 2;

  // Position dots around the ring
  const dotPositions = steps.map((_, i) => {
    const angle = (i / steps.length) * 2 * Math.PI - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardContent className="flex flex-col items-center px-6 py-6">
        {/* Ring */}
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            {/* Background track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#5D259F"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Milestone dots */}
          <svg
            width={size}
            height={size}
            className="absolute inset-0"
          >
            {steps.map((step, i) => (
              <g key={step.id}>
                {step.current && (
                  <circle
                    cx={dotPositions[i].x}
                    cy={dotPositions[i].y}
                    r={8}
                    fill="#5D259F"
                    opacity={0.3}
                    className="animate-ping"
                    style={{ transformOrigin: `${dotPositions[i].x}px ${dotPositions[i].y}px` }}
                  />
                )}
                <circle
                  cx={dotPositions[i].x}
                  cy={dotPositions[i].y}
                  r={step.current ? 6 : 5}
                  fill={step.completed ? '#5D259F' : step.current ? '#5D259F' : '#d1d5db'}
                  stroke="white"
                  strokeWidth={2}
                />
              </g>
            ))}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">
              {completedCount}/{steps.length}
            </span>
            <span className="text-xs text-gray-500">Complete</span>
          </div>
        </div>

        {/* Step pills */}
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {steps.map((step) => (
            <span
              key={step.id}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                step.completed && 'bg-primary-100 text-primary-700',
                step.current && 'bg-primary-600 text-white',
                !step.completed && !step.current && 'bg-gray-100 text-gray-400'
              )}
            >
              {step.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
