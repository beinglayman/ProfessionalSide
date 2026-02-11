import React from 'react';
import { Sparkles, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../../ui/card';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';
import type { WeeklyDigestData, WidgetVariant } from '../types';

interface WeeklyDigestProps {
  data: WeeklyDigestData;
  variant?: WidgetVariant;
}

function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function priorityStyles(priority: 'high' | 'medium' | 'low') {
  switch (priority) {
    case 'high':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'medium':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

export const WeeklyDigest: React.FC<WeeklyDigestProps> = ({
  data,
  variant = 'detailed',
}) => {
  const isMinimal = variant === 'minimal';
  const isCompact = variant === 'compact';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
              <Sparkles className="h-5 w-5 text-primary-500" />
            </div>
            <CardTitle className="text-lg">Weekly Digest</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs font-medium">
            {formatWeekLabel(data.weekOf)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* AI Summary */}
        <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-4">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">
              AI Summary
            </span>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">
            {data.summary}
          </p>
        </div>

        {/* Accomplishments */}
        {!isMinimal && (
          <div>
            <h4 className="mb-2.5 text-sm font-semibold text-gray-900">
              Accomplishments
            </h4>
            <ul className="space-y-2">
              {data.accomplishments.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Stories */}
        {!isMinimal && (
          <div>
            <h4 className="mb-2.5 text-sm font-semibold text-gray-900">
              Suggested Stories
            </h4>
            <div className={cn('grid gap-3', isCompact ? 'grid-cols-1' : 'grid-cols-1')}>
              {data.suggestedStories.map((story, idx) => (
                <div
                  key={idx}
                  className="group rounded-lg border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:border-primary-200 hover:bg-primary-50/30"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-primary-700">
                      {story.title}
                    </p>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-primary-400" />
                  </div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Source:</span>
                    <span className="text-xs font-medium text-gray-600">
                      {story.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          story.confidence >= 80
                            ? 'bg-primary-500'
                            : story.confidence >= 60
                              ? 'bg-primary-300'
                              : 'bg-primary-200'
                        )}
                        style={{ width: `${story.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-gray-500">
                      {story.confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Focus Areas */}
        <div>
          <h4 className="mb-2.5 text-sm font-semibold text-gray-900">
            Focus Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.focusAreas.map((focus, idx) => (
              <div
                key={idx}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                  priorityStyles(focus.priority)
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    focus.priority === 'high' && 'bg-red-500',
                    focus.priority === 'medium' && 'bg-amber-500',
                    focus.priority === 'low' && 'bg-blue-500'
                  )}
                />
                {focus.area}
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => {}}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary-600 active:bg-gray-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
      </CardFooter>
    </Card>
  );
};
