import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw, Clock, X } from 'lucide-react';

export function TimelineHeaderV10() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Magazine Masthead Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-8 items-start">
          {/* Main column */}
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-primary-600 font-semibold">
              Timeline
            </span>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight">
              Your Professional Activity Feed
            </h1>
            <p className="mt-3 text-base text-gray-500 font-light">
              All your workspace activity, automatically organized and always up
              to date
            </p>

            {/* Dismissible pull-quote banner */}
            {!bannerDismissed && (
              <div className="mt-5 border-l-4 border-primary-300 pl-4 text-sm text-gray-500 italic flex items-start gap-0">
                <span>{mockHeaderData.bannerText}</span>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="ml-2 text-gray-300 hover:text-gray-500 shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Side column — stats sidebar */}
          <div className="pt-1">
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {mockHeaderData.activityCount}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Activities
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {mockHeaderData.draftCount}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Drafts
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {mockHeaderData.promotedCount}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Promoted
                </div>
              </div>
            </div>

            {/* Source icons */}
            <div className="mt-4 flex items-center gap-2">
              {mockHeaderData.toolSources.map((source) => (
                <SourceIcon
                  key={source}
                  source={source}
                  className="h-4 w-4 text-gray-400"
                />
              ))}
            </div>

            {/* Sync button — icon-only circle */}
            <div className="mt-4">
              <Button
                size="sm"
                className="rounded-full w-10 h-10 p-0"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw
                  className={cn('h-4 w-4', isSyncing && 'animate-spin')}
                />
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-400 text-center">
              {timeAgo(mockHeaderData.lastSyncAt)}
            </p>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="border-b border-gray-200 mt-6" />
      </div>

      {/* Body */}
      <div className="pt-6">
        <MockBody />
      </div>
    </div>
  );
}
