import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw, Clock, X, Activity, FileText, Award, Sparkles } from 'lucide-react';

export function TimelineHeaderV4() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
        {/* Title row */}
        <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track activities across your tools and craft career stories.
        </p>

        {/* Tab strip */}
        <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden flex items-stretch">
          {/* Left section — stat segments */}
          <div className="flex-1 flex items-stretch divide-x divide-gray-200">
            {/* Segment 1 — Activities */}
            <div className="px-5 py-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary-600" />
              <div>
                <span className="text-lg font-bold text-gray-900">
                  {mockHeaderData.activityCount}
                </span>
                <span className="text-xs text-gray-500 ml-1">Activities</span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {mockHeaderData.toolSources.map((source) => (
                  <SourceIcon
                    key={source}
                    source={source}
                    className="h-3.5 w-3.5 text-gray-400"
                  />
                ))}
              </div>
            </div>

            {/* Segment 2 — Drafts */}
            <div className="px-5 py-4 flex items-center gap-3">
              <FileText className="h-5 w-5 text-amber-600" />
              <div>
                <span className="text-lg font-bold text-gray-900">
                  {mockHeaderData.draftCount}
                </span>
                <span className="text-xs text-gray-500 ml-1">Drafts Ready</span>
              </div>
            </div>

            {/* Segment 3 — Promoted */}
            <div className="px-5 py-4 flex items-center gap-3">
              <Award className="h-5 w-5 text-emerald-600" />
              <div>
                <span className="text-lg font-bold text-gray-900">
                  {mockHeaderData.promotedCount}
                </span>
                <span className="text-xs text-gray-500 ml-1">Promoted</span>
              </div>
            </div>
          </div>

          {/* Right section — sync */}
          <div className="px-5 py-4 flex items-center gap-3 border-l border-gray-200 bg-gray-50/50">
            {mockHeaderData.isEnhancing ? (
              <div className="flex items-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                <span className="text-xs text-primary-600">Enhancing...</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">
                Synced {timeAgo(mockHeaderData.lastSyncAt)}
              </span>
            )}
            <Button
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

      {/* Body */}
      <div className="pt-6">
        <MockBody />
      </div>
    </div>
  );
}
