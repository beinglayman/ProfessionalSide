/**
 * StoryList Component
 *
 * Displays a list of career stories with selection capability.
 * Shows story title, framework, publish status, and creation date.
 */

import React from 'react';
import { format } from 'date-fns';
import { FileText, CheckCircle2, Clock, Loader2, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CareerStory } from '../../types/career-stories';
import { Button } from '../ui/button';
import { NARRATIVE_FRAMEWORKS } from './constants';

interface StoryListProps {
  stories: CareerStory[];
  selectedStoryId: string | null;
  isLoading: boolean;
  onSelectStory: (story: CareerStory) => void;
}

/**
 * Story card component for the list
 */
function StoryCard({
  story,
  isSelected,
  onClick,
}: {
  story: CareerStory;
  isSelected: boolean;
  onClick: () => void;
}) {
  const frameworkInfo = NARRATIVE_FRAMEWORKS[story.framework];
  const createdDate = story.generatedAt
    ? format(new Date(story.generatedAt), 'MMM d, yyyy')
    : 'Draft';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 border-b border-gray-100 transition-colors',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500',
        isSelected && 'bg-primary-50 border-l-2 border-l-primary-500'
      )}
      data-testid={`story-card-${story.id}`}
      aria-selected={isSelected}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            isSelected ? 'bg-primary-100' : 'bg-gray-100'
          )}
        >
          <FileText
            className={cn(
              'w-4 h-4',
              isSelected ? 'text-primary-600' : 'text-gray-500'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'font-medium truncate',
                isSelected ? 'text-primary-900' : 'text-gray-900'
              )}
            >
              {story.title}
            </h3>
            {story.isPublished && (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
              {frameworkInfo?.name || story.framework}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {createdDate}
            </span>
          </div>

          {/* Activity count */}
          <div className="mt-1 text-xs text-gray-400">
            {story.activityIds.length} activities
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Empty state when no stories exist
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <BookOpen className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No stories yet</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Promote journal entries to career stories from the Journal page to see
        them here.
      </p>
    </div>
  );
}

/**
 * Loading state
 */
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    </div>
  );
}

/**
 * Story list component
 */
export function StoryList({
  stories,
  selectedStoryId,
  isLoading,
  onSelectStory,
}: StoryListProps) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (stories.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="divide-y divide-gray-100"
      role="listbox"
      aria-label="Career Stories"
    >
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          isSelected={selectedStoryId === story.id}
          onClick={() => onSelectStory(story)}
        />
      ))}
    </div>
  );
}
