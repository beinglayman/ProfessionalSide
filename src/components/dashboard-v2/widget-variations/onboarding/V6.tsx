import {
  Check,
  UserPlus,
  Link2,
  Download,
  BookOpen,
  Share2,
  PenTool,
} from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

const stepIcons = [UserPlus, Link2, Download, BookOpen, Share2, PenTool];

export function OnboardingV6() {
  const { steps } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardContent className="p-5">
        {/* Grid */}
        <div className="grid grid-cols-3 gap-3">
          {steps.map((step, i) => {
            const Icon = stepIcons[i];
            const isCompleted = step.completed;
            const isCurrent = step.current;
            const isFuture = !isCompleted && !isCurrent;

            return (
              <div
                key={step.id}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-xl p-3 transition-all',
                  isCompleted && 'bg-primary-600 text-white shadow-md',
                  isCurrent &&
                    'border-2 border-primary-400 bg-white shadow-[0_0_16px_rgba(93,37,159,0.25)]',
                  isFuture && 'bg-gray-100 text-gray-400'
                )}
              >
                {/* Check overlay for completed */}
                {isCompleted && (
                  <div className="absolute right-1.5 top-1.5">
                    <Check className="h-3.5 w-3.5 text-white/80" strokeWidth={3} />
                  </div>
                )}

                {/* Large number */}
                <span
                  className={cn(
                    'text-2xl font-bold leading-none',
                    isCompleted && 'text-white',
                    isCurrent && 'text-primary-700',
                    isFuture && 'text-gray-300'
                  )}
                >
                  {step.id}
                </span>

                {/* Icon */}
                <Icon
                  className={cn(
                    'mt-1.5 h-4 w-4',
                    isCompleted && 'text-white/80',
                    isCurrent && 'text-primary-500',
                    isFuture && 'text-gray-300'
                  )}
                />

                {/* Label */}
                <span
                  className={cn(
                    'mt-1.5 text-center text-[10px] font-medium leading-tight',
                    isCompleted && 'text-white/90',
                    isCurrent && 'font-semibold text-primary-800',
                    isFuture && 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Full-width progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>{completedCount} of {steps.length} completed</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
