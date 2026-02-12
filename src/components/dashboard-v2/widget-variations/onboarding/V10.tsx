import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  UserPlus,
  Link2,
  Download,
  BookOpen,
  Share2,
  PenTool,
} from 'lucide-react';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

const stepIcons = [UserPlus, Link2, Download, BookOpen, Share2, PenTool];

export function OnboardingV10() {
  const { steps } = mockOnboarding;
  const completedCount = steps.filter((s) => s.completed).length;
  const initialIndex = steps.findIndex((s) => s.current);
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const activeStep = steps[activeIndex];
  const Icon = stepIcons[activeIndex];

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () => setActiveIndex((i) => Math.min(steps.length - 1, i + 1));

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardContent className="p-6">
        {/* Progress dots */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === activeIndex ? 'w-6 bg-primary-500' : 'w-1.5',
                i !== activeIndex && step.completed && 'bg-primary-300',
                i !== activeIndex && !step.completed && 'bg-gray-200'
              )}
            />
          ))}
        </div>

        {/* Main card area */}
        <div className="flex items-center gap-2">
          {/* Left arrow */}
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className={cn(
              'flex-shrink-0 rounded-full p-1.5 transition-colors',
              activeIndex === 0
                ? 'text-gray-200'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
            aria-label="Previous step"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Step content */}
          <div className="flex-1 text-center">
            {/* Badge */}
            <Badge variant="secondary" className="mb-3">
              Step {activeStep.id} of {steps.length}
            </Badge>

            {/* Icon */}
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
              <Icon className="h-6 w-6 text-primary-600" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900">
              {activeStep.label}
            </h3>

            {/* Description */}
            <p className="mt-1 text-sm text-gray-500">
              {activeStep.description}
            </p>

            {/* CTA */}
            {activeStep.completed ? (
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-600">
                Completed
              </span>
            ) : (
              <button className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Right arrow */}
          <button
            onClick={goNext}
            disabled={activeIndex === steps.length - 1}
            className={cn(
              'flex-shrink-0 rounded-full p-1.5 transition-colors',
              activeIndex === steps.length - 1
                ? 'text-gray-200'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
            aria-label="Next step"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Completed counter */}
        <p className="mt-4 text-center text-xs text-gray-400">
          {completedCount} of {steps.length} steps completed
        </p>
      </CardContent>
    </Card>
  );
}
