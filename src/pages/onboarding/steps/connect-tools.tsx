import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

interface ConnectToolsProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep?: boolean;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'project' | 'code' | 'docs' | 'communication';
}

const AVAILABLE_TOOLS: Tool[] = [
  {
    id: 'jira',
    name: 'Jira',
    description: 'Track project tasks, sprints, and contributions',
    icon: '🔷',
    category: 'project',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Pull requests, commits, and code reviews',
    icon: '🐙',
    category: 'code',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Merge requests, pipelines, and repositories',
    icon: '🦊',
    category: 'code',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Documentation, pages, and knowledge base',
    icon: '📘',
    category: 'docs',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Key messages, threads, and contributions',
    icon: '💬',
    category: 'communication',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Issues, projects, and team activity',
    icon: '⚡',
    category: 'project',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Pages, databases, and team docs',
    icon: '📝',
    category: 'docs',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    description: 'Repositories, pull requests, and pipelines',
    icon: '🪣',
    category: 'code',
  },
];

export function ConnectToolsStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: ConnectToolsProps) {
  const existingConnections = (data.connectedTools as string[]) || [];
  const [connectedTools, setConnectedTools] = useState<Set<string>>(new Set(existingConnections));
  const [connectingTool, setConnectingTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnectTool = async (toolId: string) => {
    setConnectingTool(toolId);
    setError('');

    try {
      // TODO: Replace with actual MCP OAuth flow
      // For now, simulate a connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const updated = new Set(connectedTools);
      updated.add(toolId);
      setConnectedTools(updated);

      // Save connected tools to onboarding data
      await onUpdate({ connectedTools: Array.from(updated) });
    } catch (err) {
      setError(`Failed to connect ${toolId}. Please try again.`);
    } finally {
      setConnectingTool(null);
    }
  };

  const handleDisconnectTool = async (toolId: string) => {
    const updated = new Set(connectedTools);
    updated.delete(toolId);
    setConnectedTools(updated);
    await onUpdate({ connectedTools: Array.from(updated) });
  };

  const handleFinish = async () => {
    if (connectedTools.size === 0) {
      setError('Connect at least one tool to continue. InChronicle needs your work activity to create stories.');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate({ connectedTools: Array.from(connectedTools) });
      await onNext();
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Connect your work tools
        </h2>
        <p className="text-sm text-gray-600 max-w-lg mx-auto">
          InChronicle pulls your activity from tools you already use and turns it into career stories. Connect at least one tool to get started.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {connectedTools.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">
            {connectedTools.size} tool{connectedTools.size > 1 ? 's' : ''} connected — your activity will start appearing on your Timeline.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {AVAILABLE_TOOLS.map((tool) => {
          const isConnected = connectedTools.has(tool.id);
          const isConnecting = connectingTool === tool.id;

          return (
            <div
              key={tool.id}
              className={`relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                isConnected
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-2xl flex-shrink-0">{tool.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{tool.name}</p>
                <p className="text-xs text-gray-500 truncate">{tool.description}</p>
              </div>
              <div className="flex-shrink-0">
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnectTool(tool.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Connected
                  </button>
                ) : isConnecting ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Connecting...
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnectTool(tool.id)}
                    disabled={connectingTool !== null}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors disabled:opacity-50"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>

        <div className="text-center text-xs text-gray-500">
          Step 2 of 2
        </div>

        <Button
          onClick={handleFinish}
          disabled={isLoading || connectedTools.size === 0}
          className="flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Finishing...</span>
            </>
          ) : (
            <span>Get Started</span>
          )}
        </Button>
      </div>
    </div>
  );
}
