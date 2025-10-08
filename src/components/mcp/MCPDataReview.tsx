import React, { useState, useMemo } from 'react';
import { Check, X, Clock, Code, GitPullRequest, AlertCircle, ExternalLink, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { MCPSessionNotice } from './MCPPrivacyNotice';
import { MCPToolType } from '../../services/mcp.service';

interface DataItem {
  id: string;
  type: 'commit' | 'pr' | 'issue' | 'file' | 'meeting' | 'page';
  title: string;
  description?: string;
  timestamp?: Date | string;
  url?: string;
  metadata?: Record<string, any>;
}

interface MCPDataReviewProps {
  toolType: MCPToolType;
  data: any;
  sessionId: string;
  expiresAt: string;
  onSelect: (selectedItems: DataItem[]) => void;
  onCancel: () => void;
  onClearSession?: () => void;
}

export const MCPDataReview: React.FC<MCPDataReviewProps> = ({
  toolType,
  data,
  sessionId,
  expiresAt,
  onSelect,
  onCancel,
  onClearSession
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['commits', 'pullRequests']));

  // Parse data based on tool type
  const items = useMemo(() => {
    const allItems: DataItem[] = [];

    if (toolType === MCPToolType.GITHUB && data) {
      // Parse GitHub data
      if (data.commits) {
        data.commits.forEach((commit: any) => {
          allItems.push({
            id: `commit-${commit.sha}`,
            type: 'commit',
            title: commit.message.split('\n')[0],
            description: `Repository: ${commit.repository}`,
            timestamp: commit.timestamp,
            url: commit.url,
            metadata: { sha: commit.sha, author: commit.author }
          });
        });
      }

      if (data.pullRequests) {
        data.pullRequests.forEach((pr: any) => {
          allItems.push({
            id: `pr-${pr.id}`,
            type: 'pr',
            title: `PR #${pr.id}: ${pr.title}`,
            description: `${pr.state} • ${pr.repository}`,
            timestamp: pr.createdAt,
            url: pr.url,
            metadata: { state: pr.state, labels: pr.labels }
          });
        });
      }

      if (data.issues) {
        data.issues.forEach((issue: any) => {
          allItems.push({
            id: `issue-${issue.id}`,
            type: 'issue',
            title: `Issue #${issue.id}: ${issue.title}`,
            description: `${issue.state} • ${issue.repository}`,
            timestamp: issue.createdAt,
            url: issue.url,
            metadata: { state: issue.state, assignee: issue.assignee }
          });
        });
      }
    }

    // Add parsing for other tool types here

    return allItems;
  }, [toolType, data]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Group items by type
  const groupedItems = useMemo(() => {
    const groups: Record<string, DataItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleSelectGroup = (type: string) => {
    const groupItems = groupedItems[type] || [];
    const groupIds = new Set(groupItems.map(item => item.id));
    const allSelected = groupItems.every(item => selectedIds.has(item.id));

    if (allSelected) {
      // Deselect all in group
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        groupIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all in group
      setSelectedIds(prev => new Set([...prev, ...groupIds]));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const selected = items.filter(item => selectedIds.has(item.id));
    onSelect(selected);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'commit':
        return <Code className="h-4 w-4" />;
      case 'pr':
        return <GitPullRequest className="h-4 w-4" />;
      case 'issue':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'commit':
        return 'Commits';
      case 'pr':
        return 'Pull Requests';
      case 'issue':
        return 'Issues';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Review & Select What to Include</h3>
        <MCPSessionNotice
          expiresAt={expiresAt}
          onClear={onClearSession}
        />
        <p className="text-sm text-gray-600">
          This data is temporary. Only items you select will be used in your journal entry.
        </p>
      </div>

      {/* Search and Select All */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
        >
          {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* Data Groups */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto border rounded-lg p-3">
        {Object.entries(groupedItems).map(([type, groupItems]) => {
          const isExpanded = expandedSections.has(type);
          const groupSelected = groupItems.every(item => selectedIds.has(item.id));
          const groupPartiallySelected = groupItems.some(item => selectedIds.has(item.id)) && !groupSelected;

          return (
            <div key={type} className="space-y-2">
              {/* Group Header */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <button
                  onClick={() => toggleSection(type)}
                  className="p-1"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Checkbox
                  checked={groupSelected}
                  indeterminate={groupPartiallySelected}
                  onCheckedChange={() => handleSelectGroup(type)}
                />
                {getTypeIcon(type)}
                <span className="font-medium text-sm">
                  {getTypeLabel(type)} ({groupItems.length})
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {groupItems.filter(item => selectedIds.has(item.id)).length} selected
                </span>
              </div>

              {/* Group Items */}
              {isExpanded && (
                <div className="space-y-1 pl-8">
                  {groupItems.map(item => (
                    <div
                      key={item.id}
                      className={`
                        flex items-start gap-2 p-2 rounded border
                        ${selectedIds.has(item.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {item.description}
                          </div>
                        )}
                        {item.timestamp && (
                          <div className="text-xs text-gray-400">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items found
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-600">
          {selectedIds.size} of {filteredItems.length} items selected
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
          >
            Use Selected Items ({selectedIds.size})
          </Button>
        </div>
      </div>
    </div>
  );
};