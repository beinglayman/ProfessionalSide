import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, AlertCircle, Calendar, Loader2, ChevronDown, ChevronUp, XCircle, Building2, Target, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../lib/utils';
import { format, subDays, startOfDay, endOfDay, set } from 'date-fns';
import { useMCPIntegrations, useMCPIntegrationValidation } from '../../hooks/useMCP';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { useWorkspaceGoals, Goal } from '../../hooks/useGoals';
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
  onFetch: (
    selectedTools: string[],
    dateRange: { start: Date; end: Date },
    workspaceInfo: { workspaceId: string; workspaceName: string },
    goalInfo: { linkedGoalId: string | null; markGoalAsComplete: boolean }
  ) => Promise<void>;
  isLoading?: boolean;
  defaultSelected?: string[];
  defaultWorkspaceId?: string;
  className?: string;
}

export function MCPSourceSelector({
  onFetch,
  isLoading = false,
  defaultSelected = [],
  defaultWorkspaceId,
  className
}: MCPSourceSelectorProps) {
  // Use the proper hook instead of manual fetch
  const { data: integrationsData, isLoading: fetchingTools } = useMCPIntegrations();

  // Validate OAuth tokens for connected integrations
  const { data: validationData, isLoading: isValidating } = useMCPIntegrationValidation();

  // Fetch workspaces for tagging
  const { data: workspaces = [], isLoading: loadingWorkspaces } = useWorkspaces();

  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(defaultSelected));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateRangeType, setDateRangeType] = useState<'auto' | 'yesterday' | 'today' | 'custom'>('auto');
  const [customDateRange, setCustomDateRange] = useState({
    start: subDays(new Date(), 1),
    end: new Date()
  });

  // Workspace and goal selection state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(defaultWorkspaceId || '');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [markGoalComplete, setMarkGoalComplete] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);

  // Fetch goals for selected workspace
  const { data: workspaceGoals = [], isLoading: loadingGoals } = useWorkspaceGoals(selectedWorkspaceId);

  // Filter to only show actionable goals (not achieved/cancelled)
  const selectableGoals = useMemo(() =>
    workspaceGoals.filter(g =>
      g.status === 'in-progress' || g.status === 'yet-to-start' || g.status === 'blocked'
    ),
    [workspaceGoals]
  );

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      const firstWorkspace = workspaces[0];
      setSelectedWorkspaceId(firstWorkspace.id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Reset goal selection when workspace changes
  useEffect(() => {
    setSelectedGoalId(null);
    setMarkGoalComplete(false);
  }, [selectedWorkspaceId]);

  // Get selected workspace name
  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
  const selectedGoal = selectableGoals.find(g => g.id === selectedGoalId);

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

  // Helper function to get validation status for a tool
  const getToolValidationStatus = (toolType: string): { status: 'valid' | 'expired' | 'invalid'; error?: string } => {
    return validationData?.validations?.[toolType] || { status: 'valid' };
  };

  // DEBUG: Log the data to understand what's happening
  // Comprehensive logging added to track tool selection and fetch flow
  console.log('[MCPSourceSelector] Raw integrations data:', integrationsData);
  console.log('[MCPSourceSelector] Mapped tools:', tools);
  console.log('[MCPSourceSelector] Connected tools:', tools.filter(t => t.isConnected));
  console.log('[MCPSourceSelector] Validation data:', validationData);

  // Auto-select connected tools with VALID tokens when data loads (only once on initial load)
  useEffect(() => {
    // Only auto-select on initial mount when no tools are selected yet
    if (tools.length > 0 && defaultSelected.length === 0 && selectedTools.size === 0) {
      const validConnectedTools = tools
        .filter((t: MCPTool) => {
          if (!t.isConnected) return false;
          const validation = getToolValidationStatus(t.type);
          return validation.status === 'valid';
        })
        .map((t: MCPTool) => t.type);
      if (validConnectedTools.length > 0) {
        setSelectedTools(new Set(validConnectedTools));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools, validationData]);

  const toggleTool = (toolType: string) => {
    // Prevent toggling tools with expired/invalid tokens
    const validation = getToolValidationStatus(toolType);
    if (validation.status !== 'valid') {
      console.log('[MCPSourceSelector] Cannot toggle tool with invalid token:', toolType, validation);
      return;
    }

    const newSelected = new Set(selectedTools);
    if (newSelected.has(toolType)) {
      newSelected.delete(toolType);
    } else {
      newSelected.add(toolType);
    }
    console.log('[MCPSourceSelector] Tool toggled:', toolType, 'New selection:', Array.from(newSelected));
    setSelectedTools(newSelected);
  };

  const toggleAll = () => {
    // Only toggle tools that are connected AND have valid tokens
    const validConnectedTools = tools.filter(t => {
      if (!t.isConnected) return false;
      const validation = getToolValidationStatus(t.type);
      return validation.status === 'valid';
    });

    if (selectedTools.size === validConnectedTools.length) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(validConnectedTools.map(t => t.type)));
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
    const dateRange = getDateRange();
    console.log('[MCPSourceSelector] ========== FETCH TRIGGERED ==========');
    console.log('[MCPSourceSelector] Selected tools:', selectedToolTypes);
    console.log('[MCPSourceSelector] Date range:', dateRange);
    console.log('[MCPSourceSelector] Date range type:', dateRangeType);
    console.log('[MCPSourceSelector] Workspace:', selectedWorkspaceId, selectedWorkspace?.name);
    console.log('[MCPSourceSelector] Goal:', selectedGoalId, selectedGoal?.title, 'Mark complete:', markGoalComplete);

    if (selectedToolTypes.length === 0) {
      console.log('[MCPSourceSelector] No tools selected, aborting fetch');
      return;
    }

    if (!selectedWorkspaceId || !selectedWorkspace) {
      console.log('[MCPSourceSelector] No workspace selected, aborting fetch');
      return;
    }

    await onFetch(
      selectedToolTypes,
      dateRange,
      { workspaceId: selectedWorkspaceId, workspaceName: selectedWorkspace.name },
      { linkedGoalId: selectedGoalId, markGoalAsComplete: markGoalComplete }
    );
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

  // Separate tools by connection status and validation status
  const connectedTools = tools.filter(t => t.isConnected);
  const disconnectedTools = tools.filter(t => !t.isConnected);

  // Further categorize connected tools by validation status
  const validTools = connectedTools.filter(t => {
    const validation = getToolValidationStatus(t.type);
    return validation.status === 'valid';
  });

  const invalidTools = connectedTools.filter(t => {
    const validation = getToolValidationStatus(t.type);
    return validation.status !== 'valid';
  });

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

      {/* Workspace & Goal Selection */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Tag Entry To</span>
        </div>

        {/* Workspace Dropdown */}
        <div className="space-y-2">
          <label className="text-sm text-gray-600">
            Workspace <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowWorkspaceDropdown(!showWorkspaceDropdown);
                setShowGoalDropdown(false);
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg bg-white',
                'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500',
                !selectedWorkspaceId && 'text-gray-400'
              )}
            >
              <span className="truncate">
                {loadingWorkspaces ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : selectedWorkspace ? (
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary-600" />
                    {selectedWorkspace.name}
                    {selectedWorkspace.organization?.name && (
                      <span className="text-xs text-gray-400">
                        ({selectedWorkspace.organization.name})
                      </span>
                    )}
                  </span>
                ) : (
                  'Select workspace...'
                )}
              </span>
              <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', showWorkspaceDropdown && 'rotate-180')} />
            </button>

            {showWorkspaceDropdown && workspaces.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkspaceId(workspace.id);
                      setShowWorkspaceDropdown(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                      selectedWorkspaceId === workspace.id && 'bg-primary-50 text-primary-700'
                    )}
                  >
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{workspace.name}</span>
                    {workspace.organization?.name && (
                      <span className="text-xs text-gray-400 truncate">
                        ({workspace.organization.name})
                      </span>
                    )}
                    {selectedWorkspaceId === workspace.id && (
                      <CheckCircle2 className="h-4 w-4 ml-auto text-primary-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Goal Dropdown (optional) - only show if workspace has goals */}
        {selectableGoals.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm text-gray-600">
              Link to Goal <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (selectedWorkspaceId) {
                    setShowGoalDropdown(!showGoalDropdown);
                    setShowWorkspaceDropdown(false);
                  }
                }}
                disabled={!selectedWorkspaceId}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg bg-white',
                  'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  !selectedWorkspaceId && 'opacity-50 cursor-not-allowed',
                  !selectedGoalId && 'text-gray-400'
                )}
              >
                <span className="truncate">
                  {loadingGoals ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading goals...
                    </span>
                  ) : selectedGoal ? (
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary-600" />
                      {selectedGoal.title}
                    </span>
                  ) : (
                    'None'
                  )}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', showGoalDropdown && 'rotate-180')} />
              </button>

              {showGoalDropdown && selectedWorkspaceId && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoalId(null);
                      setMarkGoalComplete(false);
                      setShowGoalDropdown(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                      !selectedGoalId && 'bg-primary-50 text-primary-700'
                    )}
                  >
                    <Circle className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span>None</span>
                  </button>

                  {selectableGoals.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        setSelectedGoalId(goal.id);
                        setShowGoalDropdown(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                        selectedGoalId === goal.id && 'bg-primary-50 text-primary-700'
                      )}
                    >
                      <Target className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{goal.title}</span>
                        <span className={cn(
                          'text-xs',
                          goal.status === 'in-progress' && 'text-blue-600',
                          goal.status === 'yet-to-start' && 'text-gray-500',
                          goal.status === 'blocked' && 'text-red-600'
                        )}>
                          {goal.status.replace('-', ' ')} · {goal.progressPercentage || 0}%
                        </span>
                      </div>
                      {selectedGoalId === goal.id && (
                        <CheckCircle2 className="h-4 w-4 ml-auto text-primary-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mark Goal as Complete Checkbox */}
        {selectedGoalId && (
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <Checkbox
              id="markGoalComplete"
              checked={markGoalComplete}
              onCheckedChange={(checked) => setMarkGoalComplete(checked === true)}
            />
            <label
              htmlFor="markGoalComplete"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Mark goal as completed
            </label>
          </div>
        )}
      </div>

      {/* Connected Tools */}
      {connectedTools.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Connected Tools
              {isValidating && (
                <span className="ml-2 text-xs text-gray-500">
                  <Loader2 className="inline h-3 w-3 animate-spin" /> Validating...
                </span>
              )}
            </h4>
            <button
              onClick={toggleAll}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {selectedTools.size === validTools.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="space-y-2">
            {connectedTools.map((tool) => {
              const validation = getToolValidationStatus(tool.type);
              const isToolValid = validation.status === 'valid';
              const isDisabled = !isToolValid;

              return (
                <div
                  key={tool.type}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-all',
                    isDisabled
                      ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                      : 'cursor-pointer',
                    !isDisabled && selectedTools.has(tool.type)
                      ? 'border-primary-300 bg-primary-50'
                      : !isDisabled && 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                  onClick={() => !isDisabled && toggleTool(tool.type)}
                  title={isDisabled ? validation.error || 'This tool is currently unavailable' : ''}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <ToolIcon tool={tool.type as ToolType} size={28} disabled={isDisabled} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          'font-medium',
                          isDisabled ? 'text-gray-600' : 'text-gray-900'
                        )}>
                          {tool.name}
                        </span>
                        {isValidating && !validationData ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : validation.status === 'valid' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : validation.status === 'expired' ? (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <p className={cn(
                        'text-xs',
                        isDisabled ? 'text-red-600 font-medium' : 'text-gray-500'
                      )}>
                        {isDisabled ? (
                          validation.error || 'Token expired - Please reconnect'
                        ) : (() => {
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
                    disabled={isDisabled}
                    onCheckedChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800 mb-2">
              No tools are connected yet. Connect your work tools to import activities.
            </p>
            <Link
              to="/settings/integrations"
              className="inline-flex items-center gap-1 text-sm font-medium text-yellow-900 hover:text-yellow-700 underline"
            >
              Go to Integrations
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Warning Banner for Invalid/Expired Tokens */}
      {invalidTools.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 mb-1">
              {invalidTools.length} tool{invalidTools.length !== 1 ? 's have' : ' has'} expired or invalid tokens
            </p>
            <p className="text-xs text-red-700">
              Please reconnect: {invalidTools.map(t => t.name).join(', ')}
            </p>
            <Link
              to="/settings/integrations"
              className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-600 underline mt-2"
            >
              Reconnect in Settings
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Disconnected Tools (Show as disabled) */}
      {disconnectedTools.length > 0 && connectedTools.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-500">Not Connected</h4>
            <Link
              to="/settings/integrations"
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Connect more tools →
            </Link>
          </div>
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
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">
            {selectedTools.size === 0
              ? 'Select at least one tool'
              : !selectedWorkspaceId
              ? 'Select a workspace'
              : `${selectedTools.size} tool${selectedTools.size !== 1 ? 's' : ''} selected`}
          </p>
          {validTools.length < connectedTools.length && (
            <p className="text-xs text-red-600">
              {invalidTools.length} tool{invalidTools.length !== 1 ? 's' : ''} unavailable (expired tokens)
            </p>
          )}
        </div>

        <Button
          onClick={handleFetch}
          disabled={selectedTools.size === 0 || !selectedWorkspaceId || isLoading}
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