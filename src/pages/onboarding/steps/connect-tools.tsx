import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Check, ExternalLink, Loader2, Clock } from 'lucide-react';
import { useMCPOAuth, useMCPGroupOAuth, useMCPIntegrations } from '../../../hooks/useMCP';
import { MCPToolType } from '../../../services/mcp.service';

interface ConnectToolsProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep?: boolean;
}

interface ToolBucket {
  id: string;
  name: string;
  description: string;
  icon: string;
  toolType?: MCPToolType;
  groupType?: 'atlassian' | 'microsoft';
  subTools: string[];
  comingSoon?: boolean;
}

/** localStorage key for preserving onboarding state across OAuth redirects */
export const ONBOARDING_STORAGE_KEY = 'onboarding-oauth-return';

/**
 * Maps each backend tool type to its onboarding bucket ID.
 * Tools not listed here (figma, slack, zoom) don't have a bucket yet
 * and won't light up any onboarding card if connected via settings.
 */
export const TOOL_TO_BUCKET: Record<string, string> = {
  github: 'github',
  jira: 'atlassian',
  confluence: 'atlassian',
  outlook: 'microsoft',
  teams: 'microsoft',
  onedrive: 'microsoft',
  onenote: 'microsoft',
  sharepoint: 'microsoft',
  google_workspace: 'google',
};

export const TOOL_BUCKETS: ToolBucket[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Pull requests, commits, code reviews, and releases',
    icon: '🐙',
    toolType: MCPToolType.GITHUB,
    subTools: ['PRs', 'Commits', 'Reviews'],
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    description: 'Jira issues, sprints, and Confluence docs',
    icon: '🔷',
    groupType: 'atlassian',
    subTools: ['Jira', 'Confluence'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    description: 'Outlook calendar, Teams messages, and OneDrive files',
    icon: '📧',
    groupType: 'microsoft',
    subTools: ['Outlook', 'Teams', 'OneDrive'],
    comingSoon: true,
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Calendar events and Google Drive activity',
    icon: '🔍',
    toolType: MCPToolType.GOOGLE_WORKSPACE,
    subTools: ['Calendar', 'Drive'],
    comingSoon: true,
  },
];

export function ConnectToolsStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: ConnectToolsProps) {
  const [connectingTool, setConnectingTool] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: integrationData } = useMCPIntegrations();
  const { mutate: initiateOAuth } = useMCPOAuth();
  const { mutate: initiateGroupOAuth } = useMCPGroupOAuth();

  // Determine which buckets have real connections
  const connectedBucketIds = new Set<string>();
  const integrations = integrationData?.integrations ?? [];
  for (const integration of integrations) {
    if (!integration.isConnected) continue;
    const bucketId = TOOL_TO_BUCKET[integration.toolType];
    if (bucketId) connectedBucketIds.add(bucketId);
  }

  const hasRealConnection = connectedBucketIds.size > 0;

  const handleConnectTool = (bucket: ToolBucket) => {
    if (bucket.comingSoon) return;

    setConnectingTool(bucket.id);
    setError('');

    // Save onboarding state before OAuth redirect (page will unload)
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      step: 'connect-tools',
      ts: Date.now(),
    }));

    const callbacks = {
      onSuccess: (data: { authUrl: string }) => { window.location.href = data.authUrl; },
      onError: (err: any) => {
        setError(err.response?.data?.error || `Failed to connect ${bucket.name}`);
        setConnectingTool(null);
      },
    };

    if (bucket.groupType) {
      initiateGroupOAuth({ groupType: bucket.groupType }, callbacks);
    } else if (bucket.toolType) {
      initiateOAuth({ toolType: bucket.toolType }, callbacks);
    }
  };

  const handleFinish = async () => {
    if (!hasRealConnection) {
      setError('Connect at least one tool to continue. InChronicle needs your work activity to create stories.');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate({ connectedTools: Array.from(connectedBucketIds) });
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

      {hasRealConnection && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">
            {connectedBucketIds.size} tool{connectedBucketIds.size > 1 ? 's' : ''} connected — your activity will start appearing on your Timeline.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {TOOL_BUCKETS.map((bucket) => {
          const isConnected = connectedBucketIds.has(bucket.id);
          const isConnecting = connectingTool === bucket.id;
          const isComingSoon = bucket.comingSoon;

          return (
            <div
              key={bucket.id}
              className={`relative flex flex-col gap-2 p-4 rounded-lg border-2 transition-all duration-200 ${
                isConnected
                  ? 'border-green-400 bg-green-50'
                  : isComingSoon
                  ? 'border-gray-100 bg-gray-50 opacity-75'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl flex-shrink-0">{bucket.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{bucket.name}</p>
                    {isComingSoon && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-200 rounded-full">
                        <Clock className="w-2.5 h-2.5" />
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{bucket.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {isConnected ? (
                    <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md">
                      <Check className="w-3 h-3" />
                      Connected
                    </span>
                  ) : isConnecting ? (
                    <div className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Connecting...
                    </div>
                  ) : isComingSoon ? (
                    <span className="px-2.5 py-1.5 text-xs font-medium text-gray-400">
                      &mdash;
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnectTool(bucket)}
                      disabled={connectingTool !== null}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors disabled:opacity-50"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Connect
                    </button>
                  )}
                </div>
              </div>
              {/* Sub-tool chips */}
              <div className="flex flex-wrap gap-1.5 ml-10">
                {bucket.subTools.map((sub) => (
                  <span
                    key={sub}
                    className={`px-2 py-0.5 text-[11px] rounded-full ${
                      isConnected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {sub}
                  </span>
                ))}
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
          disabled={isLoading || !hasRealConnection}
          className="flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Finishing...</span>
            </>
          ) : hasRealConnection ? (
            <span>Get Started</span>
          ) : (
            <span>Connect at least 1 tool to continue</span>
          )}
        </Button>
      </div>
    </div>
  );
}
