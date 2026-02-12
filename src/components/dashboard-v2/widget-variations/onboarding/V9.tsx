import { Check } from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

export function OnboardingV9() {
  const { steps, currentStepIndex } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const currentStep = steps[currentStepIndex];
  const progress = completedCount / steps.length;

  // Ring dimensions
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const center = size / 2;

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardContent className="flex gap-0 p-0">
        {/* Left panel */}
        <div className="flex w-2/5 flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-white p-6">
          {/* Progress ring */}
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
            />
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
          {/* Center overlay text */}
          <div className="-mt-[90px] mb-[30px] flex flex-col items-center">
            <span className="text-2xl font-bold text-gray-900">
              {completedCount}/{steps.length}
            </span>
          </div>

          {/* Current step info */}
          {currentStep && (
            <div className="mt-2 text-center">
              <p className="text-sm font-semibold text-primary-700">
                {currentStep.label}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {currentStep.description}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-200" />

        {/* Right panel */}
        <div className="flex w-3/5 flex-col justify-center p-5">
          <div className="space-y-2.5">
            {steps.map((step) => {
              const isCompleted = step.completed;
              const isCurrent = step.current;
              const isFuture = !isCompleted && !isCurrent;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  {/* Step number */}
                  <span
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      isCompleted && 'bg-primary-100 text-primary-700',
                      isCurrent && 'bg-primary-600 text-white',
                      isFuture && 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {step.id}
                  </span>

                  {/* Label */}
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      isCompleted && 'text-gray-500 line-through',
                      isCurrent && 'font-semibold text-gray-900',
                      isFuture && 'text-gray-500'
                    )}
                  >
                    {step.label}
                  </span>

                  {/* Status dot */}
                  <div className="flex-shrink-0">
                    {isCompleted && (
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    )}
                    {isCurrent && (
                      <div className="relative">
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary-400 opacity-50" />
                        <div className="relative h-2.5 w-2.5 rounded-full bg-primary-500" />
                      </div>
                    )}
                    {isFuture && (
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
