import { useState } from 'react';
import { mockHeaderData, SourceIcon, timeAgo } from './mock-data';
import { MockBody } from './MockBody';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { RefreshCw, Clock, X, Activity, FileText, Award, Timer } from 'lucide-react';

export function TimelineHeaderV3() {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        {/* Title row */}
        <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          All your workspace activity, automatically organized
        </p>

        {/* Stat cards grid */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1 — Activities */}
          <Card className="border-l-4 border-primary-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 text-primary-500 bg-primary-50 rounded-lg p-1.5 shrink-0">
                  <Activity className="h-full w-full" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockHeaderData.activityCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Activities</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {mockHeaderData.toolSources.map((source) => (
                      <SourceIcon
                        key={source}
                        source={source}
                        className="h-3.5 w-3.5 text-gray-400"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2 — Drafts */}
          <Card className="border-l-4 border-amber-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 text-amber-500 bg-amber-50 rounded-lg p-1.5 shrink-0">
                  <FileText className="h-full w-full" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockHeaderData.draftCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Drafts Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3 — Promoted */}
          <Card className="border-l-4 border-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 text-emerald-500 bg-emerald-50 rounded-lg p-1.5 shrink-0">
                  <Award className="h-full w-full" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {mockHeaderData.promotedCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Promoted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4 — Last Sync */}
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 text-blue-500 bg-blue-50 rounded-lg p-1.5 shrink-0">
                  <Timer className="h-full w-full" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {timeAgo(mockHeaderData.lastSyncAt)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Last Synced</p>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-1.5 h-7 text-xs"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    <RefreshCw
                      className={cn('h-3 w-3 mr-1', isSyncing && 'animate-spin')}
                    />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dismissable info banner */}
        {!bannerDismissed && (
          <div className="mt-4 flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-lg px-4 py-2.5">
            <Clock className="h-4 w-4 text-primary-600 shrink-0" />
            <span className="text-xs text-primary-700 flex-1">
              {mockHeaderData.bannerText}
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-primary-400 hover:text-primary-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="border-b border-gray-100 mt-6" />
      </div>

      {/* Activity stream body */}
      <div className="pt-6">
        <MockBody />
      </div>
    </div>
  );
}
