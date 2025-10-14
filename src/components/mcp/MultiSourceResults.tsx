import React, { useState } from 'react';
import {
  Sparkles,
  GitBranch,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Award,
  BookOpen,
  Users,
  FileText,
  Lightbulb,
  Link2,
  Github
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  OrganizedActivity,
  OrganizedActivityCategory,
  OrganizedActivityItem,
  CrossToolCorrelation,
  MCPToolType
} from '../../types/mcp.types';

// Category icons and colors
const categoryConfig: Record<OrganizedActivityCategory['type'], {
  icon: React.FC<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
}> = {
  achievement: {
    icon: Award,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Achievements'
  },
  learning: {
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Learning & Growth'
  },
  collaboration: {
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Collaboration'
  },
  documentation: {
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Documentation'
  },
  problem_solving: {
    icon: Lightbulb,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'Problem Solving'
  }
};

// Tool type display config
const toolTypeConfig: Record<MCPToolType, { color: string; icon: React.FC<{ className?: string }> }> = {
  github: { color: 'text-gray-900', icon: Github },
  jira: { color: 'text-blue-600', icon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 11.429H0l5.232-5.232L11.571 0v11.429zM12.429 12.571V24l6.339-6.339L24 12.429H12.429z"/>
    </svg>
  )},
  figma: { color: 'text-purple-600', icon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z"/>
      <path d="M12 2h3.5a3.5 3.5 0 110 7H12V2z"/>
    </svg>
  )},
  outlook: { color: 'text-blue-700', icon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>
  )},
  confluence: { color: 'text-blue-600', icon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 18.5c0-.28.22-.5.5-.5h7c.28 0 .5.22.5.5v3c0 .28-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5v-3z"/>
    </svg>
  )},
  slack: { color: 'text-purple-700', icon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165"/>
    </svg>
  )},
  teams: { color: 'text-indigo-700', icon: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="14" cy="4.5" r="2"/>
    </svg>
  )}
};

interface MultiSourceResultsProps {
  organized: OrganizedActivity;
  sessionId: string;
  expiresAt: string;
  onImport: (selectedItems: OrganizedActivityItem[]) => void;
  onCancel: () => void;
  className?: string;
}

export const MultiSourceResults: React.FC<MultiSourceResultsProps> = ({
  organized,
  sessionId,
  expiresAt,
  onImport,
  onCancel,
  className = ''
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(
      organized.categories
        .flatMap(cat => cat.items)
        .filter(item => item.selected)
        .map(item => item.id)
    )
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(organized.categories.map(cat => cat.type))
  );

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleCategoryToggle = (categoryType: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryType)) {
      newExpanded.delete(categoryType);
    } else {
      newExpanded.add(categoryType);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSelectAll = () => {
    const allIds = organized.categories
      .flatMap(cat => cat.items)
      .map(item => item.id);
    setSelectedItems(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleImport = () => {
    const items = organized.categories
      .flatMap(cat => cat.items)
      .filter(item => selectedItems.has(item.id));
    onImport(items);
  };

  const expiresAtDate = new Date(expiresAt);
  const minutesUntilExpiry = Math.floor((expiresAtDate.getTime() - Date.now()) / 1000 / 60);

  return (
    <div className={cn('space-y-6', className)}>
      {/* AI Suggestions Header */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-4 border border-primary-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg">
            <Sparkles className="h-5 w-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              AI-Organized Activity
              <Badge variant="outline" className="bg-white text-xs">
                {organized.suggestedEntryType}
              </Badge>
            </h3>
            <p className="text-sm text-gray-700 mt-1 font-medium">
              {organized.suggestedTitle}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {organized.contextSummary}
            </p>

            {/* Extracted Skills */}
            {organized.extractedSkills && organized.extractedSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {organized.extractedSkills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cross-Tool Correlations */}
      {organized.correlations && organized.correlations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4" />
            Cross-Tool Correlations
            <Badge variant="outline" className="bg-white text-xs">
              {organized.correlations.length}
            </Badge>
          </h4>
          <div className="space-y-2">
            {organized.correlations.map((correlation) => (
              <div
                key={correlation.id}
                className="bg-white rounded-md p-3 border border-blue-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {Math.round(correlation.confidence * 100)}% match
                  </Badge>
                  <span className="text-xs text-gray-500">{correlation.type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">{correlation.source1.title}</span>
                  <GitBranch className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-gray-900">{correlation.source2.title}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{correlation.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            Select items to include
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={selectedItems.size === organized.categories.flatMap(c => c.items).length}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedItems.size === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {organized.categories.map((category) => {
          const config = categoryConfig[category.type];
          const IconComponent = config.icon;
          const isExpanded = expandedCategories.has(category.type);
          const selectedCount = category.items.filter(item =>
            selectedItems.has(item.id)
          ).length;

          return (
            <div
              key={category.type}
              className={cn(
                'border rounded-lg overflow-hidden',
                config.bgColor,
                'border-gray-200'
              )}
            >
              {/* Category Header */}
              <button
                onClick={() => handleCategoryToggle(category.type)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg bg-white')}>
                    <IconComponent className={cn('h-5 w-5', config.color)} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-semibold text-gray-900">
                        {category.label}
                      </h5>
                      <Badge variant="outline" className="bg-white text-xs">
                        {category.items.length}
                      </Badge>
                      {selectedCount > 0 && (
                        <span className="text-xs text-gray-600">
                          ({selectedCount} selected)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {category.summary}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="bg-white border-t border-gray-200 p-3 space-y-2">
                  {category.items.map((item) => {
                    const isSelected = selectedItems.has(item.id);
                    const ToolIcon = toolTypeConfig[item.source]?.icon;
                    const toolColor = toolTypeConfig[item.source]?.color;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-md border transition-all cursor-pointer',
                          isSelected
                            ? 'bg-primary-50 border-primary-200'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        )}
                        onClick={() => handleItemToggle(item.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleItemToggle(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {ToolIcon && (
                              <ToolIcon className={cn('h-3.5 w-3.5', toolColor)} />
                            )}
                            <h6 className="text-sm font-medium text-gray-900 truncate">
                              {item.title}
                            </h6>
                            {item.importance === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                High Priority
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500 capitalize">
                              {item.type}
                            </span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Artifacts Section */}
      {organized.artifacts && organized.artifacts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Key Artifacts
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {organized.artifacts.map((artifact, idx) => (
              <a
                key={idx}
                href={artifact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-white rounded-md border border-gray-200 hover:border-primary-300 transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {artifact.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {artifact.type}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Session Expiry Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        <p className="text-xs text-yellow-700">
          This session expires in <strong>{minutesUntilExpiry} minutes</strong>.
          Data is not saved - import now or it will be discarded.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={selectedItems.size === 0}
          className="bg-primary-600 hover:bg-primary-700"
        >
          Import {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};

export default MultiSourceResults;
