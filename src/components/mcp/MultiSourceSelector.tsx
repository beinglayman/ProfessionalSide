import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MCPToolType } from '../../types/mcp.types';
import { Checkbox } from '../ui/checkbox';
import { Github } from 'lucide-react';

// Tool configurations with icons and descriptions
const toolConfigs: Record<MCPToolType, {
  name: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  color: string;
  bgColor: string;
}> = {
  github: {
    name: 'GitHub',
    icon: Github,
    description: 'Code contributions, PRs, and issues',
    color: 'text-gray-900',
    bgColor: 'bg-gray-100'
  },
  jira: {
    name: 'Jira',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 11.429H0l5.232-5.232L11.571 0v11.429zM12.429 12.571V24l6.339-6.339L24 12.429H12.429z"/>
      </svg>
    ),
    description: 'Tasks, story points, and sprints',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  figma: {
    name: 'Figma',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z"/>
        <path d="M12 2h3.5a3.5 3.5 0 110 7H12V2z"/>
        <path d="M12 12.5a3.5 3.5 0 117 0 3.5 3.5 0 11-7 0z"/>
        <path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 11-7 0z"/>
        <path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z"/>
      </svg>
    ),
    description: 'Design files, edits, and comments',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  outlook: {
    name: 'Outlook',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
      </svg>
    ),
    description: 'Meetings, emails, and calendar',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100'
  },
  confluence: {
    name: 'Confluence',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 18.5c0-.28.22-.5.5-.5h7c.28 0 .5.22.5.5v3c0 .28-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5v-3zM14 2.5c0-.28.22-.5.5-.5h7c.28 0 .5.22.5.5v3c0 .28-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5v-3z"/>
      </svg>
    ),
    description: 'Documentation and page updates',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  slack: {
    name: 'Slack',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.528 2.528 0 01-2.52-2.521V2.522A2.528 2.528 0 0115.165 0a2.528 2.528 0 012.522 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.528 2.528 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.529 2.529 0 01-2.52-2.523 2.528 2.528 0 012.52-2.52h6.313A2.528 2.528 0 0124 15.165a2.528 2.528 0 01-2.522 2.521h-6.313z"/>
      </svg>
    ),
    description: 'Messages, threads, and discussions',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100'
  },
  teams: {
    name: 'Microsoft Teams',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5 11.5h-3v6h3c1.38 0 2.5-1.12 2.5-2.5v-1c0-1.38-1.12-2.5-2.5-2.5z"/>
        <path d="M9.5 11.5v6c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5v-6h-5z"/>
        <circle cx="14" cy="4.5" r="2"/>
        <circle cx="19.5" cy="8" r="1.5"/>
      </svg>
    ),
    description: 'Meetings, chats, and collaboration',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100'
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
          const IconComponent = config.icon;

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
              <div className={cn('p-2 rounded-md flex-shrink-0', config.bgColor)}>
                <IconComponent className={cn('h-5 w-5', config.color)} />
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
                href="/settings/integrations"
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
