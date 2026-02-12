import { useState } from 'react';
import {
  Check,
  Circle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  UserPlus,
  Link2,
  Download,
  BookOpen,
  Share2,
  PenTool,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/card';
import { cn } from '../../../../lib/utils';
import { mockOnboarding } from '../../mock-data';
import type { OnboardingJourneyData } from '../../types';

const stepIcons = [UserPlus, Link2, Download, BookOpen, Share2, PenTool];

export function OnboardingV7() {
  const { steps } = mockOnboarding;
  const [expandedId, setExpandedId] = useState<number>(
    steps.find((s) => s.current)?.id ?? -1
  );

  const toggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? -1 : id));
  };

  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Setup Guide</CardTitle>
      </CardHeader>

      <CardContent className="space-y-1.5">
        {steps.map((step, i) => {
          const isCompleted = step.completed;
          const isExpanded = expandedId === step.id;
          const Icon = stepIcons[i];

          return (
            <div key={step.id} className="overflow-hidden rounded-lg">
              {/* Collapsed header */}
              <button
                onClick={() => toggle(step.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  isExpanded
                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                )}
              >
                {/* Status icon */}
                {isCompleted ? (
                  <Check
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isExpanded ? 'text-white' : 'text-green-500'
                    )}
                    strokeWidth={3}
                  />
                ) : (
                  <Circle
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isExpanded ? 'text-white/70' : 'text-gray-300'
                    )}
                  />
                )}

                {/* Step number + label */}
                <span
                  className={cn(
                    'flex-1 text-sm font-medium',
                    isExpanded ? 'text-white' : isCompleted ? 'text-gray-500' : 'text-gray-700'
                  )}
                >
                  {step.id}. {step.label}
                </span>

                {/* Chevron */}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-white/70" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="bg-gradient-to-br from-primary-50 to-white px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-500" />
                    <div>
                      <p className="text-sm text-gray-700">{step.description}</p>
                      {!isCompleted && (
                        <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700">
                          Get Started
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {isCompleted && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" strokeWidth={3} />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
