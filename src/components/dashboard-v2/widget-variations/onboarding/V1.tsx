import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

export function OnboardingV1() {
  const [dismissed, setDismissed] = useState(false);
  const { steps, currentStepIndex } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 p-6 text-white shadow-lg">
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <h3 className="text-lg font-semibold">Getting Started</h3>
      <p className="mt-0.5 text-sm text-white/70">
        Complete each step to unlock your full experience
      </p>

      {/* Stepper */}
      <div className="relative mt-8">
        {/* Background line */}
        <div
          className="absolute top-4 h-0.5 bg-white/20"
          style={{ left: '1.25rem', right: '1.25rem' }}
        />
        {/* Progress line */}
        <div
          className="absolute top-4 h-0.5 bg-white transition-all duration-700"
          style={{
            left: '1.25rem',
            width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
            maxWidth: 'calc(100% - 2.5rem)',
          }}
        />

        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = step.completed;
            const isCurrent = step.current;
            return (
              <div key={step.id} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                {isCompleted && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
                    <Check className="h-4 w-4 text-primary-600" strokeWidth={3} />
                  </div>
                )}
                {isCurrent && (
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-white/40" />
                    <span className="relative h-4 w-4 rounded-full bg-white shadow-lg" />
                  </div>
                )}
                {!isCompleted && !isCurrent && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/30">
                    <span className="h-2 w-2 rounded-full bg-white/30" />
                  </div>
                )}
                <span
                  className={cn(
                    'mt-2 text-center text-xs leading-tight',
                    isCompleted && 'font-medium text-white',
                    isCurrent && 'font-semibold text-white',
                    !isCompleted && !isCurrent && 'text-white/50'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-8">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{completedCount} of {steps.length} completed</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
