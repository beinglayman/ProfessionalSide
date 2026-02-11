import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { OnboardingJourneyData, WidgetVariant } from '../types';

interface OnboardingJourneyProps {
  data: OnboardingJourneyData;
  variant?: WidgetVariant;
}

export function OnboardingJourney({ data, variant = 'detailed' }: OnboardingJourneyProps) {
  const [dismissed, setDismissed] = useState(data.dismissed);

  if (dismissed) return null;

  const { steps, currentStepIndex } = data;
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const currentStep = steps[currentStepIndex];

  if (variant === 'minimal') {
    return (
      <div className="relative rounded-lg border border-primary-100 bg-gradient-to-r from-primary-50 to-white px-4 py-3">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Dismiss onboarding"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <div className="flex items-center gap-1">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={cn(
                  'h-2 w-2 rounded-full',
                  step.completed && 'bg-primary-500',
                  step.current && 'bg-primary-400 animate-pulse',
                  !step.completed && !step.current && 'bg-gray-200'
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-gray-600">
            {completedCount}/{steps.length} complete
          </span>
          {currentStep && (
            <span className="text-xs text-primary-600">
              Next: {currentStep.label}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50 via-primary-50/50 to-white">
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/80 hover:text-gray-600"
        aria-label="Dismiss onboarding"
      >
        <X className="h-4 w-4" />
      </button>

      <div className={cn('px-6 pt-5', variant === 'compact' ? 'pb-4' : 'pb-5')}>
        {/* Header */}
        <div className="mb-1">
          <h3 className="text-sm font-semibold text-gray-900">
            Welcome to InChronicle
          </h3>
          <p className="text-xs text-gray-500">
            Complete these steps to get the most out of your experience
          </p>
        </div>

        {/* Stepper */}
        <div className={cn('relative mt-5', variant === 'compact' ? 'mt-4' : 'mt-6')}>
          {/* Connection line (background) */}
          <div className="absolute left-0 right-0 top-4 z-0 mx-auto h-0.5 bg-gray-200" style={{ width: `calc(100% - 2rem)`, left: '1rem' }} />

          {/* Connection line (progress fill) */}
          <div
            className="absolute top-4 z-[1] h-0.5 bg-primary-500 transition-all duration-700 ease-out"
            style={{
              left: '1rem',
              width: steps.length > 1
                ? `${(currentStepIndex / (steps.length - 1)) * 100}%`
                : '0%',
              maxWidth: `calc(100% - 2rem)`,
            }}
          />

          {/* Steps */}
          <div className="relative z-[2] flex justify-between">
            {steps.map((step, index) => {
              const isCompleted = step.completed;
              const isCurrent = step.current;
              const isFuture = !isCompleted && !isCurrent;

              return (
                <div key={step.id} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                  {/* Circle */}
                  <div className="relative">
                    {isCompleted && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 shadow-sm shadow-primary-200">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="relative flex h-8 w-8 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-300 opacity-40" />
                        <span className="absolute inline-flex h-6 w-6 animate-pulse rounded-full bg-primary-200 opacity-60" />
                        <span className="relative h-4 w-4 rounded-full bg-primary-500 shadow-md shadow-primary-300" />
                      </div>
                    )}
                    {isFuture && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
                        <span className="h-2 w-2 rounded-full bg-gray-200" />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'mt-2 text-center text-xs font-medium leading-tight',
                      isCompleted && 'text-primary-600',
                      isCurrent && 'text-primary-700 font-semibold',
                      isFuture && 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>

                  {/* Description (only for current step, only in detailed variant) */}
                  {isCurrent && variant === 'detailed' && (
                    <span className="mt-0.5 max-w-[120px] text-center text-[10px] leading-tight text-primary-500">
                      {step.description}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom progress bar */}
        <div className={cn('mt-5', variant === 'compact' && 'mt-3')}>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>{completedCount} of {steps.length} steps completed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
