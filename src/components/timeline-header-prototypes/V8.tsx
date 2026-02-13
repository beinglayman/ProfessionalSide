import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw, Clock, X, Sparkles } from 'lucide-react';

export function TimelineHeaderV8() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-primary-50 via-primary-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
          {/* Title & subtitle */}
          <h1 className="text-3xl font-bold text-gray-900">Your Timeline</h1>
          <p className="mt-2 text-base text-gray-500">
            {mockHeaderData.activityCount} activities across{' '}
            {mockHeaderData.toolSources.length} tools this month
          </p>

          {/* Sync button — absolute positioned */}
          <div className="absolute top-10 right-4 sm:right-6 lg:right-8">
            <Button onClick={handleSync} disabled={isSyncing}>
              <RefreshCw
                className={cn('h-4 w-4 mr-1.5', isSyncing && 'animate-spin')}
              />
              Sync
            </Button>
            <p className="text-xs text-gray-400 text-right mt-1">
              Synced {timeAgo(mockHeaderData.lastSyncAt)}
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-8 flex items-center gap-8 md:gap-12">
            <div>
              <div className="text-3xl font-bold text-primary-700">
                {mockHeaderData.activityCount}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                Activities
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-600">
                {mockHeaderData.draftCount}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                Drafts
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-600">
                {mockHeaderData.promotedCount}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                Promoted
              </div>
            </div>
          </div>

          {/* Source icons row */}
          <div className="mt-4 flex items-center gap-2">
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
            <div className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 animate-pulse">
              <Sparkles className="h-4 w-4" />
              Enhancing your stories...
            </div>
          )}

          {/* Dismissible banner */}
          {!bannerDismissed && (
            <div className="mt-6 text-xs text-gray-400 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{mockHeaderData.bannerText}</span>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-gray-300 hover:text-gray-500 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="pt-2">
        <MockBody />
      </div>
    </div>
  );
}
