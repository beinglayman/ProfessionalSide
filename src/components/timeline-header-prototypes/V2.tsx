import { useState } from 'react';
import { mockHeaderData, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw, Info } from 'lucide-react';

export function TimelineHeaderV2() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="border-b border-gray-200 pb-6">
          {/* Title + Sync row */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-light text-gray-900">Timeline</h1>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5 mr-1.5', isSyncing && 'animate-spin')}
              />
              Sync
            </Button>
          </div>

          {/* Stats line */}
          <p className="mt-2 text-sm text-gray-400">
            {mockHeaderData.activityCount} activities &middot;{' '}
            {mockHeaderData.draftCount} drafts &middot;{' '}
            {mockHeaderData.promotedCount} promoted &middot; Synced{' '}
            {timeAgo(mockHeaderData.lastSyncAt)}
            <Info
              className="ml-1.5 inline h-3.5 w-3.5 text-gray-300 cursor-help"
              title={mockHeaderData.bannerText}
            />
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="pt-6">
        <MockBody />
      </div>
    </div>
  );
}
