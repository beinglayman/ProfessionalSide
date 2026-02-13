import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw } from 'lucide-react';

export function TimelineHeaderV5() {
  const [isSyncing, setIsSyncing] = useState(false);

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header container — extra-tall top padding for Notion-style breathing room */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Timeline
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-base text-gray-400 font-light">
          All your workspace activity, automatically organized and always up to
          date
        </p>

        {/* Stats row */}
        <div className="mt-6 flex items-center text-sm text-gray-500">
          <span className="font-semibold text-gray-700">
            {mockHeaderData.activityCount}
          </span>
          <span className="ml-1">activities</span>
          <span className="flex items-center gap-1 ml-2">
            {mockHeaderData.toolSources.map((source) => (
              <SourceIcon
                key={source}
                source={source}
                className="h-3.5 w-3.5 text-gray-400"
              />
            ))}
          </span>

          <span className="text-gray-200 mx-4">|</span>

          <span className="font-semibold text-gray-700">
            {mockHeaderData.draftCount}
          </span>
          <span className="ml-1">drafts</span>

          <span className="text-gray-200 mx-4">|</span>

          <span className="font-semibold text-gray-700">
            {mockHeaderData.promotedCount}
          </span>
          <span className="ml-1">promoted</span>

          <span className="text-gray-200 mx-4">|</span>

          <span>Synced {timeAgo(mockHeaderData.lastSyncAt)}</span>

          <Button
            variant="outline"
            size="sm"
            className="ml-4"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 mr-1.5', isSyncing && 'animate-spin')}
            />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Activity stream body */}
      <MockBody />
    </div>
  );
}
