import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

export function OnboardingV5() {
  const [dismissed, setDismissed] = useState(false);
  const { steps, currentStepIndex } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const currentStep = steps[currentStepIndex];
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Thin accent gradient at the very top */}
      <div className="h-0.5 bg-gradient-to-r from-primary-600 via-primary-400 to-primary-200" />

      <div className="flex h-12 items-center gap-3 px-4">
        {/* Current step indicator */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
            {currentStepIndex + 1}
          </span>
          <span className="text-xs font-semibold text-primary-700">
            {currentStep?.label}
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px flex-shrink-0 bg-gray-200" />

        {/* Segmented progress bar */}
        <div className="relative flex flex-1 items-center gap-1">
          {steps.map((step, i) => (
            <div key={step.id} className="group relative flex-1">
              {/* Tiny step number above */}
              <span
                className={cn(
                  'absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-medium opacity-0 transition-opacity group-hover:opacity-100',
                  step.completed && 'text-primary-500',
                  step.current && 'text-primary-700',
                  !step.completed && !step.current && 'text-gray-400'
                )}
              >
                {step.label}
              </span>

              {/* Segment bar */}
              <div
                className={cn(
                  'h-2 rounded-sm transition-all duration-500',
                  step.completed && 'bg-primary-500',
                  step.current && 'bg-primary-400 animate-pulse',
                  !step.completed && !step.current && 'bg-gray-200'
                )}
              />

              {/* Dot marker underneath */}
              <div
                className={cn(
                  'mx-auto mt-0.5 h-1 w-1 rounded-full',
                  step.completed && 'bg-primary-400',
                  step.current && 'bg-primary-600',
                  !step.completed && !step.current && 'bg-gray-300'
                )}
              />
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="h-4 w-px flex-shrink-0 bg-gray-200" />

        {/* Counter badge */}
        <Badge variant="secondary" className="flex-shrink-0 text-[10px]">
          {completedCount}/{steps.length}
        </Badge>

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Dismiss onboarding banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
