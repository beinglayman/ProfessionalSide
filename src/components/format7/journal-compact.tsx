import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Format7JournalEntry } from './sample-data';
import {
  GithubIcon,
  JiraIcon,
  SlackIcon,
  TeamsIcon,
  FigmaIcon,
  ConfluenceIcon,
} from '../icons/ToolIcons';
import { ChevronDown, ChevronUp, Heart, MessageSquare, Repeat2 } from 'lucide-react';

interface JournalCompactProps {
  entry: Format7JournalEntry;
}

const getToolIcon = (source: string, size = 'w-3.5 h-3.5') => {
  switch (source) {
    case 'github': return <GithubIcon className={size} />;
    case 'jira': return <JiraIcon className={size} />;
    case 'slack': return <SlackIcon className={size} />;
    case 'teams': return <TeamsIcon className={size} />;
    case 'figma': return <FigmaIcon className={size} />;
    case 'confluence': return <ConfluenceIcon className={size} />;
    default: return null;
  }
};

const JournalCompact: React.FC<JournalCompactProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const toggleActivity = (activityId: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev);
      newSet.has(activityId) ? newSet.delete(activityId) : newSet.add(activityId);
      return newSet;
    });
  };

  const excerpt = entry.context.primary_focus.slice(0, 90) + '...';

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500">Journal View: Compact (without Author)</h3>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="text-base font-semibold text-gray-900 flex-1">{entry.entry_metadata.title}</h2>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {new Date(entry.entry_metadata.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3 leading-snug">
            {isExpanded ? entry.context.primary_focus : excerpt}
          </p>

          {/* Inline Metadata */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {Array.from(new Set(entry.activities.map(a => a.source))).slice(0, 4).map(source => (
              <div key={source} className="flex items-center gap-1 text-xs text-gray-600">
                {getToolIcon(source, 'w-3 h-3')}
                <span className="capitalize">{source}</span>
              </div>
            ))}
            <span className="text-gray-300">|</span>
            {entry.summary.technologies_used.slice(0, 2).map(tech => (
              <Badge key={tech} className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs px-1.5 py-0">
                {tech}
              </Badge>
            ))}
          </div>

          {/* Expanded Activities */}
          {isExpanded && (
            <div className="space-y-2 mb-3">
              {entry.activities.map((activity) => {
                const isActivityExpanded = expandedActivities.has(activity.id);
                return (
                  <div key={activity.id} className="border border-gray-200 rounded overflow-hidden">
                    <div
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer text-sm"
                      onClick={() => toggleActivity(activity.id)}
                    >
                      {getToolIcon(activity.source, 'w-4 h-4')}
                      <span className="flex-1 truncate">{activity.action}</span>
                      {isActivityExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                    {isActivityExpanded && (
                      <div className="px-2 pb-2 bg-gray-50 text-xs text-gray-600">{activity.description}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-gray-600 hover:text-purple-600 h-7">
            <Heart className="w-3 h-3 mr-1" />
            Appreciate
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-gray-600 hover:text-purple-600 h-7">
            <MessageSquare className="w-3 h-3 mr-1" />
            Discuss
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-gray-600 hover:text-purple-600 h-7">
            <Repeat2 className="w-3 h-3 mr-1" />
            ReChronicle
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JournalCompact;
