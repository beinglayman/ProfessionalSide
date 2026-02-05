/**
 * StoryViewTabs Component
 *
 * Compact tab navigation for career story views.
 * Matches the style of ActivityViewTabs for consistency.
 */

import React from 'react';
import { FileText, CheckCircle2, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type StoryViewType = 'all' | 'published' | 'drafts';

interface StoryViewTabsProps {
  activeView: StoryViewType;
  onViewChange: (view: StoryViewType) => void;
  counts?: {
    all: number;
    published: number;
    drafts: number;
  };
  className?: string;
}

const VIEW_TABS = [
  { id: 'all' as const, label: 'All', icon: FileText },
  { id: 'published' as const, label: 'Published', icon: CheckCircle2 },
  { id: 'drafts' as const, label: 'Drafts', icon: Edit3 },
] as const;

/**
 * Compact tab navigation for story views
 */
export function StoryViewTabs({
  activeView,
  onViewChange,
  counts,
  className,
}: StoryViewTabsProps) {
  return (
    <div
      className={cn(
        'inline-flex bg-gray-100 p-0.5 rounded-lg',
        className
      )}
      role="tablist"
      aria-label="Story view options"
    >
      {VIEW_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        const count = counts?.[tab.id];

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
