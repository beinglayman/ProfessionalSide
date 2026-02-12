import { Check, Circle, Square } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

export function OnboardingV4() {
  const { steps } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Getting Started</CardTitle>
          <Badge variant="secondary">{progressPercent}% done</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1">
          {steps.map((step) => {
            const isCompleted = step.completed;
            const isCurrent = step.current;
            const isFuture = !isCompleted && !isCurrent;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-3 transition-colors',
                  isCurrent && 'border-l-4 border-l-primary-500 bg-primary-50',
                  isCompleted && 'opacity-70',
                  isFuture && 'hover:bg-gray-50'
                )}
              >
                {/* Checkbox */}
                <div className="mt-0.5 flex-shrink-0">
                  {isCompleted && (
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-green-500">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  {isCurrent && (
                    <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-primary-500 bg-primary-100">
                      <Circle className="h-2.5 w-2.5 fill-primary-500 text-primary-500" />
                    </div>
                  )}
                  {isFuture && (
                    <div className="h-5 w-5 rounded border-2 border-gray-300 bg-white" />
                  )}
                </div>

                {/* Step number */}
                <span
                  className={cn(
                    'mt-0.5 flex-shrink-0 text-xs font-semibold',
                    isCompleted && 'text-gray-400',
                    isCurrent && 'text-primary-600',
                    isFuture && 'text-gray-400'
                  )}
                >
                  {step.id}.
                </span>

                {/* Label + description */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm',
                      isCompleted && 'text-gray-500 line-through',
                      isCurrent && 'font-semibold text-primary-800',
                      isFuture && 'text-gray-600'
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-xs',
                      isCompleted && 'text-gray-400',
                      isCurrent && 'text-primary-600',
                      isFuture && 'text-gray-400'
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
