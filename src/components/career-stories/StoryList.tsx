import React from 'react';
import { BookOpen, Loader2 } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  framework?: string;
  activityIds: string[];
  createdAt?: string;
}

interface StoryListProps {
  stories: Story[];
  selectedStoryId: string | null;
  isLoading: boolean;
  onSelectStory: (story: Story) => void;
}

export function StoryList({ stories, selectedStoryId, isLoading, onSelectStory }: StoryListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 p-4">
        <BookOpen className="h-12 w-12 mb-3 text-gray-300" />
        <p className="text-center">No career stories yet</p>
        <p className="text-sm text-center mt-1">Create stories from your journal entries</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Career Stories</h3>
        <p className="text-sm text-gray-500">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</p>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => onSelectStory(story)}
            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
              selectedStoryId === story.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
            }`}
          >
            <h4 className="font-medium text-gray-900 truncate">{story.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              {story.framework && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {story.framework}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {story.activityIds.length} {story.activityIds.length === 1 ? 'activity' : 'activities'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
