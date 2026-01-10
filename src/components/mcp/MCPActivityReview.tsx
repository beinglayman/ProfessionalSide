import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  GitPullRequest,
  MessageSquare,
  FileText,
  Palette,
  Users,
  Calendar,
  Link2,
  Sparkles,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface AnalyzedActivity {
  id: string;
  source: string;
  title: string;
  description: string;
  timestamp: string;
  category: string;
  importance: 'high' | 'medium' | 'low';
  skills: string[];
  selected: boolean;
  metadata?: {
    url?: string;
    type?: string;
    participants?: string[];
  };
}

interface ActivityCategory {
  label: string;
  items: AnalyzedActivity[];
  summary: string;
}

interface Correlation {
  id: string;
  source1: { id: string; title: string };
  source2: { id: string; title: string };
  type: string;
  reasoning: string;
}

interface MCPActivityReviewProps {
  activities: {
    categories: ActivityCategory[];
    correlations: Correlation[];
    suggestedTitle?: string;
    contextSummary?: string;
    extractedSkills?: string[];
  };
  onSelectionChange: (selectedIds: string[]) => void;
  onContinue: (selectedActivities: any) => void;
  isProcessing?: boolean;
  className?: string;
}

// Source icons
const sourceIcons: Record<string, React.ReactNode> = {
  github: <GitPullRequest className="h-4 w-4" />,
  jira: <FileText className="h-4 w-4" />,
  figma: <Palette className="h-4 w-4" />,
  outlook: <Calendar className="h-4 w-4" />,
  confluence: <FileText className="h-4 w-4" />,
  slack: <MessageSquare className="h-4 w-4" />,
  teams: <Users className="h-4 w-4" />
};

// Category colors
const categoryColors: Record<string, string> = {
  development: 'bg-blue-100 text-blue-800 border-blue-200',
  design: 'bg-purple-100 text-purple-800 border-purple-200',
  meetings: 'bg-green-100 text-green-800 border-green-200',
  documentation: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  communication: 'bg-pink-100 text-pink-800 border-pink-200',
  planning: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  review: 'bg-orange-100 text-orange-800 border-orange-200'
};

// Importance badges
const importanceBadges = {
  high: { color: 'bg-red-100 text-red-700', label: 'High Impact' },
  medium: { color: 'bg-yellow-100 text-yellow-700', label: 'Medium Impact' },
  low: { color: 'bg-gray-100 text-gray-600', label: 'Low Impact' }
};

export function MCPActivityReview({
  activities,
  onSelectionChange,
  onContinue,
  isProcessing = false,
  className
}: MCPActivityReviewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(activities.categories.map(c => c.label))
  );
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    activities.categories.forEach(category => {
      category.items.forEach(item => {
        if (item.selected) {
          initial.add(item.id);
        }
      });
    });
    return initial;
  });
  const [showCorrelations, setShowCorrelations] = useState(true);

  // Reset state when activities prop changes to prevent stale data
  useEffect(() => {
    setExpandedCategories(new Set(activities.categories.map(c => c.label)));

    const initial = new Set<string>();
    activities.categories.forEach(category => {
      category.items.forEach(item => {
        if (item.selected) {
          initial.add(item.id);
        }
      });
    });
    setSelectedActivities(initial);
  }, [activities]);

  const toggleCategory = (label: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleActivity = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
    onSelectionChange(Array.from(newSelected));
  };

  const toggleCategorySelection = (category: ActivityCategory) => {
    const categoryIds = category.items.map(item => item.id);
    const allSelected = categoryIds.every(id => selectedActivities.has(id));

    const newSelected = new Set(selectedActivities);
    if (allSelected) {
      categoryIds.forEach(id => newSelected.delete(id));
    } else {
      categoryIds.forEach(id => newSelected.add(id));
    }
    setSelectedActivities(newSelected);
    onSelectionChange(Array.from(newSelected));
  };

  const handleContinue = () => {
    const selectedData = {
      categories: activities.categories.map(cat => ({
        ...cat,
        items: cat.items.map(item => ({
          ...item,
          selected: selectedActivities.has(item.id)
        }))
      })),
      correlations: activities.correlations,
      suggestedTitle: activities.suggestedTitle,
      contextSummary: activities.contextSummary,
      extractedSkills: activities.extractedSkills
    };
    onContinue(selectedData);
  };

  const totalActivities = activities.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const selectedCount = selectedActivities.size;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with AI Summary */}
      {activities.contextSummary && (
        <Card className="p-4 bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-primary-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">AI Summary</h3>
              <p className="text-sm text-gray-700">{activities.contextSummary}</p>
              {activities.suggestedTitle && (
                <p className="text-xs text-primary-600 mt-2">
                  Suggested title: "{activities.suggestedTitle}"
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Skills Extracted */}
      {activities.extractedSkills && activities.extractedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">Skills detected:</span>
          {activities.extractedSkills.slice(0, 8).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="text-xs bg-gray-100 text-gray-700"
            >
              {skill}
            </Badge>
          ))}
          {activities.extractedSkills.length > 8 && (
            <Badge variant="outline" className="text-xs">
              +{activities.extractedSkills.length - 8} more
            </Badge>
          )}
        </div>
      )}

      {/* Cross-Tool Correlations */}
      {activities.correlations.length > 0 && (
        <Card className="p-4">
          <button
            onClick={() => setShowCorrelations(!showCorrelations)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center space-x-2">
              <Link2 className="h-4 w-4 text-primary-600" />
              <h3 className="font-medium text-gray-900">
                Cross-Tool Connections ({activities.correlations.length})
              </h3>
            </div>
            {showCorrelations ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {showCorrelations && (
            <div className="mt-3 space-y-2">
              {activities.correlations.slice(0, 3).map((correlation) => (
                <div
                  key={correlation.id}
                  className="flex items-center space-x-2 text-sm p-2 bg-gray-50 rounded"
                >
                  <span className="font-medium text-gray-700">
                    {correlation.source1.title}
                  </span>
                  <span className="text-gray-400">↔</span>
                  <span className="font-medium text-gray-700">
                    {correlation.source2.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs ml-auto bg-white"
                  >
                    {correlation.type}
                  </Badge>
                </div>
              ))}
              {activities.correlations.length > 3 && (
                <p className="text-xs text-gray-500 pl-2">
                  +{activities.correlations.length - 3} more connections
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Activities by Category */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Review Activities ({selectedCount}/{totalActivities} selected)
          </h3>
          <button
            onClick={() => {
              if (selectedCount === totalActivities) {
                setSelectedActivities(new Set());
                onSelectionChange([]);
              } else {
                const allIds = activities.categories.flatMap(cat =>
                  cat.items.map(item => item.id)
                );
                setSelectedActivities(new Set(allIds));
                onSelectionChange(allIds);
              }
            }}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            {selectedCount === totalActivities ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {activities.categories.map((category) => {
          const isExpanded = expandedCategories.has(category.label);
          const categorySelectedCount = category.items.filter(item =>
            selectedActivities.has(item.id)
          ).length;
          const allCategorySelected = category.items.every(item =>
            selectedActivities.has(item.id)
          );

          return (
            <Card key={category.label} className="overflow-hidden">
              <div
                className={cn(
                  'p-3 border-b cursor-pointer transition-colors',
                  isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
                )}
                onClick={() => toggleCategory(category.label)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <h4 className="font-medium text-gray-900 capitalize">
                      {category.label}
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        categoryColors[category.label.toLowerCase()] ||
                          'bg-gray-100 text-gray-700'
                      )}
                    >
                      {category.items.length} items
                    </Badge>
                    {categorySelectedCount > 0 && (
                      <Badge className="text-xs bg-primary-100 text-primary-700">
                        {categorySelectedCount} selected
                      </Badge>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategorySelection(category);
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    {allCategorySelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {category.summary && (
                  <p className="text-sm text-gray-600 mt-2 ml-7">
                    {category.summary}
                  </p>
                )}
              </div>

              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {category.items.map((activity) => {
                    const isSelected = selectedActivities.has(activity.id);

                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          'p-3 transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-primary-50 hover:bg-primary-100'
                            : 'hover:bg-gray-50'
                        )}
                        onClick={() => toggleActivity(activity.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="mt-0.5">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  {sourceIcons[activity.source] || (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  <span className="text-xs text-gray-500 capitalize">
                                    {activity.source}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-xs',
                                      importanceBadges[activity.importance].color
                                    )}
                                  >
                                    {importanceBadges[activity.importance].label}
                                  </Badge>
                                </div>

                                <h5 className="font-medium text-gray-900">
                                  {activity.title}
                                </h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  {activity.description}
                                </p>

                                {activity.skills && activity.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {activity.skills.slice(0, 3).map((skill) => (
                                      <Badge
                                        key={skill}
                                        variant="outline"
                                        className="text-xs bg-white"
                                      >
                                        {skill}
                                      </Badge>
                                    ))}
                                    {activity.skills.length > 3 && (
                                      <span className="text-xs text-gray-500">
                                        +{activity.skills.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {activity.metadata?.url && (
                                  <a
                                    href={activity.metadata.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-1 text-xs text-primary-600 hover:text-primary-700 mt-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Link2 className="h-3 w-3" />
                                    <span>View in {activity.source}</span>
                                  </a>
                                )}
                              </div>

                              <span className="text-xs text-gray-400">
                                {(() => {
                                  try {
                                    const ts = new Date(activity.timestamp);
                                    return !isNaN(ts.getTime()) ? format(ts, 'h:mm a') : '';
                                  } catch {
                                    return '';
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Warning if nothing selected */}
      {selectedCount === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3" role="alert">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Please select at least one activity to include in your journal entry.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-gray-500">
          {selectedCount === 0
            ? 'No activities selected'
            : `${selectedCount} activit${selectedCount !== 1 ? 'ies' : 'y'} will be included`}
        </p>

        <Button
          onClick={handleContinue}
          disabled={selectedCount === 0 || isProcessing}
          className="min-w-[140px] bg-primary-600 hover:bg-primary-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate Entry
              <Sparkles className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default MCPActivityReview;