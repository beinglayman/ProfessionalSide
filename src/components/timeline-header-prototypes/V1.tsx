import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { RefreshCw, Clock, X, Activity, FileText, Award, Sparkles } from 'lucide-react';

export function TimelineHeaderV1() {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  function handleSync() {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gradient banner header */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 rounded-xl overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Title + subtitle */}
          <h1 className="text-3xl font-bold text-white">Timeline</h1>
          <p className="text-primary-200 text-sm mt-1">
            All your workspace activity, automatically organized
          </p>

          {/* Stats row + sync area */}
          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
            {/* Stat pills */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Activities pill */}
              <span className="bg-white/15 backdrop-blur-sm text-white rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                {mockHeaderData.activityCount} Activities
                {mockHeaderData.toolSources.map((source) => (
                  <SourceIcon
                    key={source}
                    source={source}
                    className="h-3.5 w-3.5 text-white/70"
                  />
                ))}
              </span>

              {/* Drafts pill */}
              <span className="bg-white/15 backdrop-blur-sm text-white rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {mockHeaderData.draftCount} Drafts
              </span>

              {/* Promoted pill */}
              <span className="bg-white/15 backdrop-blur-sm text-white rounded-full px-3 py-1.5 text-sm flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                {mockHeaderData.promotedCount} Promoted
              </span>
            </div>

            {/* Sync area */}
            <div className="flex items-center gap-3">
              {mockHeaderData.isEnhancing && (
                <span className="text-primary-200 text-xs flex items-center gap-1 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5" />
                  Enhancing...
                </span>
              )}

              <span className="text-primary-200 text-xs">
                Synced {timeAgo(mockHeaderData.lastSyncAt)}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="border border-white/30 text-white bg-white/10 hover:bg-white/20"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw
                  className={cn('h-4 w-4 mr-1.5', syncing && 'animate-spin')}
                />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>

          {/* Dismissable info banner */}
          {!bannerDismissed && (
            <div className="bg-white/10 text-primary-100 text-xs rounded-lg px-4 py-2.5 mt-4 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="flex-1">{mockHeaderData.bannerText}</span>
              <button
                onClick={() => setBannerDismissed(true)}
                className="shrink-0 text-primary-200 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Activity stream body */}
      <div className="mt-6">
        <MockBody />
      </div>
    </div>
  );
}
