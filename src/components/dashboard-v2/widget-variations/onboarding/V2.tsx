import { Check, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

export function OnboardingV2() {
  const { steps, currentStepIndex } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <CardTitle className="text-lg">Onboarding Journey</CardTitle>
          </div>
          <Badge variant="default">
            {completedCount}/{steps.length}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">
          {progressPercent}% complete -- keep going!
        </p>
      </CardHeader>

      <CardContent>
        <div className="relative ml-4">
          {/* Vertical background line */}
          <div className="absolute bottom-0 left-0 top-0 w-0.5 bg-gray-200" />
          {/* Vertical progress fill */}
          <div
            className="absolute left-0 top-0 w-0.5 bg-primary-500 transition-all duration-700"
            style={{
              height: `${((currentStepIndex + 1) / steps.length) * 100}%`,
            }}
          />

          <div className="space-y-3">
            {steps.map((step, index) => {
              const isCompleted = step.completed;
              const isCurrent = step.current;
              const isFuture = !isCompleted && !isCurrent;

              return (
                <div key={step.id} className="relative pl-8">
                  {/* Dot on timeline */}
                  <div className="absolute -left-[5px] top-3">
                    {isCompleted && (
                      <div className="flex h-3 w-3 items-center justify-center rounded-full bg-green-500 shadow-sm shadow-green-200">
                        <Check className="h-2 w-2 text-white" strokeWidth={3} />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="relative">
                        <span className="absolute -inset-1.5 animate-ping rounded-full bg-primary-300 opacity-40" />
                        <div className="relative h-3 w-3 rounded-full bg-primary-500 shadow-sm shadow-primary-300" />
                      </div>
                    )}
                    {isFuture && (
                      <div className="h-3 w-3 rounded-full border-2 border-gray-300 bg-white" />
                    )}
                  </div>

                  {/* Step content cards */}
                  {isCompleted && (
                    <div className="group flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-gray-500 line-through">
                          {step.label}
                        </span>
                        <p className="text-xs text-gray-400">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                        <p className="text-sm font-semibold text-primary-800">
                          {step.label}
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs text-primary-600">
                        {step.description}
                      </p>
                      <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-primary-700">
                        Continue
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {isFuture && (
                    <div className="rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-300">
                          {index + 1}.
                        </span>
                        <span className="text-sm text-gray-400">
                          {step.label}
                        </span>
                      </div>
                      <p className="ml-5 text-xs text-gray-300">
                        {step.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
