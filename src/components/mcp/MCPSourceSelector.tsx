import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, AlertCircle, Calendar, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../lib/utils';
import { format, subDays, startOfDay, endOfDay, set } from 'date-fns';
import { useMCPIntegrations } from '../../hooks/useMCP';
import { ToolIcon, getToolDisplayName, getToolDescription, type ToolType } from '../icons/ToolIcons';

interface MCPTool {
  type: string;
  name: string;
  description: string;
  isConnected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
}

interface MCPSourceSelectorProps {
  onFetch: (selectedTools: string[], dateRange: { start: Date; end: Date }) => Promise<void>;
  isLoading?: boolean;
  defaultSelected?: string[];
  className?: string;
}

export function MCPSourceSelector({
  onFetch,
  isLoading = false,
  defaultSelected = [],
  className
}: MCPSourceSelectorProps) {
  // Use the proper hook instead of manual fetch
  const { data: integrationsData, isLoading: fetchingTools } = useMCPIntegrations();

  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(defaultSelected));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateRangeType, setDateRangeType] = useState<'auto' | 'yesterday' | 'today' | 'custom'>('auto');
  const [customDateRange, setCustomDateRange] = useState({
    start: subDays(new Date(), 1),
    end: new Date()
  });

  // Convert integrations data to tools format (memoized to prevent unnecessary re-renders)
  const tools: MCPTool[] = useMemo(() =>
    integrationsData?.integrations?.map((integration: any) => ({
      type: integration.toolType,
      name: integration.name || getToolDisplayName(integration.toolType as ToolType) || integration.toolType,
      description: integration.description || getToolDescription(integration.toolType as ToolType) || '',
      isConnected: integration.isConnected, // Fixed: use isConnected instead of isActive
      connectedAt: integration.connectedAt,
      lastSyncAt: integration.lastSyncAt
    })) || [],
    [integrationsData]
  );

  // DEBUG: Log the data to understand what's happening
  console.log('[MCPSourceSelector] Raw integrations data:', integrationsData);
  console.log('[MCPSourceSelector] Mapped tools:', tools);
  console.log('[MCPSourceSelector] Connected tools:', tools.filter(t => t.isConnected));

  // Auto-select connected tools when data loads (only once on initial load)
  useEffect(() => {
    // Only auto-select on initial mount when no tools are selected yet
    if (tools.length > 0 && defaultSelected.length === 0 && selectedTools.size === 0) {
      const connectedTools = tools
        .filter((t: MCPTool) => t.isConnected)
        .map((t: MCPTool) => t.type);
      if (connectedTools.length > 0) {
        setSelectedTools(new Set(connectedTools));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools]);

  const toggleTool = (toolType: string) => {
    const newSelected = new Set(selectedTools);
    if (newSelected.has(toolType)) {
      newSelected.delete(toolType);
    } else {
      newSelected.add(toolType);
    }
    setSelectedTools(newSelected);
  };

  const toggleAll = () => {
    const connectedTools = tools.filter(t => t.isConnected);
    if (selectedTools.size === connectedTools.length) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(connectedTools.map(t => t.type)));
    }
  };

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const currentHour = now.getHours();

    switch (dateRangeType) {
      case 'auto':
        // Before 5 PM: get yesterday's work
        // After 5 PM: get today's work
        if (currentHour < 17) {
          const yesterday = subDays(now, 1);
          return {
            start: startOfDay(yesterday),
            end: endOfDay(yesterday)
          };
        } else {
          return {
            start: startOfDay(now),
            end: now
          };
        }

      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };

      case 'today':
        return {
          start: startOfDay(now),
          end: now
        };

      case 'custom':
        return customDateRange;

      default:
        return {
          start: startOfDay(now),
          end: now
        };
    }
  };

  const handleFetch = async () => {
    const selectedToolTypes = Array.from(selectedTools);
    console.log('[MCPSourceSelector] Selected tools:', selectedToolTypes);
    if (selectedToolTypes.length === 0) {
      return;
    }

    const dateRange = getDateRange();
    await onFetch(selectedToolTypes, dateRange);
  };

  const getDateRangeLabel = () => {
    try {
      const range = getDateRange();
      const now = new Date();
      const currentHour = now.getHours();

      // Validate dates before formatting
      if (!range.start || !range.end || isNaN(range.start.getTime()) || isNaN(range.end.getTime())) {
        return 'Invalid date range';
      }

      switch (dateRangeType) {
        case 'auto':
          if (currentHour < 17) {
            return `Yesterday (${format(range.start, 'MMM d')})`;
          } else {
            return `Today (${format(range.start, 'MMM d')})`;
          }
        case 'yesterday':
          return `Yesterday (${format(range.start, 'MMM d')})`;
        case 'today':
          return `Today (${format(range.start, 'MMM d')})`;
        case 'custom':
          return `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d')}`;
        default:
          return '';
      }
    } catch (error) {
      console.error('[MCPSourceSelector] Date formatting error:', error);
      return 'Date unavailable';
    }
  };

  if (fetchingTools) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  const connectedTools = tools.filter(t => t.isConnected);
  const disconnectedTools = tools.filter(t => !t.isConnected);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Select Data Sources</h3>
        <p className="text-sm text-gray-600">
          Choose which connected tools to pull your work activities from
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Time Period</span>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <span>{showAdvanced ? 'Hide' : 'Show'} options</span>
            {showAdvanced ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="dateRange"
                value="auto"
                checked={dateRangeType === 'auto'}
                onChange={(e) => setDateRangeType(e.target.value as any)}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">
                <span className="font-medium">Auto-detect</span>
                <span className="text-gray-500 ml-1">({getDateRangeLabel()})</span>
              </span>
            </label>
          </div>

          {showAdvanced && (
            <>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateRange"
                    value="yesterday"
                    checked={dateRangeType === 'yesterday'}
                    onChange={(e) => setDateRangeType(e.target.value as any)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Yesterday</span>
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateRange"
                    value="today"
                    checked={dateRangeType === 'today'}
                    onChange={(e) => setDateRangeType(e.target.value as any)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Today</span>
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dateRange"
                    value="custom"
                    checked={dateRangeType === 'custom'}
                    onChange={(e) => setDateRangeType(e.target.value as any)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Custom range</span>
                </label>
              </div>

              {dateRangeType === 'custom' && (
                <div className="flex items-center space-x-2 ml-6">
                  <input
                    type="date"
                    value={customDateRange.start && !isNaN(customDateRange.start.getTime())
                      ? format(customDateRange.start, 'yyyy-MM-dd')
                      : ''}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setCustomDateRange({
                          ...customDateRange,
                          start: newDate
                        });
                      }
                    }}
                    className="text-sm border rounded px-2 py-1"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="date"
                    value={customDateRange.end && !isNaN(customDateRange.end.getTime())
                      ? format(customDateRange.end, 'yyyy-MM-dd')
                      : ''}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setCustomDateRange({
                          ...customDateRange,
                          end: newDate
                        });
                      }
                    }}
                    className="text-sm border rounded px-2 py-1"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Connected Tools */}
      {connectedTools.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Connected Tools</h4>
            <button
              onClick={toggleAll}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {selectedTools.size === connectedTools.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="space-y-2">
            {connectedTools.map((tool) => (
              <div
                key={tool.type}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                  selectedTools.has(tool.type)
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
                onClick={() => toggleTool(tool.type)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <ToolIcon tool={tool.type as ToolType} size={28} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{tool.name}</span>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        if (!tool.lastSyncAt) return 'Connected, never synced';
                        try {
                          const syncDate = new Date(tool.lastSyncAt);
                          if (isNaN(syncDate.getTime())) return 'Connected, never synced';
                          return `Last synced ${format(syncDate, 'MMM d, h:mm a')}`;
                        } catch {
                          return 'Connected, never synced';
                        }
                      })()}
                    </p>
                  </div>
                </div>

                <Checkbox
                  checked={selectedTools.has(tool.type)}
                  onCheckedChange={() => {}}
                  onClick={(e) => e.stopPropagation()}
                  className="pointer-events-none"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            No tools are connected yet. Please connect at least one tool from Settings → Integrations.
          </p>
        </div>
      )}

      {/* Disconnected Tools (Show as disabled) */}
      {disconnectedTools.length > 0 && connectedTools.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-500">Not Connected</h4>
          <div className="space-y-2 opacity-60">
            {disconnectedTools.map((tool) => (
              <div
                key={tool.type}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <ToolIcon tool={tool.type as ToolType} size={28} disabled />
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{tool.name}</span>
                    <p className="text-xs text-gray-400">Not connected</p>
                  </div>
                </div>
                <Circle className="h-5 w-5 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-gray-500">
          {selectedTools.size === 0
            ? 'Select at least one tool'
            : `${selectedTools.size} tool${selectedTools.size !== 1 ? 's' : ''} selected`}
        </p>

        <Button
          onClick={handleFetch}
          disabled={selectedTools.size === 0 || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fetching...
            </>
          ) : (
            'Fetch Activities'
          )}
        </Button>
      </div>
    </div>
  );
}

export default MCPSourceSelector;