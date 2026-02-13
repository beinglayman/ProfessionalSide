import { useState } from 'react';
import { mockHeaderData, SourceIcon, SOURCE_META, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw, Clock, X, Activity, FileText, Award, Sparkles } from 'lucide-react';

export function TimelineHeaderV6() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[65%_35%]">
            {/* Left panel */}
            <div className="p-6 md:p-8">
              <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                All your workspace activity, automatically organized and always up to date
              </p>

              {/* Banner */}
              {!bannerDismissed && (
                <div className="mt-4 text-xs text-gray-500 flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <span>
                    {mockHeaderData.bannerText}
                    <button
                      onClick={() => setBannerDismissed(true)}
                      className="text-gray-400 hover:text-gray-600 underline text-xs ml-1"
                    >
                      dismiss
                    </button>
                  </span>
                </div>
              )}

              {/* Source icons row */}
              <div className="mt-4 flex items-center gap-3">
                {mockHeaderData.toolSources.map((source) => (
                  <div key={source} className="flex items-center gap-1">
                    <SourceIcon source={source} className="h-4 w-4" />
                    <span className="text-xs text-gray-500">
                      {SOURCE_META[source].name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="bg-gray-50 p-6 md:p-8 border-l border-gray-100">
              {/* Stat stack */}
              <div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Activities</span>
                  <span className="text-sm font-semibold text-gray-900">324</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Drafts Ready</span>
                  <span className="text-sm font-semibold text-gray-900">5</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Promoted</span>
                  <span className="text-sm font-semibold text-gray-900">3</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Last Sync</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {timeAgo(mockHeaderData.lastSyncAt)}
                  </span>
                </div>
              </div>

              {/* Sync button */}
              <Button
                className="w-full mt-4"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5 mr-1.5', isSyncing && 'animate-spin')}
                />
                Sync Now
              </Button>

              {/* Enhancing indicator */}
              {mockHeaderData.isEnhancing && (
                <div className="text-xs text-primary-600 animate-pulse flex items-center gap-1 mt-2 justify-center">
                  <Sparkles className="h-3.5 w-3.5" />
                  Enhancing narratives...
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Body */}
      <div className="pt-6">
        <MockBody />
      </div>
    </div>
  );
}
