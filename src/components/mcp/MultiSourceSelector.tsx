import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MCPToolType } from '../../types/mcp.types';
import { Checkbox } from '../ui/checkbox';
import { ToolIcon, ToolType } from '../icons/ToolIcons';

// Tool configurations with descriptions
const toolConfigs: Record<MCPToolType, {
  name: string;
  description: string;
}> = {
  github: {
    name: 'GitHub',
    description: 'Code contributions, PRs, and issues'
  },
  jira: {
    name: 'Jira',
    description: 'Tasks, story points, and sprints'
  },
  figma: {
    name: 'Figma',
    description: 'Design files, edits, and comments'
  },
  outlook: {
    name: 'Outlook',
    description: 'Meetings, emails, and calendar'
  },
  confluence: {
    name: 'Confluence',
    description: 'Documentation and page updates'
  },
  slack: {
    name: 'Slack',
    description: 'Messages, threads, and discussions'
  },
  teams: {
    name: 'Microsoft Teams',
    description: 'Meetings, chats, and collaboration'
  }
};

interface MCPTool {
  toolType: MCPToolType;
  isConnected: boolean;
  connectedAt?: string;
}

interface MultiSourceSelectorProps {
  availableTools: MCPTool[];
  selectedTools: MCPToolType[];
  onSelectionChange: (tools: MCPToolType[]) => void;
  className?: string;
}

export const MultiSourceSelector: React.FC<MultiSourceSelectorProps> = ({
  availableTools,
  selectedTools,
  onSelectionChange,
  className = ''
}) => {
  const handleToolToggle = (toolType: MCPToolType, isConnected: boolean) => {
    if (!isConnected) return; // Don't allow selecting disconnected tools

    if (selectedTools.includes(toolType)) {
      onSelectionChange(selectedTools.filter(t => t !== toolType));
    } else {
      onSelectionChange([...selectedTools, toolType]);
    }
  };

  const handleSelectAll = () => {
    const connectedTools = availableTools
      .filter(tool => tool.isConnected)
      .map(tool => tool.toolType);
    onSelectionChange(connectedTools);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const connectedCount = availableTools.filter(tool => tool.isConnected).length;
  const selectedCount = selectedTools.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with selection actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Select Sources to Import
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedCount} of {connectedCount} connected tools selected
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            disabled={selectedCount === connectedCount}
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs text-gray-600 hover:text-gray-700 font-medium"
            disabled={selectedCount === 0}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(toolConfigs) as MCPToolType[]).map(toolType => {
          const config = toolConfigs[toolType];
          const tool = availableTools.find(t => t.toolType === toolType);
          const isConnected = tool?.isConnected ?? false;
          const isSelected = selectedTools.includes(toolType);

          return (
            <div
              key={toolType}
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer',
                isConnected && !isSelected && 'bg-white border-gray-200 hover:border-gray-300',
                isConnected && isSelected && 'bg-primary-50 border-primary-300 ring-1 ring-primary-200',
                !isConnected && 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
              )}
              onClick={() => handleToolToggle(toolType, isConnected)}
            >
              {/* Checkbox */}
              <Checkbox
                id={`tool-${toolType}`}
                checked={isSelected}
                disabled={!isConnected}
                onCheckedChange={() => handleToolToggle(toolType, isConnected)}
                className={cn(
                  isSelected && 'bg-primary-600 border-primary-600'
                )}
              />

              {/* Tool icon */}
              <div className="p-2 rounded-md flex-shrink-0 bg-gray-50">
                <ToolIcon tool={toolType as ToolType} size={20} disabled={!isConnected} />
              </div>

              {/* Tool info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`tool-${toolType}`}
                    className={cn(
                      'text-sm font-medium cursor-pointer',
                      isConnected ? 'text-gray-900' : 'text-gray-500'
                    )}
                  >
                    {config.name}
                  </label>
                  {isConnected ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <p className={cn(
                  'text-xs mt-0.5',
                  isConnected ? 'text-gray-600' : 'text-gray-400'
                )}>
                  {config.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* No connected tools message */}
      {connectedCount === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              No tools connected
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Connect at least one tool in{' '}
              <a
                href="/settings?tab=integrations"
                className="underline hover:text-yellow-800"
              >
                Settings → Integrations
              </a>
              {' '}to import work activity.
            </p>
          </div>
        </div>
      )}

      {/* Info notice */}
      {connectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Select multiple tools to let AI automatically correlate your work across platforms
            (e.g., GitHub PR → Jira ticket, design → code).
          </p>
        </div>
      )}
    </div>
  );
};

export default MultiSourceSelector;
