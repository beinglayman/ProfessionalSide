import React from 'react';
import { Clock, Layers, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ActivityViewType = 'timeline' | 'source' | 'story';

interface ActivityViewTabsProps {
  activeView: ActivityViewType;
  onViewChange: (view: ActivityViewType) => void;
  className?: string;
}

const VIEW_TABS = [
  { id: 'timeline' as const, label: 'Timeline', icon: Clock },
  { id: 'source' as const, label: 'By Source', icon: Layers },
  { id: 'story' as const, label: 'By Story', icon: BookOpen },
] as const;

/**
 * Compact tab navigation for activity views
 */
export function ActivityViewTabs({ activeView, onViewChange, className }: ActivityViewTabsProps) {
  return (
    <div
      className={cn(
        'inline-flex bg-gray-100 p-0.5 rounded-lg',
        className
      )}
      role="tablist"
      aria-label="Activity view options"
    >
      {VIEW_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;

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
          </button>
        );
      })}
    </div>
  );
}
