import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { RefreshCw, Clock, X, Activity, FileText, Award, Home, ChevronRight, Sparkles } from 'lucide-react';

export function TimelineHeaderV7() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-4">
        {/* Line 1 — Breadcrumb row */}
        <div className="flex items-center justify-between">
          {/* Left: breadcrumb */}
          <nav className="text-sm text-gray-500 flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span>Home</span>
            <ChevronRight className="h-3 w-3 text-gray-300" />
            <span className="font-medium text-gray-700">Timeline</span>
          </nav>

          {/* Right: Sync button */}
          <Button size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw
              className={cn('h-3.5 w-3.5 mr-1.5', isSyncing && 'animate-spin')}
            />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>

        {/* Line 2 — Title row */}
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Timeline</h1>
          <span className="text-xs text-gray-400">
            Last synced {timeAgo(mockHeaderData.lastSyncAt)}
          </span>
        </div>

        {/* Line 3 — Stat badges row */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
            <Activity className="h-3.5 w-3.5" />
            {mockHeaderData.activityCount} Activities
          </Badge>

          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700"
          >
            <FileText className="h-3.5 w-3.5" />
            {mockHeaderData.draftCount} Drafts
          </Badge>

          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700"
          >
            <Award className="h-3.5 w-3.5" />
            {mockHeaderData.promotedCount} Promoted
          </Badge>

          {/* Source icons cluster */}
          <div className="flex items-center gap-1 ml-2">
            {mockHeaderData.toolSources.map((source) => (
              <SourceIcon
                key={source}
                source={source}
                className="h-4 w-4 text-gray-400"
              />
            ))}
          </div>

          {/* Enhancing indicator */}
          {mockHeaderData.isEnhancing && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 px-3 py-1 animate-pulse"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Enhancing...
            </Badge>
          )}
        </div>

        {/* Banner */}
        {!bannerDismissed && (
          <div className="mt-3 flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 text-xs text-primary-700">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{mockHeaderData.bannerText}</span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-primary-400 hover:text-primary-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="border-b border-gray-200 mt-4" />
      </div>

      {/* Activity stream body */}
      <div className="pt-6">
        <MockBody />
      </div>
    </div>
  );
}
