import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw, Activity, FileText, Award } from 'lucide-react';

export function TimelineHeaderV9() {
  const [isSyncing, setIsSyncing] = useState(false);

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        {/* Chip bar */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Timeline</h1>

          <div className="h-5 w-px bg-gray-200" />

          {/* Chip — Activities */}
          <span className="rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs font-medium flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {mockHeaderData.activityCount} Activities
          </span>

          {/* Chip — Drafts */}
          <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-medium flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {mockHeaderData.draftCount} Drafts
          </span>

          {/* Chip — Promoted */}
          <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-medium flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" />
            {mockHeaderData.promotedCount} Promoted
          </span>

          {/* Source icons */}
          <div className="flex items-center gap-1 ml-1">
            {mockHeaderData.toolSources.map((source) => (
              <SourceIcon
                key={source}
                source={source}
                className="h-3.5 w-3.5 text-gray-400"
              />
            ))}
          </div>

          <div className="flex-1" />

          {/* Sync button */}
          <Button size="sm" variant="default" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw
              className={cn('h-3.5 w-3.5 mr-1.5', isSyncing && 'animate-spin')}
            />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>

        {/* Freshness bar */}
        <div className="mt-2">
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-400 transition-all"
              style={{ width: isSyncing ? '100%' : '85%' }}
            />
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            Sync freshness: {isSyncing ? '100' : '85'}% — last synced{' '}
            {timeAgo(mockHeaderData.lastSyncAt)}
          </p>
        </div>
      </div>

      {/* Activity stream body */}
      <div className="pt-4">
        <MockBody />
      </div>
    </div>
  );
}
