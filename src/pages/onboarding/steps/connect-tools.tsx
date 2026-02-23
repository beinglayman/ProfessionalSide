import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Check, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { MCPToolType } from '../../../services/mcp.service';
import { ToolIcon } from '../../../components/icons/ToolIcons';
import {
  ONBOARDING_BUCKETS,
  OnboardingBucket,
  getOnboardingBucketId,
} from '../../../constants/tool-groups';
import { useToolConnections, useOAuthFlow } from '../../../hooks/useToolConnections';

interface ConnectToolsProps {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep?: boolean;
}

/** localStorage key for preserving onboarding state across OAuth redirects */
export const ONBOARDING_STORAGE_KEY = 'onboarding-oauth-return';

/**
 * @deprecated Use getOnboardingBucketId() from constants/tool-groups.ts instead.
 * Kept as a re-export for backward compatibility with existing tests.
 */
export { getOnboardingBucketId as _getOnboardingBucketId };

export function ConnectToolsStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: ConnectToolsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { connectedBucketIds } = useToolConnections();
  const { connectingId, error, setError, handleConnect, handleConnectGroup } = useOAuthFlow();

  const hasRealConnection = connectedBucketIds.size > 0;

  const handleConnectBucket = (bucket: OnboardingBucket) => {
    if (bucket.comingSoon) return;

    // Save onboarding state before OAuth redirect (page will unload)
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      step: 'connect-tools',
      ts: Date.now(),
    }));

    if (bucket.groupId) {
      handleConnectGroup(bucket.groupId);
    } else if (bucket.toolType) {
      handleConnect(bucket.toolType);
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
        {ONBOARDING_BUCKETS.map((bucket) => {
          const isConnected = connectedBucketIds.has(bucket.id);
          const isConnecting = connectingId === bucket.id
            || connectingId === bucket.groupId
            || connectingId === bucket.toolType;
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
                <div className="flex-shrink-0 p-1.5 rounded-lg bg-gray-50">
                  <ToolIcon tool={bucket.iconTool} size={24} />
                </div>
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
                      onClick={() => handleConnectBucket(bucket)}
                      disabled={connectingId !== null}
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
                {bucket.subToolLabels.map((sub) => (
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
